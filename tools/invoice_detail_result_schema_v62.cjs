const fs = require('fs');
const path = require('path');
const { loadAperionMemory } = require('./aperion_memory.cjs');

const ROOT = path.resolve(__dirname, '..');
const queuePath = process.argv[2] || path.join(ROOT, 'data', 'bizimhesap_fatura_acma_kuyrugu.json');
const outPath = process.argv[3] || path.join(ROOT, 'data', 'bizimhesap_fatura_detay_sablonu.json');
const MEMORY = loadAperionMemory();

const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
const tasks = Array.isArray(queue) ? queue : queue.tasks || [];

const result = {
  created_at: new Date().toISOString(),
  source_queue: queuePath,
  memory: {
    dir: MEMORY.dir,
    active_company: MEMORY.config.active_company || 'ALAYLI Medikal',
    model_description: 'ALAYLI Medikal icin BizimHesaptan gelen satis, gider, fatura, cari, odeme ve banka hareketlerini okuyarak gider karti eslestirme, fatura detay kontrolu, mukerrer odeme yakalama, nakit/POS ayrimi, tahakkuk-gerceklesen takibi ve Onay Merkezi yonlendirmesi yapar.',
    gotcha_rules: MEMORY.gotchaRules.length,
    expense_card_templates: MEMORY.expenseCardNames.length
  },
  summary: {
    task_count: tasks.length,
    waiting_detail_read: tasks.filter(x => x.durum === 'fatura_detayi_acilacak').length
  },
  detail_schema: {
    task_id: '',
    firma_id: 'alayli',
    kaynak: 'bizimhesap',
    fatura_tipi: '',
    fatura_no: '',
    fatura_tarihi: '',
    vade_tarihi: '',
    cari_unvan: '',
    vergi_no: '',
    aciklama: '',
    belge_pdf: '',
    belge_xml: '',
    ara_toplam: 0,
    kdv_toplam: 0,
    genel_toplam: 0,
    odeme_durumu: '',
    cari_durum: '',
    kalemler: [
      {
        sira: 1,
        mal_hizmet: '',
        miktar: 0,
        birim: '',
        birim_fiyat: 0,
        kdv_orani: 0,
        kdv_tutari: 0,
        satir_toplami: 0
      }
    ],
    aperion_karar: {
      gider_mi: true,
      urun_alis_mi: false,
      iade_mi: false,
      kisisel_mi: false,
      gider_karti: '',
      onay_gerekli: true,
      kontrol_nedeni: ''
    }
  },
  tasks: tasks.map((t, i) => ({
    ...t,
    detail_status: 'waiting_bizimhesap_open_read',
    read_order: i + 1
  }))
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify(result.summary, null, 2));
console.log(outPath);
