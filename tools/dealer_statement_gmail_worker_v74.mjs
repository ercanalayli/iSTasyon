import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { makeGmail } from '../automation/lib/gmail-auth.js';
import { mailboxQuery, searchMessages } from '../automation/lib/gmail-search.js';
import { readMessageSummary } from '../automation/lib/gmail-message.js';
import { readAttachmentBuffer } from '../automation/lib/gmail-attachment.js';

const root = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const REQUIRED_MAILBOX = 'alaylimedikal@gmail.com';

function argValue(name, fallback = '') {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeName(value) {
  return String(value || 'dealer-statement.xls')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120);
}

function isDealerStatementAttachment(file) {
  const name = String(file?.filename || '').toLowerCase();
  if (!/\.(xls|xlsx|csv)$/i.test(name)) return false;
  return /dealer\s*statement|dealerstatement|bayi|ekstre|statement/.test(name);
}

function runNode(args, env = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    windowsHide: true,
  });
  return {
    command: `node ${args.join(' ')}`,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(label, fn, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const message = error.message || String(error);
      const transient = /premature close|econnreset|etimedout|socket|network|fetch failed/i.test(message);
      if (!transient || attempt === retries) break;
      console.log(`${label} gecici hata, tekrar deneniyor (${attempt}/${retries}): ${message}`);
      await sleep(1500 * attempt);
    }
  }
  throw lastError;
}

function writeJson(file, body) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
}

async function main() {
  const mailbox = (process.env.GMAIL_MAILBOX || argValue('mailbox', REQUIRED_MAILBOX)).trim().toLowerCase();
  const lookbackDays = Number(process.env.DEALER_LOOKBACK_DAYS || argValue('lookback-days', '45'));
  const maxMessages = Number(process.env.DEALER_MAX_MESSAGES || argValue('max-messages', '20'));
  const asOf = argValue('as-of', new Date().toISOString().slice(0, 10));
  const company = argValue('company', 'ALAYLI');
  const artifactDir = path.join(root, 'artifacts', 'dealer-statement');
  const reportFile = path.join(root, 'data', 'dealer_statement_gmail_worker_report.json');
  const planFile = path.join(root, 'data', 'dealer_statement_finance_calendar_plan.json');
  const proofFile = path.join(root, 'data', 'dealer_statement_finance_calendar_import_proof.json');

  const report = {
    created_at: new Date().toISOString(),
    source: 'gmail_dealer_statement',
    mailbox,
    as_of: asOf,
    company,
    lookback_days: lookbackDays,
    found_attachment: false,
    downloaded_file: '',
    matched_messages: [],
    commands: [],
    result: 'no_attachment',
    note: '',
  };

  if (mailbox !== REQUIRED_MAILBOX) {
    throw new Error(`Yanlis mailbox: ${mailbox}. Bu projede yalnizca ${REQUIRED_MAILBOX} kullanilir.`);
  }

  try {
    const gmail = makeGmail();
    const query = mailboxQuery(
      mailbox,
      `(filename:xls OR filename:xlsx OR filename:csv OR "DealerStatement" OR "Dealer Statement" OR "Bayi Ekstre") newer_than:${lookbackDays}d`
    );
    report.gmail_query = query;
    const found = await withRetry('Gmail arama', () => searchMessages(gmail, query, maxMessages));

    for (const item of found) {
      const msg = await withRetry(`Gmail mesaj ${item.id}`, () => readMessageSummary(gmail, item.id));
      const attachments = (msg.attachments || []).filter(isDealerStatementAttachment);
      report.matched_messages.push({
        id: msg.id,
        from: msg.from,
        subject: msg.subject,
        date: msg.date,
        attachment_count: attachments.length,
        attachments: attachments.map((file) => ({ filename: file.filename, size: file.size, mimeType: file.mimeType })),
      });
      if (!attachments.length || report.found_attachment) continue;

      const attachment = attachments[0];
      const raw = await withRetry(`Gmail ek ${attachment.filename}`, () => readAttachmentBuffer(gmail, msg.id, attachment.attachmentId));
      ensureDir(artifactDir);
      const savedFile = path.join(artifactDir, `${Date.now()}_${safeName(attachment.filename)}`);
      fs.writeFileSync(savedFile, raw);
      report.found_attachment = true;
      report.downloaded_file = savedFile;
      report.selected_message = {
        id: msg.id,
        from: msg.from,
        subject: msg.subject,
        date: msg.date,
        attachment: attachment.filename,
      };
    }
  } catch (error) {
    report.result = 'gmail_failed';
    report.error = error.message || String(error);
    report.note = 'Gmail DealerStatement taramasi basarisiz oldu; canli veri yazilmadi.';
    writeJson(reportFile, report);
    throw error;
  }

  if (!report.found_attachment) {
    report.note = 'DealerStatement eki bulunamadi; canli veri yazilmadi.';
    writeJson(reportFile, report);
    console.log('DealerStatement Gmail worker');
    console.log('Yeni DealerStatement eki bulunamadi.');
    console.log(`Cikti: ${reportFile}`);
    console.log('SONUC: BASARILI');
    return;
  }

  const build = runNode([
    'tools/build_dealer_statement_receivables_v72.cjs',
    `--file=${report.downloaded_file}`,
    `--as-of=${asOf}`,
    `--company=${company}`,
    `--out=${planFile}`,
  ]);
  report.commands.push(build);
  if (build.status !== 0) {
    report.result = 'build_failed';
    writeJson(reportFile, report);
    throw new Error(`DealerStatement plan uretimi basarisiz: ${build.stderr || build.stdout}`);
  }

  const dryImport = runNode([
    'tools/import_dealer_statement_receivables_v73.cjs',
    `--plan=${planFile}`,
    `--out=${proofFile}`,
  ]);
  report.commands.push(dryImport);
  if (dryImport.status !== 0) {
    report.result = 'dry_import_failed';
    writeJson(reportFile, report);
    throw new Error(`DealerStatement dry import basarisiz: ${dryImport.stderr || dryImport.stdout}`);
  }

  report.result = 'dry_run_ready';
  report.note = 'Plan ve dry-run kaniti uretildi. Canli Supabase insert yapilmadi.';
  writeJson(reportFile, report);

  console.log('DealerStatement Gmail worker');
  console.log(`Dosya: ${report.downloaded_file}`);
  console.log('Canli insert yapilmadi.');
  console.log(`Plan: ${planFile}`);
  console.log(`Kanit: ${proofFile}`);
  console.log(`Rapor: ${reportFile}`);
  console.log('SONUC: BASARILI');
}

main().catch((error) => {
  console.error('SONUC: BASARISIZ');
  console.error(error.message || error);
  process.exitCode = 1;
});
