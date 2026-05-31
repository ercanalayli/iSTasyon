// AperiON v66 - Finance Pool Pending Writer
// Amaç: parser çıktısını Onay Merkezi pending havuzuna yazılacak standart payload'a çevirmek.
// Bu servis ledger'a yazmaz. Kesin kayıt oluşturmaz.

const { filterDuplicateRows } = require('./yapikredi_statement_parser_v66.cjs');

const DEFAULT_STATUS_PENDING = 'pending';
const DEFAULT_STATUS_REVIEW = 'needs_review';

function toIsoDateTr(dateValue) {
  const value = String(dateValue || '').trim();
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return value;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function normalizeApprovalStatus(row) {
  if (row.approval_status === DEFAULT_STATUS_REVIEW) return DEFAULT_STATUS_REVIEW;
  if (Number(row.confidence_score || 0) < 70) return DEFAULT_STATUS_REVIEW;
  return DEFAULT_STATUS_PENDING;
}

function buildFinancePoolPayload(row, extra = {}) {
  const approvalStatus = normalizeApprovalStatus(row);

  return {
    source: row.source || 'gmail_yapikredi_pdf',
    company_code: row.company_code || 'ALAYLI_MEDIKAL',
    bank_row_key: row.bank_row_key,
    bank_account_code: row.bank_account_code || 'YAPI_KREDI_SIRKET',
    bank_account_name: row.bank_account_name || 'YAPI KREDİ ŞİRKET',
    iban: row.iban || null,
    transaction_date: toIsoDateTr(row.transaction_date),
    transaction_time: row.transaction_time || null,
    amount: Number(row.amount || 0),
    balance: row.balance === undefined || row.balance === null ? null : Number(row.balance),
    description: row.description || '',
    operation: row.operation || null,
    channel: row.channel || null,
    movement_direction: row.movement_direction || (Number(row.amount || 0) >= 0 ? 'giris' : 'cikis'),
    movement_type: row.movement_type || 'diger',
    counterparty_name: row.counterparty_name || null,
    counterparty_cari_id: row.counterparty_cari_id || null,
    counterparty_cari_status: row.counterparty_cari_status || 'not_matched',
    center_type: row.center_type || 'bekleyen_eslesme',
    center_name: row.center_name || row.gider_yeri_adi || row.gelir_yeri_adi || 'Diğer / İnceleme Gerekli',
    gider_yeri_id: row.gider_yeri_id || null,
    gider_yeri_adi: row.gider_yeri_adi || null,
    gelir_yeri_id: row.gelir_yeri_id || null,
    gelir_yeri_adi: row.gelir_yeri_adi || null,
    confidence_score: Number(row.confidence_score || 0),
    suggestion_reason: row.suggestion_reason || 'Otomatik sınıflandırma sonucu.',
    approval_status: approvalStatus,
    status: approvalStatus,
    raw_payload: {
      group_key: row.group_key || null,
      source_message_id: extra.source_message_id || null,
      source_subject: extra.source_subject || null,
      source_attachment_name: extra.source_attachment_name || null
    }
  };
}

function buildPendingInsertBatch(parsedStatement, options = {}) {
  const processedKeys = options.processedBankRowKeys || [];
  const filtered = filterDuplicateRows(parsedStatement.rows || [], processedKeys);

  const pendingPayloads = filtered.pending.map(row => buildFinancePoolPayload(row, options.source || {}));
  const duplicatePayloads = filtered.duplicates.map(row => ({
    bank_row_key: row.bank_row_key,
    duplicate_reason: row.duplicate_reason,
    transaction_date: toIsoDateTr(row.transaction_date),
    transaction_time: row.transaction_time,
    amount: row.amount,
    description: row.description
  }));

  return {
    account: parsedStatement.account || {},
    total_rows: parsedStatement.row_count || 0,
    pending_count: pendingPayloads.length,
    duplicate_count: duplicatePayloads.length,
    pending: pendingPayloads,
    duplicates: duplicatePayloads
  };
}

async function insertPendingBatch(supabaseClient, batch) {
  if (!supabaseClient) throw new Error('supabaseClient is required');
  if (!batch || !Array.isArray(batch.pending)) throw new Error('pending batch is invalid');
  if (batch.pending.length === 0) return { inserted: 0, skipped: batch.duplicate_count || 0, data: [] };

  const { data, error } = await supabaseClient
    .from('finance_movement_pool')
    .upsert(batch.pending, { onConflict: 'bank_row_key', ignoreDuplicates: true })
    .select();

  if (error) throw error;
  return { inserted: Array.isArray(data) ? data.length : 0, skipped: batch.duplicate_count || 0, data };
}

module.exports = {
  buildFinancePoolPayload,
  buildPendingInsertBatch,
  insertPendingBatch
};
