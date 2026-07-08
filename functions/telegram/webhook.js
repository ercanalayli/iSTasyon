// AperiON Telegram Webhook - emergency live reply mode
// Route: /telegram/webhook

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

function clean(text) {
  return String(text || '').trim();
}

function lowerTR(text) {
  return clean(text).replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}

function parseBasic(text) {
  const t = lowerTR(text);
  const out = {
    raw_text: clean(text),
    type: t.includes('ödeme') || t.includes('odeme') ? 'payment_note' : 'quick_note',
    payment_method: 'belirsiz'
  };
  if (t.includes('kredi kart')) out.payment_method = 'kredi kartı';
  else if (t.includes('havale') || t.includes('eft') || t.includes('fast')) out.payment_method = 'havale/eft/fast';
  else if (t.includes('nakit')) out.payment_method = 'nakit';
  else if (t.includes('çek') || t.includes('cek')) out.payment_method = 'çek';
  else if (t.includes('senet')) out.payment_method = 'senet';
  return out;
}

async function sendMessage(env, chatId, text) {
  if (!env.TELEGRAM_BOT_TOKEN) return { ok: false, error: 'missing_telegram_token' };
  const url = 'https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage';
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
  return r.json();
}

export async function onRequestGet({ env }) {
  return json({
    ok: true,
    service: 'aperion-telegram-webhook',
    mode: 'emergency-live-reply',
    telegram_token_configured: Boolean(env.TELEGRAM_BOT_TOKEN)
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const update = await request.json();
    const msg = update.message;
    if (!msg || !msg.chat || !msg.text) return json({ ok: true, ignored: true });

    const chatId = msg.chat.id;
    const text = clean(msg.text);

    if (text.startsWith('/start')) {
      await sendMessage(env, chatId, 'AperiON Telegram canlı. Hızlı not modu açıldı. Düz yaz: Sena Medikal 10 Temmuz 100 bin ödeme kredi kartı');
      return json({ ok: true });
    }

    const parsed = parseBasic(text);
    await sendMessage(env, chatId,
      'Aldım.\n' +
      'Tip: ' + parsed.type + '\n' +
      'Ödeme yöntemi: ' + parsed.payment_method + '\n' +
      'Not: ' + parsed.raw_text + '\n' +
      'Durum: Telegram hattı çalışıyor. Kalıcı kayıt bağlantısı sıradaki adımda bağlanacak.'
    );
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e.message || 'server_error' }, 500);
  }
}
