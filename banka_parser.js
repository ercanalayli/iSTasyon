const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
const getArg = (name, fallback = '') => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const FILE = getArg('--file');
const FIRMA_ID = getArg('--firma', 'alayli');
const BANKA_ARG = getArg('--banka', '');
const OUT = getArg('--out', '');
const HTML = getArg('--html', '');
const LOCAL_DB = getArg('--local-db', 'banka_raw_local.json');
const SAVE_LOCAL = args.includes('--save-local');
const SAVE_SUPABASE = args.includes('--save-supabase');
const SAVE_APPROVAL = args.includes('--save-approval');
const PREVIEW = args.includes('--preview') || !OUT;

const SUPABASE = {
  url: process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co',
  key: process.env.SUPABASE_KEY || 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW',
  table: process.env.BANKA_RAW_TABLE || 'banka_raw',
  approvalTable: process.env.BANK_APPROVAL_TABLE || 'bank_transactions',
};

if (!FILE) {
  console.error('Kullanim: node banka_parser.js --file "ekstre.xlsx|pdf" --firma alayli --preview');
  process.exit(1);
}

function normText(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function keyText(s) {
  return normText(s)
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');
}

function parseMoney(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).replace(/\s/g, '').replace(/TL|TRY/gi, '');
  const negative = s.includes('-') || /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, '').replace(/[^0-9,.-]/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative && n > 0 ? -n : n;
}

function parseDate(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  let m = s.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = s.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return null;
}

function parseTime(text) {
  const m = String(text || '').match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}:${m[3] || '00'}` : null;
}

function detectBank(text, file) {
  const t = keyText(`${text} ${file}`);
  if (t.includes('is bank') || t.includes('isbank') || t.includes('iş bank')) return 'IS BANKASI';
  if (t.includes('halk bank') || t.includes('halkbank')) return 'HALKBANK';
  if (t.includes('vakif')) return 'VAKIFBANK';
  if (t.includes('garanti')) return 'GARANTI';
  if (t.includes('akbank')) return 'AKBANK';
  if (t.includes('yapi kredi')) return 'YAPI KREDI';
  return BANKA_ARG || 'BILINMEYEN BANKA';
}

function extractCari(desc) {
  const d = normText(desc);
  const upper = d.toLocaleUpperCase('tr-TR');
  const patterns = [
    /(.+?)\s+'DAN\s+GELEN/i,
    /(.+?)\s+DAN\s+GELEN/i,
    /GELEN\s+(?:EFT|FAST).*?[-,]\s*(.+?)(?:,|$)/i,
  ];
  for (const p of patterns) {
    const m = upper.match(p);
    if (m && m[1]) return normText(m[1]).slice(0, 160);
  }
  return '';
}

function classify(row) {
  const d = keyText(row.aciklama);
  const amount = Number(row.tutar || 0);
  const has = (...words) => words.some(w => d.includes(keyText(w)));
  const cari = extractCari(row.aciklama);

  if (has('virman', 'hesaplar arasi', 'başka hesaba', 'baska hesaba', 'başka hesaptan', 'baska hesaptan')) {
    return {
      aday_kategori: 'ic_transfer',
      aday_cari: '',
      aday_islem_tipi: 'virman',
      durum: 'islenmeyecek',
      risk: 'ic_transfer',
      guven: 100,
    };
  }

  if (amount > 0 && has('gelen eft', 'gelen fast', "'dan gelen", 'dan gelen')) {
    return {
      aday_kategori: 'tahsilat',
      aday_cari: cari,
      aday_islem_tipi: 'cari_tahsilat',
      durum: cari ? 'islenecek' : 'onay_bekliyor',
      risk: cari ? 'musteri_odeme_adayi' : 'cari_belirsiz',
      guven: cari ? 90 : 70,
    };
  }

  if (amount < 0 && has('hgs', 'ttnet', 'telekom', 'turk telekom', 'sgk', 'eft ucreti', 'elektronik fon transferi', 'bsmv', 'kredi tahsis ucreti', 'komisyon')) {
    return {
      aday_kategori: 'banka_masrafi',
      aday_cari: '',
      aday_islem_tipi: 'banka_gider',
      durum: 'islenecek',
      risk: 'gider_adayi',
      guven: 95,
    };
  }

  if (has('moka', 'kmh', 'cek', 'çek', 'kredi', 'kart', 'int', 'pos')) {
    return {
      aday_kategori: 'ozel_islem',
      aday_cari: cari,
      aday_islem_tipi: 'ozel',
      durum: 'onay_bekliyor',
      risk: 'ozel_kontrol',
      guven: 50,
    };
  }

  return {
    aday_kategori: amount >= 0 ? 'belirsiz_giris' : 'belirsiz_cikis',
    aday_cari: cari,
    aday_islem_tipi: amount >= 0 ? 'bekleyen_tahsilat' : 'bekleyen_gider',
    durum: 'onay_bekliyor',
    risk: 'kural_yok',
    guven: 30,
  };
}

function makeHash(row) {
  const raw = [
    row.firma_id,
    row.kaynak_banka,
    row.tarih,
    row.saat || '',
    row.aciklama,
    Number(row.tutar || 0).toFixed(2),
    row.bakiye == null ? '' : Number(row.bakiye).toFixed(2),
  ].map(x => keyText(x)).join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function normalizeRow(raw, bank) {
  const tarih = parseDate(raw.tarih || raw.islem_tarihi || raw.date);
  const aciklama = normText(raw.aciklama || raw.description || raw.detay);
  const tutar = parseMoney(raw.tutar ?? raw.islem_tutari ?? raw.amount);
  const bakiye = parseMoney(raw.bakiye ?? raw.yeni_bakiye ?? raw.balance);
  if (!tarih || !aciklama || tutar == null) return null;
  const base = {
    tarih,
    saat: parseTime(aciklama) || raw.saat || null,
    aciklama,
    tutar,
    bakiye,
    yon: tutar >= 0 ? 'giris' : 'cikis',
    islem_tipi: raw.islem_tipi || '',
    kaynak_banka: bank,
    firma_id: FIRMA_ID,
  };
  const c = classify(base);
  const row = { ...base, ...c };
  row.hash = makeHash(row);
  return row;
}

function headerIndex(headers, names) {
  const normalized = headers.map(keyText);
  return normalized.findIndex(h => names.some(n => h.includes(keyText(n))));
}

function parseExcel(file) {
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(file, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const bank = detectBank(JSON.stringify(rows.slice(0, 30)), file);
  const headerRow = rows.findIndex(r => {
    const t = r.map(keyText).join('|');
    return t.includes('tarih') && t.includes('aciklama') && (t.includes('tutar') || t.includes('miktar'));
  });
  if (headerRow < 0) throw new Error('Excel baslik satiri bulunamadi.');
  const headers = rows[headerRow];
  const idx = {
    tarih: headerIndex(headers, ['islem tarihi', 'tarih']),
    aciklama: headerIndex(headers, ['aciklama', 'açıklama', 'detay']),
    tutar: headerIndex(headers, ['islem tutari', 'işlem tutarı', 'tutar']),
    bakiye: headerIndex(headers, ['yeni bakiye', 'bakiye']),
  };
  return rows.slice(headerRow + 1)
    .map(r => normalizeRow({
      tarih: r[idx.tarih],
      aciklama: r[idx.aciklama],
      tutar: r[idx.tutar],
      bakiye: r[idx.bakiye],
    }, bank))
    .filter(Boolean);
}

async function parsePdf(file) {
  const { PDFParse } = require('pdf-parse');
  const parser = new PDFParse({ data: fs.readFileSync(file) });
  const data = await parser.getText();
  await parser.destroy?.();
  const text = data.text || '';
  const bank = detectBank(text, file);
  const lines = text.split(/\r?\n/).map(normText).filter(Boolean);
  const records = [];
  let cur = '';
  const dateStart = /^\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/;
  for (const line of lines) {
    if (dateStart.test(line)) {
      if (cur) records.push(cur);
      cur = line;
    } else if (cur && !/^(--|Hesap Hareketleri|Tarih Saat|www\.|Ticaret|Mersis|İşletmenin|Blok|T:|F:)/i.test(line)) {
      cur += ' ' + line;
    }
  }
  if (cur) records.push(cur);

  const out = [];
  const moneyRe = /-?[\d.]+,\d{2}\s*(?:TL|₺)?|-?\d+\.\d{2}\s*(?:TL|₺)?/gi;
  for (const rec of records) {
    const date = rec.match(dateStart)?.[0];
    const time = parseTime(rec);
    const monies = [...rec.matchAll(moneyRe)].map(m => ({ value: m[0], index: m.index || 0 }));
    if (!date || monies.length < 1) continue;
    const tutarToken = monies.length >= 2 ? monies[monies.length - 2] : monies[monies.length - 1];
    const bakiyeToken = monies.length >= 2 ? monies[monies.length - 1] : null;
    const descStart = rec.indexOf(date) + date.length + (time ? rec.slice(rec.indexOf(date) + date.length).indexOf(time) + time.length : 0);
    const descEnd = tutarToken.index;
    const aciklama = normText(rec.slice(Math.max(descStart, date.length), descEnd));
    const row = normalizeRow({ tarih: date, saat: time, aciklama, tutar: tutarToken.value, bakiye: bakiyeToken?.value }, bank);
    if (row) out.push(row);
  }
  return out.filter(Boolean);
}

function dedupe(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    if (seen.has(r.hash)) continue;
    seen.add(r.hash);
    out.push(r);
  }
  return out;
}

function applyLocalDuplicateCheck(rows) {
  let existing = [];
  if (LOCAL_DB && fs.existsSync(LOCAL_DB)) {
    try {
      existing = JSON.parse(fs.readFileSync(LOCAL_DB, 'utf8'));
    } catch {
      existing = [];
    }
  }
  const known = new Set(existing.map(r => r.hash).filter(Boolean));
  const yeni = [];
  const tekrar = [];
  for (const row of rows) {
    if (known.has(row.hash)) {
      tekrar.push({ ...row, tekrar_kayit: true, durum: 'islenmeyecek', risk: 'tekrar_hash' });
    } else {
      yeni.push({ ...row, tekrar_kayit: false });
    }
  }
  if (SAVE_LOCAL && LOCAL_DB) {
    fs.writeFileSync(LOCAL_DB, JSON.stringify([...existing, ...yeni], null, 2), 'utf8');
  }
  return { yeni, tekrar };
}

function group(rows) {
  return {
    islenecek_tahsilatlar: rows.filter(r => r.aday_islem_tipi === 'cari_tahsilat' && r.durum === 'islenecek'),
    islenecek_giderler: rows.filter(r => r.aday_islem_tipi === 'banka_gider' && r.durum === 'islenecek'),
    islenmeyecek_virmanlar: rows.filter(r => r.durum === 'islenmeyecek'),
    ozel_onay_bekleyenler: rows.filter(r => r.durum === 'onay_bekliyor'),
  };
}

async function saveSupabase(payload) {
  if (!SAVE_SUPABASE || !payload.kayitlar.length) return 0;
  const { createClient } = require('@supabase/supabase-js');
  const db = createClient(SUPABASE.url, SUPABASE.key);
  const rows = payload.kayitlar.map(r => ({
    firma_id: r.firma_id,
    kaynak_banka: r.kaynak_banka,
    kaynak_dosya: payload.kaynak_dosya,
    tarih: r.tarih,
    saat: r.saat,
    aciklama: r.aciklama,
    tutar: r.tutar,
    bakiye: r.bakiye,
    yon: r.yon,
    islem_tipi: r.islem_tipi || null,
    hash: r.hash,
    aday_kategori: r.aday_kategori,
    aday_cari: r.aday_cari,
    aday_islem_tipi: r.aday_islem_tipi,
    durum: r.durum,
    guven: r.guven,
    risk: r.risk,
    raw: r,
    updated_at: new Date().toISOString(),
  }));
  const { data, error } = await db.from(SUPABASE.table)
    .upsert(rows, { onConflict: 'firma_id,hash', ignoreDuplicates: true })
    .select('id');
  if (error) throw new Error(`Supabase ${SUPABASE.table}: ${error.message}`);
  return data?.length || 0;
}

function approvalTur(row) {
  if (row.aday_islem_tipi === 'cari_tahsilat') return 'cari_tahsilat';
  if (row.aday_islem_tipi === 'banka_gider') return 'banka_gider';
  if (row.aday_islem_tipi === 'virman') return 'virman';
  if (row.aday_islem_tipi === 'ozel') return 'ozel';
  return row.yon === 'giris' ? 'tahsilat' : 'bekleyen';
}

async function saveApprovalSupabase(payload) {
  if (!SAVE_APPROVAL || !payload.kayitlar.length) return 0;
  const { createClient } = require('@supabase/supabase-js');
  const db = createClient(SUPABASE.url, SUPABASE.key);
  const rows = payload.kayitlar.map(r => ({
    firma_id: r.firma_id,
    banka: r.kaynak_banka,
    hesap: r.hesap || r.kaynak_banka || '*IS BANKASI',
    tarih: r.tarih,
    aciklama: r.aciklama,
    karsi_taraf: r.aday_cari || '',
    cari_unvan: r.aday_cari || '',
    tutar: Math.abs(Number(r.tutar || 0)),
    tur: approvalTur(r),
    sinif_guven: Number(r.guven || 0),
    sinif_kaynak: r.risk || 'banka_parser',
    ogrenme_durumu: Number(r.guven || 0) === 100 ? 'ogrenildi' : 'bekliyor',
    onay_durumu: r.durum === 'islenmeyecek' ? 'reddedildi' : 'bekliyor',
    bizimhesap_durumu: null,
    aperion_not: [
      'APERION BANKA',
      `HASH:${String(r.hash || '').slice(0, 12)}`,
      `KURAL:${r.risk || '-'}`,
      `DURUM:${r.durum}`,
    ].join(' | '),
    kaynak: 'banka_parser',
    raw: r,
    updated_at: new Date().toISOString(),
  }));
  let inserted = 0;
  for (const row of rows) {
    const exists = await db.from(SUPABASE.approvalTable)
      .select('id')
      .eq('firma_id', row.firma_id)
      .eq('tarih', row.tarih)
      .eq('tutar', row.tutar)
      .eq('aciklama', row.aciklama)
      .eq('karsi_taraf', row.karsi_taraf || '')
      .limit(1);
    if (exists.error) throw new Error(`Supabase ${SUPABASE.approvalTable}: ${exists.error.message}`);
    if (exists.data?.length) continue;
    const { error } = await db.from(SUPABASE.approvalTable).insert(row);
    if (error) throw new Error(`Supabase ${SUPABASE.approvalTable}: ${error.message}`);
    inserted++;
  }
  return inserted;
}

function printPreview(rows) {
  const g = group(rows);
  const tl = n => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  console.log(`\nAperiON Banka Onizleme - ${FIRMA_ID}`);
  console.log(`Toplam: ${rows.length}`);
  for (const [name, list] of Object.entries(g)) {
    console.log(`\n${name}: ${list.length}`);
    for (const r of list.slice(0, 12)) {
      console.log(`- ${r.tarih} | ${tl(r.tutar)} TL | ${r.aday_islem_tipi} | ${r.aday_cari || '-'} | ${r.aciklama.slice(0, 110)}`);
    }
    if (list.length > 12) console.log(`  ... ${list.length - 12} kayit daha`);
  }
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[m]));
}

function approvalHtml(payload) {
  const tl = n => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sections = [
    ['İşlenecek tahsilatlar', 'islenecek_tahsilatlar', 'ok'],
    ['İşlenecek giderler', 'islenecek_giderler', 'warn'],
    ['İşlenmeyecek virmanlar', 'islenmeyecek_virmanlar', 'muted'],
    ['Özel / onay bekleyenler', 'ozel_onay_bekleyenler', 'risk'],
  ];
  const groups = group(payload.kayitlar);
  const rows = list => list.map(r => `
    <tr>
      <td>${esc(r.tarih)}<small>${esc(r.saat || '')}</small></td>
      <td class="${r.yon === 'giris' ? 'in' : 'out'}">${tl(r.tutar)} TL</td>
      <td>${esc(r.aday_islem_tipi)}</td>
      <td>${esc(r.aday_cari || '-')}</td>
      <td>${esc(r.aciklama)}</td>
      <td><code>${esc(String(r.hash).slice(0, 12))}</code></td>
      <td>${esc(r.guven)}/100</td>
    </tr>`).join('');
  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AperiON Banka Onay Önizleme</title>
  <style>
    :root{font-family:Inter,Segoe UI,Arial,sans-serif;color:#172033;background:#f4f6fa}
    body{margin:0;padding:24px}
    .wrap{max-width:1320px;margin:auto}
    .top{background:#fff;border:1px solid #dfe6ef;border-radius:10px;padding:18px 20px;margin-bottom:16px}
    h1{font-size:22px;margin:0 0 8px}
    .meta{color:#667085;font-size:13px}
    .cards{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:14px}
    .card{border-radius:8px;padding:12px;background:#eef4ff;border:1px solid #d8e5ff}
    .card b{display:block;font-size:20px;margin-top:4px}
    section{background:#fff;border:1px solid #dfe6ef;border-radius:10px;margin:14px 0;overflow:hidden}
    h2{font-size:15px;margin:0;padding:12px 14px;border-left:5px solid #64748b;background:#f8fafc}
    h2.ok{border-color:#0f9f6e} h2.warn{border-color:#d97706} h2.muted{border-color:#64748b} h2.risk{border-color:#dc2626}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th,td{padding:10px 12px;border-top:1px solid #edf1f6;vertical-align:top;text-align:left}
    th{font-size:11px;color:#667085;text-transform:uppercase;background:#fbfcfe}
    small{display:block;color:#98a2b3;margin-top:2px}
    code{font-size:12px;background:#f1f5f9;border-radius:4px;padding:2px 5px}
    .in{color:#047857;font-weight:700}.out{color:#b42318;font-weight:700}
    .empty{padding:14px;color:#667085}
  </style>
</head>
<body>
  <main class="wrap">
    <div class="top">
      <h1>AperiON Banka Onay Önizleme</h1>
      <div class="meta">${esc(payload.firma_id)} · ${esc(payload.kaynak_dosya)} · ${esc(payload.olusturma_tarihi)}</div>
      <div class="cards">
        <div class="card">Toplam<b>${payload.toplam}</b></div>
        <div class="card">Tahsilat<b>${payload.gruplar.islenecek_tahsilatlar}</b></div>
        <div class="card">Gider<b>${payload.gruplar.islenecek_giderler}</b></div>
        <div class="card">Virman<b>${payload.gruplar.islenmeyecek_virmanlar}</b></div>
        <div class="card">Onay<b>${payload.gruplar.ozel_onay_bekleyenler}</b></div>
      </div>
    </div>
    ${sections.map(([title, key, cls]) => `
      <section>
        <h2 class="${cls}">${title} · ${groups[key].length}</h2>
        ${groups[key].length ? `
          <table>
            <thead><tr><th>Tarih</th><th>Tutar</th><th>Öneri</th><th>Cari</th><th>Açıklama</th><th>Hash</th><th>Güven</th></tr></thead>
            <tbody>${rows(groups[key])}</tbody>
          </table>` : '<div class="empty">Kayıt yok.</div>'}
      </section>`).join('')}
  </main>
</body>
</html>`;
}

async function main() {
  const ext = path.extname(FILE).toLowerCase();
  let rows;
  if (['.xlsx', '.xls', '.csv'].includes(ext)) rows = parseExcel(FILE);
  else if (ext === '.pdf') rows = await parsePdf(FILE);
  else throw new Error('Desteklenmeyen dosya: ' + ext);
  rows = dedupe(rows);
  const { yeni, tekrar } = applyLocalDuplicateCheck(rows);
  rows = yeni;
  const payload = {
    firma_id: FIRMA_ID,
    kaynak_dosya: FILE,
    olusturma_tarihi: new Date().toISOString(),
    toplam: rows.length,
    tekrar_kayit: tekrar.length,
    gruplar: Object.fromEntries(Object.entries(group(rows)).map(([k, v]) => [k, v.length])),
    kayitlar: rows,
  };
  if (PREVIEW) printPreview(rows);
  if (OUT) {
    fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`\nYazildi: ${OUT}`);
  }
  if (HTML) {
    fs.writeFileSync(HTML, approvalHtml(payload), 'utf8');
    console.log(`HTML yazildi: ${HTML}`);
  }
  if (SAVE_SUPABASE) {
    const count = await saveSupabase(payload);
    console.log(`Supabase ${SUPABASE.table}: ${count} yeni kayit`);
  }
  if (SAVE_APPROVAL) {
    const count = await saveApprovalSupabase(payload);
    console.log(`Supabase ${SUPABASE.approvalTable}: ${count} onay kaydi`);
  }
}

main().catch(e => {
  console.error('HATA:', e.message);
  process.exitCode = 1;
});
