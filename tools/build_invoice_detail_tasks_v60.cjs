const fs = require('fs');
const path = require('path');
const { loadAperionMemory, appendTransactionLog } = require('./aperion_memory.cjs');

const ROOT = path.resolve(__dirname, '..');
const input = process.argv[2] || path.join(ROOT, 'masraf_alayli_2026.json');
const output = process.argv[3] || path.join(ROOT, 'data', 'bizimhesap_fatura_acma_kuyrugu.json');
const MEMORY = loadAperionMemory();

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

function gotchaFlags(row) {
  const text = norm([row.kategori, row.aciklama, row.tedarikci, row.raw && row.raw.text].filter(Boolean).join(' '));
  const flags = [];
  if (/kapora|on odeme|avans/.test(text)) flags.push('kapora_avans_gider_degil');
  if (/iade/.test(text)) flags.push('iade_ters_kayit_stok_odeme_kontrolu');
  if (/kargo|nakliye/.test(text)) flags.push('kargo_musteri_mi_isletme_mi_kontrol');
  if (/okul|egitim|hayir|kurban|zekat/.test(text)) flags.push('kisisel_aile_kontrol');
  if (/pazaryeri|komisyon/.test(text)) flags.push('pazaryeri_komisyon_ayri_izlenmeli');
  return flags;
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
    gotcha_flags: gotchaFlags(row),
    memory_expense_cards: MEMORY.expenseCardNames.slice(0, 40),
    durum: mustOpen ? 'fatura_detayi_acilacak' : 'ozet_kayit_kontrol',
    arama_anahtari: no || [row.tedarikci, row.tarih, row.tutar].filter(Boolean).join(' | '),
    okunacak_alanlar: ['cari','vergi_no','fatura_no','fatura_tarihi','vade','kalemler','kdv','toplam','odeme_durumu','pdf_xml'],
  };
}).filter(x => x.durum === 'fatura_detayi_acilacak');

const report = {
  created_at: new Date().toISOString(),
  input,
  memory: {
    dir: MEMORY.dir,
    active_company: MEMORY.config.active_company || 'ALAYLI Medikal',
    gotcha_rules: MEMORY.gotchaRules.length,
    expense_card_templates: MEMORY.expenseCardNames.length,
    rule_note: 'Ozet satir sadece on bilgidir; kesin karar fatura detayi okununca verilir.'
  },
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
appendTransactionLog(`${new Date().toISOString().slice(0, 10)} | ALAYLI | aperion | fatura_kuyrugu_uretildi | ${path.basename(input)} | ${tasks.length} gorev | 0.00 | ok`);
console.log(JSON.stringify(report.summary, null, 2));
console.log(output);
