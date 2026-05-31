const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sqlPath = path.join(root, 'finance', 'AperiON_Personal_Finance_Actions_SQL_v54.sql');
const botPath = path.join(root, 'telegram', 'aperion_personal_finance_assistant_v54.cjs');
const sql = fs.readFileSync(sqlPath, 'utf8');
const bot = fs.readFileSync(botPath, 'utf8');

const checks = [
  { name: 'create obligation rpc', ok: sql.includes('personal_finance_create_obligation') },
  { name: 'log payment rpc', ok: sql.includes('personal_finance_log_payment') },
  { name: 'register document rpc', ok: sql.includes('personal_finance_register_document') },
  { name: 'mobile inbox view', ok: sql.includes('personal_finance_mobile_inbox_v54_view') },
  { name: 'verification pending default', ok: sql.includes('kontrol_bekliyor') },
  { name: 'no BizimHesap write', ok: !sql.toLowerCase().includes('bizimhesap') && !bot.toLowerCase().includes('bizimhesap') },
  { name: 'parse amount', ok: bot.includes('function parseAmount') },
  { name: 'parse date', ok: bot.includes('function parseDate') },
  { name: 'detect scope', ok: bot.includes('function detectScope') },
  { name: 'detect group', ok: bot.includes('function detectGroup') },
  { name: 'document draft', ok: bot.includes('function buildDocumentDraft') },
  { name: 'register obligation rpc call', ok: bot.includes('personal_finance_create_obligation') },
  { name: 'register document rpc call', ok: bot.includes('personal_finance_register_document') }
];

console.log('AperiON v54 Personal Finance Actions Verify');
console.log('-------------------------------------------');
let failed = 0;
for(const c of checks){
  console.log(`${c.ok ? 'OK ' : 'ERR'} ${c.name}`);
  if(!c.ok) failed += 1;
}
console.log('-------------------------------------------');

if(failed){
  console.log(`RESULT: FAILED - ${failed} kontrol eksik.`);
  process.exitCode = 1;
}else{
  console.log('RESULT: OK - v54 personal finance actions verified.');
}
