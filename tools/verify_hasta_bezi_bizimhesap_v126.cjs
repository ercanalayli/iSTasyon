if (process.env.SUPABASE_URL) process.env.SUPABASE_URL = process.env.SUPABASE_URL.replace(/\/rest\/v1\/?$/i, '');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'hasta-bezi', 'index.html'), 'utf8');
const generator = fs.readFileSync(path.join(root, 'tools', 'build_hasta_bezi_bizimhesap_data_v126.cjs'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'hourly-bizimhesap-sync.yml'), 'utf8');
const checks = [
  ['gÃ¼ncelleme no', html.includes('1245290726')],
  ['BizimHesap kaynak etiketi', html.includes('Ana veri kaynaÄŸÄ±: BizimHesap')],
  ['altÄ± kaynak dosyasÄ±', html.includes("const FILES=['sales','purchases','products','customers','stock','source_audit']") && html.includes('`bizimhesap_${name}.json')],
  ['Ã¼rÃ¼n ve cari drawer', html.includes('productDrawer') && html.includes('customerDrawer')],
  ['satÄ±ÅŸ ve alÄ±ÅŸ geÃ§miÅŸi', html.includes('SatÄ±ÅŸ geÃ§miÅŸi') && html.includes('AlÄ±ÅŸ / FIFO geÃ§miÅŸi')],
  ['fatura ve kÃ¢r aksiyonu', html.includes('data-invoice') && html.includes('data-profit')],
  ['sabit kÃ¢r kurallarÄ±', generator.includes('sale.satis_kdv_haric - fifoTotal - sale.nakliye') && generator.includes('profit / sale.satis_kdv_haric') && generator.includes('profit / fifoTotal')],
  ['eksik fatura kontrolÃ¼', generator.includes("fatura_no: row.belge_no || 'KONTROL'")],
  ['Jender Ä°lkbahar kabul denetimi', generator.includes('jender_xxl_ilkbahar_matches')],
  ['saatlik Ã¼retim', workflow.includes('build:hasta-bezi:bizimhesap')],
  ['workflow Ã§Ä±ktÄ± commit', workflow.includes('Commit dashboard source snapshots')],
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'OK' : 'HATA'} ${name}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log(`Hasta bezi v126: ${checks.length}/${checks.length} kontrol geÃ§ti.`);

