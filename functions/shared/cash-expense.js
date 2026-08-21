function clean(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function fold(value) {
  return clean(value)
    .replace(/\u00c3\u00b6/g, 'o')
    .replace(/\u00c3\u0096/g, 'O')
    .replace(/\u00c3\u00bc/g, 'u')
    .replace(/\u00c3\u00a7/g, 'c')
    .replace(/\u00c4\u009f/g, 'g')
    .replace(/\u00c5\u009f/g, 's')
    .replace(/\u00c4\u00b1/g, 'i')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0131/g, 'i');
}

function parseMoney(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  let normalized = text;
  if (text.includes(',') && text.includes('.')) normalized = text.replace(/\./g, '').replace(',', '.');
  else if (text.includes(',')) normalized = text.replace(',', '.');
  else if (/^\d{1,3}(?:\.\d{3})+$/.test(text)) normalized = text.replace(/\./g, '');
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null;
}

function istanbulDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const get = type => parts.find(part => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

const ACCOUNT_ALIASES = Object.freeze({
  'ercan nakit kasa': 'ercan nakit',
  'ercan nakit': 'ercan nakit'
});

const EXPENSE_CATEGORIES = Object.freeze([
  { test: /\b(yemek|lokanta|restoran|personel yemegi)\b/, category: 'Yemek', description: 'Yemek \u00f6demesi' }
]);

export function parseCashExpenseIntent(text, now = new Date()) {
  const rawText = clean(text);
  const folded = fold(rawText);
  if (!rawText || /\b(kasaya|hesaba)\b.*\b(transfer|aktar)/.test(folded)) return null;

  const amountMatch = rawText.match(/(\d[\d.,]*)\s*(?:TL|TRY)\b/iu);
  if (!amountMatch || !/\b(?:odeme|gider|masraf)/.test(folded)) return null;

  const amount = parseMoney(amountMatch[1]);
  if (!amount) return null;

  const accountAlias = Object.keys(ACCOUNT_ALIASES).find(alias => folded.startsWith(alias));
  if (!accountAlias || !folded.slice(accountAlias.length).match(/^(?:dan|'dan|\u2019dan|\s+hesaptan)\b/)) return null;
  const sourceCandidate = rawText.slice(0, accountAlias.length);
  const canonicalAccount = ACCOUNT_ALIASES[accountAlias] || null;
  const categoryRule = EXPENSE_CATEGORIES.find(rule => rule.test.test(folded));
  if (!canonicalAccount || !categoryRule) return null;

  return {
    type: 'cash_expense_command',
    source_account_candidate: sourceCandidate,
    source_account: canonicalAccount,
    expense_category: categoryRule.category,
    description: categoryRule.description,
    amount,
    currency: 'TRY',
    transaction_date: istanbulDate(now),
    raw_text: rawText,
    requires_approval: true,
    creates_finance_record: true,
    sends_to_bizimhesap: false
  };
}

export const cashExpenseInternals = { clean, fold, parseMoney, istanbulDate };
export function debugCashExpenseIntent(text) {
  const rawText = clean(text);
  const folded = fold(rawText);
  const amountMatch = rawText.match(/(\d[\d.,]*)\s*(?:TL|TRY)\b/iu);
  const accountAlias = Object.keys(ACCOUNT_ALIASES).find(alias => folded.startsWith(alias));
  return { rawText, folded, amount: amountMatch?.[1] || null, expense: /\b(?:odeme|gider|masraf)/.test(folded), accountAlias: accountAlias || null, suffix: accountAlias ? folded.slice(accountAlias.length) : null, category: EXPENSE_CATEGORIES.find(rule => rule.test.test(folded))?.category || null };
}
