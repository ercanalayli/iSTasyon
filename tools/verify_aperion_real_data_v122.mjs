import fs from 'node:fs';

const html=fs.readFileSync('aperion-merkez.html','utf8');
const required=[
  '/data/aperion_bank_approval_unified_status.json',
  '/data/aperion_payment_obligation_registry.json',
  '/data/sales_report_summary_2025_2026.json',
  '/data/aperion_last_sync.json',
  'Gerçek Veri Durumu',
  'Kaynak doğrulandı',
  'bugünkü satış değildir',
  'güncel kabul edilemez'
];
for(const token of required){
  if(!html.includes(token))throw new Error(`Eksik gerçek veri bağlantısı: ${token}`);
}
for(const file of required.slice(0,4)){
  const local=file.slice(1);
  JSON.parse(fs.readFileSync(local,'utf8'));
}
console.log('AperiON gerçek veri görünümü doğrulandı.');
