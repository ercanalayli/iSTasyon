/* AperiON Critical Risk Alert v52
   Purpose: send urgent Telegram alert with risk dedup/cooldown.
   Safe rule: reads risk feed, writes only risk_alert_sent_log after successful Telegram send.

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

function riskTR(level){
  return { critical:'Kritik', high:'Yuksek', warning:'Uyari', ok:'Normal' }[level] || level || '-';
}

function riskIcon(level){
  return { critical:'!', high:'!!', warning:'-', ok:'OK' }[level] || '-';
}

function makeRiskKey(r, company = COMPANY){
  const ref = r.ref_code || r.ref_name || r.title || 'unknown';
  const day = (r.risk_date || new Date().toISOString().slice(0, 10)).toString().slice(0, 10);
  return [company, r.risk_type || 'risk', r.risk_level || 'warning', ref, day]
    .join('|')
    .toLocaleLowerCase('tr-TR');
}

function formatRiskRows(rows, title = 'Alarm Listesi'){
  if(!rows || rows.length === 0) return `<b>${title}</b>\nRisk gorunmuyor.`;
  const lines = rows.slice(0, 20).map((r, i) => {
    const amount = Number(r.amount || 0) ? ` - <b>${money(r.amount)}</b>` : '';
    const ref = r.ref_name ? `\n   Ref: ${r.ref_name}` : '';
    return `${i + 1}. ${riskIcon(r.risk_level)} <b>${riskTR(r.risk_level)} / ${r.title || '-'}</b>${amount}\n   ${r.message || '-'}${ref}`;
  });
  const more = rows.length > 20 ? `\n\n+${rows.length - 20} risk daha var.` : '';
  return `<b>${title}</b>\n` + lines.join('\n') + more;
}

function formatCriticalAlert(rows, company = COMPANY, minLevel = RISK_ALERT_LEVEL){
  if(!rows || rows.length === 0) return null;
  const critical = rows.filter(r => r.risk_level === 'critical').length;
  const high = rows.filter(r => r.risk_level === 'high').length;
  const warning = rows.filter(r => r.risk_level === 'warning').length;
  const amount = rows.reduce((a, r) => a + Number(r.amount || 0), 0);
  return `<b>AperiON Kritik Risk Alarmi / ${company}</b>\n` +
    `Esik: <b>${minLevel}</b>\n` +
    `Kritik: <b>${critical}</b> - Yuksek: <b>${high}</b> - Uyari: <b>${warning}</b>\n` +
    `Toplam risk tutari: <b>${money(amount)}</b>\n\n` +
    formatRiskRows(rows, 'Alarm Listesi');
}

function filterUnsentByLocalLog(rows, sentMap = {}, cooldownHours = RISK_ALERT_COOLDOWN_HOURS, now = new Date()){
  const thresholdMs = cooldownHours * 60 * 60 * 1000;
  return (rows || []).filter(r => {
    const key = r.risk_key || makeRiskKey(r);
    const last = sentMap[key];
    if(!last) return true;
    return now.getTime() - new Date(last).getTime() >= thresholdMs;
  });
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

async function supabaseRpc(fn, payload = {}){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if(!res.ok) throw new Error('Supabase rpc failed: ' + fn + ' ' + await res.text());
  return res.json();
}

async function loadCriticalRisks(company = COMPANY, minLevel = RISK_ALERT_LEVEL){
  const rows = await supabaseSelect('aperion_risk_feed_v49_view', {
    company: `eq.${company}`,
    limit: '50'
  });
  const threshold = levelWeight(minLevel);
  return (rows || [])
    .filter(r => levelWeight(r.risk_level) >= threshold)
    .map(r => ({ ...r, risk_key: makeRiskKey(r, company) }));
}

async function filterSendableRisks(rows, company = COMPANY, cooldownHours = RISK_ALERT_COOLDOWN_HOURS){
  const out = [];
  for(const r of rows || []){
    const result = await supabaseRpc('risk_alert_is_sendable', {
      p_company: company,
      p_risk_key: r.risk_key,
      p_cooldown_hours: cooldownHours
    });
    if(result?.sendable) out.push(r);
  }
  return out;
}

async function markRisksSent(rows, telegramResult, company = COMPANY, cooldownHours = RISK_ALERT_COOLDOWN_HOURS){
  const messageId = telegramResult?.result?.message_id ? String(telegramResult.result.message_id) : null;
  for(const r of rows || []){
    await supabaseRpc('risk_alert_mark_sent', {
      p_company: company,
      p_risk_key: r.risk_key,
      p_risk_type: r.risk_type || null,
      p_risk_level: r.risk_level || null,
      p_title: r.title || null,
      p_message: r.message || null,
      p_ref_code: r.ref_code || null,
      p_ref_name: r.ref_name || null,
      p_risk_date: r.risk_date || null,
      p_amount: r.amount || null,
      p_payload: r,
      p_telegram_message_id: messageId,
      p_cooldown_hours: cooldownHours
    });
  }
}

async function main(){
  requireEnv();
  const rows = await loadCriticalRisks(COMPANY, RISK_ALERT_LEVEL);
  const sendable = await filterSendableRisks(rows, COMPANY, RISK_ALERT_COOLDOWN_HOURS);
  const text = formatCriticalAlert(sendable, COMPANY, RISK_ALERT_LEVEL);
  if(!text){
    console.log(`RESULT: OK - no new risk alert to send. total=${rows.length} sendable=${sendable.length}`);
    return;
  }
  const telegramResult = await telegramSend(text);
  await markRisksSent(sendable, telegramResult, COMPANY, RISK_ALERT_COOLDOWN_HOURS);
  console.log(`RESULT: OK - critical risk alert sent. total=${rows.length} sendable=${sendable.length}`);
}

if(require.main === module){
  main().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = {
  requireEnv,
  levelWeight,
  makeRiskKey,
  formatCriticalAlert,
  filterUnsentByLocalLog,
  loadCriticalRisks,
  filterSendableRisks,
  markRisksSent,
  telegramSend,
  main
};
