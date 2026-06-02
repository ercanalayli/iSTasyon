const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const financeDir = path.join(root, 'finance');
const parts = [
  'AperiON_Finance_Calendar_Live_SQL_v47.sql',
  'AperiON_Finance_Calendar_Actions_SQL_v48.sql',
  'AperiON_Finance_Calendar_Seed_v47.sql',
];
const out = path.join(financeDir, 'AperiON_Finance_Calendar_FULL_INSTALL_v58.sql');

const header = [
  '-- AperiON Finance Calendar FULL INSTALL v58',
  '-- Bu dosya Supabase SQL Editor icin tek parca kurulum paketidir.',
  '-- Kural: Mevcut veriyi silmez. Tablo/view/fonksiyon yoksa olusturur, seed kayitlari ayni baslik+tarih varsa tekrar eklemez.',
  '-- Sira: v47 canli model, v48 aksiyon RPC, v47 seed.',
  '',
].join('\n');

const body = parts.map(file => {
  const full = path.join(financeDir, file);
  if (!fs.existsSync(full)) throw new Error(`Eksik SQL parcasi: ${file}`);
  return [
    `-- ============================================================`,
    `-- ${file}`,
    `-- ============================================================`,
    fs.readFileSync(full, 'utf8'),
    '',
  ].join('\n');
}).join('\n');

fs.writeFileSync(out, header + body, 'utf8');
console.log(`OK: ${out}`);
