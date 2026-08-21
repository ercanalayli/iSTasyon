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

function lowerTR(text) {
return clean(text).replace(/Ä°/g, 'i').replace(/I/g, 'Ä±').toLowerCase();
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
if (!env.TELEGRAM_BOT_TOKEN) return { ok: false, error: 'missing_telegram_token' };
const url = 'https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage';
const r = await fetch(url, {
method: 'POST',
headers: { 'content-type': 'application/json' },
body: JSON.stringify({ chat_id: chatId, text, ...(replyMarkup ? { reply_markup: replyMarkup } : {}), ...extra })
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

async function clearCallbackButtons(env, callbackQuery) {
if (!env.TELEGRAM_BOT_TOKEN || !callbackQuery?.message?.chat?.id || !callbackQuery?.message?.message_id) return;
await fetch('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/editMessageReplyMarkup', {
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
not_found: 'Hareket bulunamadÄ±.',
already_approved: 'Bu hareket daha Ã¶nce onaylandÄ±; red uygulanmadÄ±.',
already_rejected: 'Bu hareket daha Ã¶nce reddedildi.',
};
await answerCallbackQuery(env, callbackQuery.id, labels[decision.error] || 'Banka hareketi gÃ¼ncellenemedi.');
return true;
}
await clearCallbackButtons(env, callbackQuery);
if (decision.status === 'rejected') {
await answerCallbackQuery(env, callbackQuery.id, decision.duplicate ? 'Bu hareket daha Ã¶nce reddedildi.' : 'Hareket reddedildi.');
await sendMessage(env, chatId, 'âŒ <b>Banka hareketi reddedildi</b>\nKayÄ±t BizimHesap kuyruÄŸuna alÄ±nmadÄ±.', null, { parse_mode: 'HTML' });
return true;
}
await answerCallbackQuery(env, callbackQuery.id, decision.duplicate ? 'Bu hareket daha Ã¶nce onaylandÄ±.' : 'OnaylandÄ±; gÃ¼venli iÅŸlem kuyruÄŸuna alÄ±ndÄ±.');
await sendMessage(env, chatId, 'âœ… <b>Banka hareketi onaylandÄ±</b>\nBizimHesap gÃ¼venlik kuyruÄŸuna aktarÄ±ldÄ±. Cari eÅŸleÅŸmesi, mÃ¼kerrer kontrolÃ¼ ve kayÄ±t kanÄ±tÄ± tamamlanmadan iÅŸlem kapanmÄ±ÅŸ sayÄ±lmaz.', null, { parse_mode: 'HTML' });
return true;
}

const lookup = await sbFetch(env, '/rest/v1/pending_bank_movements?select=id,status,bank_name,transaction_date,description,amount_in,amount_out&id=eq.' + encodeURIComponent(movementId) + '&limit=1');
const row = lookup.ok && Array.isArray(lookup.data) ? lookup.data[0] : null;
if (!row) {
await answerCallbackQuery(env, callbackQuery.id, 'Hareket bulunamadÄ±.');
return true;
}

if (action === 'r') {
if (row.status === 'approved') {
await answerCallbackQuery(env, callbackQuery.id, 'Bu hareket daha Ã¶nce onaylandÄ±; red uygulanmadÄ±.');
return true;
}
const rejected = await sbFetch(env, '/rest/v1/rpc/reject_pending_bank_movement', {
method: 'POST',
body: JSON.stringify({ p_id: movementId, p_note: 'Telegram Ã¼zerinden reddedildi: ' + chatId })
});
if (!rejected.ok) {
await answerCallbackQuery(env, callbackQuery.id, 'Red iÅŸlemi baÅŸarÄ±sÄ±z.');
return true;
}
await clearCallbackButtons(env, callbackQuery);
await answerCallbackQuery(env, callbackQuery.id, 'Hareket reddedildi.');
await sendMessage(env, chatId, 'âŒ <b>Banka hareketi reddedildi</b>\nKayÄ±t BizimHesap kuyruÄŸuna alÄ±nmadÄ±.', null, { parse_mode: 'HTML' });
return true;
}

if (row.status === 'rejected') {
await answerCallbackQuery(env, callbackQuery.id, 'Bu hareket daha Ã¶nce reddedildi.');
return true;
}
const approved = await sbFetch(env, '/rest/v1/rpc/approve_pending_bank_movement', {
method: 'POST',
body: JSON.stringify({ p_id: movementId, p_note: 'Telegram Ã¼zerinden onaylandÄ±: ' + chatId })
});
if (!approved.ok) {
await answerCallbackQuery(env, callbackQuery.id, 'Onay kuyruÄŸa alÄ±namadÄ±.');
return true;
}
await clearCallbackButtons(env, callbackQuery);
await answerCallbackQuery(env, callbackQuery.id, 'OnaylandÄ±; gÃ¼venli iÅŸlem kuyruÄŸuna alÄ±ndÄ±.');
await sendMessage(env, chatId, 'âœ… <b>Banka hareketi onaylandÄ±</b>\nBizimHesap gÃ¼venlik kuyruÄŸuna aktarÄ±ldÄ±. Cari eÅŸleÅŸmesi, mÃ¼kerrer kontrolÃ¼ ve kayÄ±t kanÄ±tÄ± tamamlanmadan iÅŸlem kapanmÄ±ÅŸ sayÄ±lmaz.', null, { parse_mode: 'HTML' });
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
if (lower.includes('kredi kart')) return 'kredi kartÄ±';
if (lower.includes('havale') || lower.includes('eft') || lower.includes('fast')) return 'havale/eft/fast';
if (lower.includes('nakit')) return 'nakit';
if (lower.includes('Ã§ek') || lower.includes('cek')) return 'Ã§ek';
if (lower.includes('senet')) return 'senet';
return 'belirsiz';
}

// ---- tarih cikarimi: "10 Temmuz", "bugun", "yarin" ----
const AYLAR = ['ocak', 'ÅŸubat', 'mart', 'nisan', 'mayÄ±s', 'haziran', 'temmuz', 'aÄŸustos', 'eylÃ¼l', 'ekim', 'kasÄ±m', 'aralÄ±k'];
function parseDueDate(text) {
const lower = lowerTR(text);
const now = new Date();

if (/\byarÄ±n\b/.test(lower)) {
const d = new Date(now); d.setDate(d.getDate() + 1);
return { iso: isoFromDate(d), matched: 'yarÄ±n' };
}
if (/\bbugÃ¼n\b/.test(lower)) {
return { iso: isoFromDate(now), matched: 'bugÃ¼n' };
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
const match = rawText.match(/^(.+?)\s+(?:kasadan|hesaptan)\s+(.+?)\s+(?:kasaya|hesaba)\s+([\d.,]+)\s*(?:tl|try|â‚º)\s*(?:transfer(?:\s+et)?|aktar)?$/iu);
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
const DUZ_KELIMELER = ['Ã¶deme', 'odeme', 'kredi', 'kart', 'kartÄ±', 'kartÄ±', 'havale', 'eft', 'fast', 'nakit', 'Ã§ek', 'cek', 'senet', 'tl', 'lira', 'try', 'bin', 'milyon', 'milyar', 'bugÃ¼n', 'yarÄ±n', ...AYLAR];
function guessCounterparty(text, dueDateMatchedStr, amountMatchedStr) {
let t = text;
if (dueDateMatchedStr) t = t.replace(dueDateMatchedStr, ' ');
if (amountMatchedStr) t = t.replace(amountMatchedStr, ' ');
const words = t.split(/\s+/).filter(Boolean);
const kalan = [];
for (const w of words) {
const lw = lowerTR(w).replace(/[^a-zÃ§ÄŸÄ±Ã¶ÅŸÃ¼]/g, '');
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
if (/\bsipariÅŸ|\bballya|\badet\b/.test(lower)) return 'siparis_notu';
if (/yapacaksÄ±n|hatÄ±rlat|unutma|yap\b/.test(lower)) return 'yapilacak_is';
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
await sendMessage(env, identity.chatId, 'âš ï¸ Komut kalÄ±cÄ± kuyruÄŸa alÄ±namadÄ±. HiÃ§bir dÄ±ÅŸ iÅŸlem yapÄ±lmadÄ±.');
return { handled: true, status: 'failed', error: claimed.error };
}
if (claimed.duplicate) {
await sendMessage(env, identity.chatId, `â™»ï¸ Bu komut daha Ã¶nce alÄ±ndÄ±. Durum: ${claimed.status || 'bilinmiyor'}.`);
return { handled: true, status: claimed.status || 'duplicate', duplicate: true };
}

if (intent.code === 'desktop_open') {
const queued = await queueDesktopCommand(env, identity, message, intent);
if (!queued.ok) {
await updateUniversalCommand(env, claimed.id, 'blocked', 'MasaÃ¼stÃ¼ dinleyici kuyruÄŸuna eriÅŸilemedi');
await sendMessage(env, identity.chatId, `âš ï¸ ${intent.targetTitle} aÃ§ma komutu kaydedildi fakat masaÃ¼stÃ¼ kuyruÄŸuna baÄŸlanamadÄ±. Bilgisayarda iÅŸlem yapÄ±lmadÄ±.`);
return { handled: true, status: 'blocked', error: queued.error };
}
await updateUniversalCommand(env, claimed.id, 'queued', `${intent.targetTitle} masaÃ¼stÃ¼ kuyruÄŸuna alÄ±ndÄ±`, queued.id);
await sendMessage(env, identity.chatId, `ğŸ–¥ï¸ ${intent.targetTitle} aÃ§ma komutu masaÃ¼stÃ¼ kuyruÄŸuna alÄ±ndÄ±. Bilgisayar ve AperiON dinleyicisi aÃ§Ä±ksa sonuÃ§ Telegramâ€™a bildirilecek.`);
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
await updateUniversalCommand(env, claimed.i…8674 tokens truncated…e(env, category, period))) : periods.map(() => ({ ok: false }));
const fifoLedger = fields.some(field => ['fifo_profit', 'margin'].includes(field))
? await buildProductFifoLedger(env, search, periods.find(period => period.key === 'today').to) : { ok: false, sales: [], layers: [] };
const fifo = periods.map(period => fifoPeriodSummary(fifoLedger, period));
const lines = ['ğŸ“Š ÃœRÃœN PERFORMANS RAPORU', 'Arama: ' + search, 'Kategori: ' + (category || 'eÅŸleÅŸmedi'), 'Alan profili: ' + fields.join(', '), ''];
periods.forEach((period, index) => {
const result = sales[index];
if (!result.ok) { lines.push('â€¢ ' + period.label + ': KAYNAK OKUNAMADI'); return; }
const quantity = sumRows(result.rows, 'adet');
const revenue = sumRows(result.rows, 'satis_kdv_haric') || sumRows(result.rows, 'ciro');
const parts = [];
if (fields.includes('period_quantity')) parts.push(quantity.toLocaleString('tr-TR') + ' adet');
if (fields.includes('period_revenue')) parts.push(money(revenue));
if (fields.includes('fifo_profit')) parts.push(fifo[index].ok ? 'FIFO kÃ¢r ' + money(fifo[index].profit) : 'FIFO KAYNAK EKSÄ°K');
if (fields.includes('margin')) parts.push(fifo[index].ok && Number.isFinite(fifo[index].margin) ? 'marj %' + fifo[index].margin.toFixed(1) : 'marj hesaplanamadÄ±');
if (fields.includes('category_share')) {
const denominator = categoryTotals[index].revenue;
parts.push(categoryTotals[index].ok && denominator > 0 ? 'kategori payÄ± %' + (revenue / denominator * 100).toFixed(1) : 'kategori payÄ± hesaplanamadÄ±');
}
lines.push('â€¢ ' + period.label + ': ' + (parts.join(' Â· ') || result.rows.length + ' kayÄ±t'));
});
if (fields.includes('top_customers')) {
const yearIndex = periods.findIndex(period => period.key === 'this_year');
const customers = topCustomers(sales[yearIndex].rows);
lines.push('', 'BU YIL EN Ã‡OK ALAN MÃœÅTERÄ°LER');
lines.push(...(customers.length ? customers.map(([name, value], index) => (index + 1) + '. ' + name + ' Â· ' + value.quantity.toLocaleString('tr-TR') + ' adet Â· ' + money(value.revenue)) : ['â€¢ DoÄŸrulanmÄ±ÅŸ mÃ¼ÅŸteri satÄ±ÅŸÄ± yok']));
}
if (fields.some(field => ['fifo_profit', 'margin'].includes(field))) {
lines.push('', 'KALAN FIFO STOK KATMANLARI');
lines.push(...(fifoLedger.layers.length ? fifoLedger.layers.slice(0, 12).map(layer => 'â€¢ ' + layer.remaining.toLocaleString('tr-TR') + ' adet Ã— ' + money(layer.unitCost) + ' Â· alÄ±ÅŸ ' + layer.date + (layer.document ? ' Â· ' + layer.document : '')) : ['â€¢ DoÄŸrulanmÄ±ÅŸ kalan katman yok']));
if (!fifoLedger.ok) lines.push('âš ï¸ FIFO kaynak kapsamÄ± eksik veya satÄ±lan miktarÄ±n alÄ±ÅŸ katmanÄ± bulunamadÄ±; kÃ¢r kesinleÅŸtirilmedi.');
}
lines.push('', 'Not: FIFO yalnÄ±zca doÄŸrulanmÄ±ÅŸ alÄ±ÅŸ-satÄ±ÅŸ eÅŸleÅŸmesinden hesaplanÄ±r. Eksikse kÃ¢r gÃ¶sterilmez.');
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
await sendMessage(env, chatId, 'âš ï¸ ' + definition.title + ' kaynaÄŸÄ± ÅŸu an okunamadÄ±; veri uydurulmadÄ±.');
return;
}
if (!result.data.length) {
await sendMessage(env, chatId, 'ğŸ” ' + (search ? 'â€œ' + search + 'â€ iÃ§in ' : '') + 'doÄŸrulanmÄ±ÅŸ kayÄ±t bulunamadÄ±.');
return;
}
const cards = result.data.map((row, index) => [
(index + 1) + ') ' + reportValue(fields[0], row[fields[0]]),
...fields.slice(1).map(field => 'â€¢ ' + (definition.labels[field] || field) + ': ' + reportValue(field, row[field]))
].join('\n'));
await sendMessage(env, chatId, 'ğŸ“Š ' + definition.title + (search ? ' â€” ' + search : '') + '\nAlanlar: ' + fields.join(', ') + '\n\n' + cards.join('\n\n'));
}

async function handleReportFieldsIntent(env, chatId, userId, text) {
const payload = String(text || '').replace(/^\/raporalanlari\s*/i, '').trim();
if (!payload) {
const product = await readReportFields(env, 'product');
const customer = await readReportFields(env, 'customer');
await sendMessage(env, chatId, 'âš™ï¸ Rapor alanlarÄ±\nâ€¢ ÃœrÃ¼n: ' + product.join(', ') + '\nâ€¢ Cari: ' + customer.join(', ') + '\n\nDeÄŸiÅŸtir: /raporalanlari urun:urun,miktar,tarih');
return;
}

async function handleDailyStatementIntent(env, chatId, statementType) {
const report = await buildDailyFinancialStatements(env, env.APERION_DB, new Date());
const parts = report.split('\nGÃœNLÃœK BÄ°LANÃ‡O â€” KISMÄ° GÃ–RÃœNÃœM');
const text = statementType === 'balance_sheet'
? 'GÃœNLÃœK BÄ°LANÃ‡O â€” KISMÄ° GÃ–RÃœNÃœM' + (parts[1] || '\nâ€¢ KAYNAK OKUNAMADI')
: parts[0];
await sendMessage(env, chatId, text);
}
const match = payload.match(/^(urun|Ã¼rÃ¼n|cari)\s*:\s*(.+)$/i);
if (!match) {
await sendMessage(env, chatId, 'KullanÄ±m: /raporalanlari urun:urun,miktar,birim,tarih');
return;
}
const reportKey = /cari/i.test(match[1]) ? 'customer' : 'product';
const saved = await saveReportFields(env, reportKey, match[2].split(','), userId);
await sendMessage(env, chatId, saved.ok ? 'âœ… ' + REPORT_DEFINITIONS[reportKey].title + ' alanlarÄ± gÃ¼ncellendi: ' + saved.fields.join(', ') : 'âš ï¸ ' + saved.error);
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

const priorityCashExpenseIntent = parseCashExpenseIntent(text);
if (priorityCashExpenseIntent) {
if (!identity.hardened) { await sendMessage(env, chatId, 'ğŸ”’ GerÃ§ek gider emri iÃ§in Telegram gÃ¼venlik eÅŸleÅŸtirmesi tamamlanmalÄ±dÄ±r. HiÃ§bir kayÄ±t yapÄ±lmadÄ±.'); return json({ ok: true, security_bootstrap_pending: true }); }
const saved = await saveQuickNote(env, { chatId, messageId: msg.message_id, rawText: text, parsedType: priorityCashExpenseIntent.type, paymentMethod: 'nakit', needsReview: true, status: 'approval_pending' });
if (!saved.ok) { await sendMessage(env, chatId, 'âš ï¸ Gider emri gÃ¼venli kuyruÄŸa alÄ±namadÄ±. HiÃ§bir kayÄ±t yapÄ±lmadÄ±.'); return json({ ok: false, error: saved.error || 'quick_note_failed' }, 503); }
const approval = await createCashExpenseApprovalLive(env, { chatId, messageId: msg.message_id, quickNoteId: saved.id, intent: priorityCashExpenseIntent });
if (!approval.ok) { await sendMessage(env, chatId, 'âš ï¸ Onay kartÄ± oluÅŸturulamadÄ±. HiÃ§bir BizimHesap kaydÄ± yapÄ±lmadÄ±.'); return json({ ok: false, error: approval.error || 'approval_queue_failed' }, 503); }
await sendMessage(env, chatId, cashExpenseApprovalTextLive(priorityCashExpenseIntent), cashExpenseApprovalButtonsLive(approval.id), { parse_mode: 'HTML' });
return json({ ok: true, intent: 'cash_expense', approval_id: approval.id, duplicate: approval.duplicate, live_write_enabled: false });
}

const mobileResult = await handleMobileCommand({ env, message: msg, identity, sendMessage });
if (mobileResult.handled) return json({ ok: true, mobile_command: mobileResult.code, status: mobileResult.status });

const earlyCashExpenseIntent = parseCashExpenseIntent(text);
if (earlyCashExpenseIntent) {
if (!identity.hardened) {
await sendMessage(env, chatId, 'ğŸ”’ GerÃ§ek gider emri iÃ§in Telegram gÃ¼venlik eÅŸleÅŸtirmesi tamamlanmalÄ±dÄ±r. HiÃ§bir kayÄ±t yapÄ±lmadÄ±.');
return json({ ok: true, security_bootstrap_pending: true });
}
const saved = await saveQuickNote(env, { chatId, messageId: msg.message_id, rawText: text, parsedType: earlyCashExpenseIntent.type, paymentMethod: 'nakit', needsReview: true, status: 'approval_pending' });
if (!saved.ok) { await sendMessage(env, chatId, 'âš ï¸ Gider emri gÃ¼venli kuyruÄŸa alÄ±namadÄ±. HiÃ§bir kayÄ±t yapÄ±lmadÄ±.'); return json({ ok: false, error: saved.error || 'quick_note_failed' }, 503); }
const approval = await createCashExpenseApprovalLive(env, { chatId, messageId: msg.message_id, quickNoteId: saved.id, intent: earlyCashExpenseIntent });
if (!approval.ok) { await sendMessage(env, chatId, 'âš ï¸ Onay kartÄ± oluÅŸturulamadÄ±. HiÃ§bir BizimHesap kaydÄ± yapÄ±lmadÄ±.'); return json({ ok: false, error: approval.error || 'approval_queue_failed' }, 503); }
await sendMessage(env, chatId, cashExpenseApprovalTextLive(earlyCashExpenseIntent), cashExpenseApprovalButtonsLive(approval.id), { parse_mode: 'HTML' });
return json({ ok: true, intent: 'cash_expense', approval_id: approval.id, duplicate: approval.duplicate, live_write_enabled: false });
}

const universalIntent = parseUniversalCommand(text);
if (universalIntent) {
const universalResult = await handleUniversalCommand(env, msg, identity, universalIntent);
return json({ ok: true, universal_command: universalIntent.code, status: universalResult.status, duplicate: Boolean(universalResult.duplicate) });
}

if (!identity.hardened && !lower.startsWith('/durum') && !lower.startsWith('/stok') && !lower.startsWith('/urunraporu') && !lower.startsWith('/Ã¼rÃ¼nraporu') && !lower.startsWith('/cariraporu') && !lower.startsWith('/raporalanlari') && !lower.startsWith('/gelirtablosu') && !lower.startsWith('/bilanco') && !lower.startsWith('/bilanÃ§o') && !lower.includes('bakiye')) {
await sendMessage(env, chatId, 'ğŸ”’ GÃ¼venlik eÅŸleÅŸtirmesi tamamlanÄ±yor. Åimdilik rapor/sorgular, iÃ§ gÃ¶rev kayÄ±tlarÄ± ve izin listesindeki sabit uygulama aÃ§ma komutlarÄ± kullanÄ±labilir; mali, iletiÅŸim, silme ve eriÅŸim iÅŸlemleri kapalÄ±dÄ±r.');
return json({ ok: true, security_bootstrap_pending: true });
}

if (text.startsWith('/start')) {
await sendMessage(env, chatId,
'AperiON Telegram canlÄ±. Ä°kinci beyin modu aÃ§Ä±k.\n\n' +
'Ã–deme sÃ¶zÃ¼: "Sena Medikal 10 Temmuz 100 bin Ã¶deme kredi kartÄ±"\n' +
'Bakiye sorgusu: "bakiye"\n' +
'Durum: /durum\n' +
'Stok sorgusu: /stok <Ã¼rÃ¼n adÄ±>\n' +
'Fatura/fiÅŸ fotoÄŸrafÄ±: gÃ¶nder, kuyruÄŸa alÄ±rÄ±m (BizimHesap\'a onaylÄ± yazma yakÄ±nda).\n' +
                      'Herhangi bir not: dÃ¼z yaz, kaydederim.'
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

if (lower.startsWith('/urunraporu') || lower.startsWith('/Ã¼rÃ¼nraporu')) {
await handleConfiguredReport(env, chatId, 'product', text.replace(/^\/(?:urunraporu|Ã¼rÃ¼nraporu)\s*/i, ''));
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

if (lower.startsWith('/bilanco') || lower.startsWith('/bilanÃ§o') || lower === 'bilanÃ§o' || lower === 'bilanco') {
await handleDailyStatementIntent(env, chatId, 'balance_sheet');
return json({ ok: true, report: 'balance_sheet' });
}

if (lower.startsWith('/senkron') || lower.startsWith('/oturum')) {
await sendMessage(env, chatId, 'Bu komut ÅŸu an bilgisayarÄ±nÄ±za baÄŸlÄ± deÄŸil (yerel dinleyici Ã§alÄ±ÅŸmÄ±yor, en son 12 AÄŸustos\'ta aktifti). BaÄŸlanÄ±nca haber vereceÄŸim.');
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
await sendMessage(env, chatId, 'âš ï¸ Transfer emri gÃ¼venli kuyruÄŸa alÄ±namadÄ±. HiÃ§bir kayÄ±t yapÄ±lmadÄ±.');
return json({ ok: false, error: saved.error || 'quick_note_failed' }, 503);
}

/* CASH_EXPENSE_INTENT_MOVED
const cashExpenseIntent = parseCashExpenseIntent(text);
if (cashExpenseIntent) {
const saved = await saveQuickNote(env, { chatId, messageId: msg.message_id, rawText: text, parsedType: cashExpenseIntent.type, paymentMethod: 'nakit', needsReview: true, status: 'approval_pending' });
if (!saved.ok) {
await sendMessage(env, chatId, 'âš ï¸ Gider emri gÃ¼venli kuyruÄŸa alÄ±namadÄ±. HiÃ§bir kayÄ±t yapÄ±lmadÄ±.');
return json({ ok: false, error: saved.error || 'quick_note_failed' }, 503);
}
const approval = await createCashExpenseApproval(env, { chatId, messageId: msg.message_id, quickNoteId: saved.id, intent: cashExpenseIntent });
if (!approval.ok) {
await sendMessage(env, chatId, 'âš ï¸ Onay kartÄ± oluÅŸturulamadÄ±. HiÃ§bir BizimHesap kaydÄ± yapÄ±lmadÄ±.');
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
await sendMessage(env, chatId, 'âš ï¸ Onay kartÄ± oluÅŸturulamadÄ±. HiÃ§bir BizimHesap kaydÄ± yapÄ±lmadÄ±.');
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
if (!saved.ok) { await sendMessage(env, chatId, 'âš ï¸ Gider emri gÃ¼venli kuyruÄŸa alÄ±namadÄ±. HiÃ§bir kayÄ±t yapÄ±lmadÄ±.'); return json({ ok: false, error: saved.error || 'quick_note_failed' }, 503); }
const approval = await createCashExpenseApprovalLive(env, { chatId, messageId: msg.message_id, quickNoteId: saved.id, intent: cashExpenseIntent });
if (!approval.ok) { await sendMessage(env, chatId, 'âš ï¸ Onay kartÄ± oluÅŸturulamadÄ±. HiÃ§bir BizimHesap kaydÄ± yapÄ±lmadÄ±.'); return json({ ok: false, error: approval.error || 'approval_queue_failed' }, 503); }
await sendMessage(env, chatId, cashExpenseApprovalTextLive(cashExpenseIntent), cashExpenseApprovalButtonsLive(approval.id), { parse_mode: 'HTML' });
return json({ ok: true, intent: 'cash_expense', approval_id: approval.id, duplicate: approval.duplicate, live_write_enabled: false });
}

const paymentMethod = parsePaymentMethod(lower);
const dueDate = parseDueDate(text);
const amount = parseAmount(text, dueDate.matched);
const odemeSozuAdayi = /Ã¶deme|odeme|Ã¶de\b/.test(lower) || amount.amount !== null;

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
'ğŸ“Œ Ã–deme sÃ¶zÃ¼ olarak anladÄ±m:',
'â€¢ KarÅŸÄ± taraf: ' + (musteri ? musteri.cari_unvan + ' (cari eÅŸleÅŸti)' : (counterpartyAdayi || 'belirtilmedi') + ' (cari eÅŸleÅŸmedi, kontrol et)'),
'â€¢ Tutar: ' + money(amount.amount),
'â€¢ Tarih: ' + (dueDate.iso ? trTarih(dueDate.iso) : 'BELÄ°RTÄ°LMEDÄ° â€” ne zaman?'),
'â€¢ Ã–deme yÃ¶ntemi: ' + paymentMethod
];
if (promiseSaved.ok) {
satirlar.push('âœ… AperiON kritik Ã¶deme listesine eklendi (id: ' + promiseSaved.id + ').');
} else {
satirlar.push('âš ï¸ KayÄ±t baÅŸarÄ±sÄ±z oldu, tekrar dener misin?');
}
if (!musteri) satirlar.push('â— Bu ismi cari listesinde bulamadÄ±m, yanlÄ±ÅŸsa doÄŸru unvanÄ± yaz.');
if (!dueDate.iso) satirlar.push('â— Tarih anlayamadÄ±m, "10 Temmuz" gibi yazar mÄ±sÄ±n?');
if (dueDate.gecmisMi) satirlar.push('â— Bu tarih geÃ§miÅŸte kalmÄ±ÅŸ â€” gecikmiÅŸ bir Ã¶deme mi, yoksa gelecek yÄ±l mÄ± demek istedin? Emin deÄŸilsen "gelecek yÄ±l" yaz.');
await sendMessage(env, chatId, satirlar.join('\n'));
return json({ ok: true });
}

const parsedType = classifyNote(lower);
const saved = await saveQuickNote(env, {
chatId, messageId: msg.message_id, rawText: text,
parsedType, paymentMethod, needsReview: parsedType === 'genel_not'
});

await sendMessage(env, chatId,
'AldÄ±m.\n' +
'Tip: ' + parsedType + '\n' +
'Not: ' + text + '\n' +
(saved.ok
? 'âœ… AperiON kaydÄ± aÃ§Ä±ldÄ± (id: ' + saved.id + ').'
: 'âš ï¸ Not alÄ±ndÄ± ama kalÄ±cÄ± kayÄ±t baÅŸarÄ±sÄ±z oldu (' + (saved.error || 'bilinmeyen hata') + '). Tekrar dene veya bana sÃ¶yle.')
);
return json({ ok: true });
} catch (e) {
return json({ ok: false, error: e.message || 'server_error' }, 500);
}
}

