const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'hasta-bezi', 'index.html'), 'utf8');
const generator = fs.readFileSync(path.join(root, 'tools', 'build_hasta_bezi_bizimhesap_data_v126.cjs'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'hourly-bizimhesap-sync.yml'), 'utf8');
const checks = [
  ['güncelleme no', html.includes('1245290726')],
  ['BizimHesap kaynak etiketi', html.includes('Ana veri kaynağı: BizimHesap')],
  ['altı kaynak dosyası', html.includes("const FILES=['sales','purchases','products','customers','stock','source_audit']") && html.includes('`bizimhesap_${name}.json')],
  ['ürün ve cari drawer', html.includes('productDrawer') && html.includes('customerDrawer')],
  ['satış ve alış geçmişi', html.includes('Satış geçmişi') && html.includes('Alış / FIFO geçmişi')],
  ['fatura ve kâr aksiyonu', html.includes('data-invoice') && html.includes('data-profit')],
  ['sabit kâr kuralları', generator.includes('sale.satis_kdv_haric - fifoTotal - sale.nakliye') && generator.includes('profit / sale.satis_kdv_haric') && generator.includes('profit / fifoTotal')],
  ['eksik fatura kontrolü', generator.includes("fatura_no: row.belge_no || 'KONTROL'")],
  ['Jender İlkbahar kabul denetimi', generator.includes('jender_xxl_ilkbahar_matches')],
  ['saatlik üretim', workflow.includes('build:hasta-bezi:bizimhesap')],
  ['workflow çıktı commit', workflow.includes('Commit dashboard source snapshots')],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'OK' : 'HATA'} ${name}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`Hasta bezi v126: ${checks.length}/${checks.length} kontrol geçti.`);
