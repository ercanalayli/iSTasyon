/* AperiON Morning Finance Digest v50
   Purpose: send daily finance summary to Telegram.
   Uses finance_calendar_summary_view, aperion_risk_summary_v49_view, aperion_risk_feed_v49_view.
   Safe rule: read-only. No DB write, no BizimHesap write.

   ENV:
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_CHAT_ID=...
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   COMPANY=ALAYLI
*/

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COMPANY = process.env.COMPANY || 'ALAYLI';

const { formatRiskRows } = require('./aperion_risk_formatter_v49.js');

function requireEnv(){
  const missing = [];
  if(!TELEGRAM_BOT_TOKEN) missing.push('TELEGRAM_BOT_TOKEN');
  if(!TELEGRAM_CHAT_ID) missing.push('TELEGRAM_CHAT_ID');
  if(!SUPABASE_URL) missing.push('SUPABASE_URL');
  if(!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if(missing.length) throw new Error('Missing env: ' + missing.join(', '));
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

async function loadDigestData(company = COMPANY){
  const [financeRows, riskSummaryRows, riskRows, todayRows, overdueRows] = await Promise.all([
    supabaseSelect('finance_calendar_summary_view', { company: `eq.${company}`, limit: '1' }),
    supabaseSelect('aperion_risk_summary_v49_view', { company: `eq.${company}`, limit: '1' }),
    supabaseSelect('aperion_risk_feed_v49_view', { company: `eq.${company}`, limit: '10' }),
    supabaseSelect('finance_calendar_drawer_view', { company: `eq.${company}`, period_status: 'eq.today', order: 'calendar_date.asc', limit: '10' }),
    supabaseSelect('finance_calendar_drawer_view', { company: `eq.${company}`, period_status: 'eq.overdue', order: 'calendar_date.asc', limit: '10' })
  ]);
  return {
    finance: financeRows[0] || {},
    riskSummary: riskSummaryRows[0] || {},
    risks: riskRows || [],
    today: todayRows || [],
    overdue: overdueRows || []
  };
}

function rowLine(r, i){
  const amount = Number(r.remaining_amount || r.expected_amount || 0) ? ` — ${money(r.remaining_amount || r.expected_amount)}` : '';
  return `${i + 1}. ${r.title || '-'}${amount} (${r.calendar_date || r.item_date || '-'})`;
}

function formatMorningDigest(data, company = COMPANY){
  const f = data.finance || {};
  const rs = data.riskSummary || {};
  const today = data.today || [];
  const overdue = data.overdue || [];

  const todayList = today.length ? today.slice(0,5).map(rowLine).join('\n') : 'Bugün için kayıt yok.';
  const overdueList = overdue.length ? overdue.slice(0,5).map(rowLine).join('\n') : 'Geciken kayıt yok.';
  const riskText = formatRiskRows(data.risks || [], 'İlk Riskler');

  return `<b>AperiON Sabah Finans Özeti / ${company}</b>\n` +
    `Tarih: <b>${new Date().toLocaleDateString('tr-TR')}</b>\n\n` +
    `<b>Bugün</b>\n` +
    `Tahsil: <b>${money(f.today_receivable)}</b>\n` +
    `Ödeme: <b>${money(f.today_payable)}</b>\n` +
    `Net: <b>${money(f.today_cash_net)}</b>\n\n` +
    `<b>Bu Hafta</b>\n` +
    `Tahsil: <b>${money(f.week_receivable)}</b>\n` +
    `Ödeme: <b>${money(f.week_payable)}</b>\n` +
    `Net: <b>${money(f.week_cash_net)}</b>\n\n` +
    `<b>Risk</b>\n` +
    `Toplam: <b>${rs.total_risk_count || 0}</b> · Kritik: <b>${rs.critical_count || 0}</b> · Yüksek: <b>${rs.high_count || 0}</b> · Uyarı: <b>${rs.warning_count || 0}</b>\n` +
    `Finansal risk: <b>${money(rs.financial_risk_amount)}</b>\n\n` +
    `<b>Bugünkü İlk Kayıtlar</b>\n${todayList}\n\n` +
    `<b>Geciken İlk Kayıtlar</b>\n${overdueList}\n\n` +
    riskText;
}

async function main(){
  requireEnv();
  const data = await loadDigestData(COMPANY);
  const text = formatMorningDigest(data, COMPANY);
  await telegramSend(text);
  console.log('RESULT: OK - morning finance digest sent.');
}

if(require.main === module){
  main().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = { requireEnv, loadDigestData, formatMorningDigest, telegramSend, main };
