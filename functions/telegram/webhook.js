// AperiON iSTasyon Telegram Quick Capture Webhook
// Cloudflare Pages Function route: POST /telegram/webhook
// Required env:
// - TELEGRAM_BOT_TOKEN
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// Optional env:
// - TELEGRAM_WEBHOOK_SECRET_TOKEN  (Telegram X-Telegram-Bot-Api-Secret-Token)

const MONTHS = {
  ocak: 1, subat: 2, şubat: 2, mart: 3, nisan: 4, mayis: 5, mayıs: 5, haziran: 6,
  temmuz: 7, agustos: 8, ağustos: 8, eylul: 9, eylül: 9, ekim: 10, kasim: 11, kasım: 11, aralik: 12, aralık: 12
};

function json(data, status = 200){
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

function cleanTR(s){
  return String(s || '').replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase().trim();
}

function parseAmount(text){
  const t = cleanTR(text).replace(/\./g, '').replace(/,/g, '.');
  const m = t.match(/(\d+(?:\.\d+)?)\s*(bin|bın|k|tl|₺)?/i);
  if(!m) return null;
  let n = Number(m[1]);
  if(!Number.isFinite(n)) return null;
  const suffix = m[2] || '';
  if(['bin','bın','k'].includes(suffix)) n *= 1000;
  if(n < 1000 && /\b(bin|bın|k)\b/.test(t)) n *= 1000;
  return Math.round(n * 100) / 100;
}

function parseDate(text){
  const now = new Date();
  const year = now.getFullYear();
  const t = cleanTR(text);
  const numeric = t.match(/\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\b/);
  if(numeric){
    const d = Number(numeric[1]);
    const mo = Number(numeric[2]);
    let y = numeric[3] ? Number(numeric[3]) : year;
    if(y < 100) y += 2000;
    return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  for(const [name, mo] of Object.entries(MONTHS)){
    const re = new RegExp(`\\b(\\d{1,2})\\s+${name}\\b`, 'i');
    const m = t.match(re);
    if(m){
      return `${year}-${String(mo).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}`;
    }
  }
  if(/\byarın\b/.test(t) || /\byarin\b/.test(t)){
    const d = new Date(now); d.setDate(d.getDate()+1);
    return d.toISOString().slice(0,10);
  }
  if(/\bbugün\b/.test(t) || /\bbugun\b/.test(t)) return now.toISOString().slice(0,10);
  return null;
}

function titleCaseCounterparty(text){
  let s = String(text || '')
    .replace(/\b\d+[\d.,]*\s*(bin|bın|k|tl|₺)?\b/ig, '')
    .replace(/\b(ocak|şubat|subat|mart|nisan|mayıs|mayis|haziran|temmuz|ağustos|agustos|eylül|eylul|ekim|kasım|kasim|aralık|aralik|bugün|bugun|yarın|yarin)\b/ig, '')
    .replace(/\b(ödeme|odeme|öde|ode|ödenecek|odenecek|tahsilat|tahsil|fatura|hatırlat|hatirlat|not|al|söz|soz|verdim|vereceğim|verecegim)\b/ig, '')
    .replace(/\s+/g, ' ')
    .trim();
  if(!s) return null;
  return s.split(' ').map(w => w ? w[0].toLocaleUpperCase('tr-TR') + w.slice(1).toLocaleLowerCase('tr-TR') : w).join(' ');
}

function classify(text){
  const t = cleanTR(text);
  if(/\b(tahsil|alacak|gelecek)\b/.test(t)) return 'receivable_note';
  if(/\b(fatura|abonelik|su|elektrik|dogalgaz|doğalgaz|internet|telefon)\b/.test(t)) return 'bill_note';
  if(/\b(ödeme|odeme|öde|ode|ödenecek|odenecek|borç|borc)\b/.test(t)) return 'payment_promise';
  return 'quick_note';
}

function parseQuickNote(text){
  const parsed_type = classify(text);
  const amount = parseAmount(text);
  const due_date = parseDate(text);
  const counterparty = titleCaseCounterparty(text);
  const isPayment = parsed_type === 'payment_promise';
  const priority = (isPayment && amount && due_date) ? 'critical' : 'normal';
  const confidence = [parsed_type, amount, due_date, counterparty].filter(Boolean).length * 25;
  return {
    parsed_type,
    company_class: 'ALAYLI',
    counterparty,
    amount,
    currency: 'TRY',
    due_date,
    priority,
    status: isPayment ? 'pending_payment' : 'captured',
    confidence,
    needs_review: confidence < 100,
    alarm_requested: Boolean(isPayment && due_date)
  };
}

async function telegramSend(env, chatId, text){
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  });
  return res.json();
}

async function supabaseInsert(env, table, row){
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      prefer: 'return=representation'
    },
    body: JSON.stringify(row)
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if(!res.ok) throw new Error(`Supabase insert ${table} failed: ${text}`);
  return Array.isArray(data) ? data[0] : data;
}

function paymentReply(p){
  const amount = p.amount ? Number(p.amount).toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' TL' : 'tutar belirsiz';
  const date = p.due_date || 'tarih belirsiz';
  const cp = p.counterparty || 'cari belirsiz';
  if(p.parsed_type === 'payment_promise'){
    return `✅ Aldım.\nCari: <b>${cp}</b>\nTarih: <b>${date}</b>\nTutar: <b>${amount}</b>\nTip: <b>ödeme</b>\nDurum: kritik ödeme listesine alındı.\nDekont/kanıt ödeme sonrası beklenecek.`;
  }
  return `✅ Not alındı.\nKonu: <b>${cp}</b>\nTip: <b>${p.parsed_type}</b>\nDurum: AperiON hızlı not kuyruğuna düştü.`;
}

async function handleText(env, msg){
  const chatId = msg.chat.id;
  const text = String(msg.text || '').trim();
  if(!text) return;

  if(text.startsWith('/start')){
    return telegramSend(env, chatId, 'AperiON hazır. Direkt yaz:\nSena Medikal 10 Temmuz 100 bin ödeme\n\nKomutlar sonra eklenecek; hızlı not her düz yazıyı yakalar.');
  }

  if(text.startsWith('/')){
    return telegramSend(env, chatId, 'Komut yerine düz yaz: örn. Sena Medikal 10 Temmuz 100 bin ödeme');
  }

  const parsed = parseQuickNote(text);
  const note = await supabaseInsert(env, 'quick_notes', {
    ...parsed,
    raw_text: text,
    source: 'telegram',
    created_by: msg.from?.username || msg.from?.first_name || 'telegram_user',
    telegram_chat_id: String(chatId),
    telegram_message_id: String(msg.message_id || ''),
    parsed_json: parsed
  });

  if(parsed.parsed_type === 'payment_promise' && parsed.counterparty && parsed.amount && parsed.due_date){
    await supabaseInsert(env, 'payment_promises', {
      quick_note_id: note.id,
      company_class: parsed.company_class,
      counterparty: parsed.counterparty,
      amount: parsed.amount,
      currency: parsed.currency,
      due_date: parsed.due_date,
      priority: parsed.priority,
      note: text
    });
  }

  return telegramSend(env, chatId, paymentReply(parsed));
}

export async function onRequestPost({ request, env }){
  try{
    if(!env.TELEGRAM_BOT_TOKEN || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY){
      return json({ ok:false, error:'missing_env' }, 500);
    }
    const expectedSecret = env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
    if(expectedSecret){
      const got = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
      if(got !== expectedSecret) return json({ ok:false, error:'forbidden' }, 403);
    }
    const update = await request.json();
    if(update.message?.text) await handleText(env, update.message);
    return json({ ok:true });
  }catch(e){
    return json({ ok:false, error:e.message || 'server_error' }, 500);
  }
}

export async function onRequestGet(){
  return json({ ok:true, service:'aperion-telegram-quick-capture', mode:'cloudflare-pages-function' });
}
