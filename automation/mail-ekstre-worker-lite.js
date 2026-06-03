import fs from 'fs/promises';
import cfg from './mail-ekstre-config.json' assert { type: 'json' };
import { makeGmail } from './lib/gmail-auth.js';
import { searchMessages, mailboxQuery } from './lib/gmail-search.js';
import { readMessageSummary } from './lib/gmail-message.js';
import { readAttachmentBuffer, isReadableBankAttachment } from './lib/gmail-attachment.js';
import { extractTextFromAttachment, hasEnoughText } from './lib/pdf-text.js';
import { parseBankStatement } from './parsers/index.js';

const gmail = makeGmail();
const mailbox = process.env.GMAIL_MAILBOX || cfg.mailbox || 'alaylimedikal@gmail.com';
const lookback = process.env.LOOKBACK_DAYS || cfg.lookback_days || 7;

async function main(){
  const report = {
    run_at: new Date().toISOString(),
    company_id: cfg.company_id,
    mailbox,
    lookback_days: lookback,
    scanned_messages: 0,
    attachments: 0,
    readable_attachments: 0,
    extracted_texts: 0,
    parsed_rows: 0,
    messages: [],
    errors: []
  };

  for(const bank of cfg.banks){
    const query = mailboxQuery(mailbox, `(${bank.query}) has:attachment newer_than:${lookback}d`);
    try{
      const found = await searchMessages(gmail, query, 10);
      report.scanned_messages += found.length;
      for(const item of found){
        const msg = await readMessageSummary(gmail, item.id);
        const mailInfo = {
          bank: bank.bank,
          id: msg.id,
          from: msg.from,
          to: msg.to,
          subject: msg.subject,
          date: msg.date,
          attachments: []
        };
        for(const a of msg.attachments){
          report.attachments++;
          const att = { filename: a.filename, size: a.size, mimeType: a.mimeType, readable: isReadableBankAttachment(a), text_length: 0, text_ok: false, parsed_rows: 0 };
          if(att.readable){
            report.readable_attachments++;
            const buf = await readAttachmentBuffer(gmail, msg.id, a.attachmentId);
            const text = await extractTextFromAttachment(a.filename, buf);
            att.text_length = String(text || '').length;
            att.text_ok = hasEnoughText(text);
            if(att.text_ok){
              report.extracted_texts++;
              const rows = parseBankStatement(text, { company_id: cfg.company_id || 'alayli', mailbox, bank_hint: bank.bank, mail_id: msg.id, mail_subject: msg.subject, mail_from: msg.from, mail_date: msg.date, attachment_name: a.filename });
              att.parsed_rows = rows.length;
              report.parsed_rows += rows.length;
            }
          }
          mailInfo.attachments.push(att);
        }
        report.messages.push(mailInfo);
      }
    }catch(err){
      report.errors.push({ bank: bank.bank, error: err.message || String(err) });
    }
  }

  await fs.mkdir('automation/logs',{recursive:true});
  await fs.writeFile(`automation/logs/mail-ekstre-parse-${Date.now()}.json`, JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(report.errors.length) process.exitCode = 2;
}

main().catch(e=>{console.error(e);process.exit(1)});
