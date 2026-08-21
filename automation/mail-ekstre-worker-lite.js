import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { makeGmail } from './lib/gmail-auth.js';
import { searchMessages, mailboxQuery } from './lib/gmail-search.js';
import { readMessageSummary } from './lib/gmail-message.js';
import { readAttachmentBuffer, isReadableBankAttachment } from './lib/gmail-attachment.js';
import { extractTextItemsFromAttachment, hasEnoughText } from './lib/pdf-text.js';
import { parseBankStatement, detectBank } from './parsers/index.js';

const cfg = JSON.parse(await fs.readFile(new URL('./mail-ekstre-config.json', import.meta.url), 'utf8'));
const SCOPE_BY_BANK = Object.fromEntries((cfg.banks || []).map(b => [b.bank, b.scope || 'sirket']));
function scopeForBank(bankKey){ return SCOPE_BY_BANK[bankKey] || 'sirket'; }
const DEFAULT_SUPABASE_URL = 'https://iilfwosoroflzubkaryj.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW';
const sourceMode = process.env.EKSTRE_SOURCE || 'gmail';
const gmail = sourceMode === 'gmail' ? makeGmail() : null;
const mailbox = process.env.GMAIL_MAILBOX || cfg.mailbox || 'ercanalayli@gmail.com';
const lookback = process.env.LOOKBACK_DAYS || cfg.lookback_days || 7;
const maxMessagesPerBank = Number(process.env.GMAIL_MAX_MESSAGES_PER_BANK || cfg.gmail_max_messages_per_bank || 25);
const dryRun = process.env.DRY_RUN === '1';
const LOG_DIR = new URL('./logs/', import.meta.url);
const TELEGRAM_NOTIFICATION_PREFIX = '[TELEGRAM_ONAY_KARTI]';

function telegramChatIds(){
  return String(process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_ALLOWED_CHAT_ID || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function html(value){
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function trMoney(value){
  return Number(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
}

function bankApprovalCard(row){
  const amountIn = Number(row.amount_in || 0);
  const amountOut = Number(row.amount_out || 0);
  const direction = amountIn > 0 ? 'TAHSÄ°LAT' : 'Ã–DEME';
  const amount = amountIn > 0 ? amountIn : Math.abs(amountOut);
  const confidence = Number(row.confidence_score || 0);
  const confidenceIcon = confidence >= 90 ? 'ğŸŸ¢' : confidence >= 75 ? 'ğŸŸ ' : 'ğŸ”´';
  const counterparty = row.confirmed_counterparty || row.suggested_counterparty || 'EÅLEÅME GEREKLÄ°';
  return [
    '<b>ğŸ¦ BANKA HAREKETÄ° ONAYI</b>',
    '',
    '<b>' + direction + ' â€¢ ' + trMoney(amount) + '</b>',
    'ğŸ› <b>Banka:</b> ' + html(row.bank_name || '-'),
    'ğŸ“… <b>Tarih:</b> ' + html(row.transaction_date || '-'),
    'ğŸ‘¤ <b>KarÅŸÄ± taraf:</b> ' + html(counterparty),
    'ğŸ“ <b>AÃ§Ä±klama:</b> ' + html(row.description || '-'),
    confidenceIcon + ' <b>EÅŸleÅŸme gÃ¼veni:</b> ' + confidence.toLocaleString('tr-TR') + '%',
    '',
    confidence < 84 || !row.counterparty_confirmed
      ? '<b>âš ï¸ Ä°nceleme:</b> Cari veya iÅŸlem tÃ¼rÃ¼ kesinleÅŸmeden kayÄ±t tamamlanmayacaktÄ±r.'
      : '<b>âœ… Kontrol:</b> Onaydan sonra BizimHesap gÃ¼venlik kapÄ±sÄ±na aktarÄ±lÄ±r.',
    '<i>MÃ¼kerrer kontrolÃ¼ uygulanmÄ±ÅŸtÄ±r. Onay vermek tek baÅŸÄ±na gÃ¼venlik kontrollerini kaldÄ±rmaz.</i>'
  ].join('\n');
}

async function sendTelegramApproval(token, chatId, row){
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: bankApprovalCard(row),
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: 'âœ… ONAYLA', callback_data: `bm:a:${row.id}` },
          { text: 'âŒ REDDET', callback_data: `bm:r:${row.id}` }
        ]]
      }
    })
  });
  const body = await response.json().catch(() => ({}));
  if(!response.ok || body.ok !== true) throw new Error(body.description || `Telegram HTTP ${response.status}`);
  return body.result?.message_id || null;
}

async function dispatchPendingApprovals(db, report){
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const chatIds = telegramChatIds();
  if(!token || !chatIds.length){
    report.telegram_approvals = { configured: false, sent: 0, reason: 'Telegram token/chat eksik' };
    return;
  }
  const since = new Date(Date.now() - Math.max(1, Number(lookback)) * 86400000).toISOString();
  const { data, error } = await db
    .from('pending_bank_movements')
    .select('id,bank_name,transaction_date,description,amount_in,amount_out,confidence_score,suggested_counterparty,confirmed_counterparty,counterparty_confirmed,approval_note,created_at,status')
    .eq('company_id', cfg.company_id || 'alayli')
    .in('status', ['pending', 'needs_review'])
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(50);
  if(error) throw new Error(`Telegram onay listesi okunamadÄ±: ${error.message}`);
  const rows = (data || []).filter(row => !String(row.approval_note || '').includes(TELEGRAM_NOTIFICATION_PREFIX));
  let sent = 0;
  const failures = [];
  for(const row of rows){
    try{
      const messageIds = [];
      for(const chatId of chatIds) messageIds.push(await sendTelegramApproval(token, chatId, row));
      const marker = `${TELEGRAM_NOTIFICATION_PREFIX} ${new Date().toISOString()} message=${messageIds.filter(Boolean).join(',')}`;
      const previous = String(row.approval_note || '').trim();
      const { error: updateError } = await db.from('pending_bank_movements').update({ approval_note: previous ? `${previous}\n${marker}` : marker }).eq('id', row.id);
      if(updateError) throw updateError;
      sent++;
    }catch(error){
      failures.push({ id: row.id, error: error.message || String(error) });
    }
  }
  report.telegram_approvals = { configured: true, candidates: rows.length, sent, failed: failures.length, failures: failures.slice(0, 10) };
  if(failures.length) report.errors.push({ area: 'telegram_approval_dispatch', error: `${failures.length} kart gÃ¶nderilemedi` });
}

function openDb(){
  const url = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
  if(!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function ingestViaControlPlane(rows){
  const url = process.env.APERION_BANK_INGEST_URL || '';
  const secret = process.env.APERION_BANK_INGEST_SECRET || '';
  if(!url || !secret) return null;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-aperion-ingest-secret': secret
    },
    body: JSON.stringify({ company_id: cfg.company_id || 'alayli', rows })
  });
  const body = await response.json().catch(() => ({}));
  if(!response.ok || body.ok !== true){
    const detail = body.error || body.failures?.[0]?.error || `HTTP ${response.status}`;
    throw new Error(`AperiON D1 ingest baÅŸarÄ±sÄ±z: ${detail}`);
  }
  return { backend: 'cloudflare_d1', ...body };
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
    if(!isReadableBankAttachment({ filename: f.name })) continue;
    report.attachments++;
    const raw = await drive.files.get({ fileId: f.id, alt: 'media' }, { responseType: 'arraybuffer' });
    report.readable_attachments++;
    const textItems = await extractTextItemsFromAttachment(f.name, Buffer.from(raw.data));
    const attachments = [];
    for(const item of textItems){
      const text = item.text || '';
      const att = { filename: item.filename, container_name: item.container_name || '', text_length: String(text).length, text_ok: hasEnoughText(text), parsed_rows: 0 };
      if(item.error) att.error = item.error;
      if(att.text_ok){
        report.extracted_texts++;
        const driveMeta = { company_id: cfg.company_id || 'alayli', source: 'google_drive_bank_statement', mailbox: 'google_drive', bank_hint: `${f.name} ${item.filename}`, statement_id: f.id, attachment_name: item.container_name ? `${item.container_name}/${item.filename}` : item.filename };
        const rows = parseBankStatement(text, driveMeta);
        att.parsed_rows = rows.length;
        if(rows.length === 0) att.parser_probe = buildParserProbe(text);
        report.parsed_rows += rows.length;
        const driveScope = scopeForBank(detectBank(text, driveMeta));
        parsed.push(...rows.map(r => ({ ...r, source: 'google_drive_bank_statement', mailbox: 'google_drive', attachment_name: item.container_name ? `${item.container_name}/${item.filename}` : item.filename, statement_id: f.id, scope: driveScope })));
      }
      attachments.push(att);
    }
    report.messages.push({ bank: 'drive', id: f.id, subject: f.name, date: f.modifiedTime, attachments });
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
  const seenMessages = new Set();
  const seenAttachments = new Set();
  for(const bank of cfg.banks){
    const query = mailboxQuery(mailbox, `(${bank.query}) newer_than:${lookback}d`);
    try{
      const found = await searchMessages(gmail, query, maxMessagesPerBank);
      for(const item of found){
        if(seenMessages.has(item.id)) continue;
        seenMessages.add(item.id);
        report.scanned_messages++;
        const msg = await readMessageSummary(gmail, item.id);
        const mailInfo = { bank: bank.bank, id: msg.id, from: msg.from, to: msg.to, subject: msg.subject, date: msg.date, body_text_length: 0, body_parsed_rows: 0, attachments: [] };
        const bodyText = [msg.subject, msg.snippet, msg.body_text].filter(Boolean).join('\n');
        if(bodyText.trim()){
          report.body_texts++;
          mailInfo.body_text_length = bodyText.length;
          const bodyMeta = {
            company_id: cfg.company_id || 'alayli',
            source: 'gmail_bank_notification',
            mailbox,
            bank_hint: `${bank.bank} ${msg.from || ''} ${msg.subject || ''}`,
            mail_id: msg.id,
            mail_subject: msg.subject,
            mail_from: msg.from,
            mail_date: msg.date,
            attachment_name: 'mail_body'
          };
          const rows = parseBankStatement(bodyText, bodyMeta);
          mailInfo.body_parsed_rows = rows.length;
          if(rows.length === 0) mailInfo.body_parser_probe = buildParserProbe(bodyText);
          report.body_parsed_rows += rows.length;
          report.parsed_rows += rows.length;
          // Scope, mesayi HANGI banka sorgusunun yakaladigina degil, icerigin
          // GERCEKTEN hangi bankaya ait oldugu tespitine gore atanir - yoksa
          // TEB eki "Akbank" sorgusuyla eslesen bir mailde gelirse (orijinal
          // hata tam buydu) yine sirkete gider.
          rows.forEach(r => { r.scope = scopeForBank(detectBank(bodyText, bodyMeta)); });
          parsed.push(...rows);
        }
        for(const a of msg.attachments){
          const attachmentKey = `${msg.id}:${a.attachmentId || a.filename || ''}`;
          if(seenAttachments.has(attachmentKey)) continue;
          seenAttachments.add(attachmentKey);
          report.attachments++;
          const att = { filename: a.filename, size: a.size, mimeType: a.mimeType, readable: isReadableBankAttachment(a), text_length: 0, text_ok: false, parsed_rows: 0 };
          if(att.readable){
            report.readable_attachments++;
            const buf = await readAttachmentBuffer(gmail, msg.id, a.attachmentId);
            const textItems = await extractTextItemsFromAttachment(a.filename, buf);
            att.inner_files = [];
            for(const item of textItems){
              const text = item.text || '';
              const inner = { filename: item.filename, container_name: item.container_name || '', text_length: String(text).length, text_ok: hasEnoughText(text), parsed_rows: 0 };
              if(item.error) inner.error = item.error;
              if(inner.text_ok){
                report.extracted_texts++;
                const attachmentName = item.container_name ? `${item.container_name}/${item.filename}` : item.filename;
                const attMeta = { company_id: cfg.company_id || 'alayli', mailbox, bank_hint: `${bank.bank} ${msg.from || ''} ${msg.subject || ''} ${attachmentName || ''}`, mail_id: msg.id, mail_subject: msg.subject, mail_from: msg.from, mail_date: msg.date, attachment_name: attachmentName };
                const rows = parseBankStatement(text, attMeta);
                inner.parsed_rows = rows.length;
                if(rows.length === 0) inner.parser_probe = buildParserProbe(text);
                report.parsed_rows += rows.length;
                // bank.scope DEGIL - eklentinin gercek icerigine gore tespit (asagidaki not).
                rows.forEach(r => { r.scope = scopeForBank(detectBank(text, attMeta)); });
                parsed.push(...rows);
              }
              att.inner_files.push(inner);
            }
            att.text_length = att.inner_files.reduce((sum, item) => sum + Number(item.text_length || 0), 0);
            att.text_ok = att.inner_files.some(item => item.text_ok);
            att.parsed_rows = att.inner_files.reduce((sum, item) => sum + Number(item.parsed_rows || 0), 0);
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

function rowSignature(row){
  const norm = value => String(value || '')
    .toLocaleUpperCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 180);
  const money = value => Number(value || 0).toFixed(2);
  return [
    norm(row.bank_name || row.bank || row.source || 'BANKA'),
    String(row.transaction_date || '').substring(0, 10),
    String(row.transaction_time || ''),
    money(row.amount_in),
    money(row.amount_out),
    row.balance_after == null ? '' : money(row.balance_after),
    norm(row.description)
  ].join('|');
}

async function filterAlreadyStoredRows(db, rows, report){
  if(!rows.length || !db) return rows;
  const dates = rows.map(r => String(r.transaction_date || '').substring(0, 10)).filter(Boolean).sort();
  const from = dates[0], to = dates[dates.length - 1];
  if(!from || !to) return rows;
  const { data, error } = await db
    .from('pending_bank_movements')
    .select('id,duplicate_key,bank_name,transaction_date,transaction_time,description,amount_in,amount_out,balance_after,status')
    .eq('company_id', cfg.company_id || 'alayli')
    .gte('transaction_date', from)
    .lte('transaction_date', to)
    .limit(20000);
  if(error){
    report.errors.push({ area: 'prefilter_existing', error: error.message });
    return rows;
  }
  const keys = new Set((data || []).map(r => r.duplicate_key).filter(Boolean));
  const signatures = new Map((data || []).map(r => [rowSignature(r), r.id]));
  if(process.env.DEBUG_PREFILTER){
    console.error('DEBUG existing_count=' + (data||[]).length + ' keys_size=' + keys.size + ' sig_size=' + signatures.size);
    console.error('DEBUG from=' + from + ' to=' + to);
    (data||[]).forEach(r => console.error('DEBUG_EXISTING dup_key=[' + r.duplicate_key + '] sig=[' + rowSignature(r) + ']'));
    rows.slice(0,3).forEach(r => console.error('DEBUG_NEWROW dup_key=[' + r.duplicate_key + '] sig=[' + rowSignature(r) + ']'));
  }
  const fresh = [];
  const skipped = [];
  for(const row of rows){
    const sig = rowSignature(row);
    if(keys.has(row.duplicate_key) || signatures.has(sig)){
      skipped.push({ duplicate_key: row.duplicate_key, existing_id: signatures.get(sig) || null, bank_name: row.bank_name, transaction_date: row.transaction_date, amount_in: row.amount_in, amount_out: row.amount_out });
    }else{
      fresh.push(row);
    }
  }
  report.prefilter = {
    checked_existing: (data || []).length,
    input: rows.length,
    skipped_existing: skipped.length,
    fresh: fresh.length,
    sample: skipped.slice(0, 10)
  };
  return fresh;
}

// Kisisel (sirket-disi) banka hareketlerini AperiON kisisel finans tablosuna yazar.
// Sirketin bank_transactions / pending_bank_movements / BizimHesap kuyruguna HIC dokunmaz.
async function ingestPersonalRows(db, rows, report){
  let inserted = 0, failed = 0;
  const failDetails = [];
  for(const r of rows){
    const amount = Number(r.amount_out || 0) > 0 ? -Number(r.amount_out) : Number(r.amount_in || 0);
    // company/owner NOT NULL - 'kisisel' skoru ÅŸirket adÄ± degil, sirket-disi
    // oldugunu isaretler. status, personal_finance_documents CHECK kisitina
    // uymak zorunda: received|parsed|matched|approved|rejected|archived.
    const { error } = await db.from('personal_finance_documents').insert({
      owner: 'ercan',
      company: 'kisisel',
      scope: 'kisisel',
      document_type: 'banka_hareketi',
      source_type: 'gmail_bank_statement',
      extracted_text: r.description || '',
      parsed_amount: amount,
      parsed_date: r.transaction_date || null,
      parsed_vendor: r.bank_name || 'TEB',
      ai_category: r.detected_type || null,
      status: 'received',
      note: `Otomatik ayristirildi: ${r.bank_name || 'TEB'} sahsi hesap, sirket defterine islenmedi. Mail: ${r.mail_subject || ''}`
    });
    if(error){ failed++; failDetails.push({ error: error.message, row: { tarih: r.transaction_date, tutar: amount, aciklama: r.description } }); }
    else inserted++;
  }
  if(failDetails.length) report.personal_ingest_errors = failDetails.slice(0, 10);
  return { input: rows.length, inserted, failed };
}

async function main(){
  const report = {
    run_at: new Date().toISOString(),
    mode: dryRun ? 'dry_run' : 'live',
    source: sourceMode,
    company_id: cfg.company_id,
    mailbox,
    lookback_days: lookback,
    gmail_max_messages_per_bank: maxMessagesPerBank,
    scanned_messages: 0,
    attachments: 0,
    readable_attachments: 0,
    body_texts: 0,
    body_parsed_rows: 0,
    extracted_texts: 0,
    parsed_rows: 0,
    ingest: null,
    messages: [],
    errors: []
  };

  let parsed = [];
  try{
    parsed = sourceMode === 'drive' ? await loadRowsFromDrive(report) : await loadRowsFromGmail(report);
    parsed = dedupeParsedRows(parsed, report);
  }catch(err){
    report.errors.push({ area: sourceMode, error: err.message || String(err) });
  }

  // Kisisel hesaplar (Ã¶r. TEB) sirket (BizimHesap) defterine ASLA islenmez -
  // ayri tutulup AperiON kisisel finans tablosuna yazilir. bank.scope='kisisel'
  // mail-ekstre-config.json'da tanimli.
  // scope "sirket" (veya bos/tanimsiz - varsayilan) disindaki HER SEY ALAYLI
  // defterine islenmez. Sadece "kisisel" degil - baska bir sirkete (Ã¶r. ALKAM
  // Mali Musavirlik) ait hesaplar da ayni sekilde disarida tutulmali; onlarin
  // kendi company_id ayrimi henuz yok, o yuzden simdilik sadece raporlanip
  // hicbir deftere yazilmiyorlar (ne ALAYLI'ya ne yanlislikla kisisele).
  const personalRows = parsed.filter(r => r.scope === 'kisisel');
  const otherCompanyRows = parsed.filter(r => r.scope && r.scope !== 'kisisel' && r.scope !== 'sirket');
  const companyRows = parsed.filter(r => !r.scope || r.scope === 'sirket');
  report.personal_rows_excluded = personalRows.length;
  report.other_company_rows_excluded = otherCompanyRows.length;
  if(otherCompanyRows.length){
    report.other_company_scopes = [...new Set(otherCompanyRows.map(r => r.scope))];
  }

  if(dryRun){
    report.ingest = { dry_run: true, input: companyRows.length, inserted: 0, duplicate: 0, failed: 0 };
    report.personal_ingest = { dry_run: true, input: personalRows.length, inserted: 0 };
  }else{
    const controlPlaneConfigured = Boolean(process.env.APERION_BANK_INGEST_URL && process.env.APERION_BANK_INGEST_SECRET);
    if(controlPlaneConfigured){
      if(companyRows.length) {
        try {
          report.ingest = await ingestViaControlPlane(companyRows);
        } catch(error) {
          report.errors.push({ area: 'cloudflare_d1_ingest', error: error.message || String(error) });
        }
      } else {
        report.ingest = { backend: 'cloudflare_d1', input: 0, inserted: 0, duplicate: 0, invalid: 0, telegram_sent: 0 };
      }
      report.personal_ingest = { input: personalRows.length, inserted: 0, status: 'excluded_from_company_ledger' };
    }else{
      const db = openDb();
      if(!db){
        report.errors.push({ area: 'storage', error: 'Cloudflare D1 ingest veya Supabase yapÄ±landÄ±rmasÄ± eksik' });
      }else{
        if(companyRows.length){
        const freshRows = await filterAlreadyStoredRows(db, companyRows, report);
        const res = freshRows.length
          ? await db.rpc('ingest_mail_bank_movements', { p_rows: freshRows })
          : { data: { input: companyRows.length, inserted: 0, duplicate: report.prefilter?.skipped_existing || 0, failed: 0, prefiltered: true }, error: null };
        if(res.error) report.errors.push({ area: 'ingest_rpc', error: res.error.message });
        report.ingest = res.data || null;
        }else{
          report.ingest = { input: 0, inserted: 0, duplicate: 0, failed: 0 };
        }
        if(personalRows.length){
          report.personal_ingest = await ingestPersonalRows(db, personalRows, report);
        }
        await dispatchPendingApprovals(db, report).catch(error => {
          report.errors.push({ area: 'telegram_approval_dispatch', error: error.message || String(error) });
        });
      }
    }
  }

  await fs.mkdir(LOG_DIR,{recursive:true});
  await fs.writeFile(new URL(`ekstre-${sourceMode}-${Date.now()}.json`, LOG_DIR), JSON.stringify(report,null,2));
  console.log(JSON.stringify(buildConsoleSummary(report), null, 2));
  if(report.errors.length) process.exitCode = 2;
}

function dedupeParsedRows(rows, report){
  const seen = new Set();
  const unique = [];
  for(const row of rows){
    const key = row.duplicate_key || rowSignature(row);
    if(!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  report.duplicates_inside_run = rows.length - unique.length;
  report.parsed_rows_unique = unique.length;
  return unique;
}

function buildConsoleSummary(report){
  return {
    run_at: report.run_at,
    mode: report.mode,
    source: report.source,
    company_id: report.company_id,
    mailbox: report.mailbox,
    lookback_days: report.lookback_days,
    gmail_max_messages_per_bank: report.gmail_max_messages_per_bank,
    scanned_messages: report.scanned_messages,
    attachments: report.attachments,
    readable_attachments: report.readable_attachments,
    body_texts: report.body_texts,
    body_parsed_rows: report.body_parsed_rows,
    extracted_texts: report.extracted_texts,
    parsed_rows: report.parsed_rows,
    parsed_rows_unique: report.parsed_rows_unique,
    duplicates_inside_run: report.duplicates_inside_run,
    ingest: report.ingest,
    personal_rows_excluded: report.personal_rows_excluded || 0,
    personal_ingest: report.personal_ingest || null,
    errors: report.errors
  };
}

main().catch(e=>{console.error(e);process.exit(1)});

