/* AperiON Personal Finance Assistant v54
   Purpose: convert Telegram text/document messages into controlled personal finance drafts.
   Safe rule: creates records with verification_status=kontrol_bekliyor.
*/

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COMPANY = process.env.COMPANY || 'ALAYLI';
const OWNER = process.env.OWNER || 'ercan';

function requireEnv(){
  const missing = [];
  if(!SUPABASE_URL) missing.push('SUPABASE_URL');
  if(!SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if(missing.length) throw new Error('Missing env: ' + missing.join(', '));
}

function normalizeText(text){
  return String(text || '')
    .replace(/[\u0130I\u0131]/g, 'i')
    .replace(/[\u015e\u015f]/g, 's')
    .replace(/[\u011e\u011f]/g, 'g')
    .replace(/[\u00dc\u00fc]/g, 'u')
    .replace(/[\u00d6\u00f6]/g, 'o')
    .replace(/[\u00c7\u00e7]/g, 'c')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAmount(text){
  const withoutDates = normalizeText(text)
    .replace(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g, ' ')
    .replace(/\b20\d{2}-\d{1,2}-\d{1,2}\b/g, ' ');
  const moneyMatch = withoutDates.match(/(-?\d{1,3}(?:[. ]\d{3})*(?:,\d{1,2})?|-?\d+(?:,\d{1,2})?)\s*(?:tl|try)\b/i);
  const fallback = withoutDates.match(/\b(-?\d{2,}(?:[. ]\d{3})*(?:,\d{1,2})?)\b/);
  const raw = moneyMatch?.[1] || fallback?.[1];
  if(!raw) return null;
  const amount = Number(raw.replace(/[. ]/g, '').replace(',', '.'));
  return Number.isFinite(amount) ? amount : null;
}

function pad(n){
  return String(n).padStart(2, '0');
}

function toISODate(date){
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDate(text, baseDate = new Date()){
  const t = normalizeText(text).toLowerCase();
  const dmy = t.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if(dmy){
    const y = Number(dmy[3].length === 2 ? '20' + dmy[3] : dmy[3]);
    return `${y}-${pad(dmy[2])}-${pad(dmy[1])}`;
  }
  const iso = t.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if(iso) return `${iso[1]}-${pad(iso[2])}-${pad(iso[3])}`;
  if(t.includes('bugun')) return toISODate(baseDate);
  if(t.includes('yarin')){
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  }
  return null;
}

function detectScope(text){
  const t = normalizeText(text).toLowerCase();
  if(/arac|mtv|kasko|trafik|hgs|ogs|yakit|muayene/.test(t)) return 'arac';
  if(/isyeri|dukkan|ofis|sgk|personel/.test(t)) return 'isyeri';
  if(/ev|dask|konut|site aidat|apartman/.test(t)) return 'ev';
  if(/sirket|firma|alayli/.test(t)) return 'sirket';
  if(/aile|cocuk|okul|servis/.test(t)) return 'aile';
  return 'ozel';
}

function detectGroup(text){
  const t = normalizeText(text).toLowerCase();
  if(/kredi kart|kart ekstresi|asgari/.test(t)) return 'Kredi Kartlari';
  if(/kredi|taksit|kmh|ek hesap/.test(t)) return 'Krediler';
  if(/elektrik|su|dogalgaz|internet|telefon|fatura/.test(t)) return 'Faturalar';
  if(/arac|mtv|kasko|trafik|hgs|ogs|yakit|lastik|muayene/.test(t)) return 'Arac Giderleri';
  if(/aidat/.test(t)) return 'Aidatlar';
  if(/sigorta|dask/.test(t)) return 'Sigortalar';
  if(/vergi|ceza|resmi/.test(t)) return 'Vergi / Resmi Odemeler';
  if(/chatgpt|icloud|google drive|microsoft|netflix|spotify|youtube|canva|domain|hosting/.test(t)) return 'Abonelikler';
  if(/doktor|ilac|dis|saglik|hastane/.test(t)) return 'Saglik';
  if(/okul|egitim|kurs|ders/.test(t)) return 'Egitim';
  if(/borc|alacak|elden/.test(t)) return 'Borc / Alacak';
  if(/market|kasap|manav|restoran|yemek/.test(t)) return 'Market / Yasam';
  return 'Diger / Kontrol Bekleyen';
}

function detectKind(text){
  const t = normalizeText(text).toLowerCase();
  if(/tahsil|alacak|tahsilat|gelecek para/.test(t)) return 'receivable';
  if(/yapilacak|ara|kontrol|hatirlat|not/.test(t)) return 'task';
  return 'payable';
}

function detectPriority(text, dueDate, baseDate = new Date()){
  const t = normalizeText(text).toLowerCase();
  if(/kritik|acil|son gun|gecikti|vade gecti/.test(t)) return 'critical';
  if(!dueDate) return 'normal';
  const days = Math.ceil((new Date(dueDate + 'T00:00:00') - new Date(toISODate(baseDate) + 'T00:00:00')) / 86400000);
  if(days <= 0) return 'critical';
  if(days <= 3) return 'high';
  return 'normal';
}

function titleFromText(text){
  const t = normalizeText(text);
  return t.length > 120 ? t.slice(0, 117) + '...' : t;
}

function buildFinanceDraft(text, opts = {}){
  const baseDate = opts.baseDate || new Date();
  const amount = parseAmount(text);
  const dueDate = parseDate(text, baseDate);
  const kind = detectKind(text);
  const scope = detectScope(text);
  const group = detectGroup(text);
  const priority = detectPriority(text, dueDate, baseDate);
  return {
    kind,
    owner: opts.owner || OWNER,
    company: opts.company || COMPANY,
    firma_id: opts.firma_id || 'alayli',
    scope,
    expense_group: group,
    expense_type: kind === 'receivable' ? 'tahsilat' : kind === 'task' ? 'gorev' : 'odeme',
    title: titleFromText(text),
    next_due_date: dueDate,
    expected_amount: amount,
    currency: 'TRY',
    priority,
    source_type: 'telegram',
    source_ref: opts.source_ref || null,
    note: text,
    verification_status: 'kontrol_bekliyor'
  };
}

function buildDocumentDraft(message, opts = {}){
  const doc = message?.document || {};
  const photo = Array.isArray(message?.photo) ? message.photo[message.photo.length - 1] : null;
  return {
    owner: opts.owner || OWNER,
    company: opts.company || COMPANY,
    scope: opts.scope || null,
    document_type: doc.mime_type?.includes('pdf') ? 'pdf' : photo ? 'photo' : 'belge',
    file_name: doc.file_name || null,
    mime_type: doc.mime_type || null,
    telegram_file_id: doc.file_id || photo?.file_id || null,
    telegram_message_id: message?.message_id ? String(message.message_id) : null,
    note: message?.caption || message?.text || null,
    source_type: 'telegram'
  };
}

async function supabaseRpc(fnName, payload = {}){
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
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
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if(!res.ok) throw new Error('Supabase RPC failed: ' + fnName + ' ' + text);
  return json;
}

async function registerFinanceDraft(draft){
  requireEnv();
  if(draft.kind === 'task' || draft.kind === 'payable' || draft.kind === 'receivable'){
    return supabaseRpc('personal_finance_create_obligation', {
      p_owner: draft.owner,
      p_company: draft.company,
      p_firma_id: draft.firma_id,
      p_scope: draft.scope,
      p_expense_group: draft.expense_group,
      p_expense_type: draft.expense_type,
      p_title: draft.title,
      p_period: 'once',
      p_next_due_date: draft.next_due_date,
      p_expected_amount: draft.expected_amount,
      p_currency: draft.currency,
      p_priority: draft.priority,
      p_source_type: draft.source_type,
      p_source_ref: draft.source_ref,
      p_note: draft.note
    });
  }
  throw new Error('Unsupported draft kind: ' + draft.kind);
}

async function registerDocumentDraft(draft){
  requireEnv();
  return supabaseRpc('personal_finance_register_document', {
    p_owner: draft.owner,
    p_company: draft.company,
    p_scope: draft.scope,
    p_document_type: draft.document_type,
    p_file_name: draft.file_name,
    p_mime_type: draft.mime_type,
    p_source_type: draft.source_type,
    p_telegram_file_id: draft.telegram_file_id,
    p_telegram_message_id: draft.telegram_message_id,
    p_note: draft.note
  });
}

async function telegramSend(chatId, text){
  if(!TELEGRAM_BOT_TOKEN) throw new Error('Missing env: TELEGRAM_BOT_TOKEN');
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  });
  if(!res.ok) throw new Error('Telegram send failed: ' + await res.text());
  return res.json();
}

function formatDraftPreview(draft){
  return `<b>AperiON kayit taslagi</b>\n` +
    `Tip: <b>${draft.kind}</b>\n` +
    `Kapsam: <b>${draft.scope}</b>\n` +
    `Grup: <b>${draft.expense_group}</b>\n` +
    `Tarih: <b>${draft.next_due_date || 'eksik'}</b>\n` +
    `Tutar: <b>${draft.expected_amount ?? 'eksik'}</b>\n` +
    `Durum: <b>kontrol_bekliyor</b>`;
}

module.exports = {
  normalizeText,
  parseAmount,
  parseDate,
  detectScope,
  detectGroup,
  detectKind,
  detectPriority,
  buildFinanceDraft,
  buildDocumentDraft,
  formatDraftPreview,
  registerFinanceDraft,
  registerDocumentDraft,
  telegramSend
};
