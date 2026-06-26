import { parseIsbank } from './isbank-parser.js';

export function detectBank(text, meta = {}) {
  const source = `${meta.bank_hint || ''} ${meta.mail_subject || ''} ${meta.attachment_name || ''} ${text || ''}`;
  const sourceKey = key(source);
  if (sourceKey.includes('IS_BANKASI') || sourceKey.includes('ISBANK') || sourceKey.includes('TURKIYE_IS_BANKASI') || sourceKey.includes('TURKIYE_IS')) return 'isbank';
  if (sourceKey.includes('AKBANK') || sourceKey.includes('AXESS')) return 'akbank';
  if (sourceKey.includes('VAKIFBANK') || sourceKey.includes('VAKIF_BANK')) return 'vakifbank';
  if (sourceKey.includes('HALKBANK') || sourceKey.includes('HALK_BANKASI')) return 'halkbank';
  if (sourceKey.includes('GARANTI') || sourceKey.includes('GARANTI_BBVA')) return 'garanti';
  if (sourceKey.includes('YAPI_KREDI') || sourceKey.includes('YAPIKREDI') || sourceKey.includes('HESAP_HAREKETLERI') || sourceKey.includes('HESAP_OZETI')) return 'yapikredi';
  if (sourceKey.includes('ZIRAAT') || sourceKey.includes('BANKKART')) return 'ziraat';
  if (sourceKey.includes('QNB') || sourceKey.includes('FINANSBANK') || sourceKey.includes('ENPARA')) return 'qnb';
  if (sourceKey.includes('KUVEYT')) return 'kuveytturk';
  if (sourceKey.includes('DENIZBANK') || sourceKey.includes('DENIZ_BANK')) return 'denizbank';
  if (sourceKey.includes('FIBABANKA') || sourceKey.includes('FIBA_BANKA')) return 'fibabanka';
  return String(meta.bank_hint || 'unknown').toLowerCase();
}

export function parseBankStatement(text, meta = {}) {
  const bank = detectBank(text, meta);
  const isNotification = meta.source === 'gmail_bank_notification' || meta.attachment_name === 'mail_body';
  if (isNotification) {
    const notificationRows = parseBankNotification(text, { ...meta, bank_name: bank });
    if (notificationRows.length) return qualityGate(notificationRows);
  }
  const rows = bank === 'isbank' || bank.includes('is') ? parseIsbank(text, meta) : parseGenericBank(text, { ...meta, bank_name: bank });
  const notificationRows = rows.length ? rows : parseBankNotification(text, { ...meta, bank_name: bank });
  return qualityGate(notificationRows);
}

export function parseBankNotification(text, meta = {}) {
  const src = clean(text);
  if (!src) return [];
  const joined = clean(src.replace(/\n+/g, ' '));
  const bank = detectBank(src, meta);
  const bankName = bankLabel(meta, bank);
  const sid = statementId({ ...meta, attachment_name: meta.attachment_name || 'mail_body' }) || key(`${meta.mail_id || ''} ${meta.mail_subject || ''}`);
  const dateInfo = findNotificationDate(joined, meta);
  const amountInfo = findNotificationAmount(joined);
  if (!dateInfo.date || !amountInfo) return [];

  const signedAmount = detectNotificationDirection(joined, amountInfo.amount);
  const abs = Math.abs(signedAmount || amountInfo.amount);
  const desc = notificationDescription(joined, meta);
  if (!desc || !abs) return [];

  const tx = baseTx(meta, bankName, sid, {
    transaction_date: dateInfo.date,
    transaction_time: dateInfo.time,
    value_date: '',
    description: desc,
    amount_in: signedAmount >= 0 ? abs : 0,
    amount_out: signedAmount < 0 ? abs : 0,
    balance_after: findNotificationBalance(joined),
    detected_type: typeOf(desc, signedAmount),
    confidence_score: dateInfo.fromMailDate ? 72 : 84
  });
  tx.duplicate_key = duplicate(bankName, tx);
  return [tx];
}

function clean(v) {
  return String(v || '').replace(/\r/g, '\n').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
}

function trUpper(v) {
  return clean(v).toLocaleUpperCase('tr-TR');
}

function money(v) {
  const raw = clean(v).replace(/TL|TRY/gi, '').replace(/\./g, '').replace(',', '.');
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function isoDate(v) {
  const m = String(v || '').match(/(\d{2})[\.\/](\d{2})[\.\/](\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

function isoDateFromJs(value) {
  const d = new Date(value || '');
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function monthNo(v) {
  const k = key(v);
  const months = {
    OCAK: '01',
    SUBAT: '02',
    MART: '03',
    NISAN: '04',
    MAYIS: '05',
    HAZIRAN: '06',
    TEMMUZ: '07',
    AGUSTOS: '08',
    EYLUL: '09',
    EKIM: '10',
    KASIM: '11',
    ARALIK: '12'
  };
  return months[k] || '';
}

function parseDateLine(line) {
  const slash = String(line || '').match(/^(\d{2}[\.\/]\d{2}[\.\/]\d{4})(?:\s+(\d{2}[\.\/]\d{2}[\.\/]\d{4}))?\s*(.*)$/);
  if (slash) return { date: isoDate(slash[1]), valueDate: isoDate(slash[2]), rest: clean(slash[3] || '') };
  const named = String(line || '').match(/^(\d{1,2})\s+([^\d\s]+)\s+(20\d{2})\s*(.*)$/u);
  if (!named) return null;
  const mm = monthNo(named[2]);
  if (!mm) return null;
  return { date: `${named[3]}-${mm}-${String(named[1]).padStart(2, '0')}`, valueDate: '', rest: clean(named[4] || '') };
}

function key(v) {
  return trUpper(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 180);
}

function typeOf(desc, amount) {
  const u = key(desc).replace(/_/g, ' ');
  if (u.includes('POS') || u.includes('UYE ISYERI') || u.includes('UYE IS YERI') || u.includes('PESIN SATIS') || u.includes('PESINSATIS')) return amount >= 0 ? 'pos_tahsilat' : 'pos_masraf';
  if (u.includes('SGK')) return 'sgk';
  if (u.includes('VERGI')) return 'vergi';
  if (u.includes('BSMV') || u.includes('UCRET') || u.includes('MASRAF')) return 'banka_masrafi';
  if (u.includes('FAST') || u.includes('EFT') || u.includes('HAVALE')) return amount >= 0 ? 'tahsilat' : 'odeme';
  if (u.includes('HGS')) return 'hgs';
  return amount >= 0 ? 'tahsilat' : 'odeme';
}

function bankLabel(meta, bank) {
  const s = key(`${meta.bank_hint || ''} ${meta.bank_name || ''} ${meta.mail_subject || ''} ${meta.attachment_name || ''}`);
  if (bank === 'isbank' || s.includes('ISBANK') || s.includes('IS_BANKASI') || s.includes('TURKIYE_IS')) return 'Turkiye Is Bankasi';
  if (bank === 'yapikredi' || s.includes('YAPI')) return 'Yapi Kredi';
  if (bank === 'akbank' || s.includes('AKBANK') || s.includes('AXESS')) return 'Akbank';
  if (bank === 'vakifbank' || s.includes('VAKIF')) return 'VakifBank';
  if (bank === 'halkbank' || s.includes('HALK')) return 'Halkbank';
  if (bank === 'garanti' || s.includes('GARANTI')) return 'Garanti BBVA';
  if (bank === 'ziraat' || s.includes('ZIRAAT') || s.includes('BANKKART')) return 'Ziraat';
  if (bank === 'qnb' || s.includes('QNB') || s.includes('FINANSBANK') || s.includes('ENPARA')) return 'QNB Finansbank';
  if (bank === 'kuveytturk' || s.includes('KUVEYT')) return 'Kuveyt Turk';
  if (bank === 'denizbank' || s.includes('DENIZ')) return 'Denizbank';
  if (bank === 'fibabanka' || s.includes('FIBA')) return 'Fibabanka';
  return bank || 'Banka';
}

function statementId(meta) {
  const s = `${meta.mail_subject || ''} ${meta.attachment_name || ''}`;
  const m = s.match(/(20\d{6})[_-]?(\d{6,})/);
  return m ? `${m[1]}_${m[2]}` : key(s).slice(0, 80);
}

function duplicate(bank, tx) {
  return [key(bank), tx.transaction_date, tx.transaction_time || '', tx.value_date || '', (tx.amount_in || 0).toFixed(2), (tx.amount_out || 0).toFixed(2), tx.balance_after == null ? '' : Number(tx.balance_after || 0).toFixed(2), key(tx.description)].join('|');
}

function findNotificationDate(text, meta = {}) {
  const numeric = String(text || '').match(/(\d{1,2})[\.\/-](\d{1,2})[\.\/-](20\d{2})(?:\s*(?:-|,|\s)\s*(\d{1,2})[:\.](\d{2}))?/);
  if (numeric) {
    return {
      date: `${numeric[3]}-${String(numeric[2]).padStart(2, '0')}-${String(numeric[1]).padStart(2, '0')}`,
      time: numeric[4] ? `${String(numeric[4]).padStart(2, '0')}:${numeric[5]}` : ''
    };
  }
  const named = String(text || '').match(/(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(20\d{2})(?:\s*(\d{1,2})[:\.](\d{2}))?/u);
  if (named) {
    const mm = monthNo(named[2]);
    if (mm) {
      return {
        date: `${named[3]}-${mm}-${String(named[1]).padStart(2, '0')}`,
        time: named[4] ? `${String(named[4]).padStart(2, '0')}:${named[5]}` : ''
      };
    }
  }
  return { date: isoDateFromJs(meta.mail_date), time: '', fromMailDate: true };
}

function findNotificationAmount(text) {
  const matches = [...String(text || '').matchAll(/([+-]?\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})|[+-]?\s*\d+(?:,\d{2})?)\s*(?:TL|TRY|₺)/gi)]
    .map(match => ({ raw: match[0], index: match.index || 0, amount: money(match[1]) }))
    .filter(item => Number.isFinite(item.amount) && item.amount !== 0 && !/[Xx*]/.test(item.raw));
  if (!matches.length) return null;
  const preferred = matches.find(item => {
    const around = trUpper(String(text || '').slice(Math.max(0, item.index - 60), item.index + 90));
    return /TUTAR|MIKTAR|ODEME|GONDER|GELEN|YATAN|TAHSIL|UCRET|KOMISYON|FAST|EFT|HAVALE|POS/.test(around);
  });
  return preferred || matches[0];
}

function detectNotificationDirection(text, amount) {
  if (amount < 0) return amount;
  const u = trUpper(text);
  const outgoing = [
    'HESABINIZDAN',
    'GIDEN',
    'BORC',
    'BORCLARIN TAHSILAT',
    'TAHSIL EDILMISTIR',
    'ODEME',
    'ODENDI',
    'KOMISYON',
    'UCRET',
    'VERGI OTOMATIK',
    'KREDI KARTI BORC'
  ].some(token => u.includes(token));
  const incoming = [
    'HESABINIZA',
    'GELEN',
    'YATAN',
    'PARA GONDERILDI',
    'POS ODEMESI',
    'ALACAK'
  ].some(token => u.includes(token));
  if (outgoing && !incoming) return -Math.abs(amount);
  if (outgoing && incoming && /HESABINIZDAN|GIDEN|KOMISYON|UCRET|VERGI|BORC/.test(u)) return -Math.abs(amount);
  return Math.abs(amount);
}

function findNotificationBalance(text) {
  const m = String(text || '').match(/(?:BAKIYE|KALAN)[^\d-]*(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:TL|TRY|₺)?/i);
  return m ? money(m[1]) : null;
}

function notificationDescription(text, meta = {}) {
  const parts = [
    meta.mail_subject || '',
    String(text || '').split(/\n|Sayin|Sayın|Degerli|Değerli/i).map(clean).filter(Boolean)[0] || text
  ].filter(Boolean);
  return clean(parts.join(' - '))
    .replace(/\s+/g, ' ')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig, 'mail@masked')
    .replace(/\bTR\d{2}[A-Z0-9]{8,}\b/ig, 'TR##MASKED')
    .slice(0, 320);
}

function qualityGate(rows) {
  const seen = new Set();
  return rows.filter(row => {
    const amount = Number(row.amount_in || 0) + Number(row.amount_out || 0);
    if (!row.transaction_date || !row.description || amount <= 0 || !row.duplicate_key) return false;
    if (seen.has(row.duplicate_key)) return false;
    seen.add(row.duplicate_key);
    return true;
  });
}

export function parseGenericBank(text, meta = {}) {
  const src = clean(text);
  const lines = src.split('\n').map(clean).filter(Boolean);
  const bank = detectBank(text, meta);
  const bankName = bankLabel(meta, bank);
  const sid = statementId(meta);
  const rows = [];
  const dateRe = /^(\d{2}[\.\/]\d{2}[\.\/]\d{4})(?:\s+(\d{2}[\.\/]\d{2}[\.\/]\d{4}))?(?:\s+(.+))?$/;
  const moneyPair = /(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:TL)?\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:TL)?/;
  let cur = null;

  function flush() {
    if (!cur) return;
    const joined = clean(cur.parts.join(' '));
    const mm = joined.match(moneyPair);
    if (!mm) return;
    const amount = money(mm[1]);
    const balance = money(mm[2]);
    let desc = clean(joined.replace(moneyPair, '').replace(cur.date, '').replace(cur.valueDate || '', ''));
    desc = desc.replace(/Tarih Valor Tarihi Aciklama Islem Tutari Guncel Bakiye/gi, '').trim();
    if (!desc || /^ACILIS/i.test(desc)) return;
    const tx = baseTx(meta, bankName, sid, {
      transaction_date: String(cur.date || '').includes('-') ? cur.date : isoDate(cur.date),
      value_date: isoDate(cur.valueDate),
      description: desc,
      amount_in: amount > 0 ? amount : 0,
      amount_out: amount < 0 ? Math.abs(amount) : 0,
      balance_after: balance,
      detected_type: typeOf(desc, amount),
      confidence_score: 65
    });
    tx.duplicate_key = duplicate(bankName, tx);
    rows.push(tx);
  }

  for (const line of lines) {
    const m = line.match(dateRe);
    if (m && m[1]) {
      flush();
      cur = { date: m[1], valueDate: m[2] || '', parts: [m[3] || ''] };
    } else if (cur) {
      cur.parts.push(line);
    }
  }
  flush();
  return rows.length ? rows : parseCardStatement(lines, meta, bankName, sid);
}

function baseTx(meta, bankName, sid, fields) {
  return {
    company_id: meta.company_id || 'alayli',
    source: meta.source || 'gmail_bank_statement',
    mailbox: meta.mailbox || 'alaylimedikal@gmail.com',
    bank_name: bankName,
    mail_id: meta.mail_id || '',
    mail_subject: meta.mail_subject || '',
    mail_from: meta.mail_from || '',
    mail_date: meta.mail_date || '',
    attachment_name: meta.attachment_name || '',
    statement_id: sid,
    transaction_date: fields.transaction_date || '',
    transaction_time: fields.transaction_time || '',
    value_date: fields.value_date || '',
    description: fields.description || '',
    amount_in: Number(fields.amount_in || 0),
    amount_out: Number(fields.amount_out || 0),
    balance_after: fields.balance_after ?? null,
    detected_type: fields.detected_type || '',
    suggested_counterparty: '',
    confidence_score: Number(fields.confidence_score || 0),
    status: 'pending',
    duplicate_key: '',
    created_at: new Date().toISOString()
  };
}

function parseCardStatement(lines, meta, bankName, sid) {
  const rows = [];
  const amountRe = /-?\d{1,3}(?:\.\d{3})*,\d{2}(?:\s*(?:TL|TRY))?/g;
  const skip = /\b(TOPLAM|DONEM|DONEM BORCU|ASGARI|LIMIT|SON ODEME|EKSTRE|HESAP OZETI|FAIZ|VERGI|BORC|ALACAK BAKIYE|KALAN|MUSTERI NO|KART LIMITI)\b/i;
  let cur = null;

  function flush() {
    if (!cur) return;
    const joined = clean(cur.parts.join(' '));
    const amounts = joined.match(amountRe) || [];
    if (!amounts.length) return;
    const rawAmount = amounts[amounts.length - 1];
    const amount = money(rawAmount);
    if (!amount) return;
    let desc = clean(joined.replace(rawAmount, '').replace(cur.date, '').replace(cur.valueDate || '', ''));
    desc = desc.replace(/\b(ISLEM|TARIHI|ACIKLAMA|TUTAR|TL|TRY)\b/gi, '').trim();
    if (!desc || skip.test(key(desc).replace(/_/g, ' '))) return;
    const u = trUpper(desc);
    const isInflow = u.includes('TAHSILAT') || u.includes('GELEN') || u.includes('ALACAK') || u.includes('IADE') || amount < 0;
    const abs = Math.abs(amount);
    const tx = baseTx(meta, bankName, sid, {
      transaction_date: String(cur.date || '').includes('-') ? cur.date : isoDate(cur.date),
      value_date: cur.valueDate || '',
      description: desc,
      amount_in: isInflow ? abs : 0,
      amount_out: isInflow ? 0 : abs,
      balance_after: null,
      detected_type: isInflow ? 'tahsilat_iade' : 'kredi_karti_harcama',
      confidence_score: 58
    });
    tx.duplicate_key = duplicate(bankName, tx);
    rows.push(tx);
  }

  for (const line of lines) {
    const parsedDate = parseDateLine(line);
    if (parsedDate) {
      flush();
      cur = { date: parsedDate.date, valueDate: parsedDate.valueDate || '', parts: [parsedDate.rest || ''] };
    } else if (cur) {
      cur.parts.push(line);
    }
  }
  flush();
  return rows;
}
