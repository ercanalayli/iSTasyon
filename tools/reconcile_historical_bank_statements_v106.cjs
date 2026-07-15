const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const { classifyBankMovement, fixMojibake } = require('./bank_posting_plan.cjs');

const args = process.argv.slice(2);
const root = value('--dir', 'inbox/banka-ekstreleri');
const output = value('--out', 'bank_exports/historical_bank_reconciliation_v106.json');
const company = value('--firma', process.env.COMPANY_ID || 'alayli');
const url = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function value(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function clean(value) {
  return fixMojibake(String(value ?? '')).replace(/\s+/g, ' ').trim();
}

function numberValue(value) {
  if (typeof value === 'number') return value;
  return Number(clean(value).replace(/\./g, '').replace(',', '.')) || 0;
}

function dateValue(value) {
  const match = clean(value).match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}:\d{2}))?$/);
  return match ? { date: `${match[3]}-${match[2]}-${match[1]}`, time: match[4] || '' } : null;
}

function filesIn(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(full) : [full];
  }).filter(file => /\.(xlsx|xls|csv|pdf)$/i.test(file));
}

function parseVakifXlsx(file) {
  const book = XLSX.readFile(file, { cellDates: false });
  const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, defval: '' });
  const candidates = rows.filter(row => dateValue(row[2]) && clean(row[9]));
  if (!candidates.length) return [];
  return candidates.map(row => {
    const tx = dateValue(row[2]);
    const account = clean(row[0]);
    const transactionNo = clean(row[9]);
    const signedAmount = numberValue(row[6]);
    return {
      bank_name: 'VakifBank',
      account_name: '*VAKIF SIRKET',
      transaction_date: tx.date,
      transaction_time: tx.time,
      statement_transaction_no: transactionNo,
      duplicate_key: `vakifbank:${account}:${transactionNo}`,
      amount_in: signedAmount > 0 ? signedAmount : 0,
      amount_out: signedAmount < 0 ? Math.abs(signedAmount) : 0,
      balance_after: numberValue(row[7]),
      description: `${clean(row[5])} | ${clean(row[16])}`,
      attachment_name: path.basename(file),
      source: 'vakifbank_xlsx_statement',
    };
  });
}

function inspectFile(file) {
  const extension = path.extname(file).toLowerCase();
  if (extension === '.pdf') return { file, adapter: 'pdf_adapter_required', rows: [] };
  try {
    const rows = parseVakifXlsx(file);
    return rows.length
      ? { file, adapter: 'vakifbank_xlsx_v106', rows }
      : { file, adapter: 'format_adapter_required', rows: [] };
  } catch (error) {
    return { file, adapter: 'read_failed', rows: [], error: error.message };
  }
}

async function fetchEvidence(db, duplicateKeys) {
  if (!db || !duplicateKeys.length) return new Map();
  const evidence = new Map();
  for (let start = 0; start < duplicateKeys.length; start += 100) {
    const keys = duplicateKeys.slice(start, start + 100);
    const { data: pending, error } = await db.from('pending_bank_movements')
      .select('id,duplicate_key,status,transaction_date,amount_in,amount_out')
      .eq('company_id', company).in('duplicate_key', keys);
    if (error) throw new Error(`AperiON banka kayitlari okunamadi: ${error.message}`);
    const ids = (pending || []).map(row => row.id);
    const queues = ids.length ? await db.from('bizimhesap_queue')
      .select('id,pending_bank_movement_id,status,result_message,processed_at')
      .in('pending_bank_movement_id', ids) : { data: [], error: null };
    if (queues.error) throw new Error(`BizimHesap kuyrugu okunamadi: ${queues.error.message}`);
    const byPending = new Map((queues.data || []).map(row => [row.pending_bank_movement_id, row]));
    for (const row of pending || []) evidence.set(row.duplicate_key, { pending: row, queue: byPending.get(row.id) || null });
  }
  return evidence;
}

function decision(row, evidence) {
  const trace = evidence.get(row.duplicate_key);
  if (trace?.queue?.status === 'processed') return { status: 'bizimhesap_islenmis', reason: 'AperiON kuyrugu processed; tekrar kayit yok.', queue_id: trace.queue.id };
  if (trace?.queue) return { status: 'bizimhesap_kuyrukta', reason: `Kuyruk durumu: ${trace.queue.status}`, queue_id: trace.queue.id };
  if (trace?.pending) return { status: 'aperionda_bekliyor', reason: `AperiON banka kaydi: ${trace.pending.status}`, pending_id: trace.pending.id };
  const plan = classifyBankMovement(row).plan;
  if (!plan.requires_user_review && plan.recording_confidence >= 90) return { status: 'guvenli_isleme_adayi', reason: `${plan.type}; kanitli kaynak ve ${plan.recording_confidence}/100 kayit guveni.`, plan };
  return { status: 'inceleme_gerekli', reason: plan.confirmation_question || 'Kayit turu veya karsi taraf net degil.', plan };
}

async function main() {
  const files = filesIn(root);
  const inspected = files.map(inspectFile);
  const rows = inspected.flatMap(item => item.rows);
  const db = key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  const evidence = await fetchEvidence(db, rows.map(row => row.duplicate_key));
  const decisions = rows.map(row => ({ ...row, reconciliation: decision(row, evidence) }));
  const summary = decisions.reduce((out, row) => {
    const key = row.reconciliation.status;
    out[key] = (out[key] || 0) + 1;
    return out;
  }, { files: files.length, parsed_rows: rows.length, adapter_required: inspected.filter(item => item.adapter.includes('required')).length });
  const report = { created_at: new Date().toISOString(), company_id: company, mode: 'read_only_dry_run', root: path.resolve(root), summary, files: inspected.map(item => ({ file: path.relative(root, item.file), adapter: item.adapter, rows: item.rows.length, error: item.error || '' })), decisions };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`RESULT: DRY - files=${summary.files} parsed=${summary.parsed_rows} processed=${summary.bizimhesap_islenmis || 0} candidates=${summary.guvenli_isleme_adayi || 0} review=${summary.inceleme_gerekli || 0}`);
  console.log(`REPORT: ${output}`);
}

main().catch(error => { console.error(error.message || error); process.exitCode = 1; });
