export function normalizePending(row){
  const text = value => fixMojibake(value || '');
  return {
    company_id: row.company_id || 'alayli',
    source: text(row.source || 'gmail_bank_statement'),
    mailbox: text(row.mailbox || 'alaylimedikal@gmail.com'),
    bank_name: text(row.bank_name),
    account_name: text(row.account_name),
    iban_or_account_no: text(row.iban_or_account_no),
    mail_id: text(row.mail_id),
    mail_subject: text(row.mail_subject),
    mail_from: text(row.mail_from),
    mail_date: text(row.mail_date),
    attachment_name: text(row.attachment_name),
    statement_id: text(row.statement_id),
    statement_period: text(row.statement_period),
    transaction_date: row.transaction_date || null,
    transaction_time: text(row.transaction_time),
    value_date: row.value_date || null,
    description: text(row.description),
    amount_in: Number(row.amount_in || 0),
    amount_out: Number(row.amount_out || 0),
    balance_after: row.balance_after == null ? null : Number(row.balance_after),
    raw_text: text(row.raw_text),
    detected_type: text(row.detected_type),
    suggested_counterparty: text(row.suggested_counterparty),
    confidence_score: Number(row.confidence_score || 0),
    status: row.status || 'pending',
    duplicate_key: text(row.duplicate_key),
    created_at: row.created_at || new Date().toISOString()
  };
}

function fixMojibake(value) {
  const text = replaceMojibakeSequences(String(value || ''));
  if (!/[ÃÄÅÂâ�]/.test(text)) return text;
  let current = text;
  for (let i = 0; i < 3; i += 1) {
    try {
      const repaired = replaceMojibakeSequences(Buffer.from(current, 'latin1').toString('utf8'));
      if (!repaired || mojibakeScore(repaired) > mojibakeScore(current)) break;
      current = repaired;
    } catch {
      break;
    }
  }
  return replaceMojibakeSequences(current);
}

function mojibakeScore(text) {
  return (String(text || '').match(/[ÃÄÅÂâ�]/g) || []).length;
}

function replaceMojibakeSequences(value) {
  const pairs = [
    ['\u00c4\u00b1', '\u0131'],
    ['\u00c4\u00b0', '\u0130'],
    ['\u00c4\u0178', '\u011f'],
    ['\u00c4\u017e', '\u011e'],
    ['\u00c5\u0178', '\u015f'],
    ['\u00c5\u017e', '\u015e'],
    ['\u00c3\u2021', '\u00c7'],
    ['\u00c3\u00a7', '\u00e7'],
    ['\u00c3\u2013', '\u00d6'],
    ['\u00c3\u00b6', '\u00f6'],
    ['\u00c3\u0153', '\u00dc'],
    ['\u00c3\u00bc', '\u00fc'],
    ['\u00e2\u201a\u00ba', 'TL'],
    ['\u00e2\u20ac\u2122', "'"],
    ['\u00e2\u20ac\u0153', '"'],
    ['\u00e2\u20ac\u009d', '"']
  ];
  let out = String(value || '');
  for (const [bad, good] of pairs) out = out.split(bad).join(good);
  return out;
}
