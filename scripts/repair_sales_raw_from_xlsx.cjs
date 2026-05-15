const fs = require('fs');
const crypto = require('crypto');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const args = process.argv.slice(2);
const file = args[0];
const firma = args.includes('--firma') ? args[args.indexOf('--firma') + 1] : 'alayli';
const commit = args.includes('--commit');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW';

function fail(msg) {
  console.error('[AperiON] ' + msg);
  process.exit(1);
}

function trNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value || '').replace(/TL|TRY|₺/gi, '').replace(/\s/g, '').replace(/[^0-9,.-]/g, '');
  if (!raw) return 0;
  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  let normalized = raw;
  if (comma >= 0 && dot >= 0) normalized = comma > dot ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
  else if (comma >= 0) normalized = raw.replace(/\./g, '').replace(',', '.');
  else if (dot >= 0) {
    const parts = raw.split('.');
    normalized = parts.length > 2 || parts.at(-1).length === 3 ? raw.replace(/\./g, '') : raw;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function isoDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30));
    d.setUTCDate(d.getUTCDate() + value);
    return d.toISOString().slice(0, 10);
  }
  const raw = String(value || '').trim();
  const m = raw.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return '';
}

function pick(row, index, name) {
  return row[index[name]] ?? '';
}

if (!file || !fs.existsSync(file)) fail('xlsx dosyası bulunamadı');

const wb = XLSX.readFile(file, { cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
if (rows.length < 4) fail('rapor satırı yok');

const reportRange = String(rows[1]?.[0] || '').trim();
const headers = rows[2].map(x => String(x || '').trim());
const index = Object.fromEntries(headers.map((h, i) => [h, i]));
const required = ['Tarih', 'Ürün', 'Miktar', 'TOPLAM'];
for (const col of required) if (!(col in index)) fail(`kolon yok: ${col}`);

const sourceRows = rows.slice(3).filter(r => isoDate(pick(r, index, 'Tarih')));
const records = sourceRows.map((r, i) => {
  const tarih = isoDate(pick(r, index, 'Tarih'));
  const ciro = trNumber(pick(r, index, 'TOPLAM')) || trNumber(pick(r, index, 'Tutar')) || trNumber(pick(r, index, 'Net'));
  const adet = trNumber(pick(r, index, 'Miktar'));
  const urun = String(pick(r, index, 'Ürün') || pick(r, index, 'Satır Açıklaması') || 'EMPTY').trim().substring(0, 500);
  const unvan = String(pick(r, index, 'Müşteri') || 'Perakende Satışlar').trim().substring(0, 200);
  const kategori = String(pick(r, index, 'Kategori') || pick(r, index, 'Sınıf1') || '').trim() || null;
  const hash = crypto.createHash('sha1').update([firma, tarih, i + 1, urun, unvan, adet, ciro].join('|')).digest('hex');
  return {
    urun,
    adet,
    ciro,
    kaynak: 'bizimhesap_xlsx_onarim',
    tarih,
    unvan,
    kategori,
    yil: Number(tarih.slice(0, 4)),
    ay: Number(tarih.slice(5, 7)),
    firma_id: firma,
    firma_adi: firma === 'alayli' ? 'ALAYLI MEDİKAL' : firma,
    fatura_no: String(pick(r, index, 'Belge No') || '').trim() || null,
    urun_kod: String(pick(r, index, 'Kod') || '').trim() || null,
    kaynak_rapor_tarihi: tarih,
    kaynak_cekilme_tarihi: new Date().toISOString(),
    belge_no: String(pick(r, index, 'Belge No') || '').trim() || null,
    satir_hash: hash,
    degisim_durumu: null,
    denetim_notu: `Excel kaynak onarım: ${file.split(/[\\/]/).pop()}`
  };
});

const dates = [...new Set(records.map(r => r.tarih))];
const total = records.reduce((s, r) => s + Number(r.ciro || 0), 0);
const qty = records.reduce((s, r) => s + Number(r.adet || 0), 0);
console.log(JSON.stringify({ commit, firma, dates, rows: records.length, adet: qty, ciro: total }, null, 2));

if (!commit) process.exit(0);
if (dates.length !== 1) fail('tek günlük rapor bekleniyor; işlem durduruldu');

(async () => {
  const db = createClient(SUPABASE_URL, SUPABASE_KEY);
  const date = dates[0];
  const del = await db.from('sales_raw').delete().eq('firma_id', firma).eq('tarih', date);
  if (del.error) fail('silme hatası: ' + del.error.message);
  const ins = await db.from('sales_raw').insert(records).select('id');
  if (ins.error) fail('insert hatası: ' + ins.error.message);
  console.log(`[AperiON] ${date} onarıldı: ${ins.data.length} kayıt`);
})().catch(e => fail(e.message));
