const fs = require('fs');
const path = require('path');

const RULES = loadFinanceRules();

function loadFinanceRules() {
  const file = path.join(__dirname, '..', 'config', 'aperion_finance_rules.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {
      related_parties_need_confirmation: [],
      company_fixed_expenses: [],
      personal_fixed_expenses: [],
      review_only_keywords: [],
    };
  }
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

function targetBankAccount(row) {
  if (row.target_account) return fixMojibake(row.target_account);
  const bank = normalize(bankName(row));
  const aliases = [
    ['VAKIFBANK', '*VAKIF SIRKET'],
    ['IS BANKASI', '*IS BANKASI'],
    ['TURKIYE IS BANKASI', '*IS BANKASI'],
    ['YAPI KREDI', '*YAPI KREDI SIRKET'],
    ['AKBANK', 'AKBANK SIRKET'],
    ['GARANTI', 'GARANTI SIRKET'],
    ['HALKBANK', 'HALKBANK SIRKET'],
  ];
  const match = aliases.find(([needle]) => bank.includes(needle));
  return match ? match[1] : `${bankName(row)} banka hesabi`;
}

function companyBankAccountFromText(value, excludedBank = '') {
  const text = normalize(value);
  const excluded = normalize(excludedBank);
  const banks = [
    ['IS BANKASI', '*IS BANKASI'],
    ['TURKIYE IS BANKASI', '*IS BANKASI'],
    ['VAKIFBANK', '*VAKIF SIRKET'],
    ['AKBANK', 'AKBANK SIRKET'],
    ['YAPI KREDI', '*YAPI KREDI SIRKET'],
    ['GARANTI BBVA', 'GARANTI SIRKET'],
    ['GARANTI', 'GARANTI SIRKET'],
    ['HALKBANK', 'HALKBANK SIRKET'],
  ];
  const found = banks.find(([needle]) => text.includes(needle) && !(excluded.includes(needle) || needle.includes(excluded)));
  return found ? found[1] : '';
}

function kmhAccount(row) {
  return fixMojibake(row.kmh_account || `${bankName(row)} KMH / Ek Hesap`);
}

function counterpartyGuess(row) {
  const explicit = fixMojibake(row.user_confirmed_counterparty || row.confirmed_counterparty || row.target_counterparty || row.suggested_counterparty || row.aday_cari || '').trim();
  if (explicit && !isInvalidCounterparty(explicit)) return explicit;
  const text = normalize(description(row));
  const patterns = [
    /([A-Z0-9 .&'-]{5,90})\s+(?:TARAFINDAN|TARAFINDAN AKTARILAN|DAN|DEN)\s+(?:GELEN|HAVALE|EFT|FAST|PARA)/,
    /(?:GELEN|GONDEREN|GONDERILEN|PARA GONDEREN)\s+(?:EFT|FAST|HAVALE)?\s*[-:]?\s*([A-Z0-9 .&'-]{5,90})/,
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
  if (/MOKA|MOKAUNITED|SANAL POS/.test(text)) return 'Moka United bekleyen tahsilatlar';
  if (/POS|NET SATIS|KREDI KART|BATCH YATAN/.test(text)) return 'POS POS POS KREDI KARTI';
  if (/KMH|EK HESAP|ANAPARA BORCU TAHSILATI/.test(text)) return kmhAccount(row);
  if (/KOMISYON|BSMV|UCRET|MASRAF/.test(text)) return bankName(row);
  if (/VIRMAN/.test(text)) return 'Banka ici virman';
  return 'Cari eslestirme onayda';
}

function ruleList(name) {
  return Array.isArray(RULES?.[name]) ? RULES[name] : [];
}

function containsRule(text, name) {
  const normalized = normalize(text);
  return ruleList(name).some(item => normalized.includes(normalize(item)));
}

function isConfirmedCounterparty(row) {
  return Boolean(row.counterparty_confirmed || row.user_confirmed_counterparty || row.confirmed_counterparty);
}

function businessScope(row, text) {
  if (containsRule(text, 'review_only_keywords')) return 'kisisel_veya_sirket_disi_inceleme';
  if (containsRule(text, 'personal_fixed_expenses')) return 'kisisel_finans';
  return row.scope || row.business_scope || 'sirket_finansi';
}

function fixedVariableClass(text, category) {
  const combined = `${text} ${category || ''}`;
  if (containsRule(combined, 'company_fixed_expenses') || containsRule(combined, 'personal_fixed_expenses')) return 'sabit';
  if (/KOMISYON|BSMV|UCRET|MASRAF|FAIZ|KARGO|AKARYAKIT|MARKET/.test(normalize(combined))) return 'degisken';
  return 'islem_bazli';
}

function needsRelatedPartyConfirmation(counterparty, row) {
  if (isConfirmedCounterparty(row)) return false;
  return containsRule(counterparty, 'related_parties_need_confirmation');
}

function buildConfirmationQuestion(plan, scope) {
  if (scope !== 'sirket_finansi') {
    return `Bu hareket sirket kaydi mi, kisisel/hayat asistani kaydi mi?`;
  }
  if (plan.kind === 'customer_collection') {
    return `${plan.counterparty} carisine ${plan.amount.toLocaleString('tr-TR')} TL tahsilat olarak BizimHesap'a isleyeyim mi?`;
  }
  if (plan.kind === 'bank_fee_expense') {
    return `${plan.bank_name} banka masrafini ${plan.category} gider kartina isleyeyim mi?`;
  }
  if (plan.kind === 'bank_transfer') {
    return `${plan.source_account} hesabindan ${plan.target_account} hesabina ${plan.amount.toLocaleString('tr-TR')} TL sirket ici virman olarak BizimHesap'a isleyeyim mi?`;
  }
  if (plan.kind === 'bank_unmatched_incoming') {
    return `${plan.bank_name} hesabina gelen ${plan.amount.toLocaleString('tr-TR')} TL hareketi cari baglamadan Hesaba Para Girisi olarak islenecek; aciklamadaki karsi taraf sonra eslestirilecek.`;
  }
  return `${plan.type} olarak BizimHesap kuyruğuna alinsin mi?`;
}

function isInvalidCounterparty(value) {
  const text = normalize(value);
  if (!text) return true;
  if (/^(AKBANK|GARANTI|GARANTI BBVA|YAPI|YAPI KREDI|VAKIF|VAKIFBANK|IS BANK|TURKIYE IS BANKASI|BANKA|MAIL EKSTRE)$/.test(text)) return true;
  if (/^(ACIKL|ACIKLA|ACIKLAMA|GONDEREN|ALICI|MUSTERI|ISLEM|TARIH|SAAT|TUTAR|HESAP|SUBE|IBAN|KART|PARA|AKILLI ASISTAN|AKILLI ASISTAN GELEN FAST|ANLIK ODEME BILGILENDIRMESI)$/.test(text)) return true;
  if (/\b(HESAP|SUBE|IBAN|YATIRILAN TUTAR|KART NO|ATM NO|TR MASKED|NO LU HESABINIZA PARA GELDI)\b/.test(text)) return true;
  if (/\b(AKILLI ASISTAN|ANLIK ODEME BILGILENDIRMESI|BILGI FISI|GUNLUK HESAP HAREKETLERINIZ|GUNLUK FINANSAL BILGILERINIZ)\b/.test(text)) return true;
  if (text.length < 5) return true;
  return false;
}

function isNonBankSummary(row, text) {
  const source = normalize([
    row.description,
    row.aciklama,
    row.raw_text,
    row.mail_subject,
    row.mail_from,
    row.attachment_name,
  ].filter(Boolean).join(' '));
  const hasStructuredMovementReference = [row.statement_transaction_no, row.transaction_no, row.reference_no]
    .some(value => value !== undefined && value !== null && String(value).trim() !== '');
  const isCreditCardStatementNotification = /KREDI KARTI HESAP OZETI|MAXIMILES KREDI KARTI HESAP OZETI|MAXIMUM KREDI KARTI HESAP OZETI/.test(source);
  const hasExplicitStatementLine = /ISLEM NO|REFERANS NO|BATCH YATAN|POS KOMISYON|GELEN FAST|GIDEN FAST|GELEN EFT|GIDEN EFT|HESABINIZA PARA|HESABINIZDAN PARA/.test(source);

  // An email saying that a card statement is attached is not a cash movement.
  // Only a parsed attachment line with a transaction/reference can enter the approval flow.
  if (isCreditCardStatementNotification && !hasStructuredMovementReference && !hasExplicitStatementLine) return true;

  return /BIZIMHESAP GUNLUK FINANSAL BILGILERINIZ|BIZIMHESAP GUNLUK HESAP HAREKETLERINIZ|GUNLUK NAKIT AKISINIZ|KASA VE BANKA BAKIYELERINIZ/.test(source || text);
}

function hasVerifiedBankMovement(row, text) {
  const hasReference = [row.statement_transaction_no, row.transaction_no, row.reference_no]
    .some(value => value !== undefined && value !== null && String(value).trim() !== '');
  const hasNonZeroBalance = [row.balance_after, row.bakiye]
    .some(value => Number.isFinite(Number(value)) && Number(value) !== 0);
  const hasReferenceOrBalance = hasReference || hasNonZeroBalance;
  const hasMovementLanguage = /GELEN|GIDEN|FAST|EFT|HAVALE|POS|BATCH|ISLEM NO|REFERANS|HESABINIZA|HESABINIZDAN/.test(text);
  const looksLikeAnnouncement = /HALKA ARZ|BULTEN|KAMPANYA|DUYURU|BILGI:|BILGILENDIRME:/.test(text) && !hasReferenceOrBalance;
  return !looksLikeAnnouncement && (hasReferenceOrBalance || hasMovementLanguage);
}

function hasBankNameConflict(row, text) {
  const sourceBank = normalize(bankName(row));
  const labels = [
    ['VAKIFBANK', ['VAKIFBANK']],
    ['IS BANKASI', ['IS BANKASI', 'TURKIYE IS BANKASI']],
    ['YAPI KREDI', ['YAPI KREDI']],
    ['AKBANK', ['AKBANK']],
    ['GARANTI', ['GARANTI']],
    ['HALKBANK', ['HALKBANK']],
  ];
  const mentioned = labels.filter(([needle]) => text.includes(needle));
  if (!mentioned.length) return false;
  return !mentioned.some(([, aliases]) => aliases.some(alias => sourceBank.includes(alias)));
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
  let sourceAccount = '';
  let targetAccount = targetBankAccount(row);
  let confidence = Number(row.confidence_score || row.confidence || row.guven || 0) || (incoming ? 72 : 70);
  const reasons = [];

  if (row.suggested_bizimhesap_action) {
    kind = row.suggested_bizimhesap_action;
    reasons.push(`payload:${row.suggested_bizimhesap_action}`);
  }
  if (incoming) reasons.push('banka alacak/giris');
  if (amountOut(row) > 0) reasons.push('banka borc/cikis');

  if (isNonBankSummary(row, text)) {
    kind = 'non_bank_summary_review';
    type = 'Banka disi ozet mail';
    target = 'Onay Merkezi inceleme';
    category = 'Kaynak kontrol';
    counterparty = 'Banka hareketi degil';
    sourceAccount = '';
    targetAccount = '';
    confidence = 20;
    reasons.push('banka disi ozet mail');
  }

  if (kind !== 'non_bank_summary_review' && incoming && /MOKA|MOKAUNITED|SANAL POS/.test(text)) {
    kind = 'bank_transfer';
    type = 'Moka banka transferi';
    target = 'BizimHesap hesaplar arasi transfer';
    category = 'Moka banka aktarimi';
    sourceAccount = 'Moka United bekleyen tahsilatlar';
    targetAccount = targetBankAccount(row);
    counterparty = `${sourceAccount} -> ${targetAccount}`;
    confidence = Math.max(confidence, 88);
    reasons.push('Moka banka aktarimi');
  }
  if (kind !== 'non_bank_summary_review' && amountOut(row) > 0 && /KMH|EK HESAP|ANAPARA BORCU TAHSILATI/.test(text)) {
    kind = 'bank_transfer';
    type = 'KMH ana para kapama';
    target = 'BizimHesap banka/KMH virmani';
    category = 'KMH ana para kapama';
    sourceAccount = targetBankAccount(row);
    targetAccount = kmhAccount(row);
    counterparty = `${sourceAccount} -> ${targetAccount}`;
    confidence = Math.max(confidence, 90);
    reasons.push('KMH ana para kapama');
  }
  if (kind !== 'non_bank_summary_review' && incoming && /POS|NET SATIS|KREDI KART|BATCH YATAN|UYE ISYERI/.test(text)) {
    kind = 'bank_transfer';
    type = 'POS banka transferi';
    target = 'BizimHesap hesaplar arasi transfer';
    category = 'POS banka aktarimi';
    sourceAccount = 'POS POS POS KREDI KARTI';
    targetAccount = targetBankAccount(row);
    counterparty = `${sourceAccount} -> ${targetAccount}`;
    confidence = Math.max(confidence, 88);
    reasons.push('POS banka aktarimi');
  }
  if (kind !== 'non_bank_summary_review' && (/KOMISYON|BSMV|BANKA MASRAF|FON TRANSFERI.*UCRET|EFT.*UCRET|FAST.*UCRET|HAVALE.*UCRET|KATKI PAYI/.test(text) || (amountOut(row) > 0 && /POS|KREDI KART|UYE ISYERI/.test(text)))) {
    kind = 'bank_fee_expense';
    type = 'Banka/POS masrafi';
    target = 'BizimHesap gider/masraf kaydi';
    category = 'Banka masrafi';
    counterparty = bankName(row);
    sourceAccount = '';
    targetAccount = targetBankAccount(row);
    confidence = Math.max(confidence, 90);
    reasons.push('komisyon/masraf');
  }
  if (kind !== 'non_bank_summary_review' && /VIRMAN|HESAPLAR ARASI/.test(text)) {
    kind = 'bank_transfer';
    const companyTarget = companyBankAccountFromText(text, bankName(row));
    const sourceBankAccount = targetBankAccount(row);
    type = companyTarget ? 'Sirket bankalari arasi virman' : 'Banka virmani';
    target = 'BizimHesap banka virmani';
    category = 'Bankalar arasi transfer';
    if (companyTarget && incoming) {
      sourceAccount = fixMojibake(companyTarget);
      targetAccount = fixMojibake(row.target_account || sourceBankAccount);
      reasons.push('giris yonu kaynak/hedef ters cevrildi');
    } else {
      sourceAccount = fixMojibake(row.source_account || sourceBankAccount);
      targetAccount = fixMojibake(row.target_account || companyTarget || 'Hedef banka hesabi');
    }
    counterparty = `${sourceAccount} -> ${targetAccount}`;
    confidence = Math.max(confidence, companyTarget ? 90 : 84);
    reasons.push(companyTarget ? 'aciklamada iki sirket bankasi ve virman bulundu' : 'virman');
  }
  if (kind !== 'non_bank_summary_review' && /KREDI KART BORC|KART BORC/.test(text)) {
    kind = 'credit_card_payment';
    type = 'Kredi karti odemesi';
    target = 'BizimHesap banka/kredi karti virmani';
    category = 'Kredi karti borc odemesi';
    counterparty = 'Kredi karti';
    sourceAccount = targetBankAccount(row);
    targetAccount = 'Kredi karti';
    confidence = Math.max(confidence, 86);
    reasons.push('kart borcu');
  }
  if (kind !== 'non_bank_summary_review' && /SGK|VERGI|KDV|STOPAJ/.test(text)) {
    kind = 'tax_or_sgk_payment';
    type = 'Vergi/SGK odemesi';
    target = 'BizimHesap gider/odeme kaydi';
    category = 'Vergi/SGK';
    counterparty = 'Vergi/SGK';
    sourceAccount = targetBankAccount(row);
    targetAccount = 'Vergi/SGK';
    confidence = Math.max(confidence, 84);
    reasons.push('vergi/sgk');
  }
  if (kind !== 'non_bank_summary_review' && /ELEKTRIK|ULUDAG|SU |DOGALGAZ|TELEKOM|TURKCELL|VODAFONE|TURKNET/.test(text)) {
    kind = 'utility_bill_payment';
    type = 'Fatura odemesi';
    target = 'BizimHesap gider/odeme kaydi';
    category = 'Sabit gider faturasi';
    sourceAccount = targetBankAccount(row);
    confidence = Math.max(confidence, 82);
    reasons.push('fatura anahtar kelimesi');
  }

  const amount = amountIn(row) > 0 ? amountIn(row) : Math.abs(amountOut(row));
  const scope = businessScope(row, text);
  const fixedVariable = fixedVariableClass(text, category);
  const relatedPartyReview = needsRelatedPartyConfirmation(counterparty, row);
  if (relatedPartyReview) reasons.push('ilgili kisi/cari kullanici dogrulamasi');
  if (scope !== 'sirket_finansi') reasons.push(scope);
  const counterpartyAllowedByKind = ['bank_fee_expense', 'bank_transfer', 'credit_card_payment', 'tax_or_sgk_payment', 'utility_bill_payment'].includes(kind);
  const invalidCounterpartyForKind = isInvalidCounterparty(counterparty) && !counterpartyAllowedByKind;
  const unresolvedCounterparty = /CARI ESLESTIRME ONAYDA/.test(normalize(counterparty));
  const shouldHoldIncoming = kind === 'customer_collection' && incoming && (
    confidence < 84 || invalidCounterpartyForKind || unresolvedCounterparty || relatedPartyReview
  ) && hasVerifiedBankMovement(row, text) && !hasBankNameConflict(row, text);
  if (incoming && hasBankNameConflict(row, text)) reasons.push('ekstre metnindeki banka ile kaynak banka uyusmuyor');
  if (shouldHoldIncoming) {
    kind = 'bank_unmatched_incoming';
    type = 'Banka hesaba para girisi - eslestirme bekliyor';
    target = 'BizimHesap Hesaba Para Girisi';
    category = 'AperiON banka bekletme';
    counterparty = (isInvalidCounterparty(counterparty) || unresolvedCounterparty) ? 'Belirsiz karsi taraf' : counterparty;
    sourceAccount = '';
    targetAccount = targetBankAccount(row);
    confidence = 100;
    reasons.push('gelen para kaydi kesin, cari eslestirmesi bilinmiyor');
  }
  const requiresReview = kind === 'non_bank_summary_review' ||
    (kind !== 'bank_unmatched_incoming' && (
      confidence < 84 ||
      invalidCounterpartyForKind ||
      counterparty === 'Cari eslestirme onayda' ||
      relatedPartyReview
    )) ||
    scope !== 'sirket_finansi';
  const planBase = {
    kind,
    type,
    target,
    account: targetAccount || targetBankAccount(row),
    source_account: sourceAccount,
    target_account: targetAccount,
    counterparty,
    category,
    confidence: Math.min(99, Math.round(confidence)),
    recording_confidence: kind === 'bank_unmatched_incoming' ? 100 : Math.min(99, Math.round(confidence)),
    amount,
    date: transactionDate(row),
    time: transactionTime(row),
    bank_name: bankName(row),
    description: description(row),
    source: fixMojibake(row.source || ''),
    business_scope: scope,
    fixed_variable: fixedVariable,
    requires_counterparty_confirmation: kind === 'bank_unmatched_incoming' ? false : relatedPartyReview,
    reasons: [...new Set(reasons)].slice(0, 7),
    requires_user_review: requiresReview,
    next_step_after_user_approval: 'approve_pending_bank_movement RPC -> bizimhesap_queue.status=ready_for_bizimhesap',
  };
  planBase.confirmation_question = buildConfirmationQuestion(planBase, scope);
  planBase.decision_summary = `${planBase.type} | ${planBase.counterparty} | ${planBase.category} | ${planBase.business_scope} | ${planBase.fixed_variable}`;
  return {
    pending_bank_movement_id: row.id || row.pending_bank_movement_id || '',
    statement_transaction_no: fixMojibake(row.statement_transaction_no || row.transaction_no || row.reference_no || ''),
    bank_name: bankName(row),
    transaction_date: transactionDate(row),
    transaction_time: transactionTime(row),
    amount_in: amountIn(row),
    amount_out: amountOut(row),
    balance_after: Number(row.balance_after || row.bakiye || 0),
    description: description(row),
    duplicate_key: row.duplicate_key || '',
    plan: planBase,
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
    source_account: p.source_account,
    target_account: p.target_account,
    amount: p.amount,
    date: p.date,
    time: p.time,
    bank_name: p.bank_name,
    description: p.description,
    source: p.source,
    business_scope: p.business_scope,
    fixed_variable: p.fixed_variable,
    confirmation_question: p.confirmation_question,
    decision_summary: p.decision_summary,
    requires_counterparty_confirmation: p.requires_counterparty_confirmation,
    confidence: p.confidence,
    recording_confidence: p.recording_confidence,
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
