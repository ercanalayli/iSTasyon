const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const { classifyBankMovement, fixMojibake } = require('./bank_posting_plan.cjs');

const args = process.argv.slice(2);
const file = value('--file', '');
const commit = args.includes('--commit');
const company = value('--firma', 'alayli');
const output = value('--out', 'data/vakifbank_statement_import_preview.json');
const url = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function value(name, fallback = '') {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

function clean(value) {
  return fixMojibake(String(value ?? '')).replace(/\s+/g, ' ').trim();
}

function dateValue(value) {
  const text = clean(value);
  const match = text.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}:\d{2}))?$/);
  return match ? { date: `${match[3]}-${match[2]}-${match[1]}`, time: match[4] || '' } : { date: '', time: '' };
}

function numberValue(value) {
  if (typeof value === 'number') return value;
  const text = clean(value).replace(/\./g, '').replace(',', '.');
  return Number(text) || 0;
}

function readStatement(input) {
  if (!input || !fs.existsSync(input)) throw new Error(`VakıfBank XLS bulunamadı: ${input || '-'}`);
  const book = XLSX.readFile(input, { cellDates: false });
  const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, defval: '' });
  const dataRows = rows.filter(row => /^\d{2}\.\d{2}\.\d{4}/.test(clean(row[2])) && clean(row[9]));
  return dataRows.map(row => {
    const account = clean(row[0]);
    const tx = dateValue(row[2]);
    const amount = numberValue(row[6]);
    const transactionNo = clean(row[9]);
    const description = clean(row[16]);
    const base = {
      company_id: company,
      source: 'vakifbank_xlsx_statement',
      mailbox: 'alaylimedikal@gmail.com',
      bank_name: 'VakifBank',
      account_name: 'VakifBank banka hesabi',
      iban_or_account_no: account,
      attachment_name: path.basename(input),
      statement_id: `vakifbank:${account}:${transactionNo}`,
      statement_period: tx.date,
      transaction_date: tx.date,
      transaction_time: tx.time,
      description: `${clean(row[5])} | ${description}`,
      amount_in: amount > 0 ? amount : 0,
      amount_out: amount < 0 ? Math.abs(amount) : 0,
      balance_after: numberValue(row[7]),
      raw_text: description,
      detected_type: clean(row[5]),
      suggested_counterparty: '',
      confidence_score: 99,
      statement_transaction_no: transactionNo,
      duplicate_key: `vakifbank:${account}:${transactionNo}`,
    };
    const plan = classifyBankMovement(base).plan;
    if (!['bank_transfer', 'bank_fee_expense'].includes(plan.kind)) {
      throw new Error(`İşlem türü güvenli otomatik kayıt için uygun değil: ${transactionNo} (${plan.type})`);
    }
    return { ...base, plan };
  });
}

function queuePayload(row) {
  return {
    ...row,
    target_account: row.plan.target_account,
    target_counterparty: row.plan.counterparty,
    suggested_category: row.plan.category,
    suggested_bizimhesap_action: row.plan.kind,
    confidence_score: row.plan.confidence,
    source_account: row.plan.source_account,
    statement_transaction_no: row.statement_transaction_no,
    auto_post_policy: 'vakifbank_batch_pos_v100',
  };
}

async function commitRows(rows) {
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY gerekli. Sadece önizleme üretildi.');
  const db = createClient(url, key, { auth: { persistSession: false } });
  const result = { inserted: 0, duplicate: 0, queued: 0, ids: [] };
  for (const row of rows) {
    const { data: existing, error: existingError } = await db.from('pending_bank_movements')
      .select('id,status').eq('duplicate_key', row.duplicate_key).limit(1);
    if (existingError) throw new Error(existingError.message);
    if (existing?.[0]) {
      result.duplicate += 1;
      result.ids.push({ transaction_no: row.statement_transaction_no, pending_id: existing[0].id, status: existing[0].status, duplicate: true });
      continue;
    }
    const insertable = { ...row };
    delete insertable.plan;
    delete insertable.statement_transaction_no;
    const { data: pending, error: insertError } = await db.from('pending_bank_movements').insert({
      ...insertable,
      status: 'approved',
      approval_note: `Açık VakıfBank POS/batch hareketi; kullanıcı onayıyla otomatik kayıt planı (${row.statement_transaction_no}).`,
      approved_at: new Date().toISOString(),
    }).select('id').single();
    if (insertError) throw new Error(insertError.message);
    result.inserted += 1;
    const { data: queue, error: queueError } = await db.from('bizimhesap_queue').insert({
      company_id: company,
      pending_bank_movement_id: pending.id,
      target_module: 'finance',
      action_type: row.plan.kind === 'bank_transfer' ? 'create_transfer' : 'create_expense',
      payload: queuePayload(row),
      status: 'ready_for_bizimhesap',
    }).select('id').single();
    if (queueError) throw new Error(queueError.message);
    result.queued += 1;
    result.ids.push({ transaction_no: row.statement_transaction_no, pending_id: pending.id, queue_id: queue.id, kind: row.plan.kind });
  }
  return result;
}

async function main() {
  const rows = readStatement(file);
  const preview = {
    created_at: new Date().toISOString(), company_id: company, source_file: path.resolve(file),
    mode: commit ? 'commit' : 'dry-run',
    rows: rows.map(row => ({ transaction_no: row.statement_transaction_no, amount_in: row.amount_in, amount_out: row.amount_out, description: row.description, plan: row.plan, duplicate_key: row.duplicate_key })),
  };
  if (commit) preview.commit_result = await commitRows(rows);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(preview, null, 2)}\n`, 'utf8');
  console.log(`VAKIFBANK_ROWS=${rows.length}`);
  console.log(`RESULT: ${commit ? 'COMMITTED' : 'PREVIEW'} - ${output}`);
}

main().catch(error => { console.error(error.message || error); process.exitCode = 1; });
