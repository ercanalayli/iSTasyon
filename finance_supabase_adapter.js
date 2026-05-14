/*
AperiON / ErpaltH iSTasyon
Finans Takvimi Supabase Adapter

Amaç:
- Finans modülünü demo veriden Supabase canlı veriye taşımak için tek standart katman.
- Mevcut index.html veya dashboard özelliklerini değiştirmez.
- Kesin kayıt akışı Onay Merkezi onayından sonra çalışır.
*/

const FINANCE_TABLES = {
  RECORDS: 'finance_calendar_records',
  CONTRACTS: 'fixed_payment_contracts',
  VARIABLE_ITEMS: 'variable_payment_items',
  MOKA: 'moka_united_movements',
  HOLIDAYS: 'turkiye_public_holidays'
};

function requireSupabaseClient(supabaseClient) {
  if (!supabaseClient || typeof supabaseClient.from !== 'function') {
    throw new Error('Supabase client bulunamadı. Önce mevcut AperiON Supabase bağlantısı geçirilmelidir.');
  }
  return supabaseClient;
}

async function listFinanceRecords(supabaseClient, filters = {}) {
  const sb = requireSupabaseClient(supabaseClient);
  let q = sb.from(FINANCE_TABLES.RECORDS).select('*').order('actual_payment_date', { ascending: true });
  if (filters.company && filters.company !== 'tümü') q = q.eq('company', filters.company);
  if (filters.record_type) q = q.eq('record_type', filters.record_type);
  if (filters.approval_status) q = q.eq('approval_status', filters.approval_status);
  if (filters.start_date) q = q.gte('actual_payment_date', filters.start_date);
  if (filters.end_date) q = q.lte('actual_payment_date', filters.end_date);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function createApprovalDraft(supabaseClient, record) {
  const sb = requireSupabaseClient(supabaseClient);
  const payload = {
    ...record,
    approval_status: record.approval_status || 'onay_bekliyor',
    status: record.status || 'taslak',
    source: record.source || 'manual'
  };
  const { data, error } = await sb.from(FINANCE_TABLES.RECORDS).insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

async function approveFinanceRecord(supabaseClient, id, approvedBy = 'user') {
  const sb = requireSupabaseClient(supabaseClient);
  const { data, error } = await sb
    .from(FINANCE_TABLES.RECORDS)
    .update({
      approval_status: 'onaylandi',
      status: 'bekliyor',
      notes: `Onaylandı: ${approvedBy}`,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function rejectFinanceRecord(supabaseClient, id, reason = '') {
  const sb = requireSupabaseClient(supabaseClient);
  const { data, error } = await sb
    .from(FINANCE_TABLES.RECORDS)
    .update({
      approval_status: 'reddedildi',
      status: 'iptal',
      notes: `Reddedildi: ${reason}`,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

async function upsertMokaMovement(supabaseClient, movement) {
  const sb = requireSupabaseClient(supabaseClient);
  const { data, error } = await sb.from(FINANCE_TABLES.MOKA).insert(movement).select('*').single();
  if (error) throw error;
  return data;
}

async function listCashflowSummary(supabaseClient, filters = {}) {
  const sb = requireSupabaseClient(supabaseClient);
  let q = sb.from('finance_cashflow_summary').select('*').order('cashflow_date', { ascending: true });
  if (filters.company && filters.company !== 'tümü') q = q.eq('company', filters.company);
  if (filters.start_date) q = q.gte('cashflow_date', filters.start_date);
  if (filters.end_date) q = q.lte('cashflow_date', filters.end_date);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

function mapRecordToDashboardRow(record) {
  return {
    company: record.company,
    type: record.record_type,
    cari: record.cari_name,
    desc: record.description || '',
    date: record.original_due_date,
    actualDate: record.actual_payment_date || record.original_due_date,
    accrualMonth: record.accrual_month,
    required: Number(record.expected_amount || 0),
    paid: Number(record.realized_amount || 0),
    remaining: Number(record.remaining_amount || 0),
    status: record.status,
    approval: record.approval_status,
    source: record.source
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    FINANCE_TABLES,
    listFinanceRecords,
    createApprovalDraft,
    approveFinanceRecord,
    rejectFinanceRecord,
    upsertMokaMovement,
    listCashflowSummary,
    mapRecordToDashboardRow
  };
}
