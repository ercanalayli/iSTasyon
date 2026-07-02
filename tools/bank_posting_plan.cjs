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

function normalize(value) {
  return fixMojibake(value)
    .toLocaleUpperCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function amountIn(row) {
  return Number(row.amount_in || row.alacak || 0);
}

function amountOut(row) {
  return Number(row.amount_out || row.borc || 0);
}

function bankName(row) {
  return fixMojibake(row.bank_name || row.banka || 'Banka');
}

function transactionDate(row) {
  return String(row.transaction_date || row.tarih || row.date || '').slice(0, 10);
}

function transactionTime(row) {
  return fixMojibake(row.transaction_time || row.saat || row.time || '');
}

function description(row) {
  return fixMojibake(row.description || row.aciklama || '');
}

function counterpartyGuess(row) {
  const explicit = fixMojibake(row.target_counterparty || row.suggested_counterparty || row.aday_cari || '').trim();
  if (explicit && !isInvalidCounterparty(explicit)) return explicit;
  const text = normalize(description(row));
  const patterns = [
    /(?:GELEN EFT|GIDEN EFT|GIDEN FAST|GELEN FAST|FAST|HAVALE|EFT)\s+([A-Z0-9 .&'-]{5,90})/,
    /(?:ALICI|GONDEREN|MUSTERI)\s+([A-Z0-9 .&'-]{5,90})/,
    /(ALAYLI MEDIKAL[^*\/,;]*)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const candidate = m[1].replace(/\s+/g, ' ').trim().slice(0, 90);
      if (!isInvalidCounterparty(candidate)) return candidate;
    }
  }
  if (/POS|NET SATIS|KREDI KART|BATCH YATAN/.test(text)) return 'POS / Kart musterileri';
  if (/KOMISYON|BSMV|UCRET|MASRAF/.test(text)) return bankName(row);
  if (/VIRMAN/.test(text)) return 'Banka ici virman';
  return 'Cari eslestirme onayda';
}

function isInvalidCounterparty(value) {
  const text = normalize(value);
  if (!text) return true;
  if (/^(AKBANK|GARANTI|GARANTI BBVA|YAPI|YAPI KREDI|VAKIF|VAKIFBANK|IS BANK|TURKIYE IS BANKASI|BANKA|MAIL EKSTRE)$/.test(text)) return true;
  if (/^(ACIKL|ACIKLA|ACIKLAMA|GONDEREN|ALICI|MUSTERI|ISLEM|TARIH|SAAT|TUTAR|HESAP|SUBE|IBAN|KART|PARA)$/.test(text)) return true;
  if (/\b(HESAP|SUBE|IBAN|YATIRILAN TUTAR|KART NO|ATM NO|TR MASKED|NO LU HESABINIZA PARA GELDI)\b/.test(text)) return true;
  if (text.length < 5) return true;
  return false;
}

function classifyBankMovement(row = {}) {
  const incoming = amountIn(row) > 0;
  const text = normalize([
    row.description,
    row.aciklama,
    row.detected_type,
    row.suggested_counterparty,
    row.target_counterparty,
    row.suggested_bizimhesap_action,
    row.mail_subject,
    row.attachment_name,
  ].filter(Boolean).join(' '));

  let kind = incoming ? 'customer_collection' : 'supplier_or_expense_payment';
  let type = incoming ? 'Cari tahsilat' : 'Cari odeme';
  let target = 'BizimHesap banka/kasa kaydi';
  let category = fixMojibake(row.suggested_category || row.category || (incoming ? 'Tahsilat' : 'Odeme'));
  let counterparty = counterpartyGuess(row);
  let confidence = Number(row.confidence_score || row.confidence || row.guven || 0) || (incoming ? 72 : 70);
  const reasons = [];

  if (row.suggested_bizimhesap_action) {
    kind = row.suggested_bizimhesap_action;
    reasons.push(`payload:${row.suggested_bizimhesap_action}`);
  }
  if (incoming) reasons.push('banka alacak/giris');
  if (amountOut(row) > 0) reasons.push('banka borc/cikis');

  if (incoming && /POS|NET SATIS|KREDI KART|BATCH YATAN|UYE ISYERI/.test(text)) {
    kind = 'pos_collection';
    type = 'POS tahsilati';
    target = 'BizimHesap banka tahsilati';
    category = 'Satis tahsilati';
    counterparty = 'POS / Kart musterileri';
    confidence = Math.max(confidence, 88);
    reasons.push('POS aciklamasi');
  }
  if (/KOMISYON|BSMV|UCRET|MASRAF|KATKI PAYI/.test(text) || (amountOut(row) > 0 && /POS|KREDI KART|UYE ISYERI/.test(text))) {
    kind = 'bank_fee_expense';
    type = 'Banka/POS masrafi';
    target = 'BizimHesap gider/masraf kaydi';
    category = 'Banka masrafi';
    counterparty = bankName(row);
    confidence = Math.max(confidence, 90);
    reasons.push('komisyon/masraf');
  }
  if (/VIRMAN|HESAPLAR ARASI/.test(text)) {
    kind = 'bank_transfer';
    type = 'Banka virmani';
    target = 'BizimHesap banka virmani';
    category = 'Bankalar arasi transfer';
    counterparty = 'Banka ici virman';
    confidence = Math.max(confidence, 84);
    reasons.push('virman');
  }
  if (/KREDI KART BORC|KART BORC/.test(text)) {
    kind = 'credit_card_payment';
    type = 'Kredi karti odemesi';
    target = 'BizimHesap banka/kredi karti virmani';
    category = 'Kredi karti borc odemesi';
    counterparty = 'Kredi karti';
    confidence = Math.max(confidence, 86);
    reasons.push('kart borcu');
  }
  if (/SGK|VERGI|KDV|STOPAJ/.test(text)) {
    kind = 'tax_or_sgk_payment';
    type = 'Vergi/SGK odemesi';
    target = 'BizimHesap gider/odeme kaydi';
    category = 'Vergi/SGK';
    counterparty = 'Vergi/SGK';
    confidence = Math.max(confidence, 84);
    reasons.push('vergi/sgk');
  }
  if (/ELEKTRIK|ULUDAG|SU |DOGALGAZ|TELEKOM|TURKCELL|VODAFONE|TURKNET/.test(text)) {
    kind = 'utility_bill_payment';
    type = 'Fatura odemesi';
    target = 'BizimHesap gider/odeme kaydi';
    category = 'Sabit gider faturasi';
    confidence = Math.max(confidence, 82);
    reasons.push('fatura anahtar kelimesi');
  }

  const amount = amountIn(row) > 0 ? amountIn(row) : Math.abs(amountOut(row));
  const requiresReview = confidence < 84 || isInvalidCounterparty(counterparty) || counterparty === 'Cari eslestirme onayda';
  return {
    pending_bank_movement_id: row.id || row.pending_bank_movement_id || '',
    bank_name: bankName(row),
    transaction_date: transactionDate(row),
    transaction_time: transactionTime(row),
    amount_in: amountIn(row),
    amount_out: amountOut(row),
    balance_after: Number(row.balance_after || row.bakiye || 0),
    description: description(row),
    duplicate_key: row.duplicate_key || '',
    plan: {
      kind,
      type,
      target,
      account: fixMojibake(row.target_account || `${bankName(row)} banka hesabi`),
      counterparty,
      category,
      confidence: Math.min(99, Math.round(confidence)),
      amount,
      date: transactionDate(row),
      time: transactionTime(row),
      bank_name: bankName(row),
      description: description(row),
      source: fixMojibake(row.source || ''),
      reasons: [...new Set(reasons)].slice(0, 5),
      requires_user_review: requiresReview,
      next_step_after_user_approval: 'approve_pending_bank_movement RPC -> bizimhesap_queue.status=ready_for_bizimhesap',
    },
  };
}

function classifyQueueRow(row = {}) {
  const payload = row && typeof row.payload === 'object' && row.payload ? row.payload : {};
  const base = classifyBankMovement({
    ...payload,
    id: row.pending_bank_movement_id || payload.id,
  });
  const p = base.plan;
  return {
    queue_id: row.id,
    pending_bank_movement_id: row.pending_bank_movement_id,
    action_type: row.action_type,
    kind: p.kind,
    title: p.type,
    target: p.target,
    category: p.category,
    counterparty: p.counterparty,
    account: p.account,
    amount: p.amount,
    date: p.date,
    time: p.time,
    bank_name: p.bank_name,
    description: p.description,
    source: p.source,
    confidence: p.confidence,
    reasons: p.reasons,
    requires_user_review: p.requires_user_review,
  };
}

module.exports = {
  fixMojibake,
  normalize,
  classifyBankMovement,
  classifyQueueRow,
};
