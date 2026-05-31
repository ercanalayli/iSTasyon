// AperiON v62 Finance Fingerprint Helper
// Standard transaction fingerprint for bank/Gmail/Telegram movement pool.
// This helper does not mutate live data.

const crypto = require('crypto');

const ACTIVE_COMPANY = 'ALAYLI_MEDIKAL';

function normalizeAmount(amount) {
  const numeric = Number(String(amount || '0').replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(numeric)) return '0.00';
  return Math.abs(numeric).toFixed(2);
}

function normalizeDescription(description) {
  return String(description || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, '')
    .trim();
}

function generateTransactionFingerprint({
  companyCode = ACTIVE_COMPANY,
  transactionDate,
  amount,
  description
}) {
  if (companyCode !== ACTIVE_COMPANY) {
    throw new Error('Only ALAYLI_MEDIKAL is active for finance pool.');
  }
  if (!transactionDate) throw new Error('transactionDate is required');

  const cleanAmount = normalizeAmount(amount);
  const cleanDesc = normalizeDescription(description);
  const raw = `${companyCode}_${transactionDate}_${cleanAmount}_${cleanDesc}`;

  return crypto.createHash('sha256').update(raw).digest('hex');
}

function buildPendingFinanceRecord({
  source,
  transactionDate,
  amount,
  description,
  documentUrl = null,
  companyCode = ACTIVE_COMPANY
}) {
  const transaction_fingerprint = generateTransactionFingerprint({
    companyCode,
    transactionDate,
    amount,
    description
  });

  return {
    source,
    company_code: companyCode,
    transaction_date: transactionDate,
    amount: Number(String(amount || '0').replace(/\./g, '').replace(',', '.')),
    description: description || null,
    document_url: documentUrl,
    transaction_fingerprint,
    status: 'pending'
  };
}

module.exports = {
  ACTIVE_COMPANY,
  normalizeAmount,
  normalizeDescription,
  generateTransactionFingerprint,
  buildPendingFinanceRecord
};
