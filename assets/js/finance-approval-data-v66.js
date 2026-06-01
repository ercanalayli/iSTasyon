// AperiON v66 - Finance Approval Data Adapter
// Onay Merkezi için Supabase pending havuz okuyucu/yazıcı.
// Ledger'a direkt yazmaz. Onay işlemi sadece status alanını günceller.

(function () {
  const TABLE = 'finance_movement_pool';

  function getClient() {
    if (window.supabaseClient) return window.supabaseClient;
    if (window.supabase && typeof window.supabase.from === 'function') return window.supabase;
    return null;
  }

  function normalizeRow(row) {
    return {
      id: row.id || row.bank_row_key,
      bank_row_key: row.bank_row_key,
      transaction_date: row.transaction_date,
      transaction_time: row.transaction_time || '',
      description: row.description || '',
      amount: Number(row.amount || 0),
      movement_type: row.movement_type || 'diger',
      place: row.gider_yeri_adi || row.gelir_yeri_adi || row.center_name || 'Diğer / İnceleme Gerekli',
      counterparty_name: row.counterparty_name || 'Cari eşleşmesi bekliyor',
      confidence_score: Number(row.confidence_score || 0),
      suggestion_reason: row.suggestion_reason || 'Otomatik sınıflandırma sonucu.',
      approval_status: row.approval_status || row.status || 'pending',
      raw: row
    };
  }

  async function fetchPending() {
    const client = getClient();
    if (!client) {
      return {
        ok: false,
        reason: 'supabase_client_missing',
        message: 'Supabase bağlantısı bulunamadı. Demo veri gösteriliyor.',
        rows: []
      };
    }

    const { data, error } = await client
      .from(TABLE)
      .select('*')
      .in('approval_status', ['pending', 'needs_review'])
      .order('transaction_date', { ascending: false })
      .order('transaction_time', { ascending: false });

    if (error) {
      return { ok: false, reason: 'supabase_error', message: error.message, rows: [] };
    }

    return { ok: true, rows: (data || []).map(normalizeRow) };
  }

  async function updateStatus(rowId, status, patch = {}) {
    const client = getClient();
    if (!client) return { ok: false, reason: 'supabase_client_missing' };

    const updatePayload = {
      approval_status: status,
      status,
      ...patch
    };

    const { data, error } = await client
      .from(TABLE)
      .update(updatePayload)
      .or(`id.eq.${rowId},bank_row_key.eq.${rowId}`)
      .select();

    if (error) return { ok: false, reason: 'supabase_error', message: error.message };
    return { ok: true, data };
  }

  async function approve(rowId, patch = {}) {
    return updateStatus(rowId, 'approved', patch);
  }

  async function reject(rowId) {
    return updateStatus(rowId, 'rejected');
  }

  async function hold(rowId) {
    return updateStatus(rowId, 'needs_review');
  }

  window.AperionFinanceApprovalData = {
    fetchPending,
    approve,
    reject,
    hold,
    normalizeRow
  };
})();
