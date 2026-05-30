require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

if (!TELEGRAM_BOT_TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function telegram(method, payload) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method} failed: ${JSON.stringify(json)}`);
  return json.result;
}

function getMessageText(message) {
  if (message.text) return message.text;
  if (message.caption) return message.caption;
  if (message.document) return `[document] ${message.document.file_name || ''}`.trim();
  if (message.photo) return '[photo]';
  if (message.voice) return '[voice]';
  return '[unknown]';
}

function normalizeText(text) {
  return String(text || '').toLocaleLowerCase('tr-TR').trim();
}

function detectOverrideIntent(text) {
  const t = normalizeText(text);
  if (t === '/onaylar' || t.includes('onaylar') || t.includes('bekleyen onay')) return 'finance_approvals';
  if (t === '/ekstreler' || t.includes('ekstreler') || t.includes('banka ekstresi')) return 'finance_statements';
  if (t === '/moka' || t.includes('moka')) return 'finance_moka';
  if (t === '/belgeler' || t.includes('belgeler') || t.includes('belge merkezi')) return 'document_inbox';
  return null;
}

async function saveCommand(message) {
  const text = getMessageText(message);
  const from = message.from || {};
  const chat = message.chat || {};
  const type = message.text ? 'text' : message.document ? 'document' : message.photo ? 'photo' : message.voice ? 'voice' : 'unknown';

  const { data, error } = await db.rpc('create_telegram_command_v58', {
    p_chat_id: String(chat.id || ''),
    p_user_id: String(from.id || ''),
    p_username: from.username || from.first_name || 'telegram_user',
    p_message_id: String(message.message_id || ''),
    p_raw_text: text,
    p_message_type: type,
  });
  if (error) throw error;
  return { id: data, text };
}

async function answerFromLife(intent) {
  if (intent === 'query_today') {
    const { data, error } = await db.rpc('build_assistant_focus_answer_v58', { p_owner: 'ercan' });
    if (error) throw error;
    return data;
  }
  if (intent === 'query_week') {
    const { data, error } = await db.rpc('build_assistant_week_answer_v58', { p_owner: 'ercan' });
    if (error) throw error;
    return data;
  }
  if (intent === 'query_late') {
    const { data, error } = await db.from('aperion_life_late_v58_view').select('*').limit(10);
    if (error) throw error;
    if (!data.length) return 'Geciken açık kayıt görünmüyor.';
    return 'Geciken kayıtlar:\n' + data.map((r, i) => `${i + 1}. ${r.title}${r.due_date ? ' — ' + r.due_date : ''}`).join('\n');
  }
  if (intent === 'query_payments') {
    const { data, error } = await db.from('aperion_life_week_v58_view').select('*').eq('record_type', 'payment').limit(10);
    if (error) throw error;
    if (!data.length) return 'Bu hafta açık ödeme kaydı görünmüyor.';
    const total = data.reduce((s, r) => s + Number(r.amount || 0), 0);
    return 'Bu hafta ödemeler:\n' + data.map((r, i) => `${i + 1}. ${r.title}${r.amount ? ' — ' + r.amount + ' ' + (r.currency || 'TRY') : ''}${r.due_date ? ' — ' + r.due_date : ''}`).join('\n') + `\n\nToplam: ${total} TL`;
  }
  return null;
}

function financeLine(r, i) {
  const title = r.title || r.file_name || 'Belge';
  const type = r.queue_type || 'document';
  const priority = r.priority || 'normal';
  const action = r.suggested_action || 'review';
  return `${i + 1}. ${title}\n   Tür: ${type} · Öncelik: ${priority} · Öneri: ${action}`;
}

async function answerFromFinance(intent) {
  if (intent === 'finance_approvals') {
    const { data, error } = await db.from('aperion_finance_approval_queue_v58_view').select('*').limit(10);
    if (error) throw error;
    if (!data.length) return 'Bekleyen finans onayı görünmüyor.';
    const high = data.filter(r => ['high', 'critical'].includes(r.priority)).length;
    return `Bekleyen finans onayları: ${data.length}\nYüksek öncelik: ${high}\n\n` + data.map(financeLine).join('\n');
  }

  if (intent === 'finance_statements') {
    const { data, error } = await db
      .from('aperion_finance_approval_queue_v58_view')
      .select('*')
      .in('queue_type', ['bank_statement', 'card_statement'])
      .limit(10);
    if (error) throw error;
    if (!data.length) return 'Bekleyen banka/kart ekstresi görünmüyor.';
    return `Bekleyen ekstreler: ${data.length}\n\n` + data.map(financeLine).join('\n');
  }

  if (intent === 'finance_moka') {
    const { data, error } = await db
      .from('aperion_finance_approval_queue_v58_view')
      .select('*')
      .eq('queue_type', 'moka')
      .limit(10);
    if (error) throw error;
    if (!data.length) return 'Bekleyen Moka belgesi görünmüyor.';
    return `Bekleyen Moka belgeleri: ${data.length}\n\n` + data.map(financeLine).join('\n');
  }

  if (intent === 'document_inbox') {
    const { data, error } = await db.from('aperion_document_inbox_v58_view').select('*').limit(10);
    if (error) throw error;
    if (!data.length) return 'Belge Merkezi gelen kutusunda açık belge görünmüyor.';
    return `Belge Merkezi gelen kutusu: ${data.length}\n\n` + data.map((r, i) => `${i + 1}. ${r.file_name}\n   Modül: ${r.module} · Durum: ${r.status}`).join('\n');
  }

  return null;
}

async function getCommand(commandId) {
  const { data, error } = await db
    .from('aperion_telegram_command_inbox_v58')
    .select('*')
    .eq('id', commandId)
    .single();
  if (error) throw error;
  return data;
}

async function processMessage(message) {
  const chatId = message.chat.id;
  try {
    const saved = await saveCommand(message);
    const cmd = await getCommand(saved.id);
    const overrideIntent = detectOverrideIntent(saved.text);
    let reply = await answerFromFinance(overrideIntent);
    if (!reply) reply = await answerFromLife(cmd.intent);

    if (!reply) {
      if (cmd.intent === 'create_record') {
        reply = 'Bunu kayıt taslağı olarak aldım. Bir sonraki adımda tarih, kategori ve onay bilgisi isteyeceğim.';
      } else if (cmd.intent === 'query_vehicle') {
        reply = 'Araç sorgusunu aldım. Peugeot/araç kayıt görünümü bir sonraki adımda bağlanacak.';
      } else if (cmd.intent === 'query_document') {
        reply = await answerFromFinance('document_inbox');
      } else {
        reply = 'Mesajı Komuta Kutusu’na aldım. Henüz bu komut için otomatik cevap hazır değil.';
      }
    }

    await db.from('aperion_telegram_command_inbox_v58').update({
      status: 'processed',
      response_preview: reply,
      processed_at: new Date().toISOString(),
    }).eq('id', saved.id);

    await telegram('sendMessage', { chat_id: chatId, text: reply });
  } catch (err) {
    console.error(err);
    await telegram('sendMessage', { chat_id: chatId, text: `AperiON hata aldı: ${err.message || err}` });
  }
}

async function pollOnce() {
  const offset = Number(process.env.TELEGRAM_OFFSET || 0);
  const updates = await telegram('getUpdates', { offset, timeout: 0, allowed_updates: ['message'] });
  for (const update of updates) {
    if (update.message) await processMessage(update.message);
    process.env.TELEGRAM_OFFSET = String(update.update_id + 1);
    console.log('next TELEGRAM_OFFSET=' + process.env.TELEGRAM_OFFSET);
  }
}

async function main() {
  if (process.argv.includes('--once')) {
    await pollOnce();
    return;
  }
  console.log('AperiON Telegram Command Bot v58 started.');
  while (true) {
    await pollOnce();
    await new Promise(r => setTimeout(r, 2500));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
