import { getMobileSecurityStatus, handleMobileCommand, verifyTelegramRequest } from './mobile-command-center.js';
import { DESKTOP_TARGETS, desktopTargetSummary, parseUniversalCommand } from './universal-command-router.js';
import { deviceHealth, queueDeviceCommand } from './device-bridge.js';
import { buildDailyFinancialStatements } from '../../workers/aperion-morning-brief/src/index.js';
import { parseCashExpenseIntent } from '../shared/cash-expense.js';
import { decideBankMovement } from '../shared/bank-approvals.js';

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

function telegramToken(env) {
return env.HERMES_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN || '';
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

async function sendMessage(env, chatId, text, replyMarkup, extra = {}) {
const token = telegramToken(env);
if (!token) return { ok: false, error: 'missing_telegram_token' };
const url = 'https://api.telegram.org/bot' + token + '/sendMessage';
const r = await fetch(url, {
method: 'POST',
headers: { 'content-type': 'application/json' },
body: JSON.stringify({ chat_id: chatId, text, ...(replyMarkup ? { reply_markup: replyMarkup } : {}), ...extra })
});
return r.json();
}

async function answerCallbackQuery(env, callbackQueryId, text) {
const token = telegramToken(env);
if (!token) return { ok: false, error: 'missing_telegram_token' };
const url = 'https://api.telegram.org/bot' + token + '/answerCallbackQuery';
const r = await fetch(url, {
method: 'POST',
headers: { 'content-type': 'application/json' },
body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false })
});
return r.json();
}

async function clearCallbackButtons(env, callbackQuery) {
const token = telegramToken(env);
if (!token || !callbackQuery?.message?.chat?.id || !callbackQuery?.message?.message_id) return;
await fetch('https://api.telegram.org/bot' + token + '/editMessageReplyMarkup', {
method: 'POST',
headers: { 'content-type': 'application/json' },
body: JSON.stringify({
chat_id: callbackQuery.message.chat.id,
message_id: callbackQuery.message.message_id,
reply_markup: { inline_keyboard: [] }
})
}).catch(() => {});
}

async function handleBankMovementCallback(env, callbackQuery) {
const data = clean(callbackQuery?.data);
const match = data.match(/^bm:([ar]):([0-9a-f-]{36})$/i);
if (!match) return false;
const action = match[1].toLowerCase();
const movementId = match[2];
const chatId = callbackQuery?.message?.chat?.id;
if (!chatId) return true;

if (env.APERION_DB) {
const decision = await decideBankMovement(env.APERION_DB, movementId, action === 'r' ? 'reject' : 'approve', chatId).catch(error => ({ ok: false, error: error.message || String(error) }));
if (!decision.ok) {
const labels = {
not_found: 'Hareket bulunamadı.',
already_approved: 'Bu hareket daha önce onaylandı; red uygulanmadı.',
already_rejected: 'Bu hareket daha önce reddedildi.',
};
await answerCallbackQuery(env, callbackQuery.id, labels[decision.error] || 'Banka hareketi güncellenemedi.');
return true;
}
await clearCallbackButtons(env, callbackQuery);
if (decision.status === 'rejected') {
await answerCallbackQuery(env, callbackQuery.id, decision.duplicate ? 'Bu hareket daha önce reddedildi.' : 'Hareket reddedildi.');
await sendMessage(env, chatId, '❌ <b>Banka hareketi reddedildi</b>\nKayıt BizimHesap kuyruğuna alınmadı.', null, { parse_mode: 'HTML' });
return true;
}
await answerCallbackQuery(env, callbackQuery.id, decision.duplicate ? 'Bu hareket daha önce onaylandı.' : 'Onaylandı; güvenli işlem kuyruğuna alındı.');
await sendMessage(env, chatId, '✅ <b>Banka hareketi onaylandı</b>\nBizimHesap güvenlik kuyruğuna aktarıldı. Cari eşleşmesi, mükerrer kontrolü ve kayıt kanıtı tamamlanmadan işlem kapanmış sayılmaz.', null, { parse_mode: 'HTML' });
return true;
}

const lookup = await sbFetch(env, '/rest/v1/pending_bank_movements?select=id,status,bank_name,transaction_date,description,amount_in,amount_out&id=eq.' + encodeURIComponent(movementId) + '&limit=1');
const row = lookup.ok && Array.isArray(lookup.data) ? lookup.data[0] : null;
if (!row) {
await answerCallbackQuery(env, callbackQuery.id, 'Hareket bulunamadı.');
return true;
}

if (action === 'r') {
if (row.status === 'approved') {
await answerCallbackQuery(env, callbackQuery.id, 'Bu hareket daha önce onaylandı; red uygulanmadı.');
return true;
}
const rejected = await sbFetch(env, '/rest/v1/rpc/reject_pending_bank_movement', {
method: 'POST',
body: JSON.stringify({ p_id: movementId, p_note: 'Telegram üzerinden reddedildi: ' + chatId })
});
if (!rejected.ok) {
await answerCallbackQuery(env, callbackQuery.id, 'Red işlemi başarısız.');
return true;
}
await clearCallbackButtons(env, callbackQuery);
await answerCallbackQuery(env, callbackQuery.id, 'Hareket reddedildi.');
await sendMessage(env, chatId, '❌ <b>Banka hareketi reddedildi</b>\nKayıt BizimHesap kuyruğuna alınmadı.', null, { parse_mode: 'HTML' });
return true;
}

if (row.status === 'rejected') {
await answerCallbackQuery(env, callbackQuery.id, 'Bu hareket daha önce reddedildi.');
return true;
}
const approved = await sbFetch(env, '/rest/v1/rpc/approve_pending_bank_movement', {
method: 'POST',
body: JSON.stringify({ p_id: movementId, p_note: 'Telegram üzerinden onaylandı: ' + chatId })
});
if (!approved.ok) {
await answerCallbackQuery(env, callbackQuery.id, 'Onay kuyruğa alınamadı.');
return true;
}
await clearCallbackButtons(env, callbackQuery);
await answerCallbackQuery(env, callbackQuery.id, 'Onaylandı; güvenli işlem kuyruğuna alındı.');
await sendMessage(env, chatId, '✅ <b>Banka hareketi onaylandı</b>\nBizimHesap güvenlik kuyruğuna aktarıldı. Cari eşleşmesi, mükerrer kontrolü ve kayıt kanıtı tamamlanmadan işlem kapanmış sayılmaz.', null, { parse_mode: 'HTML' });
return true;
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

async function ensureUniversalCommandSchema(env) {
if (!env.APERION_DB) return false;
try {
await env.APERION_DB.prepare(`CREATE TABLE IF NOT EXISTS telegram_command_requests (
id INTEGER PRIMARY KEY AUTOINCREMENT,
command_key TEXT NOT NULL UNIQUE,
chat_id TEXT NOT NULL,
user_id TEXT,
message_id TEXT NOT NULL,
raw_text TEXT NOT NULL,
intent_code TEXT NOT NULL,
category TEXT NOT NULL,
target TEXT,
risk_class TEXT NOT NULL,
approval_policy TEXT NOT NULL,
execution_mode TEXT NOT NULL,
status TEXT NOT NULL,
external_queue_id TEXT,
result_summary TEXT,
created_at TEXT NOT NULL DEFAULT (datetime('now')),
updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`).run();
return true;
} catch (_error) {
return false;
}
}

async function claimUniversalCommand(env, identity, message, intent) {
if (!(await ensureUniversalCommandSchema(env))) return { ok: false, error: 'command_store_unavailable' };
const commandKey = `telegram:${identity.chatId}:${message.message_id}:universal`;
try {
const row = await env.APERION_DB.prepare(`INSERT INTO telegram_command_requests
(command_key,chat_id,user_id,message_id,raw_text,intent_code,category,target,risk_class,approval_policy,execution_mode,status)
VALUES (?,?,?,?,?,?,?,?,?,?,?,'accepted')
ON CONFLICT(command_key) DO NOTHING RETURNING id`)
.bind(commandKey,identity.chatId,identity.userId || null,String(message.message_id),intent.rawText,intent.code,intent.category,intent.target || null,intent.risk,intent.approvalPolicy,intent.executionMode)
.first();
if (row?.id) return { ok: true, id: row.id, duplicate: false };
const existing = await env.APERION_DB.prepare('SELECT id,status,result_summary FROM telegram_command_requests WHERE command_key=?').bind(commandKey).first();
return { ok: true, id: existing?.id, duplicate: true, status: existing?.status, resultSummary: existing?.result_summary };
} catch (error) {
return { ok: false, error: error?.message || 'command_claim_failed' };
}
}

async function updateUniversalCommand(env, id, status, summary, externalQueueId = null) {
if (!env.APERION_DB || !id) return;
try {
await env.APERION_DB.prepare(`UPDATE telegram_command_requests
SET status=?,result_summary=?,external_queue_id=?,updated_at=datetime('now') WHERE id=?`)
.bind(status,summary || null,externalQueueId == null ? null : String(externalQueueId),id).run();
} catch (_error) { /* Command response still reports the durable-store failure. */ }
}

async function queueDesktopCommand(env, identity, message, intent) {
if (!DESKTOP_TARGETS[intent.target]) return { ok: false, error: 'desktop_target_not_allowed' };
const deviceResult = await queueDeviceCommand(env, {
commandKey: `telegram:${identity.chatId}:${message.message_id}:desktop:${intent.target}`,
chatId: identity.chatId,
command: 'desktop_open_url',
target: intent.target
});
if (deviceResult.ok) return deviceResult;
const result = await sbFetch(env, '/rest/v1/bot_commands', {
method: 'POST',
headers: { prefer: 'return=representation' },
body: JSON.stringify({
command: 'desktop_open_url',
status: 'pending',
params: {
target: intent.target,
source: 'telegram',
chat_id: String(identity.chatId),
telegram_message_id: String(message.message_id)
}
})
});
if (!result.ok) return result;
return { ok: true, id: result.data?.[0]?.id || null };
}

async function handleUniversalCommand(env, message, identity, intent) {
const claimed = await claimUniversalCommand(env, identity, message, intent);
if (!claimed.ok) {
await sendMessage(env, identity.chatId, '⚠️ Komut kalıcı kuyruğa alınamadı. Hiçbir dış işlem yapılmadı.');
return { handled: true, status: 'failed', error: claimed.error };
}
if (claimed.duplicate) {
await sendMessage(env, identity.chatId, `♻️ Bu komut daha önce alındı. Durum: ${claimed.status || 'bilinmiyor'}.`);
return { handled: true, status: claimed.status || 'duplicate', duplicate: true };
}

if (intent.code === 'desktop_open') {
const queued = await queueDesktopCommand(env, identity, message, intent);
if (!queued.ok) {
await updateUniversalCommand(env, claimed.id, 'blocked', 'Masaüstü dinleyici kuyruğuna erişilemedi');
await sendMessage(env, identity.chatId, `⚠️ ${intent.targetTitle} açma komutu kaydedildi fakat masaüstü kuyruğuna bağlanamadı. Bilgisayarda işlem yapılmadı.`);
return { handled: true, status: 'blocked', error: queued.error };
}
await updateUniversalCommand(env, claimed.id, 'queued', `${intent.targetTitle} masaüstü kuyruğuna alındı`, queued.id);
await sendMessage(env, identity.chatId, `🖥️ ${intent.targetTitle} açma komutu masaüstü kuyruğuna alındı. Bilgisayar ve AperiON dinleyicisi açıksa sonuç Telegram’a bildirilecek.`);
return { handled: true, status: 'queued', queueId: queued.id };
}

const parsedType = intent.risk === 'approval_required' ? 'approval_required_command' : 'unmapped_command';
const saved = await saveQuickNote(env, {
chatId: identity.chatId,
messageId: message.message_id,
rawText: intent.rawText,
parsedType,
paymentMethod: null,
needsReview: true,
status: intent.risk === 'approval_required' ? 'approval_required' : 'needs_review'
});
if (!saved.ok) {
await updateUniversalCommand(env, claimed.id, 'failed', 'İnceleme kaydı oluşturulamadı');
await sendMessage(env, identity.chatId, '⚠️ Emri kalıcı inceleme kuyruğuna alamadım. Hiçbir dış işlem yapılmadı.');
return { handled: true, status: 'failed' };
}
const status = intent.risk === 'approval_required' ? 'approval_required' : 'needs_review';
await updateUniversalCommand(env, claimed.id, status, `quick_note:${saved.id || 'saved'}`);
const reply = intent.risk === 'approval_required'
? `🛡️ Emri aldım ve onay gerektiren “${intent.category}” işlemi olarak hazırlık kuyruğuna koydum. Bu kayıt işlem onayı değildir; hiçbir dış işlem yapılmadı.`
  : `📥 Emri aldım ve yetenek eşleştirme kuyruğuna koydum. Henüz otomatik uygulayamadığım için hiçbir sonucu uydurmadım.\n\nKullanılabilir masaüstü hedefleri: ${desktopTargetSummary()}.`;
await sendMessage(env, identity.chatId, reply);
return { handled: true, status, requestId: claimed.id };
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

/* CASH_EXPENSE_FUNCTIONS_BEGIN
async function createCashExpenseApproval(env, { chatId, messageId, quickNoteId, intent }) {
if (!env.APERION_DB) return { ok: false, error: 'd1_required_for_safe_approval' };
const approvalId = crypto.randomUUID();
const idempotencyKey = `telegram:cash-expense:${chatId}:${messageId}`;
const payload = {
...intent,
quick_note_id: quickNoteId,
chat_id: String(chatId),
telegram_message_id: String(messageId),
live_write_enabled: false
};
try {
await env.APERION_DB.prepare(`INSERT INTO approval_queue (id,item_type,status,payload_json,evidence_ref,idempotency_key) VALUES (?,'cash_expense','needs_review',?,?,?)`).bind(
approvalId, JSON.stringify(payload), `telegram:${chatId}:${messageId}`, idempotencyKey
).run();
return { ok: true, id: approvalId, duplicate: false };
} catch (error) {
const existing = await env.APERION_DB.prepare('SELECT id,status FROM approval_queue WHERE idempotency_key=?').bind(idempotencyKey).first();
if (existing?.id) return { ok: true, id: existing.id, duplicate: true, status: existing.status };
return { ok: false, error: 'approval_queue_failed', detail: error.message };
}
}

function cashExpenseApprovalText(intent) {
return [
'🟠 <b>GERÇEK GİDER ONAYI</b>',
'<i>Onay vermeden BizimHesap kaydı oluşturulmaz.</i>',
'',
`💼 <b>Kaynak:</b> ${intent.source_account}`,
`🍽️ <b>Gider:</b> ${intent.expense_category}`,
`💳 <b>Tutar:</b> ${Number(intent.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`,
`📅 <b>Tarih:</b> ${intent.transaction_date}`,
'',
'🛡️ Onay sonrası mükerrer kontrolü yapılır.',
'📸 Başarılı kayıt; işlem kimliği, önce/sonra bakiye ve ekran görüntüsüyle bildirilir.'
].join('\n');
}

function cashExpenseApprovalButtons(approvalId) {
return { inline_keyboard: [[
{ text: '✅ GERÇEK KAYDI ONAYLA', callback_data: `ce:a:${approvalId}` },
{ text: '❌ REDDET', callback_data: `ce:r:${approvalId}` }
], [{ text: '✏️ DÜZELT', callback_data: `ce:e:${approvalId}` }]] };
}

async function handleCashExpenseCallback(env, callback) {
const match = String(callback.data || '').match(/^ce:([are]):([0-9a-f-]{36})$/i);
if (!match || !env.APERION_DB) return false;
const chatId = callback.message?.chat?.id;
const row = await env.APERION_DB.prepare('SELECT id,status,payload_json FROM approval_queue WHERE id=?').bind(match[2]).first();
if (!row) { await answerCallbackQuery(env, callback.id, 'Gider onayı bulunamadı.'); return true; }
const payload = JSON.parse(row.payload_json || '{}');
if (String(payload.chat_id) !== String(chatId)) { await answerCallbackQuery(env, callback.id, 'Bu onay size ait değil.'); return true; }
if (row.status !== 'needs_review') { await answerCallbackQuery(env, callback.id, 'Daha önce işlendi: ' + row.status); return true; }

if (match[1] !== 'a') {
const status = match[1] === 'r' ? 'rejected' : 'needs_edit';
await env.APERION_DB.prepare(`UPDATE approval_queue SET status=?,decided_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),decided_by=? WHERE id=? AND status='needs_review'`).bind(status, `telegram:${chatId}`, row.id).run();
const message = status === 'rejected' ? '❌ Gider reddedildi; hiçbir kayıt oluşturulmadı.' : '✏️ Düzeltme istendi; hiçbir kayıt oluşturulmadı.';
await answerCallbackQuery(env, callback.id, message);
await sendMessage(env, chatId, message);
return true;
}

await env.APERION_DB.prepare(`UPDATE approval_queue SET status='approved_queueing',decided_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),decided_by=? WHERE id=? AND status='needs_review'`).bind(`telegram:${chatId}`, row.id).run();
const queued = await sbFetch(env, '/rest/v1/bot_commands', {
method: 'POST', headers: { prefer: 'return=representation' }, body: JSON.stringify({
command: 'bizimhesap_expense', status: 'pending', params: {
approval_id: row.id, approved: true, chat_id: String(chatId),
source_account: payload.source_account, expense_category: payload.expense_category,
amount: payload.amount, currency: 'TRY', transaction_date: payload.transaction_date,
description: payload.description, raw_text: payload.raw_text,
idempotency_key: `telegram-expense:${row.id}`
}
})
});
if (!queued.ok) {
await env.APERION_DB.prepare(`UPDATE approval_queue SET status='approved_queue_failed' WHERE id=? AND status='approved_queueing'`).bind(row.id).run();
await answerCallbackQuery(env, callback.id, 'Kuyruk bağlantısı kurulamadı; kayıt yapılmadı.');
await sendMessage(env, chatId, '⚠️ Onay alındı fakat güvenli masaüstü kuyruğuna bağlanılamadı. BizimHesap kaydı yapılmadı.');
return true;
}
await env.APERION_DB.prepare(`UPDATE approval_queue SET status='queued' WHERE id=? AND status='approved_queueing'`).bind(row.id).run();
await answerCallbackQuery(env, callback.id, 'Onaylandı ve güvenli kuyruğa alındı.');
await sendMessage(env, chatId, '🟢 <b>ONAY ALINDI</b>\nMükerrer ve kasa kontrolleri başlatıldı. İşlem ancak BizimHesap ekranında doğrulanırsa tamamlandı sayılacak; ardından görsel kanıt gönderilecek.', null, { parse_mode: 'HTML' });
return true;
}
CASH_EXPENSE_FUNCTIONS_END */
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

async function createCashExpenseApprovalLive(env, { chatId, messageId, quickNoteId, intent }) {
if (!env.APERION_DB) return { ok: false, error: 'd1_required_for_safe_approval' };
const approvalId = crypto.randomUUID();
const idempotencyKey = `telegram:cash-expense:${chatId}:${messageId}`;
const payload = { ...intent, quick_note_id: quickNoteId, chat_id: String(chatId), telegram_message_id: String(messageId), live_write_enabled: false };
try {
await env.APERION_DB.prepare(`INSERT INTO approval_queue (id,item_type,status,payload_json,evidence_ref,idempotency_key) VALUES (?,'cash_expense','needs_review',?,?,?)`).bind(approvalId, JSON.stringify(payload), `telegram:${chatId}:${messageId}`, idempotencyKey).run();
return { ok: true, id: approvalId, duplicate: false };
} catch (error) {
const existing = await env.APERION_DB.prepare('SELECT id,status FROM approval_queue WHERE idempotency_key=?').bind(idempotencyKey).first();
if (existing?.id) return { ok: true, id: existing.id, duplicate: true, status: existing.status };
return { ok: false, error: 'approval_queue_failed', detail: error.message };
}
}

function cashExpenseApprovalTextLive(intent) {
return ['🟠 <b>GERÇEK GİDER ONAYI</b>', '<i>Onay vermeden BizimHesap kaydı oluşturulmaz.</i>', '', `💼 <b>Kaynak:</b> ${intent.source_account}`, `🍽️ <b>Gider:</b> ${intent.expense_category}`, `💳 <b>Tutar:</b> ${Number(intent.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`, `📅 <b>Tarih:</b> ${intent.transaction_date}`, '', '🛡️ Onay sonrası mükerrer kontrolü yapılır.', '📸 Başarılı kayıt; işlem kimliği, önce/sonra bakiye ve ekran görüntüsüyle bildirilir.'].join('\n');
}

function cashExpenseApprovalButtonsLive(approvalId) {
return { inline_keyboard: [[{ text: '✅ GERÇEK KAYDI ONAYLA', callback_data: `ce:a:${approvalId}` }, { text: '❌ REDDET', callback_data: `ce:r:${approvalId}` }], [{ text: '✏️ DÜZELT', callback_data: `ce:e:${approvalId}` }]] };
}

async function handleCashExpenseCallbackLive(env, callback) {
const match = String(callback.data || '').match(/^ce:([are]):([0-9a-f-]{36})$/i);
if (!match || !env.APERION_DB) return false;
const chatId = callback.message?.chat?.id;
const row = await env.APERION_DB.prepare('SELECT id,status,payload_json FROM approval_queue WHERE id=?').bind(match[2]).first();
if (!row) { await answerCallbackQuery(env, callback.id, 'Gider onayı bulunamadı.'); return true; }
const payload = JSON.parse(row.payload_json || '{}');
if (String(payload.chat_id) !== String(chatId)) { await answerCallbackQuery(env, callback.id, 'Bu onay size ait değil.'); return true; }
if (row.status !== 'needs_review') { await answerCallbackQuery(env, callback.id, 'Daha önce işlendi: ' + row.status); return true; }
if (match[1] !== 'a') {
const status = match[1] === 'r' ? 'rejected' : 'needs_edit';
await env.APERION_DB.prepare(`UPDATE approval_queue SET status=?,decided_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),decided_by=? WHERE id=? AND status='needs_review'`).bind(status, `telegram:${chatId}`, row.id).run();
const message = status === 'rejected' ? '❌ Gider reddedildi; hiçbir kayıt oluşturulmadı.' : '✏️ Düzeltme istendi; hiçbir kayıt oluşturulmadı.';
await answerCallbackQuery(env, callback.id, message); await sendMessage(env, chatId, message); return true;
}
await env.APERION_DB.prepare(`UPDATE approval_queue SET status='approved_queueing',decided_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),decided_by=? WHERE id=? AND status='needs_review'`).bind(`telegram:${chatId}`, row.id).run();
const queued = await sbFetch(env, '/rest/v1/bot_commands', { method: 'POST', headers: { prefer: 'return=representation' }, body: JSON.stringify({ command: 'bizimhesap_expense', status: 'pending', params: { approval_id: row.id, approved: true, chat_id: String(chatId), source_account: payload.source_account, expense_category: payload.expense_category, amount: payload.amount, currency: 'TRY', transaction_date: payload.transaction_date, description: payload.description, raw_text: payload.raw_text, idempotency_key: `telegram-expense:${row.id}` } }) });
if (!queued.ok) {
await env.APERION_DB.prepare(`UPDATE approval_queue SET status='approved_queue_failed' WHERE id=? AND status='approved_queueing'`).bind(row.id).run();
await answerCallbackQuery(env, callback.id, 'Kuyruk bağlantısı kurulamadı; kayıt yapılmadı.'); await sendMessage(env, chatId, '⚠️ Onay alındı fakat güvenli masaüstü kuyruğuna bağlanılamadı. BizimHesap kaydı yapılmadı.'); return true;
}
await env.APERION_DB.prepare(`UPDATE approval_queue SET status='queued' WHERE id=? AND status='approved_queueing'`).bind(row.id).run();
await answerCallbackQuery(env, callback.id, 'Onaylandı ve güvenli kuyruğa alındı.');
await sendMessage(env, chatId, '🟢 <b>ONAY ALINDI</b>\nMükerrer ve kasa kontrolleri başlatıldı. İşlem ancak BizimHesap ekranında doğrulanırsa tamamlandı sayılacak; ardından görsel kanıt gönderilecek.', null, { parse_mode: 'HTML' });
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
    const token = telegramToken(env);
    if (!token || !fileId) return null;
    try {
          const r = await fetch('https://api.telegram.org/bot' + token + '/getFile?file_id=' + encodeURIComponent(fileId));
          const j = await r.json();
          if (!j.ok || !j.result || !j.result.file_path) return null;
          return 'https://api.telegram.org/file/bot' + token + '/' + j.result.file_path;
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
const security = await getMobileSecurityStatus(env);
const desktopBridge = await deviceHealth(env);
return json({
ok: true,
service: 'aperion-telegram-webhook',
mode: 'mobile-command-center-v2',
command_router_version: 'v143',
device_status_command: '/cihazdurum',
desktop_target_count: Object.keys(DESKTOP_TARGETS).length,
desktop_bridge_configured: desktopBridge.configured,
desktop_bridge_active_device_count: desktopBridge.activeDeviceCount,
desktop_bridge_pending_command_count: desktopBridge.pendingCommandCount,
telegram_token_configured: Boolean(telegramToken(env)),
supabase_configured: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
identity_guard_configured: security.identityGuard,
webhook_secret_configured: security.webhookSecret,
security_source: security.source,
webhook_bootstrap_status: security.bootstrapStatus || (security.webhookSecret ? 'ready' : 'pending')
});
}

const REPORT_DEFINITIONS = Object.freeze({
product: {
title: 'Ürün performans raporu', table: 'sales_raw', searchField: 'urun',
defaultFields: ['period_quantity', 'period_revenue', 'top_customers', 'fifo_profit', 'margin', 'category_share'],
allowedFields: ['period_quantity', 'period_revenue', 'top_customers', 'fifo_profit', 'margin', 'category_share'],
labels: { period_quantity: 'Dönem adedi', period_revenue: 'Dönem cirosu', top_customers: 'En çok alan müşteriler', fifo_profit: 'FIFO kârı', margin: 'Kâr marjı', category_share: 'Kategori payı' }
},
customer: {
title: 'Cari raporu', table: 'customers', searchField: 'cari_unvan',
defaultFields: ['cari_unvan', 'sinif', 'acik_bakiye', 'cek_senet_bakiyesi', 'bakiye_guncelleme'],
allowedFields: ['cari_unvan', 'sinif', 'acik_bakiye', 'cek_senet_bakiyesi', 'bakiye_guncelleme'],
labels: { cari_unvan: 'Cari', sinif: 'Sınıf', acik_bakiye: 'Açık bakiye', cek_senet_bakiyesi: 'Çek/senet', bakiye_guncelleme: 'Güncelleme' }
}
});

async function ensureReportProfileSchema(db) {
if (!db) return false;
try {
await db.prepare(`CREATE TABLE IF NOT EXISTS telegram_report_profiles (
report_key TEXT PRIMARY KEY,title TEXT NOT NULL,fields_json TEXT NOT NULL,updated_by TEXT,
updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`).run();
return true;
} catch (_error) { return false; }
}

async function readReportFields(env, reportKey) {
const definition = REPORT_DEFINITIONS[reportKey];
if (!definition) return [];
if (!(await ensureReportProfileSchema(env.APERION_DB))) return definition.defaultFields;
try {
const row = await env.APERION_DB.prepare('SELECT fields_json FROM telegram_report_profiles WHERE report_key=?').bind(reportKey).first();
const fields = JSON.parse(row?.fields_json || '[]').filter(field => definition.allowedFields.includes(field));
return fields.length ? fields : definition.defaultFields;
} catch (_error) { return definition.defaultFields; }
}

async function saveReportFields(env, reportKey, requested, userId) {
const definition = REPORT_DEFINITIONS[reportKey];
if (!definition) return { ok: false, error: 'Rapor türü ürün veya cari olmalı.' };
const fields = requested.map(value => String(value || '').trim().toLocaleLowerCase('tr-TR')).filter(Boolean);
const invalid = fields.filter(field => !definition.allowedFields.includes(field));
if (!fields.length) return { ok: false, error: 'En az bir alan belirtin.' };
if (invalid.length) return { ok: false, error: 'Desteklenmeyen alan: ' + invalid.join(', ') + '. Kullanılabilir: ' + definition.allowedFields.join(', ') };
if (!(await ensureReportProfileSchema(env.APERION_DB))) return { ok: false, error: 'Rapor profili kaynağı kullanılamıyor.' };
await env.APERION_DB.prepare(`INSERT INTO telegram_report_profiles(report_key,title,fields_json,updated_by,updated_at)
VALUES(?,?,?,?,datetime('now')) ON CONFLICT(report_key) DO UPDATE SET fields_json=excluded.fields_json,updated_by=excluded.updated_by,updated_at=datetime('now')`)
.bind(reportKey, definition.title, JSON.stringify(fields), String(userId || 'telegram')).run();
return { ok: true, fields };
}

function reportValue(field, value) {
if (value == null || value === '') return 'bilgi yok';
if (['acik_bakiye', 'cek_senet_bakiyesi'].includes(field)) return money(value);
return String(value);
}

function isoDate(date) {
return date.toISOString().slice(0, 10);
}

function productPeriods(now = new Date()) {
const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const day = today.getUTCDay() || 7;
const weekStart = new Date(today); weekStart.setUTCDate(today.getUTCDate() - day + 1);
const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
const previousMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
const previousMonthEnd = new Date(monthStart); previousMonthEnd.setUTCDate(0);
const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
return [
{ key: 'today', label: 'Bugün', from: isoDate(today), to: isoDate(today) },
{ key: 'yesterday', label: 'Dün', from: isoDate(new Date(today.getTime() - 86400000)), to: isoDate(new Date(today.getTime() - 86400000)) },
{ key: 'this_week', label: 'Bu hafta', from: isoDate(weekStart), to: isoDate(today) },
{ key: 'this_month', label: 'Bu ay', from: isoDate(monthStart), to: isoDate(today) },
{ key: 'last_month', label: 'Geçen ay', from: isoDate(previousMonthStart), to: isoDate(previousMonthEnd) },
{ key: 'this_year', label: 'Bu yıl', from: isoDate(yearStart), to: isoDate(today) },
{ key: 'last_year', label: 'Geçen yıl', from: `${today.getUTCFullYear() - 1}-01-01`, to: `${today.getUTCFullYear() - 1}-12-31` }
];
}

function sumRows(rows, field) {
return rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
}

async function queryProductPeriod(env, query, period) {
const path = '/rest/v1/sales_raw?select=urun,adet,ciro,satis_kdv_haric,unvan,kategori,tarih,urun_kod' +
'&firma_id=eq.alayli&urun=ilike.*' + encodeURIComponent(query) + '*&tarih=gte.' + period.from + '&tarih=lte.' + period.to + '&limit=5000';
const response = await sbFetch(env, path);
if (!response.ok || !Array.isArray(response.data)) return { ok: false, rows: [] };
return { ok: true, rows: response.data };
}

async function queryCategoryRevenue(env, category, period) {
if (!category) return { ok: false, revenue: null };
const path = '/rest/v1/sales_raw?select=ciro,satis_kdv_haric&firma_id=eq.alayli&kategori=eq.' + encodeURIComponent(category) +
'&tarih=gte.' + period.from + '&tarih=lte.' + period.to + '&limit=5000';
const response = await sbFetch(env, path);
if (!response.ok || !Array.isArray(response.data)) return { ok: false, revenue: null };
return { ok: true, revenue: sumRows(response.data, 'satis_kdv_haric') || sumRows(response.data, 'ciro') };
}

function fifoProductKey(row) {
return String(row.urun_kod || row.barkod || row.urun || '').trim().toLocaleLowerCase('tr-TR');
}

async function buildProductFifoLedger(env, query, throughDate) {
const filter = '&firma_id=eq.alayli&urun=ilike.*' + encodeURIComponent(query) + '*';
const [purchaseResponse, salesResponse] = await Promise.all([
sbFetch(env, '/rest/v1/purchase_raw?select=id,tarih,belge_no,urun,urun_kod,barkod,miktar,alis_fiyat,tutar' + filter + '&tarih=lte.' + throughDate + '&order=tarih.asc&limit=5000'),
sbFetch(env, '/rest/v1/sales_raw?select=id,tarih,urun,urun_kod,barkod,adet,satis_kdv_haric,ciro' + filter + '&tarih=lte.' + throughDate + '&order=tarih.asc,id.asc&limit=5000')
]);
if (!purchaseResponse.ok || !salesResponse.ok || !Array.isArray(purchaseResponse.data) || !Array.isArray(salesResponse.data)) return { ok: false, sales: [], layers: [] };
const truncated = purchaseResponse.data.length >= 5000 || salesResponse.data.length >= 5000;
const layersByProduct = new Map();
for (const row of purchaseResponse.data) {
const quantity = Number(row.miktar) || 0;
const unitCost = Number(row.alis_fiyat) || (quantity ? (Number(row.tutar) || 0) / quantity : 0);
if (quantity <= 0 || unitCost <= 0) continue;
const key = fifoProductKey(row);
if (!layersByProduct.has(key)) layersByProduct.set(key, []);
layersByProduct.get(key).push({ product: row.urun, date: row.tarih, document: row.belge_no, unitCost, received: quantity, remaining: quantity });
}
const sales = [];
let incomplete = truncated;
for (const row of salesResponse.data) {
let needed = Number(row.adet) || 0;
if (needed < 0) { incomplete = true; continue; }
let fifoCost = 0;
const allocations = [];
const layers = layersByProduct.get(fifoProductKey(row)) || [];
for (const layer of layers) {
if (needed <= 0) break;
if (layer.remaining <= 0) continue;
const used = Math.min(needed, layer.remaining);
layer.remaining -= used;
needed -= used;
fifoCost += used * layer.unitCost;
allocations.push({ quantity: used, unitCost: layer.unitCost, purchaseDate: layer.date });
}
if (needed > 0) incomplete = true;
const revenue = Number(row.satis_kdv_haric) || Number(row.ciro) || 0;
sales.push({ date: row.tarih, quantity: Number(row.adet) || 0, revenue, fifoCost, profit: revenue - fifoCost, missingQuantity: needed, allocations });
}
return { ok: !incomplete, incomplete, truncated, sales, layers: [...layersByProduct.values()].flat().filter(layer => layer.remaining > 0) };
}

function fifoPeriodSummary(ledger, period) {
if (!ledger.sales.length) return { ok: ledger.ok, revenue: 0, cost: 0, profit: 0, margin: null };
const rows = ledger.sales.filter(row => row.date >= period.from && row.date <= period.to);
const revenue = sumRows(rows, 'revenue');
const cost = sumRows(rows, 'fifoCost');
const profit = revenue - cost;
return { ok: ledger.ok && !rows.some(row => row.missingQuantity > 0), revenue, cost, profit, margin: revenue ? profit / revenue * 100 : null };
}

function topCustomers(rows) {
const totals = new Map();
for (const row of rows) {
const name = row.unvan || 'Cari eşleşmedi';
const current = totals.get(name) || { quantity: 0, revenue: 0 };
current.quantity += Number(row.adet) || 0;
current.revenue += Number(row.satis_kdv_haric) || Number(row.ciro) || 0;
totals.set(name, current);
}
return [...totals.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);
}

async function handleProductPerformanceReport(env, chatId, query) {
const search = String(query || '').trim();
if (!search) {
await sendMessage(env, chatId, 'Kullanım: /urunraporu <ürün adı veya kodu>');
return;
}
const fields = await readReportFields(env, 'product');
const periods = productPeriods(new Date());
const sales = await Promise.all(periods.map(period => queryProductPeriod(env, search, period)));
if (!sales.some(result => result.ok)) {
await sendMessage(env, chatId, '⚠️ Ürün satış kaynağı okunamadı; rapor uydurulmadı.');
return;
}
const category = sales.flatMap(result => result.rows).find(row => row.kategori)?.kategori || '';
const categoryTotals = fields.includes('category_share')
? await Promise.all(periods.map(period => queryCategoryRevenue(env, category, period))) : periods.map(() => ({ ok: false }));
const fifoLedger = fields.some(field => ['fifo_profit', 'margin'].includes(field))
? await buildProductFifoLedger(env, search, periods.find(period => period.key === 'today').to) : { ok: false, sales: [], layers: [] };
const fifo = periods.map(period => fifoPeriodSummary(fifoLedger, period));
const lines = ['📊 ÜRÜN PERFORMANS RAPORU', 'Arama: ' + search, 'Kategori: ' + (category || 'eşleşmedi'), 'Alan profili: ' + fields.join(', '), ''];
periods.forEach((period, index) => {
const result = sales[index];
if (!result.ok) { lines.push('• ' + period.label + ': KAYNAK OKUNAMADI'); return; }
const quantity = sumRows(result.rows, 'adet');
const revenue = sumRows(result.rows, 'satis_kdv_haric') || sumRows(result.rows, 'ciro');
const parts = [];
if (fields.includes('period_quantity')) parts.push(quantity.toLocaleString('tr-TR') + ' adet');
if (fields.includes('period_revenue')) parts.push(money(revenue));
if (fields.includes('fifo_profit')) parts.push(fifo[index].ok ? 'FIFO kâr ' + money(fifo[index].profit) : 'FIFO KAYNAK EKSİK');
if (fields.includes('margin')) parts.push(fifo[index].ok && Number.isFinite(fifo[index].margin) ? 'marj %' + fifo[index].margin.toFixed(1) : 'marj hesaplanamadı');
if (fields.includes('category_share')) {
const denominator = categoryTotals[index].revenue;
parts.push(categoryTotals[index].ok && denominator > 0 ? 'kategori payı %' + (revenue / denominator * 100).toFixed(1) : 'kategori payı hesaplanamadı');
}
lines.push('• ' + period.label + ': ' + (parts.join(' · ') || result.rows.length + ' kayıt'));
});
if (fields.includes('top_customers')) {
const yearIndex = periods.findIndex(period => period.key === 'this_year');
const customers = topCustomers(sales[yearIndex].rows);
lines.push('', 'BU YIL EN ÇOK ALAN MÜŞTERİLER');
lines.push(...(customers.length ? customers.map(([name, value], index) => (index + 1) + '. ' + name + ' · ' + value.quantity.toLocaleString('tr-TR') + ' adet · ' + money(value.revenue)) : ['• Doğrulanmış müşteri satışı yok']));
}
if (fields.some(field => ['fifo_profit', 'margin'].includes(field))) {
lines.push('', 'KALAN FIFO STOK KATMANLARI');
lines.push(...(fifoLedger.layers.length ? fifoLedger.layers.slice(0, 12).map(layer => '• ' + layer.remaining.toLocaleString('tr-TR') + ' adet × ' + money(layer.unitCost) + ' · alış ' + layer.date + (layer.document ? ' · ' + layer.document : '')) : ['• Doğrulanmış kalan katman yok']));
if (!fifoLedger.ok) lines.push('⚠️ FIFO kaynak kapsamı eksik veya satılan miktarın alış katmanı bulunamadı; kâr kesinleştirilmedi.');
}
lines.push('', 'Not: FIFO yalnızca doğrulanmış alış-satış eşleşmesinden hesaplanır. Eksikse kâr gösterilmez.');
await sendMessage(env, chatId, lines.join('\n').slice(0, 4000));
}

async function handleConfiguredReport(env, chatId, reportKey, query) {
const definition = REPORT_DEFINITIONS[reportKey];
if (reportKey === 'product') return handleProductPerformanceReport(env, chatId, query);
const fields = await readReportFields(env, reportKey);
const search = String(query || '').trim();
let path = '/rest/v1/' + definition.table + '?select=' + encodeURIComponent(fields.join(','));
if (search) path += '&' + definition.searchField + '=ilike.*' + encodeURIComponent(search) + '*';
path += reportKey === 'customer' ? '&order=acik_bakiye.desc.nullslast&limit=10' : '&order=urun.asc&limit=10';
const result = await sbFetch(env, path);
if (!result.ok || !Array.isArray(result.data)) {
await sendMessage(env, chatId, '⚠️ ' + definition.title + ' kaynağı şu an okunamadı; veri uydurulmadı.');
return;
}
if (!result.data.length) {
await sendMessage(env, chatId, '🔎 ' + (search ? '“' + search + '” için ' : '') + 'doğrulanmış kayıt bulunamadı.');
return;
}
const cards = result.data.map((row, index) => [
(index + 1) + ') ' + reportValue(fields[0], row[fields[0]]),
...fields.slice(1).map(field => '• ' + (definition.labels[field] || field) + ': ' + reportValue(field, row[field]))
].join('\n'));
await sendMessage(env, chatId, '📊 ' + definition.title + (search ? ' — ' + search : '') + '\nAlanlar: ' + fields.join(', ') + '\n\n' + cards.join('\n\n'));
}

function detectDirectEntityReport(text) {
const value = clean(text);
const lower = lowerTR(value);
if (!value || value.startsWith('/') || value.length > 160) return null;
const productWords = ['belbant', 'bel bant', 'külot', 'kulot', 'hasta bezi', 'serme', 'jender', 'coverdry', 'beden'];
if (productWords.some(word => lower.includes(word))) {
return { command: 'aperion.product_report', query: value, kind: 'product' };
}
const customerWords = ['medikal', 'eczane', 'hastane', 'sağlık', 'saglik', 'ortopedi'];
if (customerWords.some(word => lower.includes(word))) {
return { command: 'aperion.customer_report', query: value, kind: 'customer' };
}
return null;
}

async function fetchBridgeReport(env, directReport, message) {
const secret = clean(env.APERION_HERMES_SECRET || env.APERION_BRIDGE_SECRET);
if (!secret) return { ok: false, error: 'missing_bridge_secret' };
const bridgeUrl = clean(env.APERION_COMMAND_BRIDGE_URL || 'https://aperion-command-bridge.yenicespor-finans.workers.dev').replace(/\/+$/, '');
const response = await fetch(bridgeUrl + '/v1/tasks', {
method: 'POST',
headers: {
authorization: 'Bearer ' + secret,
'content-type': 'application/json',
'idempotency-key': 'telegram-' + message.chat.id + '-' + message.message_id
},
body: JSON.stringify({
command: directReport.command,
query: directReport.query,
source: 'telegram',
chat_id: String(message.chat.id),
message_id: String(message.message_id)
})
});
const body = await response.json().catch(() => ({}));
if (!response.ok) return { ok: false, error: body.error || ('bridge_http_' + response.status) };
const telegramCard = body?.result?.telegramCard || body?.telegramCard;
return telegramCard ? { ok: true, telegramCard } : { ok: false, error: 'missing_telegram_card' };
}

async function handleReportFieldsIntent(env, chatId, userId, text) {
const payload = String(text || '').replace(/^\/raporalanlari\s*/i, '').trim();
if (!payload) {
const product = await readReportFields(env, 'product');
const customer = await readReportFields(env, 'customer');
await sendMessage(env, chatId, '⚙️ Rapor alanları\n• Ürün: ' + product.join(', ') + '\n• Cari: ' + customer.join(', ') + '\n\nDeğiştir: /raporalanlari urun:urun,miktar,tarih');
return;
}

async function handleDailyStatementIntent(env, chatId, statementType) {
const report = await buildDailyFinancialStatements(env, env.APERION_DB, new Date());
const parts = report.split('\nGÜNLÜK BİLANÇO — KISMİ GÖRÜNÜM');
const text = statementType === 'balance_sheet'
? 'GÜNLÜK BİLANÇO — KISMİ GÖRÜNÜM' + (parts[1] || '\n• KAYNAK OKUNAMADI')
: parts[0];
await sendMessage(env, chatId, text);
}
const match = payload.match(/^(urun|ürün|cari)\s*:\s*(.+)$/i);
if (!match) {
await sendMessage(env, chatId, 'Kullanım: /raporalanlari urun:urun,miktar,birim,tarih');
return;
}
const reportKey = /cari/i.test(match[1]) ? 'customer' : 'product';
const saved = await saveReportFields(env, reportKey, match[2].split(','), userId);
await sendMessage(env, chatId, saved.ok ? '✅ ' + REPORT_DEFINITIONS[reportKey].title + ' alanları güncellendi: ' + saved.fields.join(', ') : '⚠️ ' + saved.error);
}

export async function onRequestPost({ request, env }) {
try {
const update = await request.json();
const identity = await verifyTelegramRequest(request, env, update);
if (!identity.ok) return json({ ok: false, error: 'unauthorized_telegram_update' }, identity.status || 403);
if (update.callback_query) {
if (!identity.hardened) return json({ ok: false, error: 'security_bootstrap_pending' }, 503);
const handled = await handleBankMovementCallback(env, update.callback_query) || await handleCashExpenseCallbackLive(env, update.callback_query) || await handleTransferCallback(env, update.callback_query);
return json({ ok: true, callback_handled: handled });
}
const msg = update.message;
      if (msg && msg.chat && (msg.photo || msg.document || msg.video)) {
      if (!identity.hardened) return json({ ok: false, error: 'security_bootstrap_pending' }, 503);
      return await handleMediaCapture(env, msg);
      }
if (!msg || !msg.chat || !msg.text) return json({ ok: true, ignored: true });

const chatId = msg.chat.id;
const text = clean(msg.text);
const lower = lowerTR(text);
const directReport = detectDirectEntityReport(text);

const priorityCashExpenseIntent = parseCashExpenseIntent(text);
if (priorityCashExpenseIntent) {
if (!identity.hardened) { await sendMessage(env, chatId, '🔒 Gerçek gider emri için Telegram güvenlik eşleştirmesi tamamlanmalıdır. Hiçbir kayıt yapılmadı.'); return json({ ok: true, security_bootstrap_pending: true }); }
const saved = await saveQuickNote(env, { chatId, messageId: msg.message_id, rawText: text, parsedType: priorityCashExpenseIntent.type, paymentMethod: 'nakit', needsReview: true, status: 'approval_pending' });
if (!saved.ok) { await sendMessage(env, chatId, '⚠️ Gider emri güvenli kuyruğa alınamadı. Hiçbir kayıt yapılmadı.'); return json({ ok: false, error: saved.error || 'quick_note_failed' }, 503); }
const approval = await createCashExpenseApprovalLive(env, { chatId, messageId: msg.message_id, quickNoteId: saved.id, intent: priorityCashExpenseIntent });
if (!approval.ok) { await sendMessage(env, chatId, '⚠️ Onay kartı oluşturulamadı. Hiçbir BizimHesap kaydı yapılmadı.'); return json({ ok: false, error: approval.error || 'approval_queue_failed' }, 503); }
await sendMessage(env, chatId, cashExpenseApprovalTextLive(priorityCashExpenseIntent), cashExpenseApprovalButtonsLive(approval.id), { parse_mode: 'HTML' });
return json({ ok: true, intent: 'cash_expense', approval_id: approval.id, duplicate: approval.duplicate, live_write_enabled: false });
}

const mobileResult = await handleMobileCommand({ env, message: msg, identity, sendMessage });
if (mobileResult.handled) return json({
ok: mobileResult.status !== 'failed',
mobile_command: mobileResult.code,
status: mobileResult.status,
received_recorded: mobileResult.receivedRecorded,
completed_recorded: mobileResult.completedRecorded,
telegram_delivered: mobileResult.delivered
}, mobileResult.status === 'failed' ? 502 : 200);

const earlyCashExpenseIntent = parseCashExpenseIntent(text);
if (earlyCashExpenseIntent) {
if (!identity.hardened) {
await sendMessage(env, chatId, '🔒 Gerçek gider emri için Telegram güvenlik eşleştirmesi tamamlanmalıdır. Hiçbir kayıt yapılmadı.');
return json({ ok: true, security_bootstrap_pending: true });
}
const saved = await saveQuickNote(env, { chatId, messageId: msg.message_id, rawText: text, parsedType: earlyCashExpenseIntent.type, paymentMethod: 'nakit', needsReview: true, status: 'approval_pending' });
if (!saved.ok) { await sendMessage(env, chatId, '⚠️ Gider emri güvenli kuyruğa alınamadı. Hiçbir kayıt yapılmadı.'); return json({ ok: false, error: saved.error || 'quick_note_failed' }, 503); }
const approval = await createCashExpenseApprovalLive(env, { chatId, messageId: msg.message_id, quickNoteId: saved.id, intent: earlyCashExpenseIntent });
if (!approval.ok) { await sendMessage(env, chatId, '⚠️ Onay kartı oluşturulamadı. Hiçbir BizimHesap kaydı yapılmadı.'); return json({ ok: false, error: approval.error || 'approval_queue_failed' }, 503); }
await sendMessage(env, chatId, cashExpenseApprovalTextLive(earlyCashExpenseIntent), cashExpenseApprovalButtonsLive(approval.id), { parse_mode: 'HTML' });
return json({ ok: true, intent: 'cash_expense', approval_id: approval.id, duplicate: approval.duplicate, live_write_enabled: false });
}

const universalIntent = parseUniversalCommand(text);
if (universalIntent) {
const universalResult = await handleUniversalCommand(env, msg, identity, universalIntent);
return json({ ok: true, universal_command: universalIntent.code, status: universalResult.status, duplicate: Boolean(universalResult.duplicate) });
}

if (!identity.hardened && !directReport && !lower.startsWith('/durum') && !lower.startsWith('/stok') && !lower.startsWith('/urunraporu') && !lower.startsWith('/ürünraporu') && !lower.startsWith('/cariraporu') && !lower.startsWith('/raporalanlari') && !lower.startsWith('/gelirtablosu') && !lower.startsWith('/bilanco') && !lower.startsWith('/bilanço') && !lower.includes('bakiye')) {
await sendMessage(env, chatId, '🔒 Güvenlik eşleştirmesi tamamlanıyor. Şimdilik rapor/sorgular, iç görev kayıtları ve izin listesindeki sabit uygulama açma komutları kullanılabilir; mali, iletişim, silme ve erişim işlemleri kapalıdır.');
return json({ ok: true, security_bootstrap_pending: true });
}

if (directReport) {
const report = await fetchBridgeReport(env, directReport, msg);
if (report.ok) {
await sendMessage(env, chatId, report.telegramCard);
return json({ ok: true, report: directReport.kind, source: 'aperion_command_bridge' });
}
await sendMessage(env, chatId, '⚠️ RAPOR HATTI GEÇİCİ OLARAK KULLANILAMIYOR\nKaynak doğrulanamadığı için tahmini veri göstermedim. Finansal işlem veya genel not oluşturulmadı.');
// Telegram retries every non-2xx webhook response. A delivery failure is
// acknowledged here so one user message can never create a retry storm.
return json({ ok: true, report: directReport.kind, delivered: false, error: report.error });
}

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

if (lower.startsWith('/urunraporu') || lower.startsWith('/ürünraporu')) {
await handleConfiguredReport(env, chatId, 'product', text.replace(/^\/(?:urunraporu|ürünraporu)\s*/i, ''));
return json({ ok: true, report: 'product' });
}

if (lower.startsWith('/cariraporu')) {
await handleConfiguredReport(env, chatId, 'customer', text.replace(/^\/cariraporu\s*/i, ''));
return json({ ok: true, report: 'customer' });
}

if (lower.startsWith('/raporalanlari')) {
await handleReportFieldsIntent(env, chatId, msg.from?.id, text);
return json({ ok: true, report_profile: true });
}

if (lower.startsWith('/gelirtablosu') || lower.includes('gelir tablosu')) {
await handleDailyStatementIntent(env, chatId, 'income_statement');
return json({ ok: true, report: 'income_statement' });
}

if (lower.startsWith('/bilanco') || lower.startsWith('/bilanço') || lower === 'bilanço' || lower === 'bilanco') {
await handleDailyStatementIntent(env, chatId, 'balance_sheet');
return json({ ok: true, report: 'balance_sheet' });
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

/* CASH_EXPENSE_INTENT_MOVED
const cashExpenseIntent = parseCashExpenseIntent(text);
if (cashExpenseIntent) {
const saved = await saveQuickNote(env, { chatId, messageId: msg.message_id, rawText: text, parsedType: cashExpenseIntent.type, paymentMethod: 'nakit', needsReview: true, status: 'approval_pending' });
if (!saved.ok) {
await sendMessage(env, chatId, '⚠️ Gider emri güvenli kuyruğa alınamadı. Hiçbir kayıt yapılmadı.');
return json({ ok: false, error: saved.error || 'quick_note_failed' }, 503);
}
const approval = await createCashExpenseApproval(env, { chatId, messageId: msg.message_id, quickNoteId: saved.id, intent: cashExpenseIntent });
if (!approval.ok) {
await sendMessage(env, chatId, '⚠️ Onay kartı oluşturulamadı. Hiçbir BizimHesap kaydı yapılmadı.');
return json({ ok: false, error: approval.error || 'approval_queue_failed' }, 503);
}
await sendMessage(env, chatId, cashExpenseApprovalText(cashExpenseIntent), cashExpenseApprovalButtons(approval.id), { parse_mode: 'HTML' });
return json({ ok: true, intent: 'cash_expense', approval_id: approval.id, duplicate: approval.duplicate, live_write_enabled: false });
}
CASH_EXPENSE_INTENT_MOVED_END */
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

const cashExpenseIntent = parseCashExpenseIntent(text);
if (cashExpenseIntent) {
const saved = await saveQuickNote(env, { chatId, messageId: msg.message_id, rawText: text, parsedType: cashExpenseIntent.type, paymentMethod: 'nakit', needsReview: true, status: 'approval_pending' });
if (!saved.ok) { await sendMessage(env, chatId, '⚠️ Gider emri güvenli kuyruğa alınamadı. Hiçbir kayıt yapılmadı.'); return json({ ok: false, error: saved.error || 'quick_note_failed' }, 503); }
const approval = await createCashExpenseApprovalLive(env, { chatId, messageId: msg.message_id, quickNoteId: saved.id, intent: cashExpenseIntent });
if (!approval.ok) { await sendMessage(env, chatId, '⚠️ Onay kartı oluşturulamadı. Hiçbir BizimHesap kaydı yapılmadı.'); return json({ ok: false, error: approval.error || 'approval_queue_failed' }, 503); }
await sendMessage(env, chatId, cashExpenseApprovalTextLive(cashExpenseIntent), cashExpenseApprovalButtonsLive(approval.id), { parse_mode: 'HTML' });
return json({ ok: true, intent: 'cash_expense', approval_id: approval.id, duplicate: approval.duplicate, live_write_enabled: false });
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
