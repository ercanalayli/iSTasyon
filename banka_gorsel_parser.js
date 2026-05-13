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
  if (t.includes('virman') || t.includes('hesaplar arasi')) return ['virman', 'ic_transfer', 'islenmeyecek', 100, 'ic_transfer'];
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

function dedupe(rows) {
  return [...new Map(rows.map(r => [r.hash, r])).values()];
}

async function ocr(file) {
  const Tesseract = require('tesseract.js');
  const r = await Tesseract.recognize(file, 'tur+eng');
  return r.data?.text || '';
}

async function saveRows(rows, text) {
  if (!SAVE_SUPABASE || !rows.length) return { raw: 0, approval: 0 };
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
        .eq('tarih', row.tarih)
        .eq('tutar', row.tutar)
        .eq('aciklama', row.aciklama)
        .limit(1);
      if (exists.error) throw new Error(`bank_transactions: ${exists.error.message}`);
      if (exists.data?.length) continue;
      const ins = await db.from('bank_transactions').insert(row);
      if (ins.error) throw new Error(`bank_transactions: ${ins.error.message}`);
      approval += 1;
    }
  }
  return { raw: raw.data?.length || 0, approval };
}

(async () => {
  const text = fs.existsSync(`${FILE}.txt`) ? fs.readFileSync(`${FILE}.txt`, 'utf8') : await ocr(FILE);
  const rows = parseFromText(text);
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
  console.log(`Gorsel banka: ${rows.length} hareket, banka_raw ${saved.raw}, onay ${saved.approval}`);
})().catch(e => {
  console.error('HATA:', e.message);
  process.exitCode = 1;
});
