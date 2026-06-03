import fs from 'fs/promises';
import cfg from './mail-ekstre-config.json' assert { type: 'json' };
import { makeGmail } from './lib/gmail-auth.js';
import { searchMessages, mailboxQuery } from './lib/gmail-search.js';
import { readMessageSummary } from './lib/gmail-message.js';

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
        report.attachments += msg.attachments.length;
        report.messages.push({
          bank: bank.bank,
          id: msg.id,
          from: msg.from,
          to: msg.to,
          subject: msg.subject,
          date: msg.date,
          attachments: msg.attachments.map(a => ({ filename: a.filename, size: a.size, mimeType: a.mimeType }))
        });
      }
    }catch(err){
      report.errors.push({ bank: bank.bank, error: err.message || String(err) });
    }
  }

  await fs.mkdir('automation/logs',{recursive:true});
  await fs.writeFile(`automation/logs/mail-ekstre-live-scan-${Date.now()}.json`, JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(report.errors.length) process.exitCode = 2;
}

main().catch(e=>{console.error(e);process.exit(1)});
