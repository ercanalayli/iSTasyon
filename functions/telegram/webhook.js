// AperiON Telegram Webhook - ikinci beyin / hizli yakalama
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

function supabaseBase(env) {
  return (env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/i, '');
}

async function sbFetch(env, path, opts = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, error: 'missing_supabase_env' };
  const url = supabaseBase(env) + path;
  const r = await fetch(url, {
    ...opts,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
      'content-type': 'application/json',
      ...(opts.headers || {})
    }
  });
  if (!r.ok) {
    const t = await r.text();
    return { ok: false, error: 'http_' + r.status, detail: t };
  }
  const text = await r.text();
  return { ok: true, data: text ? JSON.parse(text) : null };
}

// ---- Google Takvim: refresh token'dan gecici access token, sonra etkinlik olustur ----
async function googleAccessToken(env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) return null;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.access_token || null;
}

async function createCalendarEvent(env, { summary, description, dateIso }) {
  const token = await googleAccessToken(env);
  if (!token) return { ok: false, error: 'google_token_unavailable' };
  const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({
      summary,
      description,
      start: { date: dateIso },
      end: { date: dateIso },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 }
        ]
      }
    })
  });
  if (!r.ok) {
    const t = await r.text();
    return { ok: false, error: 'http_' + r.status, detail: t };
  }
  const j = await r.json();
  return { ok: true, eventId: j.id, link: j.htmlLink };
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
  if (env.APERION_DB) {
    try {
      const row = await env.APERION_DB.prepare(`INSERT INTO quick_notes (source,source_message_id,chat_id,raw_text,parsed_type,payment_method,status,needs_review) VALUES ('telegram',?,?,?,?,?,'captured',1) ON CONFLICT(source,source_message_id) DO UPDATE SET updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') RETURNING id`).bind(String(messageId),String(chatId),rawText,parsed.type,parsed.payment_method).first();
      return { ok:true, id:row?.id, duplicate_safe:true, store:'cloudflare_d1' };
    } catch (error) { return { ok:false, error:'d1_storage_failed', detail:error.message }; }
  }
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
  if (env.APERION_DB) {
    try {
      const rows=await env.APERION_DB.prepare('SELECT bank_name,balance AS son_bakiye,balance_date AS son_tarih FROM last_bank_balances ORDER BY bank_name').all();
      return rows.results||[];
    } catch (_error) { return null; }
  }
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

function isoBugun() {
  const n = new Date();
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
}

// ---- odeme yontemi ----
function parsePaymentMethod(lower) {
  if (lower.includes('kredi kart')) return 'kredi kartı';
  if (lower.includes('havale') || lower.includes('eft') || lower.includes('fast')) return 'havale/eft/fast';
  if (lower.includes('nakit')) return 'nakit';
  if (lower.includes('çek') || lower.includes('cek')) return 'çek';
  if (lower.includes('senet')) return 'senet';
  return 'belirsiz';
}

// ---- tarih cikarimi: "10 Temmuz", "bugun", "yarin" ----
const AYLAR = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
function parseDueDate(text) {
  const lower = lowerTR(text);
  const now = new Date();

  if (/\byarın\b/.test(lower)) {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    return { iso: isoFromDate(d), matched: 'yarın' };
  }
  if (/\bbugün\b/.test(lower)) {
    return { iso: isoFromDate(now), matched: 'bugün' };
  }

  const ayPattern = AYLAR.join('|');
  const re = new RegExp('(\\d{1,2})\\s*(' + ayPattern + ')', 'i');
  const m = lower.match(re);
  if (m) {
    const gun = parseInt(m[1], 10);
    const ayIdx = AYLAR.indexOf(m[2].toLowerCase());
    if (gun >= 1 && gun <= 31 && ayIdx >= 0) {
      // 2026-08-12: yil belirtilmedigi icin ONCEDEN otomatik "gelecek yil"
      // varsayiliyordu - ama "10 Temmuz" agustosta soylenince bu, gecikmis
      // bir odemeyi SESSIZCE bir yil ileri atiyordu (yanlis olabilirdi, hic
      // dogrulanmadan). Artik tahmin YOK: tarih bu yilin tarihi olarak
      // donduruluyor, gecmisteyse "gecmisMi" bayragiyla isaretlenip
      // kullaniciya acikca soruluyor.
      const yil = now.getFullYear();
      const d = new Date(yil, ayIdx, gun);
      const bugunGeceYarisi = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { iso: isoFromDate(d), matched: m[0], gecmisMi: d < bugunGeceYarisi };
    }
  }
  return { iso: null, matched: null, gecmisMi: false };
}
function isoFromDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ---- tutar cikarimi: "100 bin", "1.5 milyon", "50000 TL" ----
function parseAmount(text, dueDateMatchedStr) {
  let t = text;
  if (dueDateMatchedStr) t = t.replace(dueDateMatchedStr, ' ');
  const re = /(\d[\d.,]*)\s*(bin|milyon|milyar|tl|lira|try)\b/i;
  const m = t.match(re);
  if (!m) return { amount: null, currency: 'TRY', matched: null };
  const carpanKelime = m[2].toLowerCase();
  const carpan = carpanKelime === 'bin' ? 1e3 : carpanKelime === 'milyon' ? 1e6 : carpanKelime === 'milyar' ? 1e9 : 1;
  const sayiStr = m[1].replace(/\./g, '').replace(',', '.');
  const sayi = parseFloat(sayiStr);
  if (!Number.isFinite(sayi)) return { amount: null, currency: 'TRY', matched: null };
  return { amount: Math.round(sayi * carpan * 100) / 100, currency: 'TRY', matched: m[0] };
}

// ---- karsi taraf tahmini: tarih/tutar/anahtar kelimelerden once gelen kisim ----
const DUZ_KELIMELER = ['ödeme', 'odeme', 'kredi', 'kart', 'kartı', 'kartı', 'havale', 'eft', 'fast', 'nakit', 'çek', 'cek', 'senet', 'tl', 'lira', 'try', 'bin', 'milyon', 'milyar', 'bugün', 'yarın', ...AYLAR];
function guessCounterparty(text, dueDateMatchedStr, amountMatchedStr) {
  let t = text;
  if (dueDateMatchedStr) t = t.replace(dueDateMatchedStr, ' ');
  if (amountMatchedStr) t = t.replace(amountMatchedStr, ' ');
  const words = t.split(/\s+/).filter(Boolean);
  const kalan = [];
  for (const w of words) {
    const lw = lowerTR(w).replace(/[^a-zçğıöşü]/g, '');
    if (DUZ_KELIMELER.includes(lw) || /^\d+$/.test(w)) continue;
    kalan.push(w);
  }
  const aday = kalan.slice(0, 4).join(' ').trim();
  return aday || null;
}

async function matchCustomer(env, adayIsim) {
  if (!adayIsim || adayIsim.length < 3) return null;
  const ilkKelime = adayIsim.split(/\s+/)[0];
  if (!ilkKelime || ilkKelime.length < 3) return null;
  const r = await sbFetch(env, '/rest/v1/customers?select=id,cari_unvan&cari_unvan=ilike.*' + encodeURIComponent(ilkKelime) + '*&limit=3');
  if (!r.ok || !r.data || !r.data.length) return null;
  return r.data[0];
}

// ---- siniflandirma (odeme sozu disindaki notlar icin) ----
function classifyNote(lower) {
  if (/\bsipariş|\bballya|\badet\b/.test(lower)) return 'siparis_notu';
  if (/yapacaksın|hatırlat|unutma|yap\b/.test(lower)) return 'yapilacak_is';
  return 'genel_not';
}

async function saveQuickNote(env, { chatId, messageId, rawText, parsedType, paymentMethod, needsReview }) {
  const r = await sbFetch(env, '/rest/v1/quick_notes', {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify({
      source: 'telegram',
      chat_id: chatId,
      telegram_message_id: messageId,
      raw_text: rawText,
      parsed_type: parsedType,
      payment_method: paymentMethod,
      status: 'captured',
      needs_review: needsReview
    })
  });
  if (!r.ok) return { ok: false, error: r.error, detail: r.detail };
  return { ok: true, id: r.data && r.data[0] && r.data[0].id };
}

async function savePaymentPromise(env, { chatId, quickNoteId, rawText, counterparty, matchedCustomerId, amount, dueDate, paymentMethod }) {
  const r = await sbFetch(env, '/rest/v1/payment_promises', {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify({
      quick_note_id: quickNoteId,
      counterparty: counterparty || '(belirtilmedi)',
      counterparty_matched_customer_id: matchedCustomerId || null,
      amount,
      currency: 'TRY',
      due_date: dueDate,
      payment_method: paymentMethod,
      approval_status: 'pending',
      paid_status: 'pending_payment',
      evidence_status: 'waiting_proof',
      chat_id: chatId,
      raw_text: rawText
    })
  });
  if (!r.ok) return { ok: false, error: r.error, detail: r.detail };
  return { ok: true, id: r.data && r.data[0] && r.data[0].id };
}

// ---- mukerrer kontrolu: ayni telegram mesaji webhook tarafindan iki kez teslim edilirse ----
async function zatenKayitliMi(env, messageId, chatId) {
  if (!messageId) return false;
  const r = await sbFetch(env, '/rest/v1/quick_notes?select=id&telegram_message_id=eq.' + messageId + '&chat_id=eq.' + chatId + '&limit=1');
  return r.ok && r.data && r.data.length > 0;
}

async function queryBalance(env) {
  const r = await sbFetch(env, '/rest/v1/aperion_bank_last_known_balance_v1_view?select=bank_name,son_bakiye,son_tarih');
  if (!r.ok) return null;
  return r.data;
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
    mode: 'quick-capture-v2',
    telegram_token_configured: Boolean(env.TELEGRAM_BOT_TOKEN),
    supabase_configured: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
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
      await sendMessage(env, chatId,
        'AperiON Telegram canlı. İkinci beyin modu açık.\n\n' +
        'Ödeme sözü: "Sena Medikal 10 Temmuz 100 bin ödeme kredi kartı"\n' +
        'Bakiye sorgusu: "bakiye"\n' +
        'Herhangi bir not: düz yaz, kaydederim.'
      );
      return json({ ok: true });
    }

    if (lower.includes('bakiye') || lower.includes('ne kadar param var') || lower.includes('nakit durum')) {
      await handleBalanceIntent(env, chatId);
      return json({ ok: true });
    }

    if (await zatenKayitliMi(env, msg.message_id, chatId)) {
      return json({ ok: true, deduped: true });
    }

    const paymentMethod = parsePaymentMethod(lower);
    const dueDate = parseDueDate(text);
    const amount = parseAmount(text, dueDate.matched);
    const odemeSozuAdayi = /ödeme|odeme|öde\b/.test(lower) || amount.amount !== null;

    if (odemeSozuAdayi && amount.amount !== null) {
      // Odeme sozu: tutar bulundu, kayit payment_promises'a acilir.
      const counterpartyAdayi = guessCounterparty(text, dueDate.matched, amount.matched);
      const musteri = await matchCustomer(env, counterpartyAdayi);

      const noteSaved = await saveQuickNote(env, {
        chatId, messageId: msg.message_id, rawText: text,
        parsedType: 'odeme_sozu', paymentMethod, needsReview: !musteri || !dueDate.iso || dueDate.gecmisMi
      });
      const promiseSaved = noteSaved.ok
        ? await savePaymentPromise(env, {
            chatId, quickNoteId: noteSaved.id, rawText: text,
            counterparty: musteri ? musteri.cari_unvan : counterpartyAdayi,
            matchedCustomerId: musteri ? musteri.id : null,
            amount: amount.amount, dueDate: dueDate.iso, paymentMethod
          })
        : { ok: false };

      const satirlar = [
        '📌 Ödeme sözü olarak anladım:',
        '• Karşı taraf: ' + (musteri ? musteri.cari_unvan + ' (cari eşleşti)' : (counterpartyAdayi || 'belirtilmedi') + ' (cari eşleşmedi, kontrol et)'),
        '• Tutar: ' + money(amount.amount),
        '• Tarih: ' + (dueDate.iso ? trTarih(dueDate.iso) : 'BELİRTİLMEDİ — ne zaman?'),
        '• Ödeme yöntemi: ' + paymentMethod
      ];
      if (promiseSaved.ok) {
        satirlar.push('✅ AperiON kritik ödeme listesine eklendi (id: ' + promiseSaved.id + ').');
      } else {
        satirlar.push('⚠️ Kayıt başarısız oldu, tekrar dener misin?');
      }
      if (!musteri) satirlar.push('❗ Bu ismi cari listesinde bulamadım, yanlışsa doğru unvanı yaz.');
      if (!dueDate.iso) satirlar.push('❗ Tarih anlayamadım, "10 Temmuz" gibi yazar mısın?');
      if (dueDate.gecmisMi) satirlar.push('❗ Bu tarih geçmişte kalmış — gecikmiş bir ödeme mi, yoksa gelecek yıl mı demek istedin? Emin değilsen "gelecek yıl" yaz.');
      await sendMessage(env, chatId, satirlar.join('\n'));
      return json({ ok: true });
    }

    // Odeme sozu degil - genel not olarak siniflandirip kaydet.
    const parsedType = classifyNote(lower);
    const saved = await saveQuickNote(env, {
      chatId, messageId: msg.message_id, rawText: text,
      parsedType, paymentMethod, needsReview: parsedType === 'genel_not'
    });

    await sendMessage(env, chatId,
      'Aldım.\n' +
      'Tip: ' + parsedType + '\n' +
      'Not: ' + text + '\n' +
      (saved.ok
        ? '✅ AperiON kaydı açıldı (id: ' + saved.id + ').'
        : '⚠️ Not alındı ama kalıcı kayıt başarısız oldu (' + (saved.error || 'bilinmeyen hata') + '). Tekrar dene veya bana söyle.')
    );
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e.message || 'server_error' }, 500);
  }
}
