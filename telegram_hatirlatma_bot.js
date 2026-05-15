import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const WATCH = args.includes('--watch');
const REMIND_ONLY = args.includes('--remind-only');
const ONCE = args.includes('--once') || (!WATCH && !REMIND_ONLY);
const POLL_MS = Number(process.env.TELEGRAM_POLL_MS || 15000);
const FIRMA_ID = process.env.APERION_FIRMA_ID || 'alayli';
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW';

if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN yok.');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const tr = s => String(s || '')
  .toLocaleLowerCase('tr-TR')
  .replaceAll('ı', 'i')
  .replaceAll('ğ', 'g')
  .replaceAll('ü', 'u')
  .replaceAll('ş', 's')
  .replaceAll('ö', 'o')
  .replaceAll('ç', 'c');

function pad(n) { return String(n).padStart(2, '0'); }
function isoDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function categoryOf(text) {
  const t = tr(text);
  if (/(tahsil|tahsilat|alacak|alinacak|müşteriden|musteriden)/.test(t)) return 'tahsil_edilecek';
  if (/(ode|odeme|odenecek|fatura|kira|sgk|vergi|maas|kredi|kart|cek)/.test(t)) return 'odenecek';
  return 'yapilacak';
}

function parseDate(text) {
  const t = tr(text);
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let d = null;

  const iso = t.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const dm = t.match(/\b(\d{1,2})[./-](\d{1,2})(?:[./-](20\d{2}))?\b/);
  if (!d && dm) d = new Date(Number(dm[3] || now.getFullYear()), Number(dm[2]) - 1, Number(dm[1]));

  if (!d && /\bbugun\b/.test(t)) d = base;
  if (!d && /\byarin\b/.test(t)) { d = new Date(base); d.setDate(d.getDate() + 1); }

  const days = ['pazar', 'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi'];
  if (!d) {
    const idx = days.findIndex(x => new RegExp(`\\b${x}\\b`).test(t));
    if (idx >= 0) {
      d = new Date(base);
      const add = (idx - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + add);
    }
  }

  const time = t.match(/\b(?:saat\s*)?(\d{1,2})[:.](\d{2})\b/);
  const hour = time ? Math.min(23, Number(time[1])) : 9;
  const minute = time ? Math.min(59, Number(time[2])) : 0;
  if (!d) return null;
  d.setHours(hour, minute, 0, 0);
  return d;
}

function cleanTitle(text) {
  return String(text || '')
    .replace(/\b(?:bugün|bugun|yarın|yarin|pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cuma|cumartesi|pazar)\b/ig, '')
    .replace(/\b(?:saat\s*)?\d{1,2}[:.]\d{2}\b/g, '')
    .replace(/\b20\d{2}[-/]\d{1,2}[-/]\d{1,2}\b/g, '')
    .replace(/\b\d{1,2}[./-]\d{1,2}(?:[./-]20\d{2})?\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
}

function parseReminder(text) {
  const when = parseDate(text);
  if (!when) return null;
  return {
    firma_id: FIRMA_ID,
    kategori: categoryOf(text),
    baslik: cleanTitle(text) || String(text).slice(0, 120),
    aciklama: text,
    hatirlatma_zamani: when.toISOString(),
    raw_text: text,
  };
}

function moneyOf(text) {
  const m = String(text || '').match(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)\s*(?:tl|try|₺)?/i);
  if (!m) return null;
  return Number(m[1].replace(/\s/g, '').replace(/\./g, '').replace(',', '.')) || null;
}

function inboxCategory(text, msg) {
  const t = tr(text);
  if (msg.document || msg.photo) {
    if (/ekstre|hesap hareket|banka/.test(t)) return 'ekstre';
    if (/tahakkuk|borc bildirimi/.test(t)) return 'tahakkuk';
    return 'dekont';
  }
  if (/tahakkuk|borc bildirimi/.test(t)) return 'tahakkuk';
  if (/dekont|odeme yaptim|odedim|makbuz/.test(t)) return 'dekont';
  if (/ekstre|hesap hareket|banka ekstresi/.test(t)) return 'ekstre';
  if (/tahsil|tahsilat|para geldi|odeme alindi/.test(t)) return 'tahsilat';
  if (/soz verdi|odeme sozu|odeyecek|tahsil edilecek/.test(t)) return 'odeme_sozu';
  if (/vade|vadeli|son odeme/.test(t)) return 'vade';
  if (/ode|odenecek|fatura|sgk|vergi|kira|maas|kredi/.test(t)) return 'odeme';
  return 'not';
}

function fileInfo(msg) {
  if (msg.document) {
    return {
      dosya_tipi: 'document',
      file_id: msg.document.file_id,
      file_unique_id: msg.document.file_unique_id,
      file_name: msg.document.file_name,
      mime_type: msg.document.mime_type,
    };
  }
  if (msg.photo?.length) {
    const p = msg.photo[msg.photo.length - 1];
    return { dosya_tipi: 'photo', file_id: p.file_id, file_unique_id: p.file_unique_id };
  }
  if (msg.voice) return { dosya_tipi: 'voice', file_id: msg.voice.file_id, file_unique_id: msg.voice.file_unique_id, mime_type: msg.voice.mime_type };
  return {};
}

async function saveFinancialInbox(msg) {
  const text = msg.text || msg.caption || '';
  const category = inboxCategory(text, msg);
  const when = parseDate(text);
  const amount = moneyOf(text);
  const title = cleanTitle(text) || (msg.document?.file_name || 'Telegram finans kaydi');
  const row = {
    firma_id: FIRMA_ID,
    kanal: 'telegram',
    chat_id: String(msg.chat.id),
    message_id: msg.message_id,
    kategori: category,
    baslik: title.slice(0, 240),
    aciklama: text || title,
    tutar: amount,
    tarih: category === 'dekont' || category === 'ekstre' || category === 'tahsilat' ? when?.toISOString() || null : null,
    vade_tarihi: category === 'vade' || category === 'odeme' || category === 'odeme_sozu' || category === 'tahakkuk' ? when?.toISOString() || null : null,
    onay_durumu: 'bekliyor',
    bizimhesap_durumu: 'beklemede',
    hash: `telegram:${msg.chat.id}:${msg.message_id}`,
    raw_text: text,
    raw: msg,
    ...fileInfo(msg),
  };
  const { data, error } = await db.from('financial_inbox').upsert(row, { onConflict: 'hash' }).select('*').single();
  if (error) throw new Error(`financial_inbox: ${error.message}`);
  return data;
}

async function tg(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method}: ${json.description || res.status}`);
  return json.result;
}

async function send(chatId, text) {
  return tg('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true });
}

async function saveReminder(msg) {
  const text = msg.text || msg.caption || '';
  if (!text || text.startsWith('/start')) {
    await send(msg.chat.id, 'AperiON hazir. Ornek: "yarin 14:30 SGK odenecek" veya "25.05.2026 10:00 Murat Ticaret tahsil edilecek".');
    return;
  }
  const inbox = await saveFinancialInbox(msg);
  const parsed = parseReminder(text);
  if (!parsed) {
    await send(msg.chat.id, [
      'AperiON finans gelen kutusuna aldi',
      `ID: ${inbox.id}`,
      `Tur: ${inbox.kategori}`,
      'Tarih/saat yoksa sadece bekleyen kayit olur; istersen vade saatiyle tekrar yaz.',
    ].join('\n'));
    return;
  }
  const row = {
    ...parsed,
    chat_id: String(msg.chat.id),
    message_id: msg.message_id,
    raw: msg,
  };
  const { data, error } = await db.from('telegram_reminders').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  await send(msg.chat.id, [
    'AperiON not aldi',
    `Finans ID: ${inbox.id}`,
    `ID: ${data.id}`,
    `Grup: ${data.kategori}`,
    `Zaman: ${new Date(data.hatirlatma_zamani).toLocaleString('tr-TR')}`,
    `Not: ${data.baslik}`,
  ].join('\n'));
}

async function pollUpdates() {
  const stateKey = 'telegram_reminder_offset';
  const { data: state } = await db.from('bot_state').select('value').eq('key', stateKey).maybeSingle();
  const offset = Number(state?.value || 0);
  const updates = await tg('getUpdates', { offset, timeout: 1, allowed_updates: ['message'] });
  let maxId = offset;
  for (const u of updates) {
    maxId = Math.max(maxId, u.update_id + 1);
    if (u.message) {
      try { await saveReminder(u.message); }
      catch (e) { await send(u.message.chat.id, `Kayit hatasi: ${e.message}`); }
    }
  }
  if (maxId !== offset) {
    await db.from('bot_state').upsert({ key: stateKey, value: String(maxId), updated_at: new Date().toISOString() });
  }
}

async function remindDue() {
  const now = new Date().toISOString();
  const { data, error } = await db.from('telegram_reminders')
    .select('*')
    .eq('durum', 'bekliyor')
    .lte('hatirlatma_zamani', now)
    .order('hatirlatma_zamani', { ascending: true })
    .limit(20);
  if (error) throw new Error(error.message);
  for (const r of data || []) {
    await send(r.chat_id, [
      `AperiON hatirlatti: ${r.kategori}`,
      `ID: ${r.id}`,
      `Zaman: ${new Date(r.hatirlatma_zamani).toLocaleString('tr-TR')}`,
      `Not: ${r.baslik}`,
    ].join('\n'));
    await db.from('telegram_reminders').update({
      durum: 'hatirlatildi',
      bildirim_tarihi: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', r.id);
  }
}

async function main() {
  do {
    if (!REMIND_ONLY) await pollUpdates();
    await remindDue();
    if (ONCE || REMIND_ONLY) break;
    await new Promise(r => setTimeout(r, POLL_MS));
  } while (WATCH);
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
