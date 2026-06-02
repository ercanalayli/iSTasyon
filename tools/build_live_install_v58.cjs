const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const financeDir = path.join(root, 'finance');
const out = path.join(financeDir, 'AperiON_LIVE_INSTALL_v58.sql');

const parts = [
  {
    label: 'Cash command center v57: banka, kasa, cek, senet, kredi karti, onay ve BizimHesap kuyrugu',
    file: path.join(financeDir, 'AperiON_Cash_Command_Center_SQL_v57.sql'),
  },
  {
    label: 'Finance calendar v58: tahakkuk, takvim, ana ekran finans drawer ve aksiyon RPC',
    file: path.join(financeDir, 'AperiON_Finance_Calendar_FULL_INSTALL_v58.sql'),
  },
  {
    label: 'June 2026 accruals from live sales_raw and masraf_raw',
    file: path.join(financeDir, 'AperiON_June_2026_Accruals_FROM_LIVE_v58.sql'),
  },
  {
    label: 'Telegram bank transaction approval RPC v58',
    file: path.join(financeDir, 'AperiON_Bank_Transaction_Approval_RPC_v58.sql'),
  },
];

const header = [
  '-- AperiON LIVE INSTALL v58',
  '-- Supabase SQL Editor icin tek parca canli kurulum paketidir.',
  '-- Mevcut veriyi silmez. create table if not exists / create or replace view/function / idempotent insert kullanir.',
  '-- Sira: v57 hesap omurgasi, v58 finans takvimi, Haziran 2026 tahakkuklari.',
  '-- Calistirdiktan sonra yerelde: npm run preflight',
  '',
].join('\n');

const body = parts.map(part => {
  if (!fs.existsSync(part.file)) throw new Error(`Eksik SQL parcasi: ${part.file}`);
  return [
    '-- ============================================================',
    `-- ${part.label}`,
    `-- File: ${path.basename(part.file)}`,
    '-- ============================================================',
    fs.readFileSync(part.file, 'utf8').replace(/^\uFEFF/, ''),
    '',
  ].join('\n');
}).join('\n');

fs.writeFileSync(out, header + body, 'utf8');
console.log(`OK: ${out}`);
console.log(`Bytes: ${fs.statSync(out).size}`);
