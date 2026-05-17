/* AperiON Critical Risk Alert v52
   Purpose: send urgent Telegram risk alerts without repeating the same risk during cooldown.
   Safe rule: reads risk feed, writes only to risk_alert_sent_log via v52 RPC after a successful Telegram send.

   ENV:
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_CHAT_ID=...
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   COMPANY=ALAYLI
   RISK_ALERT_LEVEL=critical|high|warning  default: high
   RISK_ALERT_COOLDOWN_MINUTES=360
*/

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COMPANY = process.env.COMPANY || 'ALAYLI';
const RISK_ALERT_LEVEL = process.env.RISK_ALERT_LEVEL || 'high';
const RISK_ALERT_COOLDOWN_MINUTES = Number(process.env.RISK_ALERT_COOLDOWN_MINUTES || 360);

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

function riskIcon(level){
  return { critical:'🚨', high:'🟠', warning:'🟡', ok:'🟢' }[level] || '•';
}

function riskTR(level){
  return { critical:'Kritik', high:'Yüksek', warning:'Uyarı', ok:'Normal' }[level] || level || '-';
}

function money(n){
  return Number(n || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

function normalizeKeyPart(value){
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ|:._ -]/gi, '')
    .slice(0, 120);
}

function buildRiskKey(row){
  const parts = [
    row.company,
    row.risk_type,
    row.risk_level,
    row.title,
    row.ref_code || row.ref_name || 'no-ref',
    row.risk_date || 'no-date'
  ];
  return parts.map(normalizeKeyPart).join('|');
}

function formatRiskRows(rows, title = 'Alarm Listesi'){
  if(!rows || rows.length === 0) return `<b>${title}</b>\nYeni risk görünmüyor.`;
  const lines = rows.slice(0, 20).map((r, i) => {
    const amount = Number(r.amount || 0) ? ` — <b>${money(r.amount)}</b>` : '';
    const ref = r.ref_name ? `\n   Ref: ${r.ref_name}` : '';
    return `${i + 1}. ${riskIcon(r.risk_level)} <b>${riskTR(r.risk_level)} / ${r.title || '-'}</b>${amount}\n   ${r.message || '-'}${ref}`;
  });
  const more = rows.length > 20 ? `\n\n+${rows.length - 20} risk daha var.` : '';
  return `<b>${title}</b>\n` + lines.join('\n') + more;
}

function formatCriticalAlert(rows, company = COMPANY, minLevel = RISK_ALERT_LEVEL, skippedCount = 0){
  if(!rows || rows.length === 0){
    return null;
  }
  const critical = rows.filter(r => r.risk_level === 'critical').length;
  const high = rows.filter(r => r.risk_level === 'high').length;
  const warning = rows.filter(r => r.risk_level === 'warning').length;
  const amount = rows.reduce((a, r) => a + Number(r.amount || 0), 0);
  const skippedLine = skippedCount ? `Tekrar engellenen: <b>${skippedCount}</b>\n` : '';

  return `<b>🚨 AperiON Kritik Risk Alarmı / ${company}</b>\n` +
    `Eşik: <b>${minLevel}</b>\n` +
    `Kritik: <b>${critical}</b> · Yüksek: <b>${high}</b> · Uyarı: <b>${warning}</b>\n` +
    `Toplam risk tutarı: <b>${money(amount)}</b>\n` +
    skippedLine +
    `\n` +
    formatRiskRows(rows, 'Yeni Alarm Listesi');
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

async function supabaseRpc(functionName, payload = {}){
  const url = `${SUPABASE_URL}/rest/v1/rpc/${functionName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if(!res.ok) throw new Error('Supabase RPC failed: ' + functionName + ' ' + await res.text());
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

async function filterRowsForCooldown(rows, cooldownMinutes = RISK_ALERT_COOLDOWN_MINUTES, rpcFn = supabaseRpc){
  const sendable = [];
  const skipped = [];

  for(const row of rows || []){
    const riskKey = buildRiskKey(row);
    const canSend = await rpcFn('risk_alert_can_send_v52', {
      p_company: row.company || COMPANY,
      p_risk_key: riskKey,
      p_cooldown_minutes: cooldownMinutes
    });

    if(canSend === true){
      sendable.push({ ...row, risk_key: riskKey });
    }else{
      skipped.push({ ...row, risk_key: riskKey });
    }
  }

  return { sendable, skipped };
}

async function markRowsSent(rows, telegramResponse, cooldownMinutes = RISK_ALERT_COOLDOWN_MINUTES, rpcFn = supabaseRpc){
  const messageId = telegramResponse?.result?.message_id ? String(telegramResponse.result.message_id) : null;
  const ids = [];

  for(const row of rows || []){
    const id = await rpcFn('risk_alert_mark_sent_v52', {
      p_company: row.company || COMPANY,
      p_risk_key: row.risk_key || buildRiskKey(row),
      p_risk_type: row.risk_type || null,
      p_risk_level: row.risk_level || null,
      p_title: row.title || null,
      p_ref_code: row.ref_code || null,
      p_ref_name: row.ref_name || null,
      p_amount: row.amount ?? null,
      p_risk_date: row.risk_date || null,
      p_cooldown_minutes: cooldownMinutes,
      p_telegram_message_id: messageId,
      p_payload: row
    });
    ids.push(id);
  }

  return ids;
}

async function main(){
  requireEnv();
  const rows = await loadCriticalRisks(COMPANY, RISK_ALERT_LEVEL);
  const { sendable, skipped } = await filterRowsForCooldown(rows, RISK_ALERT_COOLDOWN_MINUTES);
  const text = formatCriticalAlert(sendable, COMPANY, RISK_ALERT_LEVEL, skipped.length);

  if(!text){
    console.log(`RESULT: OK - no new risk alert to send. Skipped by cooldown: ${skipped.length}.`);
    return;
  }

  const telegramResponse = await telegramSend(text);
  await markRowsSent(sendable, telegramResponse, RISK_ALERT_COOLDOWN_MINUTES);
  console.log(`RESULT: OK - critical risk alert v52 sent. Sent: ${sendable.length}. Skipped by cooldown: ${skipped.length}.`);
}

if(import.meta.url === `file://${process.argv[1]}`){
  main().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}

export {
  requireEnv,
  levelWeight,
  riskIcon,
  riskTR,
  money,
  normalizeKeyPart,
  buildRiskKey,
  formatRiskRows,
  formatCriticalAlert,
  telegramSend,
  supabaseSelect,
  supabaseRpc,
  loadCriticalRisks,
  filterRowsForCooldown,
  markRowsSent,
  main
};
