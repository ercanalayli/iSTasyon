/*
AperiON / ErpaltH iSTasyon
Finans Komuta Merkezi Adapter

İlk sürüm kapsamı:
- Supabase'den Komuta Merkezi kayıtlarını okur.
- Yapılacaklar / Ödenecekler / Tahsil Edilecekler olarak gruplar.
- Telegram tam bot entegrasyonu yapmaz.
*/

const COMMAND_CENTER_TABLES = {
  RECORDS: 'finance_command_center_records',
  ACTION_LOG: 'finance_command_center_action_log',
  TELEGRAM_QUEUE: 'finance_telegram_alarm_queue',
  TODAY_VIEW: 'finance_command_center_today',
  LATE_VIEW: 'finance_command_center_late',
  ALARM_VIEW: 'finance_command_center_alarm_candidates'
};

function requireSupabaseClient(supabaseClient) {
  if (!supabaseClient || typeof supabaseClient.from !== 'function') {
    throw new Error('Supabase client bulunamadı.');
  }
  return supabaseClient;
}

async function listCommandCenterRecords(supabaseClient, filters = {}) {
  const sb = requireSupabaseClient(supabaseClient);
  let q = sb.from(COMMAND_CENTER_TABLES.RECORDS).select('*').order('due_date', { ascending: true });
  if (filters.company && filters.company !== 'tümü') q = q.eq('company', filters.company);
  if (filters.core) q = q.eq('core', filters.core);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.start_date) q = q.gte('due_date', filters.start_date);
  if (filters.end_date) q = q.lte('due_date', filters.end_date);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function listTodayCommandCenter(supabaseClient, company = 'tümü') {
  const sb = requireSupabaseClient(supabaseClient);
  let q = sb.from(COMMAND_CENTER_TABLES.TODAY_VIEW).select('*').order('core', { ascending: true });
  if (company && company !== 'tümü') q = q.eq('company', company);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function listLateCommandCenter(supabaseClient, company = 'tümü') {
  const sb = requireSupabaseClient(supabaseClient);
  let q = sb.from(COMMAND_CENTER_TABLES.LATE_VIEW).select('*').order('due_date', { ascending: true });
  if (company && company !== 'tümü') q = q.eq('company', company);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

async function listAlarmCandidates(supabaseClient, company = 'tümü') {
  const sb = requireSupabaseClient(supabaseClient);
  let q = sb.from(COMMAND_CENTER_TABLES.ALARM_VIEW).select('*').order('due_date', { ascending: true });
  if (company && company !== 'tümü') q = q.eq('company', company);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

function groupCommandCenter(records) {
  return {
    tasks: records.filter(r => r.core === 'task'),
    payables: records.filter(r => r.core === 'payable'),
    receivables: records.filter(r => r.core === 'receivable'),
    late: records.filter(r => r.status === 'late'),
    alarms: records.filter(r => r.alarm_level === 'critical' || r.alarm_level === 'warning' || r.status === 'late')
  };
}

function summarizeCommandCenter(records) {
  const grouped = groupCommandCenter(records);
  return {
    task_count: grouped.tasks.length,
    payable_count: grouped.payables.length,
    payable_total: grouped.payables.reduce((a, r) => a + Number(r.amount || 0), 0),
    receivable_count: grouped.receivables.length,
    receivable_total: grouped.receivables.reduce((a, r) => a + Number(r.amount || 0), 0),
    late_count: grouped.late.length,
    alarm_count: grouped.alarms.length,
    unverified_count: records.filter(r => ['unverified','needs_approval','manual_required'].includes(r.verification)).length
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    COMMAND_CENTER_TABLES,
    listCommandCenterRecords,
    listTodayCommandCenter,
    listLateCommandCenter,
    listAlarmCandidates,
    groupCommandCenter,
    summarizeCommandCenter
  };
}
