/* AperiON Critical Risk Alert v52
   Purpose: send urgent Telegram alert for critical/high/warning risks without repeating the same risk inside cooldown window.
   Safe rule: reads risk feed and writes only to risk_alert_sent_log after successful Telegram send.

   ENV:
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_CHAT_ID=...
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   COMPANY=ALAYLI
   RISK_ALERT_LEVEL=critical|high|warning  default: high
   RISK_ALERT_COOLDOWN_HOURS=24
*/

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COMPANY = process.env.COMPANY || 'ALAYLI';
const RISK_ALERT_LEVEL = process.env.RISK_ALERT_LEVEL || 'high';
const RISK_ALERT_COOLDOWN_HOURS = Number(process.env.RISK_ALERT_COOLDOWN_HOURS || 24);

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

function makeRiskKey(row){
  return String([
    row.company || '',
    row.risk_type || '',
    row.risk_level || '',
    row.title || '',
    row.ref_code || '',
    row.ref_name || '',
    row.risk_date || new Date().toISOString().slice(0, 10)
  ].join('|')).toLowerCase();
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

async function supabaseRequest(path, options = {}){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {})
    }
  });
  if(!res.ok) throw new Error('Supabase request failed: ' + path + ' ' + await res.text());
  return res.status === 204 ? null : res.json();
}

async function supabaseSelect(viewName, params = {}){
  const query = new URLSearchParams(params).toString();
  return supabaseRequest(`${viewName}${query ? '?' + query : ''}`, { method: 'GET' });
}

async function loadRiskRows(company = COMPANY, minLevel = RISK_ALERT_LEVEL){
  let rows;
  try{
    rows = await supabaseSelect('aperion_risk_feed_v52_view', {
      company: `eq.${company}`,
      limit: '100'
    });
  }catch(err){
    rows = await supabaseSelect('aperion_risk_feed_v49_view', {
      company: `eq.${company}`,
      limit: '100'
    });
  }
  const threshold = levelWeight(minLevel);
  return (rows || [])
    .filter(r => levelWeight(r.risk_level) >= threshold)
    .map(r => ({ ...r, risk_key: r.risk_key || makeRiskKey(r) }));
}

async function filterUnsentRisks(rows, cooldownHours = RISK_ALERT_COOLDOWN_HOURS){
  const result = [];
  for(const row of rows || []){
    const key = row.risk_key || makeRiskKey(row);
    const existing = await supabaseSelect('risk_alert_sent_log', {
      company: `eq.${row.company}`,
      risk_key: `eq.${key}`,
      alert_channel: 'eq.telegram',
      sent_at: `gte.${new Date(Date.now() - Math.max(Number(cooldownHours || 24), 1) * 3600000).toISOString()}`,
      limit: '1'
    });
    if(!existing || existing.length === 0){
      result.push({ ...row, risk_key: key });
    }
  }
  return result;
}

async function logSentRisks(rows, text, alertLevel = RISK_ALERT_LEVEL, cooldownHours = RISK_ALERT_COOLDOWN_HOURS){
  if(!rows || rows.length === 0) return [];
  const payload = rows.map(row => ({
    company: row.company,
    risk_key: row.risk_key || makeRiskKey(row),
    risk_type: row.risk_type || null,
    risk_level: row.risk_level || null,
    title: row.title || null,
    ref_code: row.ref_code || null,
    ref_name: row.ref_name || null,
    amount: row.amount || null,
    risk_date: row.risk_date || null,
    alert_channel: 'telegram',
    alert_level: alertLevel,
    cooldown_hours: Math.max(Number(cooldownHours || 24), 1),
    message_preview: String(text || '').slice(0, 500)
  }));
  return supabaseRequest('risk_alert_sent_log', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

function formatCriticalAlert(rows, company = COMPANY, minLevel = RISK_ALERT_LEVEL, skippedCount = 0){
  if(!rows || rows.length === 0){
    return null;
  }
  const critical = rows.filter(r => r.risk_level === 'critical').length;
  const high = rows.filter(r => r.risk_level === 'high').length;
  const warning = rows.filter(r => r.risk_level === 'warning').length;
  const amount = rows.reduce((a, r) => a + Number(r.amount || 0), 0);
  const skippedLine = skippedCount ? `Tekrar alarm engeli: <b>${skippedCount}</b> kayıt atlandı.\n` : '';
  return `<b>🚨 AperiON Kritik Risk Alarmı / ${company}</b>\n` +
    `Eşik: <b>${minLevel}</b>\n` +
    `Kritik: <b>${critical}</b> · Yüksek: <b>${high}</b> · Uyarı: <b>${warning}</b>\n` +
    `Toplam risk tutarı: <b>${money(amount)}</b>\n` +
    skippedLine +
    `\n` +
    formatRiskRows(rows, 'Alarm Listesi');
}

async function main(){
  requireEnv();
  const allRows = await loadRiskRows(COMPANY, RISK_ALERT_LEVEL);
  const rows = await filterUnsentRisks(allRows, RISK_ALERT_COOLDOWN_HOURS);
  const text = formatCriticalAlert(rows, COMPANY, RISK_ALERT_LEVEL, allRows.length - rows.length);
  if(!text){
    console.log('RESULT: OK - no new risk alert to send. Dedup active.');
    return;
  }
  await telegramSend(text);
  await logSentRisks(rows, text, RISK_ALERT_LEVEL, RISK_ALERT_COOLDOWN_HOURS);
  console.log(`RESULT: OK - risk alert sent. New=${rows.length} Skipped=${allRows.length - rows.length}`);
}

if(require.main === module){
  main().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = {
  requireEnv,
  loadRiskRows,
  filterUnsentRisks,
  logSentRisks,
  formatCriticalAlert,
  telegramSend,
  levelWeight,
  makeRiskKey,
  main
};
