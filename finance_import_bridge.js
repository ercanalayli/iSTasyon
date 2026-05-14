/*
AperiON / ErpaltH iSTasyon
Finans Takvimi ve Nakit Akışı Merkezi - Import Bridge

Amaç:
- BizimHesap bot/rapor çıktılarından gelen ham hareketleri standart finans kayıtlarına çevirmek.
- Hiçbir hareketi direkt kesin kayıt yapmamak.
- Önce Onay Merkezi mantığıyla approval_status='onay_bekliyor' olarak işaretlemek.

Bu dosya mevcut index.html dosyasını değiştirmez.
Node.js tarafında veya browser tarafında yardımcı modül olarak kullanılabilir.
*/

const APERION_COMPANIES = ['alayli', 'woodlet', 'elit', 'odyoform', 'alkam', 'yenicespor'];

const FINANCE_TYPES = {
  TAHSILAT: 'tahsilat',
  ODEME: 'odeme',
  GIDER: 'gider',
  SABIT_ODEME: 'sabit_odeme',
  DEGISKEN_ODEME: 'degisken_odeme',
  CEK_SENET: 'cek_senet',
  KREDI_KARTI: 'kredi_karti',
  VERGI_SGK: 'vergi_sgk',
  MOKA: 'moka_united',
  BANKA_TRANSFERI: 'banka_transferi'
};

const TURKIYE_PUBLIC_HOLIDAYS_2026 = new Set([
  '2026-01-01',
  '2026-03-20', '2026-03-21', '2026-03-22',
  '2026-04-23',
  '2026-05-01',
  '2026-05-19',
  '2026-05-27', '2026-05-28', '2026-05-29', '2026-05-30',
  '2026-07-15',
  '2026-08-30',
  '2026-10-29'
]);

function normalizeText(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
    .trim();
}

function toIsoDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const tr = raw.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (tr) {
    const [, dd, mm, yyyy] = tr;
    return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function toNumber(value) {
  if (typeof value === 'number') return value;
  const raw = String(value || '0')
    .replace(/TL/gi, '')
    .replace(/₺/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

function isWeekend(isoDate) {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.getDay() === 0 || d.getDay() === 6;
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function nextBusinessDay(isoDate) {
  let d = isoDate;
  while (isWeekend(d) || TURKIYE_PUBLIC_HOLIDAYS_2026.has(d)) {
    d = addDays(d, 1);
  }
  return d;
}

function inferRecordType(raw) {
  const text = normalizeText([raw.description, raw.cari_name, raw.category, raw.account_name].join(' '));
  if (text.includes('moka') || text.includes('pos') || text.includes('kredi kart tahsilat')) return FINANCE_TYPES.MOKA;
  if (text.includes('cek') || text.includes('senet')) return FINANCE_TYPES.CEK_SENET;
  if (text.includes('kredi kart') || text.includes('axess') || text.includes('adios') || text.includes('world') || text.includes('maximum')) return FINANCE_TYPES.KREDI_KARTI;
  if (text.includes('sgk') || text.includes('vergi') || text.includes('muhtasar') || text.includes('kdv')) return FINANCE_TYPES.VERGI_SGK;
  if (text.includes('kira') || text.includes('maas') || text.includes('aidat') || text.includes('abonelik')) return FINANCE_TYPES.SABIT_ODEME;
  if (toNumber(raw.incoming_amount || raw.alacak || raw.credit) > 0) return FINANCE_TYPES.TAHSILAT;
  if (toNumber(raw.outgoing_amount || raw.borc || raw.debit) > 0) return FINANCE_TYPES.ODEME;
  return FINANCE_TYPES.DEGISKEN_ODEME;
}

function confidenceFor(raw, type) {
  let score = 40;
  const reason = [];
  if (raw.cari_name || raw.customer_name || raw.supplier_name) { score += 20; reason.push('cari adı bulundu'); }
  if (toIsoDate(raw.date || raw.due_date || raw.transaction_date)) { score += 15; reason.push('tarih okunabildi'); }
  if (toNumber(raw.amount || raw.incoming_amount || raw.outgoing_amount || raw.alacak || raw.borc || raw.credit || raw.debit) > 0) { score += 15; reason.push('tutar okunabildi'); }
  if ([FINANCE_TYPES.MOKA, FINANCE_TYPES.CEK_SENET, FINANCE_TYPES.KREDI_KARTI, FINANCE_TYPES.VERGI_SGK].includes(type)) { score += 10; reason.push('anahtar kelime ile tür belirlendi'); }
  return { score: Math.min(score, 100), reason: reason.join(', ') || 'ham kayıt genel kuralla sınıflandı' };
}

function normalizeFinanceRecord(raw, fallbackCompany = 'alayli') {
  const company = APERION_COMPANIES.includes(raw.company) ? raw.company : fallbackCompany;
  const recordType = inferRecordType(raw);
  const date = toIsoDate(raw.due_date || raw.date || raw.transaction_date) || new Date().toISOString().slice(0, 10);
  const incoming = toNumber(raw.incoming_amount || raw.alacak || raw.credit);
  const outgoing = toNumber(raw.outgoing_amount || raw.borc || raw.debit);
  const amount = toNumber(raw.amount) || incoming || outgoing;
  const isIncome = recordType === FINANCE_TYPES.TAHSILAT || recordType === FINANCE_TYPES.MOKA;
  const actualDate = [FINANCE_TYPES.CEK_SENET, FINANCE_TYPES.KREDI_KARTI, FINANCE_TYPES.VERGI_SGK, FINANCE_TYPES.ODEME, FINANCE_TYPES.SABIT_ODEME, FINANCE_TYPES.DEGISKEN_ODEME].includes(recordType)
    ? nextBusinessDay(date)
    : date;
  const confidence = confidenceFor(raw, recordType);
  return {
    company,
    record_type: isIncome && recordType === FINANCE_TYPES.MOKA ? FINANCE_TYPES.TAHSILAT : recordType,
    status: confidence.score >= 85 ? 'bekliyor' : 'taslak',
    cari_name: raw.cari_name || raw.customer_name || raw.supplier_name || raw.account_name || 'Eşleşmeyen Cari',
    cari_code: raw.cari_code || null,
    description: raw.description || raw.note || raw.explanation || '',
    original_due_date: date,
    actual_payment_date: actualDate,
    accrual_month: raw.accrual_month || null,
    expected_amount: amount,
    realized_amount: raw.is_realized ? amount : 0,
    source: raw.source || 'bizimhesap_import_bridge',
    source_ref: raw.source_ref || raw.id || null,
    approval_status: 'onay_bekliyor',
    confidence_score: confidence.score,
    match_reason: confidence.reason,
    document_url: raw.document_url || null,
    notes: raw.notes || null
  };
}

function buildApprovalQueue(rawRows, fallbackCompany = 'alayli') {
  return rawRows.map((raw, index) => ({
    temp_id: `FIN-${String(index + 1).padStart(5, '0')}`,
    ...normalizeFinanceRecord(raw, fallbackCompany)
  }));
}

function summarizeQueue(records) {
  return records.reduce((acc, r) => {
    const key = `${r.company}_${r.record_type}`;
    acc.count += 1;
    acc.total += Number(r.expected_amount || 0);
    acc.by_type[key] = acc.by_type[key] || { count: 0, total: 0 };
    acc.by_type[key].count += 1;
    acc.by_type[key].total += Number(r.expected_amount || 0);
    if (r.confidence_score < 85) acc.needs_review += 1;
    return acc;
  }, { count: 0, total: 0, needs_review: 0, by_type: {} });
}

if (typeof module !== 'undefined') {
  module.exports = {
    APERION_COMPANIES,
    FINANCE_TYPES,
    normalizeFinanceRecord,
    buildApprovalQueue,
    summarizeQueue,
    nextBusinessDay
  };
}
