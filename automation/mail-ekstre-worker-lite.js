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
const LOG_DIR = new URL('./logs/', import.meta.url);

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
  const files = await listDriveFiles(drive, folderId);
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

async function listDriveFiles(drive, folderId, depth = 0, seen = new Set()){
  if(seen.has(folderId) || depth > 3) return [];
  seen.add(folderId);
  const escapedFolderId = String(folderId).replace(/'/g, "\\'");
  const q = `'${escapedFolderId}' in parents and trashed = false`;
  const res = await drive.files.list({
    q,
    pageSize: 100,
    fields: 'files(id,name,mimeType,modifiedTime)',
    includeItemsFromAllDrives: true,
    supportsAllDrives: true
  });
  const items = res.data.files || [];
  const nested = [];
  for(const item of items){
    if(item.mimeType === 'application/vnd.google-apps.folder'){
      nested.push(...await listDriveFiles(drive, item.id, depth + 1, seen));
    }
  }
  return items.filter(item => item.mimeType !== 'application/vnd.google-apps.folder').concat(nested);
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
              if(rows.length === 0) att.parser_probe = buildParserProbe(text);
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

function buildParserProbe(text){
  const lines = String(text || '')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const interesting = lines.filter(line =>
    /\d/.test(line) &&
    (/\d{1,2}[\.\/-]\d{1,2}/.test(line) || /\d{1,3}(?:\.\d{3})*,\d{2}/.test(line) || /TL|TRY|TUTAR|ISLEM|HESAP|ODEME|BORC/i.test(line))
  );
  return interesting.slice(0, 30).map(line =>
    line
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig, 'mail@masked')
      .replace(/\bTR\d{2}[A-Z0-9]{10,}\b/ig, 'TR##MASKED')
      .replace(/\d/g, '#')
      .slice(0, 180)
  );
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

  await fs.mkdir(LOG_DIR,{recursive:true});
  await fs.writeFile(new URL(`ekstre-${sourceMode}-${Date.now()}.json`, LOG_DIR), JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(report.errors.length) process.exitCode = 2;
}

main().catch(e=>{console.error(e);process.exit(1)});
