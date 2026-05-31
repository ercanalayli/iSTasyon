// AperiON v63 - Yapı Kredi Transaction Key Helper
// Rule owner: Ercan Alayli
// Purpose: Prevent duplicate bank movements even if the same date range is sent again.
// Critical: Yapı Kredi can have multiple rows at the exact same date/time.
// Therefore date+time is the group key; row sequence creates the final row key.

const BANK_CODE = 'YAPI_KREDI';
const COMPANY_CODE = 'ALAYLI_MEDIKAL';
const IBAN = 'TR500006701000000077455056';

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function buildYapiKrediGroupKey(dateText, timeText) {
  // Example: 26/05/2026 + 09:27:53 => 26052026092753
  const dateDigits = onlyDigits(dateText);
  const timeDigits = onlyDigits(timeText);

  if (dateDigits.length !== 8 || timeDigits.length !== 6) {
    throw new Error(`Invalid Yapı Kredi date/time key: ${dateText} ${timeText}`);
  }

  return `${dateDigits}${timeDigits}`;
}

function buildYapiKrediRowKey(dateText, timeText, rowSequence = 1) {
  const groupKey = buildYapiKrediGroupKey(dateText, timeText);
  const suffix = String(rowSequence).padStart(2, '0');
  return `${groupKey}-${suffix}`;
}

function buildYapiKrediRecordIdentity({
  dateText,
  timeText,
  rowSequence = 1,
  amount,
  balance,
  description
}) {
  const groupKey = buildYapiKrediGroupKey(dateText, timeText);
  const rowKey = buildYapiKrediRowKey(dateText, timeText, rowSequence);

  return {
    bank_code: BANK_CODE,
    company_code: COMPANY_CODE,
    iban: IBAN,
    bank_group_key: groupKey,
    bank_row_key: rowKey,
    row_sequence: rowSequence,
    amount,
    balance,
    description
  };
}

module.exports = {
  BANK_CODE,
  COMPANY_CODE,
  IBAN,
  buildYapiKrediGroupKey,
  buildYapiKrediRowKey,
  buildYapiKrediRecordIdentity
};
