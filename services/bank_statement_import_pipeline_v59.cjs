require('dotenv').config();
const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { parseBankStatement } = require('./bank_statement_parser_v59.cjs');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function fileFingerprint(filePath) {
  const buffer = fs.readFileSync(filePath);
  return sha256Buffer(buffer);
}

function toDateOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function createBatch({ company, sourceChannel, sourceAccount, documentId, driveFileId, fileName, fingerprint, detectedBank, metadata }) {
  const { data, error } = await db.rpc('create_processing_batch_v59', {
    p_company: company,
    p_source_channel: sourceChannel,
    p_source_account: sourceAccount || null,
    p_document_id: documentId || null,
    p_drive_file_id: driveFileId || null,
    p_file_name: fileName,
    p_file_fingerprint: fingerprint,
    p_detected_bank: detectedBank || null,
    p_metadata: metadata || {},
  });
  if (error) throw error;
  return data;
}

async function insertTransaction({ company, batchId, documentId, rowIndex, tx, bankName }) {
  const { data, error } = await db.rpc('upsert_bank_transaction_raw_v59', {
    p_company: company,
    p_batch_id: batchId,
    p_document_id: documentId || null,
    p_row_index: rowIndex,
    p_transaction_date: toDateOrNull(tx.transaction_date),
    p_bank_name: bankName || null,
    p_description: tx.description || '',
    p_raw_line: tx.raw_line || '',
    p_amount: tx.amount === null || tx.amount === undefined ? null : Number(tx.amount),
    p_balance: tx.balance === null || tx.balance === undefined ? null : Number(tx.balance),
    p_direction: tx.direction || 'unknown',
    p_currency: tx.currency || 'TRY',
    p_parse_confidence: tx.confidence || tx.parse_confidence || 0,
  });
  if (error) throw error;
  return data;
}

async function importBankStatement(filePath, options = {}) {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  const company = options.company || 'alayli';
  const sourceChannel = options.sourceChannel || 'manual';
  const sourceAccount = options.sourceAccount || null;
  const documentId = options.documentId || null;
  const driveFileId = options.driveFileId || null;
  const fingerprint = fileFingerprint(filePath);

  const parsed = await parseBankStatement(filePath);
  const batchId = await createBatch({
    company,
    sourceChannel,
    sourceAccount,
    documentId,
    driveFileId,
    fileName: parsed.source_file,
    fingerprint,
    detectedBank: parsed.bank_name,
    metadata: {
      parser: 'bank_statement_parser_v59',
      transaction_count: parsed.transaction_count,
      text_preview: parsed.text_preview,
    },
  });

  let inserted = 0;
  let duplicateOrUpdated = 0;
  const transactionIds = [];

  for (let i = 0; i < parsed.transactions.length; i++) {
    const id = await insertTransaction({
      company,
      batchId,
      documentId,
      rowIndex: i + 1,
      tx: parsed.transactions[i],
      bankName: parsed.bank_name,
    });
    transactionIds.push(id);
    inserted++;
  }

  const { error: updateError } = await db
    .from('aperion_processing_batches_v59')
    .update({
      status: 'parsed',
      row_count: parsed.transactions.length,
      parsed_count: inserted,
      duplicate_count: duplicateOrUpdated,
      processed_at: new Date().toISOString(),
    })
    .eq('id', batchId);
  if (updateError) throw updateError;

  return {
    batch_id: batchId,
    file_fingerprint: fingerprint,
    bank_name: parsed.bank_name,
    transaction_count: parsed.transaction_count,
    inserted_count: inserted,
    transaction_ids: transactionIds,
  };
}

function parseArgs(argv) {
  const args = { filePath: argv[2] };
  for (let i = 3; i < argv.length; i++) {
    const [k, v] = argv[i].split('=');
    if (k === '--company') args.company = v;
    if (k === '--source') args.sourceChannel = v;
    if (k === '--account') args.sourceAccount = v;
    if (k === '--document') args.documentId = v;
    if (k === '--drive') args.driveFileId = v;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.filePath) {
    console.error('Usage: node services/bank_statement_import_pipeline_v59.cjs <file> --company=alayli --source=manual');
    process.exit(1);
  }
  const result = await importBankStatement(args.filePath, args);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { importBankStatement, fileFingerprint };
