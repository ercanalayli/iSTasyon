const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const input = process.argv[2] || path.join(ROOT, 'masraf_alayli_2026.json');
const output = process.argv[3] || path.join(ROOT, 'data', 'bizimhesap_fatura_acma_kuyrugu.json');

function norm(v) {
  return String(v || '').toLocaleLowerCase('tr-TR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
}

function invoiceNo(text) {
  const s = String(text || '');
  const patterns = [
    /No[:\s]*([A-ZÇĞİÖŞÜ0-9]{3,}[0-9]{6,})/i,
    /([A-ZÇĞİÖŞÜ]{2,4}[0-9]{10,})/i,
    /([A-ZÇĞİÖŞÜ][0-9]{12,})/i
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) return m[1];
  }
  return '';
}

function kind(row) {
  const text = norm([row.kategori, row.aciklama, row.tedarikci, row.raw && row.raw.text].filter(Boolean).join(' '));
  if (/musteriden alinan urun|iade/.test(text)) return 'satis_iadesi';
  if (/tedarikciden alis|alis fatura|alis faturasi/.test(text)) return 'alis_faturasi';
  if (/elektrik|su|iletisim|isinma|dogalgaz|telefon|internet|kargo|market/.test(text)) return 'gider_faturasi';
  return 'kontrol';
}

const data = JSON.parse(fs.readFileSync(input, 'utf8'));
const rows = Array.isArray(data) ? data : data.kayitlar || data.rows || [];

const tasks = rows.map((row, i) => {
  const text = [row.aciklama, row.tedarikci, row.raw && row.raw.text].filter(Boolean).join(' ');
  const no = invoiceNo(text);
  const taskKind = kind(row);
  const mustOpen = Boolean(no) || taskKind !== 'kontrol';
  return {
    task_id: `${row.firma_id || 'alayli'}-${row.tarih || 'tarihsiz'}-${i + 1}`,
    firma_id: row.firma_id || 'alayli',
    tarih: row.tarih || '',
    tutar: Number(row.tutar || 0),
    kaynak_kategori: row.kategori || '',
    tedarikci: row.tedarikci || '',
    aciklama: row.aciklama || '',
    fatura_no_adayi: no,
    fatura_tipi_adayi: taskKind,
    durum: mustOpen ? 'fatura_detayi_acilacak' : 'ozet_kayit_kontrol',
    arama_anahtari: no || [row.tedarikci, row.tarih, row.tutar].filter(Boolean).join(' | '),
    okunacak_alanlar: ['cari','vergi_no','fatura_no','fatura_tarihi','vade','kalemler','kdv','toplam','odeme_durumu','pdf_xml'],
  };
}).filter(x => x.durum === 'fatura_detayi_acilacak');

const report = {
  created_at: new Date().toISOString(),
  input,
  summary: {
    source_rows: rows.length,
    invoice_open_tasks: tasks.length,
    alis_faturasi: tasks.filter(x => x.fatura_tipi_adayi === 'alis_faturasi').length,
    gider_faturasi: tasks.filter(x => x.fatura_tipi_adayi === 'gider_faturasi').length,
    satis_iadesi: tasks.filter(x => x.fatura_tipi_adayi === 'satis_iadesi').length,
  },
  tasks
};

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report.summary, null, 2));
console.log(output);
