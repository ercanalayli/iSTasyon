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

async function saveQuickNote(env, { chatId, messageId, rawText, parsed }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: 'missing_supabase_env' };
  }
  const url = env.SUPABASE_URL.replace(/\/rest\/v1\/?$/i, '') + '/rest/v1/quick_notes';
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
      'content-type': 'application/json',
      prefer: 'return=representation'
    },
    body: JSON.stringify({
      source: 'telegram',
      chat_id: chatId,
      telegram_message_id: messageId,
      raw_text: rawText,
      parsed_type: parsed.type,
      payment_method: parsed.payment_method,
      status: 'captured',
      needs_review: true
    })
  });
  if (!r.ok) {
    const errText = await r.text();
    return { ok: false, error: 'storage_failed', detail: errText };
  }
  const rows = await r.json();
  return { ok: true, id: rows && rows[0] && rows[0].id };
}

async function queryBalance(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const base = env.SUPABASE_URL.replace(/\/rest\/v1\/?$/i, '');
  const url = base + '/rest/v1/aperion_bank_last_known_balance_v1_view?select=bank_name,son_bakiye,son_tarih';
  const r = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY
    }
  });
  if (!r.ok) return null;
  return r.json();
}

function money(n) {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString('tr-TR') + ' TL';
}

function trTarih(iso) {
  if (!iso) return 'tarih bilinmiyor';
  const [y, m, d] = String(iso).split('-');
  return d + '.' + m + '.' + y;
}

async function handleBalanceIntent(env, chatId) {
  const rows = await queryBalance(env);
  if (!rows) {
    await sendMessage(env, chatId, 'Bakiye verisine şu an ulaşamadım (Supabase bağlantı sorunu).');
    return;
  }
  let toplam = 0;
  let enEskiTarih = null;
  const lines = rows.map(r => {
    toplam += Number(r.son_bakiye) || 0;
    if (r.son_tarih && (!enEskiTarih || r.son_tarih < enEskiTarih)) enEskiTarih = r.son_tarih;
    return '• ' + r.bank_name + ': ' + money(r.son_bakiye) + ' (' + trTarih(r.son_tarih) + ' itibarıyla)';
  });
  const suan = new Date();
  const suanStr = String(suan.getDate()).padStart(2, '0') + '.' + String(suan.getMonth() + 1).padStart(2, '0') + '.' + suan.getFullYear() + ' ' + String(suan.getHours()).padStart(2, '0') + ':' + String(suan.getMinutes()).padStart(2, '0');
  let mesaj = '💰 Şu an elde (bilinen banka toplamı, ' + suanStr + ' sorgu anı): ' + money(toplam) + '\n' + lines.join('\n');
  if (enEskiTarih) {
    const gunFarki = Math.floor((suan - new Date(enEskiTarih)) / 86400000);
    if (gunFarki >= 2) {
      mesaj += '\n\n⚠️ En eski bakiye verisi ' + gunFarki + ' gün önceye ait (' + trTarih(enEskiTarih) + ') — o bankanın ekstresi güncellenmemiş olabilir.';
    }
  }
  await sendMessage(env, chatId, mesaj);
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
    const lower = lowerTR(text);

    if (text.startsWith('/start')) {
      await sendMessage(env, chatId, 'AperiON Telegram canlı. Hızlı not modu açıldı. Düz yaz: Sena Medikal 10 Temmuz 100 bin ödeme kredi kartı\nYa da sor: "bakiye" / "ne kadar param var"');
      return json({ ok: true });
    }

    if (lower.includes('bakiye') || lower.includes('ne kadar param var') || lower.includes('nakit durum')) {
      await handleBalanceIntent(env, chatId);
      return json({ ok: true });
    }

    const parsed = parseBasic(text);
    const saved = await saveQuickNote(env, { chatId, messageId: msg.message_id, rawText: text, parsed });

    await sendMessage(env, chatId,
      'Aldım.\n' +
      'Tip: ' + parsed.type + '\n' +
      'Ödeme yöntemi: ' + parsed.payment_method + '\n' +
      'Not: ' + parsed.raw_text + '\n' +
      (saved.ok
        ? '✅ AperiON kaydı açıldı (id: ' + saved.id + '). İnceleyip doğru hesaba/kategoriye ben taşıyacağım.'
        : '⚠️ Not alındı ama kalıcı kayıt başarısız oldu (' + (saved.error || 'bilinmeyen hata') + '). Tekrar dene veya bana söyle.')
    );
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e.message || 'server_error' }, 500);
  }
}
