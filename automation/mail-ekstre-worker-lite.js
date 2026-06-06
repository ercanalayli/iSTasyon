import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import pdf from 'pdf-parse';
import { makeGmail } from './lib/gmail-auth.js';
import { searchMessages, mailboxQuery } from './lib/gmail-search.js';
import { readMessageSummary } from './lib/gmail-message.js';
import { readAttachmentBuffer, isReadableBankAttachment } from './lib/gmail-attachment.js';
import { extractTextFromAttachment, hasEnoughText } from './lib/pdf-text.js';
import { parseBankStatement } from './parsers/index.js';

const cfg = JSON.parse(await fs.readFile(new URL('./mail-ekstre-config.json', import.meta.url), 'utf8'));
const DEFAULT_SUPABASE_URL = 'https://iilfwosoroflzubkaryj.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW';
const sourceMode = process.env.EKSTRE_SOURCE || 'gmail';
const gmail = sourceMode === 'gmail' ? makeGmail() : null;
const mailbox = process.env.GMAIL_MAILBOX || cfg.mailbox || 'alaylimedikal@gmail.com';
const lookback = process.env.LOOKBACK_DAYS || cfg.lookback_days || 7;
const dryRun = process.env.DRY_RUN === '1';

function openDb(){
  const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
  if(!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function makeDrive(){
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI || 'http://localhost');
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth });
}

async function loadRowsFromDrive(report){
  const folderId = process.env.GDRIVE_EKSTRE_FOLDER_ID;
  if(!folderId) throw new Error('GDRIVE_EKSTRE_FOLDER_ID eksik');
  const drive = makeDrive();
  const q = `'${folderId}' in parents and trashed = false`;
  const res = await drive.files.list({ q, pageSize: 20, fields: 'files(id,name,mimeType,modifiedTime)' });
  const files = res.data.files || [];
  report.drive_folder_id = folderId;
  report.scanned_messages = files.length;
  const parsed = [];
  for(const f of files){
    if(!String(f.name || '').toLowerCase().endsWith('.pdf')) continue;
    report.attachments++;
    const raw = await drive.files.get({ fileId: f.id, alt: 'media' }, { responseType: 'arraybuffer' });
    const text = (await pdf(Buffer.from(raw.data))).text || '';
    if(!hasEnoughText(text)) continue;
    report.readable_attachments++;
    report.extracted_texts++;
    const rows = parseBankStatement(text, { company_id: cfg.company_id || 'alayli', source: 'google_drive_bank_statement', mailbox: 'google_drive', bank_hint: f.name, statement_id: f.id, attachment_name: f.name });
    report.parsed_rows += rows.length;
    parsed.push(...rows.map(r => ({ ...r, source: 'google_drive_bank_statement', mailbox: 'google_drive', attachment_name: f.name, statement_id: f.id })));
    report.messages.push({ bank: 'drive', id: f.id, subject: f.name, date: f.modifiedTime, attachments: [{ filename: f.name, parsed_rows: rows.length }] });
  }
  return parsed;
}

async function loadRowsFromGmail(report){
  const parsed = [];
  for(const bank of cfg.banks){
    const query = mailboxQuery(mailbox, `(${bank.query}) has:attachment newer_than:${lookback}d`);
    try{
      const found = await searchMessages(gmail, query, 10);
      report.scanned_messages += found.length;
      for(const item of found){
        const msg = await readMessageSummary(gmail, item.id);
        const mailInfo = { bank: bank.bank, id: msg.id, from: msg.from, to: msg.to, subject: msg.subject, date: msg.date, attachments: [] };
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
              parsed.push(...rows);
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
  return parsed;
}

async function main(){
  const report = {
    run_at: new Date().toISOString(),
    mode: dryRun ? 'dry_run' : 'live',
    source: sourceMode,
    company_id: cfg.company_id,
    mailbox,
    lookback_days: lookback,
    scanned_messages: 0,
    attachments: 0,
    readable_attachments: 0,
    extracted_texts: 0,
    parsed_rows: 0,
    ingest: null,
    messages: [],
    errors: []
  };

  let parsed = [];
  try{
    parsed = sourceMode === 'drive' ? await loadRowsFromDrive(report) : await loadRowsFromGmail(report);
  }catch(err){
    report.errors.push({ area: sourceMode, error: err.message || String(err) });
  }

  if(dryRun){
    report.ingest = { dry_run: true, input: parsed.length, inserted: 0, duplicate: 0, failed: 0 };
  }else if(parsed.length){
    const db = openDb();
    if(!db){
      report.errors.push({ area: 'supabase', error: 'SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY eksik' });
    }else{
      const res = await db.rpc('ingest_mail_bank_movements', { p_rows: parsed });
      if(res.error) report.errors.push({ area: 'ingest_rpc', error: res.error.message });
      report.ingest = res.data || null;
    }
  }else{
    report.ingest = { input: 0, inserted: 0, duplicate: 0, failed: 0 };
  }

  await fs.mkdir('automation/logs',{recursive:true});
  await fs.writeFile(`automation/logs/ekstre-${sourceMode}-${Date.now()}.json`, JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(report.errors.length) process.exitCode = 2;
}

main().catch(e=>{console.error(e);process.exit(1)});
