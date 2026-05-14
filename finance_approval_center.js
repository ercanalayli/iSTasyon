/*
AperiON / ErpaltH iSTasyon
Finans Onay Merkezi Modeli

Amaç:
- Finans Takvimi kayıtları direkt kesinleşmesin.
- BizimHesap, satış raporu, banka ekstresi, Moka United, çek/senet gibi kaynaklardan gelen kayıtlar önce onaya düşsün.
- Kullanıcı onay verirse finance_calendar_records tablosuna kesin kayıt olarak işlenir.
*/

const APPROVAL_STATUS = {
  WAITING: 'onay_bekliyor',
  APPROVED: 'onaylandi',
  REJECTED: 'reddedildi',
  NEEDS_REVIEW: 'kontrol_gerekli'
};

function makeApprovalItem(record) {
  return {
    temp_id: record.temp_id || cryptoRandomId(),
    company: record.company,
    record_type: record.record_type,
    cari_name: record.cari_name,
    description: record.description || '',
    original_due_date: record.original_due_date,
    actual_payment_date: record.actual_payment_date || record.original_due_date,
    accrual_month: record.accrual_month || null,
    expected_amount: Number(record.expected_amount || 0),
    realized_amount: Number(record.realized_amount || 0),
    source: record.source || 'manual',
    source_ref: record.source_ref || null,
    confidence_score: Number(record.confidence_score || 0),
    match_reason: record.match_reason || 'eşleşme sebebi belirtilmedi',
    approval_status: record.confidence_score >= 85 ? APPROVAL_STATUS.WAITING : APPROVAL_STATUS.NEEDS_REVIEW,
    created_at: new Date().toISOString()
  };
}

function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'approval-' + Math.random().toString(36).slice(2) + Date.now();
}

function splitApprovalQueue(records) {
  const waiting = [];
  const needsReview = [];
  records.map(makeApprovalItem).forEach(item => {
    if (item.approval_status === APPROVAL_STATUS.WAITING) waiting.push(item);
    else needsReview.push(item);
  });
  return { waiting, needsReview };
}

function approvalSummary(queue) {
  const all = [...(queue.waiting || []), ...(queue.needsReview || [])];
  return all.reduce((acc, item) => {
    acc.count += 1;
    acc.total_expected += Number(item.expected_amount || 0);
    acc.total_realized += Number(item.realized_amount || 0);
    acc.total_remaining += Math.max(Number(item.expected_amount || 0) - Number(item.realized_amount || 0), 0);
    acc.by_company[item.company] = acc.by_company[item.company] || { count: 0, total_expected: 0 };
    acc.by_company[item.company].count += 1;
    acc.by_company[item.company].total_expected += Number(item.expected_amount || 0);
    acc.by_source[item.source] = acc.by_source[item.source] || { count: 0, total_expected: 0 };
    acc.by_source[item.source].count += 1;
    acc.by_source[item.source].total_expected += Number(item.expected_amount || 0);
    return acc;
  }, { count: 0, total_expected: 0, total_realized: 0, total_remaining: 0, by_company: {}, by_source: {} });
}

function approveItem(item, approvedBy = 'user') {
  return {
    ...item,
    approval_status: APPROVAL_STATUS.APPROVED,
    approved_by: approvedBy,
    approved_at: new Date().toISOString()
  };
}

function rejectItem(item, reason = '') {
  return {
    ...item,
    approval_status: APPROVAL_STATUS.REJECTED,
    reject_reason: reason,
    rejected_at: new Date().toISOString()
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    APPROVAL_STATUS,
    makeApprovalItem,
    splitApprovalQueue,
    approvalSummary,
    approveItem,
    rejectItem
  };
}
