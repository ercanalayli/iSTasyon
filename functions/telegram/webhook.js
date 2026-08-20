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

async function sendMessage(env, chatId, text, replyMarkup) {
if (!env.TELEGRAM_BOT_TOKEN) return { ok: false, error: 'missing_telegram_token' };
const url = 'https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage';
const r = await fetch(url, {
method: 'POST',
headers: { 'content-type': 'application/json' },
body: JSON.stringify({ chat_id: chatId, text, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) })
});
return r.json();
}

async function answerCallbackQuery(env, callbackQueryId, text) {
if (!env.TELEGRAM_BOT_TOKEN) return { ok: false, error: 'missing_telegram_token' };
const url = 'https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/answerCallbackQuery';
const r = await fetch(url, {
method: 'POST',
headers: { 'content-type': 'application/json' },
body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false })
});
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

export function parseCashTransferIntent(text) {
const rawText = clean(text).replace(/\s+/g, ' ');
const match = rawText.match(/^(.+?)\s+(?:kasadan|hesaptan)\s+(.+?)\s+(?:kasaya|hesaba)\s+([\d.,]+)\s*(?:tl|try|₺)\s*(?:transfer(?:\s+et)?|aktar)?$/iu);
if (!match) return null;
const amountResult = parseAmount(match[3] + ' TL', null);
if (!clean(match[1]) || !clean(match[2]) || amountResult.amount === null || amountResult.amount <= 0) return null;
return {
type: 'cash_transfer_command',
source_account_candidate: clean(match[1]),
target_account_candidate: clean(match[2]),
amount: amountResult.amount,
currency: 'TRY',
raw_text: rawText,
requires_approval: true,
creates_finance_record: false,
sends_to_bizimhesap: false
};
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

async function saveQuickNote(env, { chatId, messageId, rawText, parsedType, paymentMethod, needsReview, status = 'captured' }) {
if (env.APERION_DB) {
try {
const row = await env.APERION_DB.prepare(`INSERT INTO quick_notes (source,source_message_id,chat_id,raw_text,parsed_type,payment_method,status,needs_review) VALUES ('telegram',?,?,?,?,?,?,?) ON CONFLICT(source,source_message_id) DO UPDATE SET updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') RETURNING id`).bind(String(messageId),String(chatId),rawText,parsedType,paymentMethod,status,needsReview?1:0).first();
return { ok:true, id:row?.id, store:'cloudflare_d1' };
} catch (error) { /* D1 yoksa/hata varsa Supabase'e dus */ }
}
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
status,
needs_review: needsReview
})
});
if (!r.ok) return { ok: false, error: r.error, detail: r.detail };
return { ok: true, id: r.data && r.data[0] && r.data[0].id };
}

async function createTransferApproval(env, { chatId, messageId, quickNoteId, intent }) {
if (!env.APERION_DB) return { ok: false, error: 'd1_required_for_safe_approval' };
const approvalId = crypto.randomUUID();
const idempotencyKey = `telegram:cash-transfer:${chatId}:${messageId}`;
const payload = {
...intent,
quick_note_id: quickNoteId,
chat_id: String(chatId),
telegram_message_id: String(messageId),
test_mode: true,
live_write_enabled: false
};
try {
await env.APERION_DB.prepare(`INSERT INTO approval_queue (id,item_type,status,payload_json,evidence_ref,idempotency_key) VALUES (?,'cash_transfer_test','needs_review',?,?,?)`).bind(
approvalId,
JSON.stringify(payload),
`telegram:${chatId}:${messageId}`,
idempotencyKey
).run();
return { ok: true, id: approvalId, duplicate: false };
} catch (error) {
const existing = await env.APERION_DB.prepare('SELECT id,status FROM approval_queue WHERE idempotency_key=?').bind(idempotencyKey).first();
if (existing?.id) return { ok: true, id: existing.id, duplicate: true, status: existing.status };
return { ok: false, error: 'approval_queue_failed', detail: error.message };
}
}

function transferApprovalText(intent) {
return [
'🧪 TEST MODU — BizimHesap kaydı yapılmayacak',
'',
'Kaynak hesap adayı: ' + intent.source_account_candidate,
'Hedef hesap adayı: ' + intent.target_account_candidate,
'Tutar: ' + Number(intent.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL',
'İşlem: Kasalar arası transfer',
'Durum: Hesap adları BizimHesap’ta henüz doğrulanmadı'
].join('\n');
}

function transferApprovalButtons(approvalId) {
return {
inline_keyboard: [
[
{ text: 'ONAYLA (TEST)', callback_data: `ct:a:${approvalId}` },
{ text: 'REDDET', callback_data: `ct:r:${approvalId}` }
],
[{ text: 'HESAP DÜZELT', callback_data: `ct:e:${approvalId}` }]
]
};
}

async function handleTransferCallback(env, callback) {
const match = String(callback.data || '').match(/^ct:([are]):([0-9a-f-]{36})$/i);
if (!match || !env.APERION_DB) return false;
const chatId = callback.message?.chat?.id;
const row = await env.APERION_DB.prepare('SELECT id,status,payload_json FROM approval_queue WHERE id=?').bind(match[2]).first();
if (!row) {
await answerCallbackQuery(env, callback.id, 'Test onayı bulunamadı.');
return true;
}
const payload = JSON.parse(row.payload_json || '{}');
if (String(payload.chat_id) !== String(chatId)) {
await answerCallbackQuery(env, callback.id, 'Bu onay size ait değil.');
return true;
}
if (row.status !== 'needs_review') {
await answerCallbackQuery(env, callback.id, 'Daha önce işlendi: ' + row.status);
return true;
}
const status = { a: 'test_approved', r: 'rejected', e: 'needs_account_edit' }[match[1]];
await env.APERION_DB.prepare(`UPDATE approval_queue SET status=?,decided_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),decided_by=? WHERE id=? AND status='needs_review'`).bind(
status,
`telegram:${chatId}`,
row.id
).run();
const message = status === 'test_approved'
? '✅ Kuru test onaylandı. BizimHesap’a kayıt yapılmadı.'
: status === 'rejected'
? '❌ Kuru test reddedildi. Kayıt yapılmadı.'
: '✏️ Hesap düzeltme istendi. Kayıt yapılmadı.';
await answerCallbackQuery(env, callback.id, message);
await sendMessage(env, chatId, message);
return true;
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
if (env.APERION_DB) {
try {
const rows = await env.APERION_DB.prepare('SELECT bank_name,balance AS son_bakiye,balance_date AS son_tarih FROM last_bank_balances ORDER BY bank_name').all();
if (rows.results && rows.results.length) return rows.results;
} catch (_error) { /* D1 yoksa/hata varsa Supabase'e dus */ }
}
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

// ---------------------------------------------------------------------------
// APERION-008 Faz 1 (Cloudflare tarafi) — 2026-08-15 eklendi.
// AMAC: /durum ve /stok komutlarini DOGRUDAN Supabase'den cevaplamak — bu
// webhook Cloudflare'de calistigi icin Windows bilgisayara hic erisemiyor,
// bu yuzden sadece bulutta zaten var olan veriye bakan komutlar eklendi.
// /senkron ve /oturum gibi "yerel bilgisayarda bir seyi calistir" komutlari
// bu mimaride yapilamaz — bunun icin bot_commands kuyrugundaki yerel
// dinleyicinin (su an 3 gundur calismiyor) ayrica calisir hale gelmesi lazim.
// ---------------------------------------------------------------------------

async function handleStokIntent(env, chatId, query) {
if (!query) {
await sendMessage(env, chatId, 'Kullanım: /stok <ürün adı>');
return;
}
const encoded = encodeURIComponent('*' + query + '*');
const r = await sbFetch(env, '/rest/v1/stock_raw?select=urun,miktar,birim,tarih&urun=ilike.' + encoded + '&order=urun.asc&limit=5');
if (!r.ok || !r.data) {
await sendMessage(env, chatId, 'Stok verisine şu an ulaşamadım (Supabase bağlantı sorunu).');
return;
}
if (!r.data.length) {
await sendMessage(env, chatId, '"' + query + '" için sonuç bulunamadı.');
return;
}
const sonTarih = r.data[0].tarih;
const lines = r.data.map(row => '• ' + row.urun + '\n  Stok: ' + row.miktar + ' ' + row.birim);
await sendMessage(env, chatId,
'"' + query + '" için ' + r.data.length + ' sonuç (veri tarihi: ' + trTarih(sonTarih) + '):\n\n' + lines.join('\n\n')
);
}

async function handleDurumIntent(env, chatId) {
const stokR = await sbFetch(env, '/rest/v1/stock_raw?select=tarih&order=tarih.desc&limit=1');
const eventR = await sbFetch(env, '/rest/v1/bizimhesap_events?select=created_at&order=created_at.desc&limit=1');
const lines = ['AperiON Durum (Supabase üzerinden):', ''];
if (stokR.ok && stokR.data && stokR.data[0]) {
lines.push('• Stok verisi: son güncelleme ' + trTarih(stokR.data[0].tarih));
} else {
lines.push('• Stok verisi: okunamadı');
}
if (eventR.ok && eventR.data && eventR.data[0]) {
const dt = new Date(eventR.data[0].created_at);
lines.push('• Son BizimHesap olayı: ' + dt.toLocaleString('tr-TR'));
} else {
lines.push('• BizimHesap olay kaydı: okunamadı');
}
lines.push('', 'Not: bu özet yalnızca buluttaki (Supabase) verilere bakar; bilgisayarınızdaki senkron scriptinin şu anki canlı çalışma durumunu göstermez.');
await sendMessage(env, chatId, lines.join('\n'));
}
// ---------------------------------------------------------------------------

async function getTelegramFileUrl(env, fileId) {
    if (!env.TELEGRAM_BOT_TOKEN || !fileId) return null;
    try {
          const r = await fetch('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/getFile?file_id=' + encodeURIComponent(fileId));
          const j = await r.json();
          if (!j.ok || !j.result || !j.result.file_path) return null;
          return 'https://api.telegram.org/file/bot' + env.TELEGRAM_BOT_TOKEN + '/' + j.result.file_path;
    } catch (_e) { return null; }
}

async function ensureCapturesTable(env) {
    await env.APERION_DB.prepare(
          "CREATE TABLE IF NOT EXISTS telegram_captures (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id TEXT NOT NULL, message_id TEXT NOT NULL, kind TEXT NOT NULL, file_id TEXT NOT NULL, mime_type TEXT, caption TEXT, status TEXT NOT NULL DEFAULT 'pending_review', created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(chat_id, message_id))"
        ).run();
}

async function handleMediaCapture(env, msg) {
    const chatId = msg.chat.id;
    let fileId = null, kind = null, mimeType = null;
    if (msg.photo && msg.photo.length) { const best = msg.photo[msg.photo.length - 1]; fileId = best.file_id; kind = 'photo'; }
    else if (msg.document) { fileId = msg.document.file_id; kind = 'document'; mimeType = msg.document.mime_type || null; }
    else if (msg.video) { fileId = msg.video.file_id; kind = 'video'; mimeType = msg.video.mime_type || null; }
    if (!fileId) return json({ ok: true, ignored: true });
  
    const caption = clean(msg.caption || '');
    let savedOk = false;
    if (env.APERION_DB) {
          try {
                  await ensureCapturesTable(env);
                  await env.APERION_DB.prepare(
                            'INSERT INTO telegram_captures (chat_id,message_id,kind,file_id,mime_type,caption) VALUES (?,?,?,?,?,?) ON CONFLICT(chat_id,message_id) DO NOTHING'
                          ).bind(String(chatId), String(msg.message_id), kind, fileId, mimeType, caption).run();
                  savedOk = true;
          } catch (_e) { savedOk = false; }
    }
  
    const etiket = kind === 'photo' ? '📸 Fotoğrafı' : kind === 'video' ? '🎥 Videoyu' : '📎 Dosyayı';
    const satirlar = [
          etiket + ' aldım' + (caption ? (' — not: "' + caption + '"') : '') + '.',
          savedOk ? '✅ Kuyruğa alındı (durum: onay bekliyor).' : '⚠️ Aldım ama kalıcı kayıt başarısız oldu.',
          'Bu fatura/fiş görselinden bilgi çıkarma ve BizimHesap\'a onaylı yazma adımı şu an geliştiriliyor — hazır olunca burada onayına sunacağım.'
        ];
    await sendMessage(env, chatId, satirlar.join('\n'));
    return json({ ok: true, captured: kind });
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
if (update.callback_query) {
const handled = await handleTransferCallback(env, update.callback_query);
return json({ ok: true, callback_handled: handled });
}
const msg = update.message;
      if (msg && msg.chat && (msg.photo || msg.document || msg.video)) { return await handleMediaCapture(env, msg); }
if (!msg || !msg.chat || !msg.text) return json({ ok: true, ignored: true });

const chatId = msg.chat.id;
const text = clean(msg.text);
const lower = lowerTR(text);

if (text.startsWith('/start')) {
await sendMessage(env, chatId,
'AperiON Telegram canlı. İkinci beyin modu açık.\n\n' +
'Ödeme sözü: "Sena Medikal 10 Temmuz 100 bin ödeme kredi kartı"\n' +
'Bakiye sorgusu: "bakiye"\n' +
'Durum: /durum\n' +
'Stok sorgusu: /stok <ürün adı>\n' +
'Fatura/fiş fotoğrafı: gönder, kuyruğa alırım (BizimHesap\'a onaylı yazma yakında).\n' +
                      'Herhangi bir not: düz yaz, kaydederim.'
);
return json({ ok: true });
}

if (lower.startsWith('/durum')) {
await handleDurumIntent(env, chatId);
return json({ ok: true });
}

if (lower.startsWith('/stok')) {
await handleStokIntent(env, chatId, text.slice(5).trim());
return json({ ok: true });
}

if (lower.startsWith('/senkron') || lower.startsWith('/oturum')) {
await sendMessage(env, chatId, 'Bu komut şu an bilgisayarınıza bağlı değil (yerel dinleyici çalışmıyor, en son 12 Ağustos\'ta aktifti). Bağlanınca haber vereceğim.');
return json({ ok: true });
}

if (lower.includes('bakiye') || lower.includes('ne kadar param var') || lower.includes('nakit durum')) {
await handleBalanceIntent(env, chatId);
return json({ ok: true });
}

if (await zatenKayitliMi(env, msg.message_id, chatId)) {
return json({ ok: true, deduped: true });
}

const transferIntent = parseCashTransferIntent(text);
if (transferIntent) {
const saved = await saveQuickNote(env, {
chatId,
messageId: msg.message_id,
rawText: text,
parsedType: transferIntent.type,
paymentMethod: 'nakit',
needsReview: true,
status: 'approval_pending'
});
if (!saved.ok) {
await sendMessage(env, chatId, '⚠️ Transfer emri güvenli kuyruğa alınamadı. Hiçbir kayıt yapılmadı.');
return json({ ok: false, error: saved.error || 'quick_note_failed' }, 503);
}
const approval = await createTransferApproval(env, {
chatId,
messageId: msg.message_id,
quickNoteId: saved.id,
intent: transferIntent
});
if (!approval.ok) {
await sendMessage(env, chatId, '⚠️ Onay kartı oluşturulamadı. Hiçbir BizimHesap kaydı yapılmadı.');
return json({ ok: false, error: approval.error || 'approval_queue_failed' }, 503);
}
await sendMessage(env, chatId, transferApprovalText(transferIntent), transferApprovalButtons(approval.id));
return json({
ok: true,
intent: 'cash_transfer_test',
approval_id: approval.id,
duplicate: approval.duplicate,
live_write_enabled: false
});
}

const paymentMethod = parsePaymentMethod(lower);
const dueDate = parseDueDate(text);
const amount = parseAmount(text, dueDate.matched);
const odemeSozuAdayi = /ödeme|odeme|öde\b/.test(lower) || amount.amount !== null;

if (odemeSozuAdayi && amount.amount !== null) {
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
