import { getMobileSecurityStatus, handleMobileCommand, verifyTelegramRequest } from './mobile-command-center.js';
import { DESKTOP_TARGETS, desktopTargetSummary, parseUniversalCommand } from './universal-command-router.js';
import { deviceHealth, queueDeviceCommand } from './device-bridge.js';
import { buildDailyFinancialStatements } from '../../workers/aperion-morning-brief/src/index.js';
import { parseCashExpenseIntent } from '../shared/cash-expense.js';

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
await sendMessage(env, identity.chatId, `ðŸ–¥ï¸ ${intent.targetTitle} aÃ§ma komutu masaÃ¼stÃ¼ kuyruÄŸuna alÄ±ndÄ±. Bilgisayar ve AperiON dinleyicisi aÃ§Ä±ksa sonuÃ§ Telegramâ€™a bildirilecek.`);
return { handled: true, status: 'queued', queueId: queued.id };
}

const parsedType = intent.risk ==×nöîÚ$z{-®éÜj×ö–â‚uÆâr’“°¦v—B6VæDÖW76vR†VçbÂ6†D–BÂ	ù8¢r²FVf–æ—F–öâçF—FÆR²‡6V&6‚òr(	Br²6V&6‚¢rr’²uÆäÆæÆ#¢r²f–VÆG2æ¦ö–â‚rÂr’²uÆåÆâr²6&G2æ¦ö–â‚uÆåÆâr’“°§Ð ¦7–æ2gVæ7F–öâ†æFÆU&W÷'Df–VÆG4–çFVçB†VçbÂ6†D–BÂW6W$–BÂFW‡B’°¦6öç7B–ÆöBÒ7G&–ær‡FW‡BÇÂrr’ç&WÆ6R‚õåÂ÷&÷&ÆæÆ&•Ç2¢ö’Ârr’çG&–Ò‚“°¦–b‚–ÆöB’°¦6öç7B&öGV7BÒv—B&VE&W÷'Df–VÆG2†VçbÂw&öGV7Br“°¦6öç7B7W7FöÖW"Òv—B&VE&W÷'Df–VÆG2†VçbÂv7W7FöÖW"r“°¦v—B6VæDÖW76vR†VçbÂ6†D–BÂ~)©žûˆò&÷"ÆæÆ,KÆî(
"9Ç,;Æã¢r²&öGV7Bæ¦ö–â‚rÂr’²uÆî(
"6&“¢r²7W7FöÖW"æ¦ö–â‚rÂr’²uÆåÆäF\IöœY÷F—#¢÷&÷&ÆæÆ&’W'Vã§W'VâÆÖ–·F"ÇF&–‚r“°§&WGW&ã°§Ð ¦7–æ2gVæ7F–öâ†æFÆTF–Ç•7FFVÖVçD–çFVçB†VçbÂ6†D–BÂ7FFVÖVçEG—R’°¦6öç7B&W÷'BÒv—B'V–ÆDF–Ç”f–ææ6–Å7FFVÖVçG2†VçbÂVçbäU$”ôåôD"ÂæWrFFR‚’“°¦6öç7B'G2Ò&W÷'Bç7Æ—B‚uÆä|9ÄäÌ9Ä²,KÄì8tò(	B´•4ÜK|9e,9Äì9ÄÒr“°¦6öç7BFW‡BÒ7FFVÖVçEG—RÓÓÒv&Ææ6U÷6†VWBp£òt|9ÄäÌ9Ä²,KÄì8tò(	B´•4ÜK|9e,9Äì9ÄÒr²‡'G5³ÒÇÂuÆî(
"´”ä²ôµTäÔD’r£¢'G5³Ó°¦v—B6VæDÖW76vR†VçbÂ6†D–BÂFW‡B“°§Ð¦6öç7BÖF6‚Ò–ÆöBæÖF6‚‚õâ‡W'VçÌ;Ç,;ÆçÆ6&’•Ç2£¥Ç2¢‚â²’Bö’“°¦–b‚ÖF6‚’°¦v—B6VæDÖW76vR†VçbÂ6†D–BÂt·VÆÆìKÓ¢÷&÷&ÆæÆ&’W'Vã§W'VâÆÖ–·F"Æ&—&–ÒÇF&–‚r“°§&WGW&ã°§Ð¦6öç7B&W÷'D¶W’Òö6&’ö’çFW7B†ÖF6…³Ò’òv7W7FöÖW"r¢w&öGV7Bs°¦6öç7B6fVBÒv—B6fU&W÷'Df–VÆG2†VçbÂ&W÷'D¶W’ÂÖF6…³%Òç7Æ—B‚rÂr’ÂW6W$–B“°¦v—B6VæDÖW76vR†VçbÂ6†D–BÂ6fVBæö²ò~)ÈRr²$Uõ%EôDTd”ä•D”ôå5·&W÷'D¶W•ÒçF—FÆR²rÆæÆ,K|;Ææ6VÆÆVæF“¢r²6fVBæf–VÆG2æ¦ö–â‚rÂr’¢~)ªûˆòr²6fVBæW'&÷"“°§Ð Ð¦W‡÷'B7–æ2gVæ7F–öâöå&WVW7E÷7B‡²&WVW7BÂVçbÒ’°Ð§G'’°¦6öç7BWFFRÒv—B&WVW7Bæ§6öâ‚“°¦6öç7B–FVçF—G’Òv—BfW&–g•FVÆVw&Õ&WVW7B‡&WVW7BÂVçbÂWFFR“°¦–b‚–FVçF—G’æö²’&WGW&â§6öâ‡²ö³¢fÇ6RÂW'&÷#¢wVæWF†÷&—¦VE÷FVÆVw&Õ÷WFFRrÒÂ–FVçF—G’ç7FGW2ÇÂC2“°¦–b‡WFFRæ6ÆÆ&6µ÷VW'’’°¦–b‚–FVçF—G’æ†&FVæVB’&WGW&â§6öâ‡²ö³¢fÇ6RÂW'&÷#¢w6V7W&—G•ö&ö÷G7G&÷VæF–ærrÒÂS2“°¦6öç7B†æFÆVBÒv—B†æFÆT66„W‡Vç6T6ÆÆ&6´Æ—fR†VçbÂWFFRæ6ÆÆ&6µ÷VW'’’ÇÂv—B†æFÆUG&ç6fW$6ÆÆ&6²†VçbÂWFFRæ6ÆÆ&6µ÷VW'’“°§&WGW&â§6öâ‡²ö³¢G'VRÂ6ÆÆ&6µö†æFÆVC¢†æFÆVBÒ“°§Ð¦6öç7B×6rÒWFFRæÖW76vS°¢–b†×6rbb×6ræ6†Bbb†×6rç†÷FòÇÂ×6ræFö7VÖVçBÇÂ×6rçf–FVò’’°¢–b‚–FVçF—G’æ†&FVæVB’&WGW&â§6öâ‡²ö³¢fÇ6RÂW'&÷#¢w6V7W&—G•ö&ö÷G7G&÷VæF–ærrÒÂS2“°¢&WGW&âv—B†æFÆTÖVF–6GW&R†VçbÂ×6r“°¢Ð¦–b‚×6rÇÂ×6ræ6†BÇÂ×6rçFW‡B’&WGW&â§6öâ‡²ö³¢G'VRÂ–væ÷&VC¢G'VRÒ“°Ð Ð¦6öç7B6†D–BÒ×6ræ6†Bæ–C°Ð¦6öç7BFW‡BÒ6ÆVâ†×6rçFW‡B“°¦6öç7BÆ÷vW"ÒÆ÷vW%E"‡FW‡B“° ¦6öç7B&–÷&—G”66„W‡Vç6T–çFVçBÒ'6T66„W‡Vç6T–çFVçB‡FW‡B“°¦–b‡&–÷&—G”66„W‡Vç6T–çFVçB’°¦–b‚–FVçF—G’æ†&FVæVB’²v—B6VæDÖW76vR†VçbÂ6†D–BÂ	ùI"vW,:vV²v–FW"V×&’œ:v–âFVÆVw&Ò|;ÇfVæÆ–²\YöÆ\Y÷F—&ÖW6’FÖÖÆæÖÌKLK"â†œ:v&—"¶œKB–KÆÖLKâr“²&WGW&â§6öâ‡²ö³¢G'VRÂ6V7W&—G•ö&ö÷G7G&÷VæF–æs¢G'VRÒ“²Ð¦6öç7B6fVBÒv—B6fUV–6´æ÷FR†VçbÂ²6†D–BÂÖW76vT–C¢×6ræÖW76vUö–BÂ&uFW‡C¢FW‡BÂ'6VEG—S¢&–÷&—G”66„W‡Vç6T–çFVçBçG—RÂ–ÖVçDÖWF†öC¢væ¶—BrÂæVVG5&Wf–Ws¢G'VRÂ7FGW3¢v&÷fÅ÷VæF–ærrÒ“°¦–b‚6fVBæö²’²v—B6VæDÖW76vR†VçbÂ6†D–BÂ~)ªûˆòv–FW"V×&’|;ÇfVæÆ’·W—'\IöÌKæÖLKâ†œ:v&—"¶œKB–KÆÖLKâr“²&WGW&â§6öâ‡²ö³¢fÇ6RÂW'&÷#¢6fVBæW'&÷"ÇÂwV–6µöæ÷FUöf–ÆVBrÒÂS2“²Ð¦6öç7B&÷fÂÒv—B7&VFT66„W‡Vç6T&÷fÄÆ—fR†VçbÂ²6†D–BÂÖW76vT–C¢×6ræÖW76vUö–BÂV–6´æ÷FT–C¢6fVBæ–BÂ–çFVçC¢&–÷&—G”66„W‡Vç6T–çFVçBÒ“°¦–b‚&÷fÂæö²’²v—B6VæDÖW76vR†VçbÂ6†D–BÂ~)ªûˆòöæ’¶'LKöÇ\Y÷GW'VÆÖLKâ†œ:v&—"&—¦–Ô†W6¶–LK–KÆÖLKâr“²&WGW&â§6öâ‡²ö³¢fÇ6RÂW'&÷#¢&÷fÂæW'&÷"ÇÂv&÷fÅ÷VWVUöf–ÆVBrÒÂS2“²Ð¦v—B6VæDÖW76vR†VçbÂ6†D–BÂ66„W‡Vç6T&÷fÅFW‡DÆ—fR‡&–÷&—G”66„W‡Vç6T–çFVçB’Â66„W‡Vç6T&÷fÄ'WGFöç4Æ—fR†&÷fÂæ–B’Â²'6UöÖöFS¢t…DÔÂrÒ“°§&WGW&â§6öâ‡²ö³¢G'VRÂ–çFVçC¢v66…öW‡Vç6RrÂ&÷fÅö–C¢&÷fÂæ–BÂGWÆ–6FS¢&÷fÂæGWÆ–6FRÂÆ—fU÷w&—FUöVæ&ÆVC¢fÇ6RÒ“°§Ð ¦6öç7BÖö&–ÆU&W7VÇBÒv—B†æFÆTÖö&–ÆT6öÖÖæB‡²VçbÂÖW76vS¢×6rÂ–FVçF—G’Â6VæDÖW76vRÒ“°¦–b†Öö&–ÆU&W7VÇBæ†æFÆVB’&WGW&â§6öâ‡²ö³¢G'VRÂÖö&–ÆUö6öÖÖæC¢Öö&–ÆU&W7VÇBæ6öFRÂ7FGW3¢Öö&–ÆU&W7VÇBç7FGW2Ò“° ¦6öç7BV&Ç”66„W‡Vç6T–çFVçBÒ'6T66„W‡Vç6T–çFVçB‡FW‡B“°¦–b†V&Ç”66„W‡Vç6T–çFVçB’°¦–b‚–FVçF—G’æ†&FVæVB’°¦v—B6VæDÖW76vR†VçbÂ6†D–BÂ	ùI"vW,:vV²v–FW"V×&’œ:v–âFVÆVw&Ò|;ÇfVæÆ–²\YöÆ\Y÷F—&ÖW6’FÖÖÆæÖÌKLK"â†œ:v&—"¶œKB–KÆÖLKâr“°§&WGW&â§6öâ‡²ö³¢G'VRÂ6V7W&—G•ö&ö÷G7G&÷VæF–æs¢G'VRÒ“°§Ð¦6öç7B6fVBÒv—B6fUV–6´æ÷FR†VçbÂ²6†D–BÂÖW76vT–C¢×6ræÖW76vUö–BÂ&uFW‡C¢FW‡BÂ'6VEG—S¢V&Ç”66„W‡Vç6T–çFVçBçG—RÂ–ÖVçDÖWF†öC¢væ¶—BrÂæVVG5&Wf–Ws¢G'VRÂ7FGW3¢v&÷fÅ÷VæF–ærrÒ“°¦–b‚6fVBæö²’²v—B6VæDÖW76vR†VçbÂ6†D–BÂ~)ªûˆòv–FW"V×&’|;ÇfVæÆ’·W—'\IöÌKæÖLKâ†œ:v&—"¶œKB–KÆÖLKâr“²&WGW&â§6öâ‡²ö³¢fÇ6RÂW'&÷#¢6fVBæW'&÷"ÇÂwV–6µöæ÷FUöf–ÆVBrÒÂS2“²Ð¦6öç7B&÷fÂÒv—B7&VFT66„W‡Vç6T&÷fÄÆ—fR†VçbÂ²6†D–BÂÖW76vT–C¢×6ræÖW76vUö–BÂV–6´æ÷FT–C¢6fVBæ–BÂ–çFVçC¢V&Ç”66„W‡Vç6T–çFVçBÒ“°¦–b‚&÷fÂæö²’²v—B6VæDÖW76vR†VçbÂ6†D–BÂ~)ªûˆòöæ’¶'LKöÇ\Y÷GW'VÆÖLKâ†œ:v&—"&—¦–Ô†W6¶–LK–KÆÖLKâr“²&WGW&â§6öâ‡²ö³¢fÇ6RÂW'&÷#¢&÷fÂæW'&÷"ÇÂv&÷fÅ÷VWVUöf–ÆVBrÒÂS2“²Ð¦v—B6VæDÖW76vR†VçbÂ6†D–BÂ66„W‡Vç6T&÷fÅFW‡DÆ—fR†V&Ç”66„W‡Vç6T–çFVçB’Â66„W‡Vç6T&÷fÄ'WGFöç4Æ—fR†&÷fÂæ–B’Â²'6UöÖöFS¢t…DÔÂrÒ“°§&WGW&â§6öâ‡²ö³¢G'VRÂ–çFVçC¢v66…öW‡Vç6RrÂ&÷fÅö–C¢&÷fÂæ–BÂGWÆ–6FS¢&÷fÂæGWÆ–6FRÂÆ—fU÷w&—FUöVæ&ÆVC¢fÇ6RÒ“°§Ð ¦6öç7BVæ—fW'6Ä–çFVçBÒ'6UVæ—fW'6Ä6öÖÖæB‡FW‡B“°¦–b‡Væ—fW'6Ä–çFVçB’°¦6öç7BVæ—fW'6Å&W7VÇBÒv—B†æFÆUVæ—fW'6Ä6öÖÖæB†VçbÂ×6rÂ–FVçF—G’ÂVæ—fW'6Ä–çFVçB“°§&WGW&â§6öâ‡²ö³¢G'VRÂVæ—fW'6Åö6öÖÖæC¢Væ—fW'6Ä–çFVçBæ6öFRÂ7FGW3¢Væ—fW'6Å&W7VÇBç7FGW2ÂGWÆ–6FS¢&ööÆVâ‡Væ—fW'6Å&W7VÇBæGWÆ–6FR’Ò“°§Ð ¦–b‚–FVçF—G’æ†&FVæVBbbÆ÷vW"ç7F'G5v—F‚‚röGW'VÒr’bbÆ÷vW"ç7F'G5v—F‚‚r÷7Fö²r’bbÆ÷vW"ç7F'G5v—F‚‚r÷W'Vç&÷'Rr’bbÆ÷vW"ç7F'G5v—F‚‚rü;Ç,;Æç&÷'Rr’bbÆ÷vW"ç7F'G5v—F‚‚rö6&—&÷'Rr’bbÆ÷vW"ç7F'G5v—F‚‚r÷&÷&ÆæÆ&’r’bbÆ÷vW"ç7F'G5v—F‚‚rövVÆ—'F&Æ÷7Rr’bbÆ÷vW"ç7F'G5v—F‚‚rö&–Ææ6òr’bbÆ÷vW"ç7F'G5v—F‚‚rö&–Æì:vòr’bbÆ÷vW"æ–æ6ÇVFW2‚v&¶—–Rr’’°¦v—B6VæDÖW76vR†VçbÂ6†D–BÂ	ùI"|;ÇfVæÆ–²\YöÆ\Y÷F—&ÖW6’FÖÖÆìK–÷"âYæ–ÖF–Æ–²&÷"÷6÷&wVÆ"Âœ:r|;g&Wb¶œKFÆ,KfR—¦–âÆ—7FW6–æFV¶’6&—BW–wVÆÖ:vÖ¶ö×WFÆ,K·VÆÆìKÆ&–Æ—#²ÖÆ’Â–ÆWFœYö–ÒÂ6–ÆÖRfRW&œYö–ÒœYöÆVÖÆW&’¶ÌKLK"âr“°§&WGW&â§6öâ‡²ö³¢G'VRÂ6V7W&—G•ö&ö÷G7G&÷VæF–æs¢G'VRÒ“°§Ð ¦–b‡FW‡Bç7F'G5v—F‚‚r÷7F'Br’’°¦v—B6VæDÖW76vR†VçbÂ6†D–BÀÐ¢tW&”ôâFVÆVw&Ò6æÌKâK¶–æ6’&W––âÖöGR:|K²åÆåÆâr°Ð¢|9fFVÖR<;g¬;Ã¢%6VæÖVF–¶ÂFVÖ×W¢&–â;fFVÖR·&VF’¶'LK%Æâr°Ð¢t&¶—–R6÷&wW7S¢&&¶—–R%Æâr°Ð¢tGW'VÓ¢öGW'VÕÆâr°Ð¢u7Fö²6÷&wW7S¢÷7Fö²Ì;Ç,;ÆâLKåÆâr°Ð¢tfGW&öfœYòf÷FüI÷&lK¢|;fæFW"Â·W—'\IöÌK,KÒ„&—¦–Ô†W6Âvöæ–ÌK–¦Ö–¼KæF’åÆâr°Ð¢t†W&†æv’&—"æ÷C¢L;Ç¢–¢Â¶–FVFW&–ÒâpÐ¢“°Ð§&WGW&â§6öâ‡²ö³¢G'VRÒ“°Ð§ÐÐ Ð¦–b†Æ÷vW"ç7F'G5v—F‚‚röGW'VÒr’’°Ð¦v—B†æFÆTGW'VÔ–çFVçB†VçbÂ6†D–B“°Ð§&WGW&â§6öâ‡²ö³¢G'VRÒ“°Ð§ÐÐ Ð¦–b†Æ÷vW"ç7F'G5v—F‚‚r÷7Fö²r’’°¦v—B†æFÆU7Fö´–çFVçB†VçbÂ6†D–BÂFW‡Bç6Æ–6RƒR’çG&–Ò‚’“°§&WGW&â§6öâ‡²ö³¢G'VRÒ“°§Ð ¦–b†Æ÷vW"ç7F'G5v—F‚‚r÷W'Vç&÷'Rr’ÇÂÆ÷vW"ç7F'G5v—F‚‚rü;Ç,;Æç&÷'Rr’’°¦v—B†æFÆT6öæf–wW&VE&W÷'B†VçbÂ6†D–BÂw&öGV7BrÂFW‡Bç&WÆ6R‚õåÂòƒó§W'Vç&÷'WÌ;Ç,;Æç&÷'R•Ç2¢ö’Ârr’“°§&WGW&â§6öâ‡²ö³¢G'VRÂ&W÷'C¢w&öGV7BrÒ“°§Ð ¦–b†Æ÷vW"ç7F'G5v—F‚‚rö6&—&÷'Rr’’°¦v—B†æFÆT6öæf–wW&VE&W÷'B†VçbÂ6†D–BÂv7W7FöÖW"rÂFW‡Bç&WÆ6R‚õåÂö6&—&÷'UÇ2¢ö’Ârr’“°§&WGW&â§6öâ‡²ö³¢G'VRÂ&W÷'C¢v7W7FöÖW"rÒ“°§Ð ¦–b†Æ÷vW"ç7F'G5v—F‚‚r÷&÷&ÆæÆ&’r’’°¦v—B†æFÆU&W÷'Df–VÆG4–çFVçB†VçbÂ6†D–BÂ×6ræg&öÓòæ–BÂFW‡B“°§&WGW&â§6öâ‡²ö³¢G'VRÂ&W÷'E÷&öf–ÆS¢G'VRÒ“°§Ð ¦–b†Æ÷vW"ç7F'G5v—F‚‚rövVÆ—'F&Æ÷7Rr’ÇÂÆ÷vW"æ–æ6ÇVFW2‚vvVÆ—"F&Æ÷7Rr’’°¦v—B†æFÆTF–Ç•7FFVÖVçD–çFVçB†VçbÂ6†D–BÂv–æ6öÖU÷7FFVÖVçBr“°§&WGW&â§6öâ‡²ö³¢G'VRÂ&W÷'C¢v–æ6öÖU÷7FFVÖVçBrÒ“°§Ð ¦–b†Æ÷vW"ç7F'G5v—F‚‚rö&–Ææ6òr’ÇÂÆ÷vW"ç7F'G5v—F‚‚rö&–Æì:vòr’ÇÂÆ÷vW"ÓÓÒv&–Æì:vòrÇÂÆ÷vW"ÓÓÒv&–Ææ6òr’°¦v—B†æFÆTF–Ç•7FFVÖVçD–çFVçB†VçbÂ6†D–BÂv&Ææ6U÷6†VWBr“°§&WGW&â§6öâ‡²ö³¢G'VRÂ&W÷'C¢v&Ææ6U÷6†VWBrÒ“°§Ð Ð¦–b†Æ÷vW"ç7F'G5v—F‚‚r÷6Væ·&öâr’ÇÂÆ÷vW"ç7F'G5v—F‚‚rö÷GW'VÒr’’°Ð¦v—B6VæDÖW76vR†VçbÂ6†D–BÂt'R¶ö×WBY÷Râ&–Æv—6–,KìK¦&IöÌKF\Iö–Â‡–W&VÂF–æÆW––6’:vÌKYöÜK–÷"ÂVâ6öâ"I÷W7F÷5ÂwF·F–gF’’â&IöÆìKæ6†&W"fW&V6\Iö–Òâr“°Ð§&WGW&â§6öâ‡²ö³¢G'VRÒ“°Ð§ÐÐ Ð¦–b†Æ÷vW"æ–æ6ÇVFW2‚v&¶—–Rr’ÇÂÆ÷vW"æ–æ6ÇVFW2‚væR¶F"&Òf"r’ÇÂÆ÷vW"æ–æ6ÇVFW2‚væ¶—BGW'VÒr’’°Ð¦v—B†æFÆT&Ææ6T–çFVçB†VçbÂ6†D–B“°Ð§&WGW&â§6öâ‡²ö³¢G'VRÒ“°Ð§ÐÐ Ð¦–b†v—B¦FVä¶–—FÆ”Ö’†VçbÂ×6ræÖW76vUö–BÂ6†D–B’’°§&WGW&â§6öâ‡²ö³¢G'VRÂFVGWVC¢G'VRÒ“°§Ð ¦6öç7BG&ç6fW$–çFVçBÒ'6T66…G&ç6fW$–çFVçB‡FW‡B“°¦–b‡G&ç6fW$–çFVçB’°¦6öç7B6fVBÒv—B6fUV–6´æ÷FR†VçbÂ°¦6†D–BÀ¦ÖW76vT–C¢×6ræÖW76vUö–BÀ§&uFW‡C¢FW‡BÀ§'6VEG—S¢G&ç6fW$–çFVçBçG—RÀ§–ÖVçDÖWF†öC¢væ¶—BrÀ¦æVVG5&Wf–Ws¢G'VRÀ§7FGW3¢v&÷fÅ÷VæF–ærp§Ò“°¦–b‚6fVBæö²’°¦v—B6VæDÖW76vR†VçbÂ6†D–BÂ~)ªûˆòG&ç6fW"V×&’|;ÇfVæÆ’·W—'\IöÌKæÖLKâ†œ:v&—"¶œKB–KÆÖLKâr“°§&WGW&â§6öâ‡²ö³¢fÇ6RÂW'&÷#¢6fVBæW'&÷"ÇÂwV–6µöæ÷FUöf–ÆVBrÒÂS2“°§Ð ¢ò¢44…ôU…Tå4Uô”åDTåEôÔõdT@¦6öç7B66„W‡Vç6T–çFVçBÒ'6T66„W‡Vç6T–çFVçB‡FW‡B“°¦–b†66„W‡Vç6T–çFVçB’°¦6öç7B6fVBÒv—B6fUV–6´æ÷FR†VçbÂ²6†D–BÂÖW76vT–C¢×6ræÖW76vUö–BÂ&uFW‡C¢FW‡BÂ'6VEG—S¢66„W‡Vç6T–çFVçBçG—RÂ–ÖVçDÖWF†öC¢væ¶—BrÂæVVG5&Wf–Ws¢G'VRÂ7FGW3¢v&÷fÅ÷VæF–ærrÒ“°¦–b‚6fVBæö²’°¦v—B6VæDÖW76vR†VçbÂ6†D–BÂ~)ªûˆòv–FW"V×&’|;ÇfVæÆ’·W—'\IöÌKæÖLKâ†œ:v&—"¶œKB–KÆÖLKâr“°§&WGW&â§6öâ‡²ö³¢fÇ6RÂW'&÷#¢6fVBæW'&÷"ÇÂwV–6µöæ÷FUöf–ÆVBrÒÂS2“°§Ð¦6öç7B&÷fÂÒv—B7&VFT66„W‡Vç6T&÷fÂ†VçbÂ²6†D–BÂÖW76vT–C¢×6ræÖW76vUö–BÂV–6´æ÷FT–C¢6fVBæ–BÂ–çFVçC¢66„W‡Vç6T–çFVçBÒ“°¦–b‚&÷fÂæö²’°¦v—B6VæDÖW76vR†VçbÂ6†D–BÂ~)ªûˆòöæ’¶'LKöÇ\Y÷GW'VÆÖLKâ†œ:v&—"&—¦–Ô†W6¶–LK–KÆÖLKâr“°§&WGW&â§6öâ‡²ö³¢fÇ6RÂW'&÷#¢&÷fÂæW'&÷"ÇÂv&÷fÅ÷VWVUöf–ÆVBrÒÂS2“°§Ð¦v—B6VæDÖW76vR†VçbÂ6†D–BÂ66„W‡Vç6T&÷fÅFW‡B†66„W‡Vç6T–çFVçB’Â66„W‡Vç6T&÷fÄ'WGFöç2†&÷fÂæ–B’Â²'6UöÖöFS¢t…DÔÂrÒ“°§&WGW&â§6öâ‡²ö³¢G'VRÂ–çFVçC¢v66…öW‡Vç6RrÂ&÷fÅö–C¢&÷fÂæ–BÂGWÆ–6FS¢&÷fÂæGWÆ–6FRÂÆ—fU÷w&—FUöVæ&ÆVC¢fÇ6RÒ“°§Ð¤44…ôU…Tå4Uô”åDTåEôÔõdTEôTäB¢ð¦6öç7B&÷fÂÒv—B7&VFUG&ç6fW$&÷fÂ†VçbÂ°¦6†D–BÀ¦ÖW76vT–C¢×6ræÖW76vUö–BÀ§V–6´æ÷FT–C¢6fVBæ–BÀ¦–çFVçC¢G&ç6fW$–çFVç@§Ò“°¦–b‚&÷fÂæö²’°¦v—B6VæDÖW76vR†VçbÂ6†D–BÂ~)ªûˆòöæ’¶'LKöÇ\Y÷GW'VÆÖLKâ†œ:v&—"&—¦–Ô†W6¶–LK–KÆÖLKâr“°§&WGW&â§6öâ‡²ö³¢fÇ6RÂW'&÷#¢&÷fÂæW'&÷"ÇÂv&÷fÅ÷VWVUöf–ÆVBrÒÂS2“°§Ð¦v—B6VæDÖW76vR†VçbÂ6†D–BÂG&ç6fW$&÷fÅFW‡B‡G&ç6fW$–çFVçB’ÂG&ç6fW$&÷fÄ'WGFöç2†&÷fÂæ–B’“°§&WGW&â§6öâ‡°¦ö³¢G'VRÀ¦–çFVçC¢v66…÷G&ç6fW%÷FW7BrÀ¦&÷fÅö–C¢&÷fÂæ–BÀ¦GWÆ–6FS¢&÷fÂæGWÆ–6FRÀ¦Æ—fU÷w&—FUöVæ&ÆVC¢fÇ6P§Ò“°§Ð ¦6öç7B66„W‡Vç6T–çFVçBÒ'6T66„W‡Vç6T–çFVçB‡FW‡B“°¦–b†66„W‡Vç6T–çFVçB’°¦6öç7B6fVBÒv—B6fUV–6´æ÷FR†VçbÂ²6†D–BÂÖW76vT–C¢×6ræÖW76vUö–BÂ&uFW‡C¢FW‡BÂ'6VEG—S¢66„W‡Vç6T–çFVçBçG—RÂ–ÖVçDÖWF†öC¢væ¶—BrÂæVVG5&Wf–Ws¢G'VRÂ7FGW3¢v&÷fÅ÷VæF–ærrÒ“°¦–b‚6fVBæö²’²v—B6VæDÖW76vR†VçbÂ6†D–BÂ~)ªûˆòv–FW"V×&’|;ÇfVæÆ’·W—'\IöÌKæÖLKâ†œ:v&—"¶œKB–KÆÖLKâr“²&WGW&â§6öâ‡²ö³¢fÇ6RÂW'&÷#¢6fVBæW'&÷"ÇÂwV–6µöæ÷FUöf–ÆVBrÒÂS2“²Ð¦6öç7B&÷fÂÒv—B7&VFT66„W‡Vç6T&÷fÄÆ—fR†VçbÂ²6†D–BÂÖW76vT–C¢×6ræÖW76vUö–BÂV–6´æ÷FT–C¢6fVBæ–BÂ–çFVçC¢66„W‡Vç6T–çFVçBÒ“°¦–b‚&÷fÂæö²’²v—B6VæDÖW76vR†VçbÂ6†D–BÂ~)ªûˆòöæ’¶'LKöÇ\Y÷GW'VÆÖLKâ†œ:v&—"&—¦–Ô†W6¶–LK–KÆÖLKâr“²&WGW&â§6öâ‡²ö³¢fÇ6RÂW'&÷#¢&÷fÂæW'&÷"ÇÂv&÷fÅ÷VWVUöf–ÆVBrÒÂS2“²Ð¦v—B6VæDÖW76vR†VçbÂ6†D–BÂ66„W‡Vç6T&÷fÅFW‡DÆ—fR†66„W‡Vç6T–çFVçB’Â66„W‡Vç6T&÷fÄ'WGFöç4Æ—fR†&÷fÂæ–B’Â²'6UöÖöFS¢t…DÔÂrÒ“°§&WGW&â§6öâ‡²ö³¢G'VRÂ–çFVçC¢v66…öW‡Vç6RrÂ&÷fÅö–C¢&÷fÂæ–BÂGWÆ–6FS¢&÷fÂæGWÆ–6FRÂÆ—fU÷w&—FUöVæ&ÆVC¢fÇ6RÒ“°§Ð ¦6öç7B–ÖVçDÖWF†öBÒ'6U–ÖVçDÖWF†öB†Æ÷vW"“°¦6öç7BGVTFFRÒ'6TGVTFFR‡FW‡B“°Ð¦6öç7BÖ÷VçBÒ'6TÖ÷VçB‡FW‡BÂGVTFFRæÖF6†VB“°Ð¦6öç7BöFVÖU6÷§TF–’Òü;fFVÖWÆöFVÖWÌ;fFUÆ"òçFW7B†Æ÷vW"’ÇÂÖ÷VçBæÖ÷VçBÓÒçVÆÃ°Ð Ð¦–b†öFVÖU6÷§TF–’bbÖ÷VçBæÖ÷VçBÓÒçVÆÂ’°Ð¦6öç7B6÷VçFW''G”F–’ÒwVW746÷VçFW''G’‡FW‡BÂGVTFFRæÖF6†VBÂÖ÷VçBæÖF6†VB“°Ð¦6öç7B×W7FW&’Òv—BÖF6„7W7FöÖW"†VçbÂ6÷VçFW''G”F–’“°Ð Ð¦6öç7Bæ÷FU6fVBÒv—B6fUV–6´æ÷FR†VçbÂ°Ð¦6†D–BÂÖW76vT–C¢×6ræÖW76vUö–BÂ&uFW‡C¢FW‡BÀÐ§'6VEG—S¢vöFVÖU÷6÷§RrÂ–ÖVçDÖWF†öBÂæVVG5&Wf–Ws¢×W7FW&’ÇÂGVTFFRæ—6òÇÂGVTFFRævV6Ö—4ÖÐ§Ò“°Ð¦6öç7B&öÖ—6U6fVBÒæ÷FU6fVBæö°Ð£òv—B6fU–ÖVçE&öÖ—6R†VçbÂ°Ð¦6†D–BÂV–6´æ÷FT–C¢æ÷FU6fVBæ–BÂ&uFW‡C¢FW‡BÀÐ¦6÷VçFW''G“¢×W7FW&’ò×W7FW&’æ6&•÷Vçfâ¢6÷VçFW''G”F–’ÀÐ¦ÖF6†VD7W7FöÖW$–C¢×W7FW&’ò×W7FW&’æ–B¢çVÆÂÀÐ¦Ö÷VçC¢Ö÷VçBæÖ÷VçBÂGVTFFS¢GVTFFRæ—6òÂ–ÖVçDÖWF†ö@Ð§ÒÐ£¢²ö³¢fÇ6RÓ°Ð Ð¦6öç7B6F—&Æ"Ò°Ð¢	ù8Â9fFVÖR<;g¬;ÂöÆ&²æÆLKÓ¢rÀÐ¢~(
"¶,YüKF&c¢r²†×W7FW&’ò×W7FW&’æ6&•÷Vçfâ²r†6&’\YöÆ\Y÷F’’r¢†6÷VçFW''G”F–’ÇÂv&VÆ—'F–ÆÖVF’r’²r†6&’\YöÆ\YöÖVF’Â¶öçG&öÂWB’r’ÀÐ¢~(
"GWF#¢r²ÖöæW’†Ö÷VçBæÖ÷VçB’ÀÐ¢~(
"F&–ƒ¢r²†GVTFFRæ—6òòG%F&–‚†GVTFFRæ—6ò’¢t$TÌK%LKÄÔTLK(	BæR¦Öãòr’ÀÐ¢~(
"9fFVÖRœ;fçFVÖ“¢r²–ÖVçDÖWF†ö@Ð¥Ó°Ð¦–b‡&öÖ—6U6fVBæö²’°Ð§6F—&Æ"çW6‚‚~)ÈRW&”ôâ·&—F–²;fFVÖRÆ—7FW6–æRV¶ÆVæF’†–C¢r²&öÖ—6U6fVBæ–B²r’âr“°Ð§ÒVÇ6R°Ð§6F—&Æ"çW6‚‚~)ªûˆò¶œKB&Yö,K<K¢öÆGRÂFV·&"FVæW"Ö—6–ãòr“°Ð§ÐÐ¦–b‚×W7FW&’’6F—&Æ"çW6‚‚~)Ùr'R—6Ö’6&’Æ—7FW6–æFR'VÆÖLKÒÂ–æÌKY÷6FüI÷'RVçfìK–¢âr“°Ð¦–b‚GVTFFRæ—6ò’6F—&Æ"çW6‚‚~)ÙrF&–‚æÆ–ÖLKÒÂ#FVÖ×W¢"v–&’–¦"ÜK<Kãòr“°Ð¦–b†GVTFFRævV6Ö—4Ö’’6F—&Æ"çW6‚‚~)Ùr'RF&–‚v\:vÖœY÷FR¶ÆÜKYò(	BvV6–¶ÖœYò&—";fFVÖRÖ’Â–ö·6vVÆV6V²œKÂÜKFVÖV²—7FVF–ãòVÖ–âF\Iö–Ç6Vâ&vVÆV6V²œKÂ"–¢âr“°Ð¦v—B6VæDÖW76vR†VçbÂ6†D–BÂ6F—&Æ"æ¦ö–â‚uÆâr’“°Ð§&WGW&â§6öâ‡²ö³¢G'VRÒ“°Ð§ÐÐ Ð¦6öç7B'6VEG—RÒ6Æ76–g”æ÷FR†Æ÷vW"“°Ð¦6öç7B6fVBÒv—B6fUV–6´æ÷FR†VçbÂ°Ð¦6†D–BÂÖW76vT–C¢×6ræÖW76vUö–BÂ&uFW‡C¢FW‡BÀÐ§'6VEG—RÂ–ÖVçDÖWF†öBÂæVVG5&Wf–Ws¢'6VEG—RÓÓÒvvVæVÅöæ÷BpÐ§Ò“°Ð Ð¦v—B6VæDÖW76vR†VçbÂ6†D–BÀÐ¢tÆLKÒåÆâr°Ð¢uF—¢r²'6VEG—R²uÆâr°Ð¢tæ÷C¢r²FW‡B²uÆâr°Ð¢‡6fVBæö°Ð£ò~)ÈRW&”ôâ¶–LK:|KÆLK†–C¢r²6fVBæ–B²r’âpÐ£¢~)ªûˆòæ÷BÌKæLKÖ¶ÌK<K¶œKB&Yö,K<K¢öÆGR‚r²‡6fVBæW'&÷"ÇÂv&–Æ–æÖW–Vâ†Fr’²r’âFV·&"FVæRfW–&æ<;g–ÆRârÐ¢“°Ð§&WGW&â§6öâ‡²ö³¢G'VRÒ“°Ð§Ò6F6‚†R’°Ð§&WGW&â§6öâ‡²ö³¢fÇ6RÂW'&÷#¢RæÖW76vRÇÂw6W'fW%öW'&÷"rÒÂS“°Ð§ÐÐ§ÐÐ