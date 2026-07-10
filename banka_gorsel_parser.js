import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const args = process.argv.slice(2);
const FILE = valueArg('--file', '');
const FIRMA_ID = valueArg('--firma', 'alayli');
const BANKA = valueArg('--banka', 'IS BANKASI');
const OUT = valueArg('--out', '');
const SAVE_APPROVAL = args.includes('--save-approval');
const SAVE_SUPABASE = args.includes('--save-supabase') || SAVE_APPROVAL;

const db = createClient(
  process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co',
  process.env.SUPABASE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW'
);

if (!FILE) {
  console.error('Kullanim: node banka_gorsel_parser.js --file ekran.jpg --firma alayli --save-approval');
  process.exit(1);
}

function valueArg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

function fixText(s) {
  return String(s || '')
    .replace(/Ä±/g, 'ı').replace(/Ä°/g, 'İ').replace(/ÅŸ/g, 'ş').replace(/Å/g, 'Ş')
    .replace(/ÄŸ/g, 'ğ').replace(/Ä/g, 'Ğ').replace(/Ã¼/g, 'ü').replace(/Ãœ/g, 'Ü')
    .replace(/Ã¶/g, 'ö').replace(/Ã–/g, 'Ö').replace(/Ã§/g, 'ç').replace(/Ã‡/g, 'Ç')
    .replace(/\uFFFD\s*CRET\uFFFD/gi, '\u00dcCRET\u0130')
    .replace(/\uFFFD\s*CRETI/gi, '\u00dcCRET\u0130')
    .replace(/\s+/g, ' ')
    .trim();
}

function key(s) {
  return fixText(s).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parseDate(s) {
  const m = String(s || '').replace(/[Oo]/g, '0').match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

function parseMoney(s) {
  let raw = String(s || '').replace(/\s/g, '').replace(/TL|TRY|₺/gi, '');
  const neg = raw.includes('-') || /^\(.*\)$/.test(raw);
  raw = raw.replace(/[()]/g, '').replace(/[^0-9,.-]/g, '');
  if (!raw) return null;
  if (raw.includes(',') && raw.includes('.')) raw = raw.replace(/\./g, '').replace(',', '.');
  else if (raw.includes(',')) raw = raw.replace(',', '.');
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return neg && n > 0 ? -n : n;
}

function hash(row) {
  return crypto.createHash('sha1')
    .update([row.firma_id, row.kaynak_banka, row.tarih, row.aciklama, row.tutar, row.bakiye ?? ''].map(key).join('|'))
    .digest('hex');
}

function classify(row) {
  const t = key(row.aciklama);
  if (t.includes('virman') || t.includes('hesaplar arasi')) return ['virman', 'bankalar_arasi_transfer', 'onay_bekliyor', 90, 'sirket_ici_virman_onayi'];
  if (t.includes('sgk') || t.includes('sosyal guv')) return ['banka_gider', 'sgk', 'onay_bekliyor', 90, 'sgk_onay'];
  if (t.includes('eft') || t.includes('fast')) return [row.tutar > 0 ? 'cari_tahsilat' : 'banka_gider', row.tutar > 0 ? 'tahsilat' : 'banka_cikis', 'onay_bekliyor', 70, 'gorsel_onay'];
  if (t.includes('para yatirma') || t.includes('atm')) return ['ozel', 'nakit/atm', 'onay_bekliyor', 60, 'atm_onay'];
  return [row.tutar > 0 ? 'tahsilat' : 'banka_gider', row.tutar > 0 ? 'belirsiz_giris' : 'banka_cikis', 'onay_bekliyor', 50, 'gorsel_belirsiz'];
}

function parseFromText(text) {
  const lines = String(text || '').split(/\r?\n/).map(fixText).filter(Boolean);
  const rows = [];
  let pending = null;
  const moneyRe = /-?\d[\d.]*,\d{2}\s*(?:TL|TRY|₺)?/gi;

  for (const line of lines) {
    const tarih = parseDate(line);
    const monies = [...line.matchAll(moneyRe)].map(m => m[0]);
    if (tarih && pending) {
      const bakiye = monies.length ? parseMoney(monies[monies.length - 1]) : null;
      const base = { ...pending, tarih, bakiye };
      const [tip, kat, durum, guven, risk] = classify(base);
      base.aday_islem_tipi = tip;
      base.aday_kategori = kat;
      base.durum = durum;
      base.guven = guven;
      base.risk = risk;
      base.hash = hash(base);
      rows.push(base);
      pending = null;
      continue;
    }
    if (!tarih && monies.length) {
      const tutar = parseMoney(monies[monies.length - 1]);
      const aciklama = fixText(line.replace(moneyRe, '').replace(/\s+-\s*$/, ''));
      if (aciklama && tutar != null) {
        pending = {
          firma_id: FIRMA_ID,
          kaynak_banka: BANKA,
          kaynak_dosya: FILE,
          saat: '',
          aciklama,
          tutar,
          yon: tutar >= 0 ? 'giris' : 'cikis',
          islem_tipi: 'gorsel_ekstre',
        };
      }
    }
  }
  return dedupe(rows);
}

function parseFromTextBlocks(text) {
  const lines = String(text || '').split(/\r?\n/).map(fixText).filter(Boolean);
  const rows = [];
  const moneyRe = /-?\d[\d.]*,\d{2}\s*(?:TL|TRY|â‚º)?/gi;
  let current = null;

  for (const line of lines) {
    const tarih = parseDate(line);
    const monies = [...line.matchAll(moneyRe)].map(m => m[0]);
    if (tarih && monies.length) {
      if (current) rows.push(finalizeBlock(current));
      const timeMatch = line.match(/\b(\d{1,2}:\d{2})(?::\d{2})?\b/);
      const tutar = parseMoney(monies[0]);
      const bakiye = monies.length > 1 ? parseMoney(monies[1]) : null;
      const cleanLine = fixText(line
        .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}(?:[-\s]\d{1,2}:\d{2}(?::\d{2})?)?/g, '')
        .replace(moneyRe, ''));
      current = {
        firma_id: FIRMA_ID,
        kaynak_banka: BANKA,
        kaynak_dosya: FILE,
        saat: timeMatch ? `${timeMatch[1]}:00` : '',
        tarih,
        aciklamaSatirlari: cleanLine ? [cleanLine] : [],
        tutar,
        bakiye,
        yon: tutar >= 0 ? 'giris' : 'cikis',
        islem_tipi: 'gorsel_ekstre',
      };
      continue;
    }
    if (current && !isUiNoise(line)) {
      current.aciklamaSatirlari.push(line);
    }
  }
  if (current) rows.push(finalizeBlock(current));
  return dedupe(rows);
}

function isUiNoise(line) {
  const t = key(line);
  return [
    'hesapbilgileri',
    'hareketler detay',
    'para akis yonu',
    'donem araligi',
    'tumu sonlay',
    'tarih tutar bakiye',
    'ana sayfa menu nakit akisi',
  ].some(x => t.includes(x)) || /^[.vw\s]+$/i.test(t);
}

function finalizeBlock(block) {
  const aciklama = fixText((block.aciklamaSatirlari || []).join(' | ').replace(/\|\s*\|/g, '|'));
  const base = {
    ...block,
    aciklama: aciklama || 'Banka hareketi',
  };
  delete base.aciklamaSatirlari;
  const [tip, kat, durum, guven, risk] = classify(base);
  base.aday_islem_tipi = tip;
  base.aday_kategori = kat;
  base.durum = durum;
  base.guven = guven;
  base.risk = risk;
  base.hash = hash(base);
  return base;
}

function dedupe(rows) {
  return [...new Map(rows.map(r => [r.hash, r])).values()];
}

async function ocr(file) {
  const Tesseract = require('tesseract.js');
  const r = await Tesseract.recognize(file, 'tur+eng');
  return r.data?.text || '';
}

async function saveRows(rows, text) {
  if (!SAVE_SUPABASE || !rows.length) return { raw: 0, approval: 0, v57Raw: 0, v57Approval: 0 };
  const rawRows = rows.map(r => ({
    firma_id: r.firma_id,
    kaynak_banka: r.kaynak_banka,
    kaynak_dosya: r.kaynak_dosya,
    tarih: r.tarih,
    saat: null,
    aciklama: r.aciklama,
    tutar: r.tutar,
    bakiye: r.bakiye,
    yon: r.yon,
    islem_tipi: r.islem_tipi,
    hash: r.hash,
    aday_kategori: r.aday_kategori,
    aday_cari: '',
    aday_islem_tipi: r.aday_islem_tipi,
    durum: r.durum,
    guven: r.guven,
    risk: r.risk,
    raw: { ...r, ocr_text: text },
    updated_at: new Date().toISOString(),
  }));
  const raw = await db.from('banka_raw').upsert(rawRows, { onConflict: 'firma_id,hash', ignoreDuplicates: true }).select('id');
  if (raw.error) throw new Error(`banka_raw: ${raw.error.message}`);

  let approval = 0;
  let v57Raw = 0;
  let v57Approval = 0;
  if (SAVE_APPROVAL) {
    for (const r of rows) {
      const row = {
        firma_id: r.firma_id,
        banka: r.kaynak_banka,
        hesap: r.kaynak_banka,
        tarih: r.tarih,
        aciklama: r.aciklama,
        karsi_taraf: '',
        cari_unvan: '',
        tutar: Math.abs(Number(r.tutar || 0)),
        tur: r.aday_islem_tipi,
        sinif_guven: r.guven,
        sinif_kaynak: r.risk,
        ogrenme_durumu: r.guven === 100 ? 'ogrenildi' : 'bekliyor',
        onay_durumu: r.durum === 'islenmeyecek' ? 'reddedildi' : 'bekliyor',
        kaynak: 'banka_gorsel_parser',
        raw: r,
        updated_at: new Date().toISOString(),
      };
      const exists = await db.from('bank_transactions')
        .select('id')
        .eq('firma_id', row.firma_id)
        .eq('raw->>hash', r.hash)
        .limit(1);
      if (exists.error) throw new Error(`bank_transactions: ${exists.error.message}`);
      if (exists.data?.length) continue;
      const fuzzyExists = await db.from('bank_transactions')
        .select('id,aciklama')
        .eq('firma_id', row.firma_id)
        .eq('banka', row.banka)
        .eq('tarih', row.tarih)
        .eq('tutar', row.tutar)
        .limit(10);
      if (fuzzyExists.error) throw new Error(`bank_transactions: ${fuzzyExists.error.message}`);
      if ((fuzzyExists.data || []).some((x) => key(x.aciklama).includes(key(row.aciklama).slice(0, 40)) || key(row.aciklama).includes(key(x.aciklama).slice(0, 40)))) continue;
      const ins = await db.from('bank_transactions').insert(row);
      if (ins.error) throw new Error(`bank_transactions: ${ins.error.message}`);
      approval += 1;
    }
    const v57 = await saveV57Approvals(rows, text);
    v57Raw = v57.raw;
    v57Approval = v57.approval;
  }
  return { raw: raw.data?.length || 0, approval, v57Raw, v57Approval };
}

function v57Direction(row) {
  if (row.aday_islem_tipi === 'virman' || row.aday_islem_tipi === 'transfer') return 'transfer';
  if (Number(row.tutar || 0) > 0) return 'in';
  if (Number(row.tutar || 0) < 0) return 'out';
  return 'unknown';
}

function v57Type(row) {
  const tip = row.aday_islem_tipi || (Number(row.tutar || 0) > 0 ? 'tahsilat' : 'odeme');
  if (tip === 'cari_tahsilat') return 'tahsilat';
  if (tip === 'banka_gider') return 'gider_odeme';
  if (tip === 'transfer') return 'virman';
  return tip;
}

async function saveV57Approvals(rows, text) {
  const rpcSaved = await saveV57ApprovalsWithRpc(rows, text);
  if (!rpcSaved.error) return rpcSaved.data;
  if (!isMissingV57(rpcSaved.error) && !isMissingRpc(rpcSaved.error)) {
    throw new Error(`ingest_bank_image_transactions_v59: ${rpcSaved.error.message}`);
  }

  let raw = 0;
  let approval = 0;
  for (const r of rows) {
    const amount = Math.abs(Number(r.tutar || 0));
    const direction = v57Direction(r);
    const rawRow = {
      company: r.firma_id,
      bank_name: r.kaynak_banka,
      transaction_date: r.tarih,
      description: r.aciklama,
      debit_amount: direction === 'out' ? amount : 0,
      credit_amount: direction === 'in' ? amount : 0,
      amount,
      currency: 'TRY',
      balance_after: r.bakiye,
      direction,
      raw_text: text,
      source_type: 'telegram_bank_image',
      source_file_name: r.kaynak_dosya,
      transaction_hash: r.hash,
      duplicate_status: 'unique',
      status: r.durum === 'islenmeyecek' ? 'rejected' : 'approval_waiting',
    };
    const rawUpsert = await saveV57RawTransaction(rawRow);
    if (isMissingV57(rawUpsert.error)) return { raw, approval };
    if (isRlsWriteBlocked(rawUpsert.error)) return { raw, approval };
    if (rawUpsert.error) throw new Error(`bank_transactions_raw: ${rawUpsert.error.message}`);
    raw += 1;
    const rawId = rawUpsert.data.id;

    const suggestion = {
      company: r.firma_id,
      raw_transaction_id: rawId,
      suggested_type: v57Type(r),
      suggested_customer_name: r.karsi_taraf || r.aday_cari || '',
      confidence_score: r.guven || 50,
      match_reason: r.risk || 'Telegram banka gorseli OCR siniflandirma',
      risk_note: r.guven >= 85 ? 'Tek tik onaya hazir.' : 'Kontrol onerilir.',
      approval_status: r.guven >= 70 ? 'approval_waiting' : 'control_waiting',
    };
    const existingSuggestion = await db.from('cash_transaction_suggestions')
      .select('id')
      .eq('raw_transaction_id', rawId)
      .limit(1);
    if (isMissingV57(existingSuggestion.error)) return { raw, approval };
    if (isRlsWriteBlocked(existingSuggestion.error)) return { raw, approval };
    if (existingSuggestion.error) throw new Error(`cash_transaction_suggestions: ${existingSuggestion.error.message}`);
    if (!existingSuggestion.data?.length) {
      const suggestionInsert = await db.from('cash_transaction_suggestions').insert(suggestion);
      if (isMissingV57(suggestionInsert.error)) return { raw, approval };
      if (isRlsWriteBlocked(suggestionInsert.error)) return { raw, approval };
      if (suggestionInsert.error) throw new Error(`cash_transaction_suggestions: ${suggestionInsert.error.message}`);
    }

    const existingApproval = await db.from('aperion_approval_center')
      .select('id')
      .eq('source_type', 'bank_transactions_raw')
      .eq('source_id', rawId)
      .limit(1);
    if (isMissingV57(existingApproval.error)) return { raw, approval };
    if (isRlsWriteBlocked(existingApproval.error)) return { raw, approval };
    if (existingApproval.error) throw new Error(`aperion_approval_center: ${existingApproval.error.message}`);
    if (existingApproval.data?.length) continue;
    const approvalRow = {
      company: r.firma_id,
      source_type: 'bank_transactions_raw',
      source_id: rawId,
      approval_title: `${r.kaynak_banka} ${v57Type(r)} ${amount.toLocaleString('tr-TR')} TL`,
      approval_description: r.aciklama,
      suggested_entry_type: v57Type(r),
      suggested_customer_name: r.karsi_taraf || r.aday_cari || '',
      suggested_amount: amount,
      confidence_score: r.guven || 50,
      match_reason: r.risk || 'Telegram banka gorseli OCR siniflandirma',
      risk_note: r.guven >= 85 ? 'Tek tik onaya hazir.' : 'Kontrol onerilir.',
      status: r.durum === 'islenmeyecek' ? 'rejected' : 'approval_waiting',
    };
    const approvalInsert = await db.from('aperion_approval_center').insert(approvalRow);
    if (isMissingV57(approvalInsert.error)) return { raw, approval };
    if (isRlsWriteBlocked(approvalInsert.error)) return { raw, approval };
    if (approvalInsert.error) throw new Error(`aperion_approval_center: ${approvalInsert.error.message}`);
    approval += 1;
  }
  return { raw, approval };
}

async function saveV57ApprovalsWithRpc(rows, text) {
  const payload = rows.map((r) => ({
    ...r,
    direction: v57Direction(r),
    suggested_type: v57Type(r),
  }));
  const res = await db.rpc('ingest_bank_image_transactions_v59', {
    p_company: FIRMA_ID,
    p_rows: payload,
    p_raw_text: text,
  });
  if (res.error) return { error: res.error };
  const first = Array.isArray(res.data) ? res.data[0] : res.data;
  return {
    data: {
      raw: Number(first?.raw_count || 0),
      approval: Number(first?.approval_count || 0),
    },
    error: null,
  };
}

async function saveV57RawTransaction(rawRow) {
  const upserted = await db.from('bank_transactions_raw')
    .upsert(rawRow, { onConflict: 'company,transaction_hash' })
    .select('id')
    .single();
  if (!isMissingUpsertConstraint(upserted.error)) return upserted;

  const existing = await db.from('bank_transactions_raw')
    .select('id')
    .eq('company', rawRow.company)
    .eq('transaction_hash', rawRow.transaction_hash)
    .limit(1);
  if (existing.error) return { error: existing.error };
  if (existing.data?.length) {
    const updated = await db.from('bank_transactions_raw')
      .update(rawRow)
      .eq('id', existing.data[0].id)
      .select('id')
      .single();
    return updated.error ? { data: existing.data[0], error: null } : updated;
  }

  const inserted = await db.from('bank_transactions_raw')
    .insert(rawRow)
    .select('id')
    .single();
  if (!inserted.error) return inserted;

  const raced = await db.from('bank_transactions_raw')
    .select('id')
    .eq('company', rawRow.company)
    .eq('transaction_hash', rawRow.transaction_hash)
    .limit(1);
  if (!raced.error && raced.data?.length) return { data: raced.data[0], error: null };
  return inserted;
}

function isMissingUpsertConstraint(error) {
  const msg = String(error?.message || '');
  return Boolean(error && msg.includes('no unique or exclusion constraint matching the ON CONFLICT specification'));
}

function isMissingV57(error) {
  const msg = String(error?.message || '');
  return Boolean(error && (
    msg.includes("Could not find the table 'public.bank_transactions_raw'") ||
    msg.includes("Could not find the table 'public.cash_transaction_suggestions'") ||
    msg.includes("Could not find the table 'public.aperion_approval_center'") ||
    msg.includes('schema cache')
  ));
}

function isMissingRpc(error) {
  const msg = String(error?.message || '');
  return Boolean(error && (
    msg.includes('ingest_bank_image_transactions_v59') ||
    msg.includes('Could not find the function') ||
    msg.includes('schema cache')
  ));
}

function isRlsWriteBlocked(error) {
  const msg = String(error?.message || '');
  return Boolean(error && msg.includes('violates row-level security policy'));
}

(async () => {
  const text = fs.existsSync(`${FILE}.txt`) ? fs.readFileSync(`${FILE}.txt`, 'utf8') : await ocr(FILE);
  const rows = parseFromTextBlocks(text);
  const payload = {
    olusturma_tarihi: new Date().toISOString(),
    kaynak_dosya: path.resolve(FILE),
    firma_id: FIRMA_ID,
    toplam: rows.length,
    ocr_text: text,
    kayitlar: rows,
  };
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf8');
  const saved = await saveRows(rows, text);
  console.log(`Gorsel banka: ${rows.length} hareket, banka_raw ${saved.raw}, onay ${saved.approval}, v57_raw ${saved.v57Raw}, v57_onay ${saved.v57Approval}`);
})().catch(e => {
  console.error('HATA:', e.message);
  process.exitCode = 1;
});
