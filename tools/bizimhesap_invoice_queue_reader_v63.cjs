const fs = require('fs');
const path = require('path');
const { loadAperionMemory, appendTransactionLog } = require('./aperion_memory.cjs');

const ROOT = path.resolve(__dirname, '..');
const queuePath = process.argv[2] || path.join(ROOT, 'data', 'bizimhesap_fatura_acma_kuyrugu.json');
const outPath = process.argv[3] || path.join(ROOT, 'data', 'bizimhesap_fatura_detaylari_raw.json');
const MEMORY = loadAperionMemory();

const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
const tasks = Array.isArray(queue) ? queue : queue.tasks || [];

const details = tasks.map((t, index) => ({
  task_id: t.task_id || `task-${index + 1}`,
  firma_id: t.firma_id || 'alayli',
  source: 'bizimhesap',
  read_status: 'waiting_browser_reader',
  search_key: t.arama_anahtari || t.fatura_no_adayi || '',
  reader_command: `node bizimhesap_fatura_detay_oku.js --firma ${t.firma_id || 'alayli'} --queue ${queuePath} --out ${outPath}`,
  invoice_no_candidate: t.fatura_no_adayi || '',
  invoice_type_candidate: t.fatura_tipi_adayi || '',
  date_candidate: t.tarih || '',
  vendor_candidate: t.tedarikci || '',
  amount_candidate: Number(t.tutar || 0),
  summary_text: [t.kaynak_kategori, t.tedarikci, t.aciklama].filter(Boolean).join(' | '),
  memory_context: {
    active_company: MEMORY.config.active_company || 'ALAYLI Medikal',
    gotcha_flags: t.gotcha_flags || [],
    rule_note: 'Fatura detayi okunmadan gider karti kesinlesmez.'
  },
  fields_to_read: [
    'fatura_tipi',
    'fatura_no',
    'fatura_tarihi',
    'vade_tarihi',
    'cari_unvan',
    'vergi_no',
    'aciklama',
    'kalemler',
    'ara_toplam',
    'kdv_toplam',
    'genel_toplam',
    'odeme_durumu',
    'cari_durum',
    'belge_pdf',
    'belge_xml'
  ]
}));

const report = {
  created_at: new Date().toISOString(),
  source_queue: queuePath,
  reader: {
    status: 'ready_for_browser_reader',
    command: `node bizimhesap_fatura_detay_oku.js --firma alayli --queue ${queuePath} --out ${outPath}`,
    memory_dir: MEMORY.dir
  },
  summary: {
    queue_count: tasks.length,
    detail_waiting_count: details.length
  },
  details
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
appendTransactionLog(`${new Date().toISOString().slice(0, 10)} | ALAYLI | aperion | fatura_reader_manifest | ${path.basename(queuePath)} | ${details.length} bekliyor | 0.00 | ok`);
console.log(JSON.stringify(report.summary, null, 2));
console.log(outPath);
