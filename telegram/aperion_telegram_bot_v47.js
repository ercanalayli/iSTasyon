/* AperiON Telegram Bot v48
   Purpose: connect Telegram finance commands to finance_calendar_live v47/v48 views and action RPCs.
   Safety: action buttons update only finance_calendar_items through audited RPC functions.
   No BizimHesap write.

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

async function telegramAnswerCallback(callbackQueryId, text){
  if(!callbackQueryId) return null;
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text: text || 'Tamam', show_alert: false })
  });
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

async function supabaseRpc(fnName, payload = {}){
  const url = `${SUPABASE_URL}/rest/v1/rpc/${fnName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  let json;
  try{ json = text ? JSON.parse(text) : {}; }catch(e){ json = { raw:text }; }
  if(!res.ok) throw new Error('Supabase RPC failed: ' + fnName + ' ' + text);
  return json;
}

function money(n){
  return Number(n || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

function typeTR(t){
  return {
    payable: 'Ödenecek', receivable: 'Tahsil', task: 'Görev', approval: 'Onay', credit: 'Kredi',
    credit_card: 'Kredi Kartı', check: 'Çek/Senet', note: 'Not', moka: 'Moka',
    fixed_payment: 'Sabit Ödeme', variable_expense: 'Değişken Gider'
  }[t] || t || '-';
}

function statusTR(s){
  return {
    overdue: 'Geciken', today: 'Bugün', tomorrow: 'Yarın', this_week: 'Bu hafta',
    until_month_end: 'Ay sonuna kadar', next_month: 'Gelecek ay', future: 'İleri tarih', closed: 'Kapalı'
  }[s] || s || '-';
}

function actionButtons(row){
  const id = row.id;
  if(!id) return null;
  if(row.direction === 'out') return { inline_keyboard: [[
    { text: '✅ Ödendi', callback_data: `fc:paid:${id}` },
    { text: '⏭ Ertele', callback_data: `fc:postpone:${id}` },
    { text: 'ℹ️ Detay', callback_data: `fc:detail:${id}` }
  ]]};
  if(row.direction === 'in') return { inline_keyboard: [[
    { text: '✅ Tahsil Edildi', callback_data: `fc:collected:${id}` },
    { text: '⏭ Ertele', callback_data: `fc:postpone:${id}` },
    { text: 'ℹ️ Detay', callback_data: `fc:detail:${id}` }
  ]]};
  if(row.item_type === 'task') return { inline_keyboard: [[
    { text: '✅ Tamamlandı', callback_data: `fc:done:${id}` },
    { text: '⏭ Ertele', callback_data: `fc:postpone:${id}` },
    { text: 'ℹ️ Detay', callback_data: `fc:detail:${id}` }
  ]]};
  if(row.item_type === 'approval') return { inline_keyboard: [[
    { text: '✅ Onayla', callback_data: `fc:approve:${id}` },
    { text: '❌ Reddet', callback_data: `fc:reject:${id}` },
    { text: 'ℹ️ Detay', callback_data: `fc:detail:${id}` }
  ]]};
  return { inline_keyboard: [[
    { text: '✅ Tamamlandı', callback_data: `fc:done:${id}` },
    { text: 'ℹ️ Detay', callback_data: `fc:detail:${id}` }
  ]]};
}

function formatOneRow(row){
  const amount = Number(row.remaining_amount || row.expected_amount || 0) ? ` — <b>${money(row.remaining_amount || row.expected_amount)}</b>` : '';
  const date = row.calendar_date || row.item_date || '-';
  const dir = row.direction === 'in' ? '⬆' : row.direction === 'out' ? '⬇' : '•';
  return `${dir} <b>${row.title || '-'}</b>${amount}\n${date} · ${typeTR(row.item_type)} · ${statusTR(row.period_status)} · ${row.status || '-'}`;
}

function formatCalendarRows(rows, title){
  if(!rows || rows.length === 0) return `<b>${title}</b>\nKayıt yok.`;
  const lines = rows.slice(0, 25).map((r, i) => `${i + 1}. ${formatOneRow(r)}`);
  const more = rows.length > 25 ? `\n\n+${rows.length - 25} kayıt daha var.` : '';
  return `<b>${title}</b>\n` + lines.join('\n') + more;
}

async function sendCalendarRowsWithButtons(chatId, rows, title){
  await telegramSend(chatId, `<b>${title}</b>\n${rows.length || 0} kayıt listeleniyor.`);
  if(!rows || rows.length === 0) return telegramSend(chatId, 'Kayıt yok.');
  for(const row of rows.slice(0, 12)){
    await telegramSend(chatId, formatOneRow(row), actionButtons(row));
  }
  if(rows.length > 12) await telegramSend(chatId, `+${rows.length - 12} kayıt daha var. Listeyi daraltmak için /bugun /gecikenler kullan.`);
}

async function getCalendarRows(company = 'ALAYLI', filters = {}){
  const params = { company: `eq.${company}`, order: 'calendar_date.asc', limit: String(filters.limit || 80) };
  if(filters.periodStatus) params.period_status = `eq.${filters.periodStatus}`;
  if(filters.itemType) params.item_type = `eq.${filters.itemType}`;
  if(filters.direction) params.direction = `eq.${filters.direction}`;
  return supabaseSelect('finance_calendar_drawer_view', params);
}

async function getCalendarItem(itemId){
  const rows = await supabaseSelect('finance_calendar_drawer_view', { id: `eq.${itemId}`, limit: '1' });
  return rows[0] || null;
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
    `Görev: <b>${summary.urgent_tasks || 0}</b> · Onay: <b>${summary.waiting_approvals || 0}</b>`;
  await telegramSend(chatId, header);
  await sendCalendarRowsWithButtons(chatId, rows, 'Bugünkü kayıtlar');
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
  await sendCalendarRowsWithButtons(chatId, rows, 'Ödenecekler');
}

async function commandTahsilatlar(chatId, company = 'ALAYLI'){
  const rows = await getCalendarRows(company, { direction: 'in', limit: 80 });
  await sendCalendarRowsWithButtons(chatId, rows, 'Tahsil Edilecekler');
}

async function commandGecikenler(chatId, company = 'ALAYLI'){
  const rows = await getCalendarRows(company, { periodStatus: 'overdue', limit: 80 });
  await sendCalendarRowsWithButtons(chatId, rows, 'Gecikenler');
}

async function commandYapilacak(chatId, company = 'ALAYLI'){
  const rows = await getCalendarRows(company, { itemType: 'task', limit: 80 });
  await sendCalendarRowsWithButtons(chatId, rows, 'Yapılacaklar');
}

async function commandOnay(chatId, company = 'ALAYLI'){
  const rows = await getCalendarRows(company, { itemType: 'approval', limit: 80 });
  await sendCalendarRowsWithButtons(chatId, rows, 'Onay Bekleyenler');
}

async function commandRapor(chatId, company = 'ALAYLI'){
  return commandNakit(chatId, company);
}

function tomorrowISO(){
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0,10);
}

async function handleCallback(callbackQuery){
  const chatId = callbackQuery.message?.chat?.id;
  const id = callbackQuery.id;
  const data = String(callbackQuery.data || '');
  const parts = data.split(':');
  if(parts[0] !== 'fc') return telegramAnswerCallback(id, 'Bilinmeyen işlem');
  const action = parts[1];
  const itemId = Number(parts[2]);
  if(!itemId) return telegramAnswerCallback(id, 'Kayıt ID eksik');

  let rpcName, payload;
  if(action === 'paid') { rpcName='finance_calendar_mark_paid'; payload={p_item_id:itemId, p_amount:null, p_actor:'telegram', p_note:'Telegram butonu'}; }
  else if(action === 'collected') { rpcName='finance_calendar_mark_collected'; payload={p_item_id:itemId, p_amount:null, p_actor:'telegram', p_note:'Telegram butonu'}; }
  else if(action === 'done') { rpcName='finance_calendar_mark_done'; payload={p_item_id:itemId, p_actor:'telegram', p_note:'Telegram butonu'}; }
  else if(action === 'approve') { rpcName='finance_calendar_approve'; payload={p_item_id:itemId, p_actor:'telegram', p_note:'Telegram butonu'}; }
  else if(action === 'reject') { rpcName='finance_calendar_reject'; payload={p_item_id:itemId, p_actor:'telegram', p_note:'Telegram butonu'}; }
  else if(action === 'postpone') { rpcName='finance_calendar_postpone'; payload={p_item_id:itemId, p_new_date:tomorrowISO(), p_actor:'telegram', p_note:'Telegram butonu: yarına ertele'}; }
  else if(action === 'detail') {
    const row = await getCalendarItem(itemId);
    await telegramAnswerCallback(id, 'Detay açıldı');
    return telegramSend(chatId, row ? formatOneRow(row) : 'Kayıt bulunamadı.');
  }
  else return telegramAnswerCallback(id, 'Bilinmeyen işlem');

  const result = await supabaseRpc(rpcName, payload);
  await telegramAnswerCallback(id, result.ok ? 'İşlem tamam' : `Hata: ${result.error || 'bilinmiyor'}`);
  if(chatId){
    const label = result.ok ? '✅ İşlem tamamlandı' : '❌ İşlem yapılamadı';
    await telegramSend(chatId, `<b>${label}</b>\nKayıt: ${itemId}\nİşlem: ${action}\n${result.error ? 'Hata: '+result.error : ''}`);
  }
}

async function handleCommand(chatId, text){
  const cmd = String(text || '').split(' ')[0].toLowerCase();
  if(cmd === '/start') return telegramSend(chatId, 'Komutlar: /bugun /nakit /odenecekler /tahsilatlar /gecikenler /yapilacak /onay /rapor');
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
  if(update.callback_query) return handleCallback(update.callback_query);
  const msg = update.message;
  if(msg && msg.chat && msg.text) return handleCommand(msg.chat.id, msg.text);
  return null;
}

module.exports = {
  requireEnv, telegramSend, telegramAnswerCallback, supabaseSelect, supabaseRpc,
  handleUpdate, handleCommand, handleCallback,
  commandBugun, commandNakit, commandOdenecekler, commandTahsilatlar, commandGecikenler, commandYapilacak, commandOnay, commandRapor,
  formatCalendarRows, formatOneRow, actionButtons
};

if(require.main === module){
  requireEnv();
  console.log('AperiON Telegram Bot v48 finance calendar command/action module ready.');
}
