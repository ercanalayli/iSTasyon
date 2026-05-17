/* AperiON Telegram Bot v47
   Purpose: connect Telegram finance commands to finance_calendar_live v47 views.
   Safe rule: read-only. No delete, no BizimHesap write, no Supabase update.

   Required environment variables:
   TELEGRAM_BOT_TOKEN=...
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
*/

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnv(){
  const missing = [];
  if(!TELEGRAM_BOT_TOKEN) missing.push('TELEGRAM_BOT_TOKEN');
  if(!SUPABASE_URL) missing.push('SUPABASE_URL');
  if(!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if(missing.length) throw new Error('Missing env: ' + missing.join(', '));
}

async function telegramSend(chatId, text, replyMarkup){
  const body = { chat_id: chatId, text, parse_mode: 'HTML' };
  if(replyMarkup) body.reply_markup = replyMarkup;
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

function money(n){
  return Number(n || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

function typeTR(t){
  return {
    payable: 'Ödenecek',
    receivable: 'Tahsil',
    task: 'Görev',
    approval: 'Onay',
    credit: 'Kredi',
    credit_card: 'Kredi Kartı',
    check: 'Çek/Senet',
    note: 'Not',
    moka: 'Moka',
    fixed_payment: 'Sabit Ödeme',
    variable_expense: 'Değişken Gider'
  }[t] || t || '-';
}

function statusTR(s){
  return {
    overdue: 'Geciken',
    today: 'Bugün',
    tomorrow: 'Yarın',
    this_week: 'Bu hafta',
    until_month_end: 'Ay sonuna kadar',
    next_month: 'Gelecek ay',
    future: 'İleri tarih',
    closed: 'Kapalı'
  }[s] || s || '-';
}

function formatCalendarRows(rows, title){
  if(!rows || rows.length === 0) return `<b>${title}</b>\nKayıt yok.`;
  const lines = rows.slice(0, 25).map((r, i) => {
    const amount = Number(r.remaining_amount || r.expected_amount || 0) ? ` — <b>${money(r.remaining_amount || r.expected_amount)}</b>` : '';
    const date = r.calendar_date || r.item_date || '-';
    const dir = r.direction === 'in' ? '⬆' : r.direction === 'out' ? '⬇' : '•';
    return `${i + 1}. ${dir} <b>${r.title || '-'}</b>${amount}\n   ${date} · ${typeTR(r.item_type)} · ${statusTR(r.period_status)} · ${r.status || '-'}`;
  });
  const more = rows.length > 25 ? `\n\n+${rows.length - 25} kayıt daha var.` : '';
  return `<b>${title}</b>\n` + lines.join('\n') + more;
}

async function getCalendarRows(company = 'ALAYLI', filters = {}){
  const params = {
    company: `eq.${company}`,
    order: 'calendar_date.asc',
    limit: String(filters.limit || 80)
  };
  if(filters.periodStatus) params.period_status = `eq.${filters.periodStatus}`;
  if(filters.itemType) params.item_type = `eq.${filters.itemType}`;
  if(filters.direction) params.direction = `eq.${filters.direction}`;
  return supabaseSelect('finance_calendar_drawer_view', params);
}

async function getSummary(company = 'ALAYLI'){
  const rows = await supabaseSelect('finance_calendar_summary_view', { company: `eq.${company}`, limit: '1' });
  return rows[0] || {};
}

async function commandBugun(chatId, company = 'ALAYLI'){
  const [summary, rows] = await Promise.all([
    getSummary(company),
    supabaseSelect('finance_calendar_drawer_view', { company: `eq.${company}`, period_status: 'eq.today', order: 'calendar_date.asc', limit: '60' })
  ]);
  const header = `<b>AperiON / Bugün</b>\n` +
    `Satış: <b>${money(summary.today_sales)}</b>\n` +
    `Tahsil: <b>${money(summary.today_receivable)}</b>\n` +
    `Ödeme: <b>${money(summary.today_payable)}</b>\n` +
    `Net: <b>${money(summary.today_cash_net)}</b>\n` +
    `Görev: <b>${summary.urgent_tasks || 0}</b> · Onay: <b>${summary.waiting_approvals || 0}</b>\n\n`;
  await telegramSend(chatId, header + formatCalendarRows(rows, 'Bugünkü kayıtlar'));
}

async function commandNakit(chatId, company = 'ALAYLI'){
  const s = await getSummary(company);
  const text = `<b>AperiON Nakit Özeti</b>\n` +
    `Bugün tahsil: <b>${money(s.today_receivable)}</b>\n` +
    `Bugün ödeme: <b>${money(s.today_payable)}</b>\n` +
    `Bugün net: <b>${money(s.today_cash_net)}</b>\n\n` +
    `Bu hafta tahsil: <b>${money(s.week_receivable)}</b>\n` +
    `Bu hafta ödeme: <b>${money(s.week_payable)}</b>\n` +
    `Bu hafta net: <b>${money(s.week_cash_net)}</b>\n\n` +
    `Ay sonuna kadar tahsil: <b>${money(s.month_end_receivable)}</b>\n` +
    `Ay sonuna kadar ödeme: <b>${money(s.month_end_payable)}</b>\n` +
    `Ay sonu net: <b>${money(s.month_end_cash_net)}</b>`;
  await telegramSend(chatId, text);
}

async function commandOdenecekler(chatId, company = 'ALAYLI'){
  const rows = await getCalendarRows(company, { direction: 'out', limit: 80 });
  await telegramSend(chatId, formatCalendarRows(rows, 'Ödenecekler'));
}

async function commandTahsilatlar(chatId, company = 'ALAYLI'){
  const rows = await getCalendarRows(company, { direction: 'in', limit: 80 });
  await telegramSend(chatId, formatCalendarRows(rows, 'Tahsil Edilecekler'));
}

async function commandGecikenler(chatId, company = 'ALAYLI'){
  const rows = await getCalendarRows(company, { periodStatus: 'overdue', limit: 80 });
  await telegramSend(chatId, formatCalendarRows(rows, 'Gecikenler'));
}

async function commandYapilacak(chatId, company = 'ALAYLI'){
  const rows = await getCalendarRows(company, { itemType: 'task', limit: 80 });
  await telegramSend(chatId, formatCalendarRows(rows, 'Yapılacaklar'));
}

async function commandOnay(chatId, company = 'ALAYLI'){
  const rows = await getCalendarRows(company, { itemType: 'approval', limit: 80 });
  await telegramSend(chatId, formatCalendarRows(rows, 'Onay Bekleyenler'));
}

async function commandRapor(chatId, company = 'ALAYLI'){
  return commandNakit(chatId, company);
}

async function handleCommand(chatId, text){
  const cmd = String(text || '').split(' ')[0].toLowerCase();
  if(cmd === '/start'){
    return telegramSend(chatId, 'Komutlar: /bugun /nakit /odenecekler /tahsilatlar /gecikenler /yapilacak /onay /rapor');
  }
  if(cmd === '/bugun') return commandBugun(chatId);
  if(cmd === '/nakit' || cmd === '/rapor') return commandNakit(chatId);
  if(cmd === '/odenecekler' || cmd === '/odenecek') return commandOdenecekler(chatId);
  if(cmd === '/tahsilatlar' || cmd === '/tahsil') return commandTahsilatlar(chatId);
  if(cmd === '/gecikenler' || cmd === '/geciken') return commandGecikenler(chatId);
  if(cmd === '/yapilacak') return commandYapilacak(chatId);
  if(cmd === '/onay') return commandOnay(chatId);
  return telegramSend(chatId, 'Komutlar: /bugun /nakit /odenecekler /tahsilatlar /gecikenler /yapilacak /onay /rapor');
}

async function handleUpdate(update){
  const msg = update.message;
  if(msg && msg.chat && msg.text){
    return handleCommand(msg.chat.id, msg.text);
  }
  return null;
}

module.exports = {
  requireEnv,
  telegramSend,
  supabaseSelect,
  handleUpdate,
  handleCommand,
  commandBugun,
  commandNakit,
  commandOdenecekler,
  commandTahsilatlar,
  commandGecikenler,
  commandYapilacak,
  commandOnay,
  commandRapor,
  formatCalendarRows
};

if(require.main === module){
  requireEnv();
  console.log('AperiON Telegram Bot v47 finance calendar command module ready.');
}
