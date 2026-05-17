/* AperiON Critical Risk Alert v51
   Purpose: send urgent Telegram alert for critical/high risks.
   Safe rule: read-only. No DB write, no BizimHesap write.

   ENV:
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_CHAT_ID=...
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   COMPANY=ALAYLI
   RISK_ALERT_LEVEL=critical|high|warning  default: high
*/

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COMPANY = process.env.COMPANY || 'ALAYLI';
const RISK_ALERT_LEVEL = process.env.RISK_ALERT_LEVEL || 'high';

const { formatRiskRows } = require('./aperion_risk_formatter_v49.js');

function requireEnv(){
  const missing = [];
  if(!TELEGRAM_BOT_TOKEN) missing.push('TELEGRAM_BOT_TOKEN');
  if(!TELEGRAM_CHAT_ID) missing.push('TELEGRAM_CHAT_ID');
  if(!SUPABASE_URL) missing.push('SUPABASE_URL');
  if(!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if(missing.length) throw new Error('Missing env: ' + missing.join(', '));
}

function levelWeight(level){
  return { critical: 3, high: 2, warning: 1, ok: 0 }[level] || 0;
}

function money(n){
  return Number(n || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

async function telegramSend(text){
  const body = { chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' };
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(!res.ok) throw new Error('Telegram send failed: ' + await res.text());
  return res.json();
}

async function supabaseSelect(viewName, params = {}){
  const query = new URLSearchParams(params).toString();
  const url = `${SUPABASE_URL}/rest/v1/${viewName}${query ? '?' + query : ''}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  if(!res.ok) throw new Error('Supabase select failed: ' + viewName + ' ' + await res.text());
  return res.json();
}

async function loadCriticalRisks(company = COMPANY, minLevel = RISK_ALERT_LEVEL){
  const rows = await supabaseSelect('aperion_risk_feed_v49_view', {
    company: `eq.${company}`,
    limit: '50'
  });
  const threshold = levelWeight(minLevel);
  return (rows || []).filter(r => levelWeight(r.risk_level) >= threshold);
}

function formatCriticalAlert(rows, company = COMPANY, minLevel = RISK_ALERT_LEVEL){
  if(!rows || rows.length === 0){
    return null;
  }
  const critical = rows.filter(r => r.risk_level === 'critical').length;
  const high = rows.filter(r => r.risk_level === 'high').length;
  const warning = rows.filter(r => r.risk_level === 'warning').length;
  const amount = rows.reduce((a, r) => a + Number(r.amount || 0), 0);
  return `<b>🚨 AperiON Kritik Risk Alarmı / ${company}</b>\n` +
    `Eşik: <b>${minLevel}</b>\n` +
    `Kritik: <b>${critical}</b> · Yüksek: <b>${high}</b> · Uyarı: <b>${warning}</b>\n` +
    `Toplam risk tutarı: <b>${money(amount)}</b>\n\n` +
    formatRiskRows(rows, 'Alarm Listesi');
}

async function main(){
  requireEnv();
  const rows = await loadCriticalRisks(COMPANY, RISK_ALERT_LEVEL);
  const text = formatCriticalAlert(rows, COMPANY, RISK_ALERT_LEVEL);
  if(!text){
    console.log('RESULT: OK - no critical/high risk alert to send.');
    return;
  }
  await telegramSend(text);
  console.log('RESULT: OK - critical risk alert sent.');
}

if(require.main === module){
  main().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = { requireEnv, loadCriticalRisks, formatCriticalAlert, telegramSend, levelWeight, main };
