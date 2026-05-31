// AperiON v66 - Yapı Kredi Hesap Hareketleri Parser
// Amaç: Gmail'den gelen Yapı Kredi PDF metnini satır hareketlerine çevirmek.
// Bu dosya kesin kayıt oluşturmaz. Sadece pending havuz payload üretir.

const { classifyFinanceMovement } = require('./finance_movement_classifier_v64.cjs');

const COMPANY_CODE = 'ALAYLI_MEDIKAL';
const BANK_ACCOUNT_CODE = 'YAPI_KREDI_SIRKET';
const SOURCE = 'gmail_yapikredi_pdf';

function normalizeSpaces(value) {
  return String(value || '')
    .replace(/&[#]40;/g, '(')
    .replace(/&[#]41;/g, ')')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function parseTurkishAmount(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).replace(/TL|TRY/gi, '').trim();
  const negative = raw.includes('-');
  const cleaned = raw.replace(/-/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  const number = Number(cleaned || 0);
  return negative ? -number : number;
}

function buildGroupKey(date, time) {
  return onlyDigits(date) + onlyDigits(time);
}

function buildRowKey(date, time, sequence) {
  return `${buildGroupKey(date, time)}-${String(sequence).padStart(2, '0')}`;
}

function getAccountInfo(text) {
  const clean = normalizeSpaces(text);
  const ibanMatch = clean.match(/IBAN\/Hesap No\s*:\s*([^\n]+)/i);
  const accountNameMatch = clean.match(/Hesap Adı\s*:\s*([^\n]+)/i);
  const periodMatch = clean.match(/Tarih Aralığı\s*:\s*([^\n]+)/i);
  const balanceMatch = clean.match(/Kullanılabilir Bakiye\s*:\s*([^\n]+)/i);
  return {
    account_name: accountNameMatch ? accountNameMatch[1].trim() : null,
    iban: ibanMatch ? ibanMatch[1].trim() : null,
    period: periodMatch ? periodMatch[1].trim() : null,
    available_balance_text: balanceMatch ? balanceMatch[1].trim() : null,
    available_balance: balanceMatch ? parseTurkishAmount(balanceMatch[1]) : null
  };
}

function joinBrokenDescription(lines, startIndex) {
  const first = lines[startIndex];
  const amountPattern = /(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*TL\s*(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*TL/;
  let collected = first;
  let i = startIndex;

  while (!amountPattern.test(collected) && i + 1 < lines.length) {
    i += 1;
    const next = lines[i];
    if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}\s+/.test(next)) break;
    collected += ' ' + next;
  }

  return { line: collected, endIndex: i };
}

function parseLineToTransaction(line) {
  const dateTime = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})\s+(.+)$/);
  if (!dateTime) return null;

  const date = dateTime[1];
  const time = dateTime[2];
  const rest = dateTime[3];
  const amounts = [...rest.matchAll(/(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*TL/g)];
  if (amounts.length < 2) return null;

  const amountText = amounts[amounts.length - 2][1];
  const balanceText = amounts[amounts.length - 1][1];
  const amountIndex = amounts[amounts.length - 2].index;
  const beforeAmounts = rest.slice(0, amountIndex).trim();

  const tokens = beforeAmounts.split(' ');
  const işlem = tokens[0] || 'Diğer';
  const channelStart = beforeAmounts.includes('Internet - Mobil') ? 'Internet - Mobil' : (tokens[1] || 'Diğer');
  const description = beforeAmounts
    .replace(/^Diğer\s+Diğer\s*/i, '')
    .replace(/^Diğer\s+Internet - Mobil\s*/i, '')
    .replace(/^Para Gönder\s+Internet - Mobil\s*/i, '')
    .replace(/^Para Gönder\s+Diğer\s*/i, '')
    .replace(/^Fatura Ödemesi\s+Diğer\s*/i, '')
    .trim();

  return {
    date,
    time,
    operation: işlem,
    channel: channelStart,
    description,
    amount_text: amountText,
    amount: parseTurkishAmount(amountText),
    balance_text: balanceText,
    balance: parseTurkishAmount(balanceText),
    group_key: buildGroupKey(date, time)
  };
}

function parseYapiKrediStatementText(rawText, options = {}) {
  const clean = normalizeSpaces(rawText);
  const account = getAccountInfo(clean);
  const lines = clean.split('\n').map(x => x.trim()).filter(Boolean);
  const baseRows = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}\s+/.test(lines[i])) continue;
    const joined = joinBrokenDescription(lines, i);
    const txn = parseLineToTransaction(joined.line);
    if (txn) baseRows.push(txn);
    i = Math.max(i, joined.endIndex);
  }

  const sameSecondCount = {};
  const rows = baseRows.map((row) => {
    sameSecondCount[row.group_key] = (sameSecondCount[row.group_key] || 0) + 1;
    const bank_row_key = buildRowKey(row.date, row.time, sameSecondCount[row.group_key]);
    const classified = classifyFinanceMovement({ description: row.description, amount: row.amount }, options.knownCariMap || {});
    return {
      source: SOURCE,
      company_code: COMPANY_CODE,
      bank_account_code: BANK_ACCOUNT_CODE,
      bank_account_name: account.account_name || 'ALAYLI MEDİKAL',
      iban: account.iban,
      bank_row_key,
      group_key: row.group_key,
      transaction_date: row.date,
      transaction_time: row.time,
      amount: row.amount,
      balance: row.balance,
      description: row.description,
      operation: row.operation,
      channel: row.channel,
      ...classified
    };
  });

  return { account, row_count: rows.length, rows };
}

function filterDuplicateRows(rows, processedKeys = []) {
  const processed = new Set(processedKeys);
  const pending = [];
  const duplicates = [];
  for (const row of rows) {
    if (processed.has(row.bank_row_key)) duplicates.push({ ...row, duplicate_reason: 'bank_row_key_already_processed' });
    else pending.push(row);
  }
  return { pending, duplicates };
}

module.exports = {
  COMPANY_CODE,
  BANK_ACCOUNT_CODE,
  SOURCE,
  normalizeSpaces,
  parseTurkishAmount,
  buildGroupKey,
  buildRowKey,
  parseYapiKrediStatementText,
  filterDuplicateRows
};
