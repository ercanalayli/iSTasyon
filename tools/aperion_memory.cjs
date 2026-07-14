const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MEMORY_DIR = path.join(ROOT, 'data');
const LOG_FILE = path.join(MEMORY_DIR, 'aperion_transaction_log.txt');

const DEFAULT_EXPENSE_CARDS = [
  'Kira',
  'Elektrik',
  'Su',
  'Isinma',
  'Iletisim',
  'Aidat',
  'Personel Maas',
  'Personel Yemek',
  'Personel Prim',
  'Personel Yol Parasi',
  'Vergi / SGK',
  'Banka Masrafi',
  'Kargo / Nakliye',
  'Arac Yakit',
  'Market - Mutfak',
  'Market - Temizlik',
  'Urun Alis',
  'Satis Iadesi / Ters Kayit',
  'Diger - Kontrol',
];

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return fallback;
  }
}

function uniqueStrings(values) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
}

function loadAperionMemory() {
  const scope = readJson(path.join(ROOT, 'config', 'aperion_intelligence_scope.json'), {});
  const financeRules = readJson(path.join(ROOT, 'config', 'aperion_finance_rules.json'), {});
  const expenseStatus = readJson(path.join(MEMORY_DIR, 'aperion_expense_memory_status.json'), {});
  const configuredCards = Array.isArray(financeRules.expense_cards) ? financeRules.expense_cards : [];
  const expenseCardNames = uniqueStrings([...DEFAULT_EXPENSE_CARDS, ...configuredCards]);
  const gotchaRules = Array.isArray(financeRules.gotcha_rules)
    ? financeRules.gotcha_rules
    : ['personal_or_family_review', 'return_is_not_expense', 'stock_purchase_not_expense', 'duplicate_review'];

  return {
    dir: MEMORY_DIR,
    config: {
      active_company: scope.active_company || scope.active_company_name || 'ALAYLI Medikal',
      active_company_id: scope.active_company_id || 'alayli',
      expense_memory_status: expenseStatus.status || 'not_initialized',
    },
    gotchaRules,
    expenseCardNames,
  };
}

function appendTransactionLog(line) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
  fs.appendFileSync(LOG_FILE, `${String(line || '').trim()}\n`, 'utf8');
}

module.exports = { loadAperionMemory, appendTransactionLog };
