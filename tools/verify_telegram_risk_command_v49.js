const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const botPath = path.join(root, 'telegram', 'aperion_telegram_bot_v47.js');
const formatterPath = path.join(root, 'telegram', 'aperion_risk_formatter_v49.js');
const patchPath = path.join(root, 'tools', 'patch_telegram_risk_command_v49.js');
const sqlPath = path.join(root, 'finance', 'AperiON_Finance_Risk_Engine_SQL_v49.sql');

const bot = fs.existsSync(botPath) ? fs.readFileSync(botPath, 'utf8') : '';
const sql = fs.existsSync(sqlPath) ? fs.readFileSync(sqlPath, 'utf8') : '';

const checks = [
  { name: 'risk SQL exists', ok: fs.existsSync(sqlPath) },
  { name: 'risk feed view exists', ok: sql.includes('aperion_risk_feed_v49_view') },
  { name: 'risk summary view exists', ok: sql.includes('aperion_risk_summary_v49_view') },
  { name: 'risk formatter exists', ok: fs.existsSync(formatterPath) },
  { name: 'risk patch script exists', ok: fs.existsSync(patchPath) },
  { name: 'bot imports risk formatter', ok: bot.includes('aperion_risk_formatter_v49.js') },
  { name: 'bot has getRiskSummary', ok: bot.includes('function getRiskSummary') || bot.includes('async function getRiskSummary') },
  { name: 'bot has getRiskRows', ok: bot.includes('function getRiskRows') || bot.includes('async function getRiskRows') },
  { name: 'bot has commandRisk', ok: bot.includes('function commandRisk') || bot.includes('async function commandRisk') },
  { name: 'bot routes /risk', ok: bot.includes("cmd === '/risk'") || bot.includes("cmd==='/risk'") },
  { name: 'bot routes /riskler', ok: bot.includes("cmd === '/riskler'") || bot.includes("cmd==='/riskler'") },
  { name: 'bot exports commandRisk', ok: bot.includes('commandRisk') && bot.includes('module.exports') },
  { name: 'help text includes /risk', ok: bot.includes('/bugun /nakit /risk') }
];

console.log('AperiON Telegram Risk Command Verify v49');
console.log('----------------------------------------');
let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? 'OK ' : 'ERR'} - ${c.name}`);
  if (!c.ok) failed++;
}
console.log('----------------------------------------');
if (failed) {
  console.log(`RESULT: FAILED - ${failed} kontrol eksik. Önce npm run patch:telegram-risk-v49 çalıştırılmalı.`);
  process.exitCode = 1;
} else {
  console.log('RESULT: OK - Telegram /risk komutu v49 bot içine bağlı görünüyor.');
}
