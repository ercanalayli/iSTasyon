/* AperiON Telegram Bot v43
   Purpose: command skeleton for payables, receivables, tasks and approvals.
   Safe rule: no delete, no BizimHesap write, no Supabase update without explicit action handler.

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

function formatQuickRows(rows, title){
  if(!rows || rows.length === 0) return `<b>${title}</b>\nKayıt yok.`;
  const lines = rows.slice(0, 20).map((r, i) => {
    const amount = Number(r.remaining_amount || 0) ? ` — ${money(r.remaining_amount)}` : '';
    const date = r.item_date ? ` (${r.item_date})` : '';
    return `${i + 1}. <b>${r.title || '-'}</b>${amount}${date}\n   ${r.item_type || ''} · ${r.period_status || ''} · ${r.status || ''}`;
  });
  const more = rows.length > 20 ? `\n\n+${rows.length - 20} kayıt daha var.` : '';
  return `<b>${title}</b>\n` + lines.join('\n') + more;
}

function actionButtons(row){
  const id = row.id;
  const type = row.item_type;
  if(type === 'payable') return { inline_keyboard: [[
    { text: 'Ödendi', callback_data: `payable_paid:${id}` },
    { text: 'Ertele', callback_data: `postpone:finance_payables:${id}` },
    { text: 'Detay', callback_data: `detail:finance_payables:${id}` }
  ]]};
  if(type === 'receivable') return { inline_keyboard: [[
    { text: 'Tahsil Edildi', callback_data: `receivable_collected:${id}` },
    { text: 'Ertele', callback_data: `postpone:finance_receivables:${id}` },
    { text: 'Detay', callback_data: `detail:finance_receivables:${id}` }
  ]]};
  if(type === 'task') return { inline_keyboard: [[
    { text: 'Tamamlandı', callback_data: `task_done:${id}` },
    { text: 'Ertele', callback_data: `postpone:aperion_tasks:${id}` },
    { text: 'Detay', callback_data: `detail:aperion_tasks:${id}` }
  ]]};
  if(type === 'approval') return { inline_keyboard: [[
    { text: 'Onayla', callback_data: `approval_ok:${id}` },
    { text: 'Reddet', callback_data: `approval_reject:${id}` },
    { text: 'Detay', callback_data: `detail:approval_queue:${id}` }
  ]]};
  return null;
}

async function getQuickRows(company, itemType, periodStatus){
  const params = {
    company: `eq.${company}`,
    order: 'item_date.asc',
    limit: '50'
  };
  if(itemType) params.item_type = `eq.${itemType}`;
  if(periodStatus) params.period_status = `eq.${periodStatus}`;
  return supabaseSelect('quick_control_center_view', params);
}

async function commandBugun(chatId, company = 'ALAYLI'){
  const rows = await supabaseSelect('telegram_today_digest_view', { company: `eq.${company}`, limit: '50' });
  await telegramSend(chatId, formatQuickRows(rows, 'AperiON / Bugün'));
}

async function commandOdenecek(chatId, company = 'ALAYLI'){
  const rows = await getQuickRows(company, 'payable');
  await telegramSend(chatId, formatQuickRows(rows, 'Ödenecekler'));
}

async function commandTahsil(chatId, company = 'ALAYLI'){
  const rows = await getQuickRows(company, 'receivable');
  await telegramSend(chatId, formatQuickRows(rows, 'Tahsil Edilecekler'));
}

async function commandYapilacak(chatId, company = 'ALAYLI'){
  const rows = await getQuickRows(company, 'task');
  await telegramSend(chatId, formatQuickRows(rows, 'Yapılacaklar'));
}

async function commandOnay(chatId, company = 'ALAYLI'){
  const rows = await getQuickRows(company, 'approval');
  await telegramSend(chatId, formatQuickRows(rows, 'Onay Bekleyenler'));
}

async function commandRapor(chatId, company = 'ALAYLI'){
  const summary = await supabaseSelect('quick_control_summary_view', { company: `eq.${company}`, limit: '1' });
  const s = summary[0] || {};
  const text = `<b>AperiON Hızlı Rapor</b>\n` +
    `Bugün ödenecek: <b>${money(s.today_payable)}</b>\n` +
    `Geciken ödenecek: <b>${money(s.overdue_payable)}</b>\n` +
    `Bugün tahsil edilecek: <b>${money(s.today_receivable)}</b>\n` +
    `Geciken tahsilat: <b>${money(s.overdue_receivable)}</b>\n` +
    `Bugünkü yapılacak: <b>${s.today_tasks || 0}</b>\n` +
    `Geciken yapılacak: <b>${s.overdue_tasks || 0}</b>\n` +
    `Onay bekleyen: <b>${s.waiting_approvals || 0}</b>`;
  await telegramSend(chatId, text);
}

async function handleCommand(chatId, text){
  const cmd = String(text || '').split(' ')[0].toLowerCase();
  if(cmd === '/start' || cmd === '/bugun') return commandBugun(chatId);
  if(cmd === '/odenecek') return commandOdenecek(chatId);
  if(cmd === '/tahsil') return commandTahsil(chatId);
  if(cmd === '/yapilacak') return commandYapilacak(chatId);
  if(cmd === '/onay') return commandOnay(chatId);
  if(cmd === '/rapor') return commandRapor(chatId);
  if(cmd === '/geciken'){
    const rows = await supabaseSelect('quick_control_center_view', { period_status: 'eq.overdue', order: 'item_date.asc', limit: '50' });
    return telegramSend(chatId, formatQuickRows(rows, 'Gecikenler'));
  }
  return telegramSend(chatId, 'Komutlar: /bugun /odenecek /tahsil /yapilacak /geciken /onay /rapor');
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
  commandOdenecek,
  commandTahsil,
  commandYapilacak,
  commandOnay,
  commandRapor,
  actionButtons
};

if(require.main === module){
  requireEnv();
  console.log('AperiON Telegram Bot v43 command module ready. Use webhook/server wrapper to receive updates.');
}
