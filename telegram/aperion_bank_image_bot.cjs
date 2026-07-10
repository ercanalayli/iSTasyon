const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const { classifyBankMovement } = require('../tools/bank_posting_plan.cjs');

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const DEFAULT_SUPABASE_URL = 'https://iilfwosoroflzubkaryj.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW';

loadEnv();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.APERION_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_ALLOWED_CHAT_ID = process.env.TELEGRAM_ALLOWED_CHAT_ID || process.env.APERION_TELEGRAM_CHAT_ID || '';
const COMPANY = process.env.APERION_COMPANY || 'alayli';
const BANK_NAME = process.env.APERION_BANK_IMAGE_BANK || 'IS BANKASI';
const POLL_TIMEOUT = Number(process.env.TELEGRAM_POLL_TIMEOUT || 25);
const db = createClient(
  process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY,
  { auth: { persistSession: false } }
);

function loadEnv() {
  if (!fs.existsSync(ENV_PATH)) return;
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const i = trimmed.indexOf('=');
    const key = trimmed.slice(0, i).trim();
    const value = trimmed.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function requireEnv() {
  if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN gerekli');
}

async function tg(method, payload = {}) {
  requireEnv();
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description || res.statusText}`);
  return json.result;
}

async function downloadTelegramFile(fileId, outPath) {
  const file = await tg('getFile', { file_id: fileId });
  const res = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file.file_path}`);
  if (!res.ok) throw new Error(`Telegram dosya indirilemedi: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  return outPath;
}

function allowed(chatId) {
  return !TELEGRAM_ALLOWED_CHAT_ID || String(chatId) === String(TELEGRAM_ALLOWED_CHAT_ID);
}

function money(n) {
  return `${Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

function buttonRows(id) {
  return {
    inline_keyboard: [[
      { text: 'Onayla ve Kuyruğa Al', callback_data: `bank:approve:${id}` },
      { text: 'Reddet', callback_data: `bank:reject:${id}` },
    ]],
  };
}

function parserOutputPath() {
  const dir = path.join(ROOT, 'diagnostics');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `telegram_bank_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
}

function runParser(filePath) {
  const out = parserOutputPath();
  const result = spawnSync(process.execPath, [
    path.join(ROOT, 'banka_gorsel_parser.js'),
    '--file', filePath,
    '--firma', COMPANY,
    '--banka', BANK_NAME,
    '--save-approval',
    '--out', out,
  ], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, NODE_PATH: path.join(ROOT, 'node_modules') },
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'Parser hata verdi').trim());
  }
  const payload = JSON.parse(fs.readFileSync(out, 'utf8'));
  return { out, payload, stdout: result.stdout };
}

async function listWaitingBankRows(limit = 8) {
  const { data, error } = await db.from('bank_transactions')
    .select('id,tarih,saat,tutar,tur,banka,hesap,aciklama,onay_durumu,bizimhesap_durumu,sinif_guven,raw')
    .eq('firma_id', COMPANY)
    .eq('onay_durumu', 'bekliyor')
    .order('id', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

function telegramBankPlan(row) {
  const raw = row.raw || {};
  const amount = Number(row.tutar || 0);
  const outgoing = raw.yon === 'cikis' || raw.yon === 'out' || amount < 0;
  return classifyBankMovement({
    id: row.id,
    bank_name: row.banka || row.hesap || raw.kaynak_banka || BANK_NAME,
    transaction_date: row.tarih,
    transaction_time: row.saat || raw.saat || '',
    description: row.aciklama,
    amount_in: outgoing ? 0 : Math.abs(amount),
    amount_out: outgoing ? Math.abs(amount) : 0,
    balance_after: raw.bakiye,
    source_account: row.hesap || row.banka || raw.kaynak_banka || '',
    target_account: raw.hedef_hesap || raw.target_account || '',
    confidence_score: row.sinif_guven,
  }).plan;
}

function waitingRowText(row) {
  const plan = telegramBankPlan(row);
  const explanation = escapeHtml((row.aciklama || '').slice(0, 900));
  const amount = money(Math.abs(Number(row.tutar || 0)));
  const source = escapeHtml(plan.source_account || `${row.banka || 'Banka'} banka hesabı`);
  const target = escapeHtml(plan.target_account || 'Hedef hesap açıklamada net değil');
  const question = escapeHtml(plan.confirmation_question || 'Bu hareketi önerilen kayıt türüyle işleyeyim mi?');
  return `<b>Onay gerekli: ${escapeHtml(plan.type)}</b>\n` +
    `Tarih: <b>${escapeHtml(row.tarih || '-')}</b> · Tutar: <b>${amount}</b>\n` +
    `Kaynak hesap: <b>${source}</b>\n` +
    `Hedef hesap: <b>${target}</b>\n` +
    `BizimHesap kaydı: <b>${escapeHtml(plan.target)}</b>\n` +
    `Kategori: <b>${escapeHtml(plan.category)}</b>\n` +
    `Güven: <b>${plan.confidence}/100</b>\n\n` +
    `<b>Açıklama kanıtı</b>\n<blockquote>${explanation}</blockquote>\n\n` +
    `<b>Sorum:</b> ${question}`;
}

async function sendWaitingRows(chatId, header) {
  const rows = await listWaitingBankRows();
  await tg('sendMessage', {
    chat_id: chatId,
    parse_mode: 'HTML',
    text: `<b>${header}</b>\nOnay bekleyen hareket: <b>${rows.length}</b>`,
  });
  for (const row of rows) {
    await tg('sendMessage', {
      chat_id: chatId,
      parse_mode: 'HTML',
      text: `<b>#${row.id} ${row.tur || '-'}</b>\n${row.tarih || '-'} · <b>${money(row.tutar)}</b>\n${escapeHtml((row.aciklama || '').slice(0, 700))}\nGüven: ${row.sinif_guven || 0}/100`,
      text: waitingRowText(row),
      reply_markup: buttonRows(row.id),
    });
  }
}

async function handlePhoto(message) {
  const chatId = message.chat.id;
  if (!allowed(chatId)) return tg('sendMessage', { chat_id: chatId, text: 'Bu sohbet yetkili değil.' });
  const photo = [...(message.photo || [])].sort((a, b) => (b.file_size || 0) - (a.file_size || 0))[0];
  const doc = message.document;
  const fileId = photo?.file_id || doc?.file_id;
  if (!fileId) return;

  await tg('sendMessage', { chat_id: chatId, text: 'Banka görseli okunuyor...' });
  const ext = doc?.file_name ? path.extname(doc.file_name) || '.jpg' : '.jpg';
  const filePath = path.join(os.tmpdir(), `aperion-bank-${crypto.randomUUID()}${ext}`);
  await downloadTelegramFile(fileId, filePath);
  const parsed = runParser(filePath);
  await sendWaitingRows(chatId, `OCR tamam: ${parsed.payload.toplam} hareket`);
}

async function approveBankTransaction(id, actor = 'telegram') {
  const rpc = await db.rpc('approve_bank_transaction_v58', {
    p_bank_transaction_id: id,
    p_approved_by: actor,
  });
  if (!rpc.error && rpc.data) {
    return { ok: Boolean(rpc.data.ok), message: rpc.data.message || 'Onaylandi ve kuyruga alindi.' };
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, message: `Onay RPC calismadi: ${rpc.error?.message || 'yetki yok'}` };
  }
  const { data: row, error } = await db.from('bank_transactions').select('*').eq('id', id).single();
  if (error) throw error;
  if (!row) throw new Error('Kayıt bulunamadı');
  if (row.onay_durumu !== 'bekliyor') return { ok: true, message: `Zaten ${row.onay_durumu}` };

  const { data: updatedRows, error: updError } = await db.from('bank_transactions').update({
    onay_durumu: 'onaylandi',
    bizimhesap_durumu: 'kuyrukta',
    bizimhesap_mesaj: 'Telegram tek tık onaylandı; BizimHesap posting kuyruğu bekliyor.',
    updated_at: new Date().toISOString(),
  }).eq('id', id).select('id');
  if (updError) throw updError;
  if (!updatedRows?.length) return { ok: false, message: 'Onay yazılamadı; Supabase RLS/update yetkisi kontrol edilmeli.' };

  const approval = await findV57Approval(row);
  if (approval?.id) {
    const rpc = await db.rpc('approve_and_queue_finance_entry', {
      p_approval_id: approval.id,
      p_approved_by: actor,
      p_dry_run: true,
    });
    if (rpc.error) {
      await db.from('bank_transactions').update({
        bizimhesap_durumu: 'kuyruk_hatasi',
        bizimhesap_mesaj: rpc.error.message,
      }).eq('id', id);
      return { ok: false, message: rpc.error.message };
    }
  }
  return { ok: true, message: 'Onaylandı ve BizimHesap kuyruğuna alındı.' };
}

async function findV57Approval(row) {
  const hash = row.raw?.hash;
  if (!hash) return null;
  const raw = await db.from('bank_transactions_raw').select('id').eq('company', COMPANY).eq('transaction_hash', hash).limit(1);
  if (raw.error || !raw.data?.length) return null;
  const approval = await db.from('aperion_approval_center').select('id,status').eq('source_id', raw.data[0].id).limit(1);
  if (approval.error || !approval.data?.length) return null;
  return approval.data[0];
}

async function rejectBankTransaction(id) {
  const rpc = await db.rpc('reject_bank_transaction_v58', {
    p_bank_transaction_id: id,
    p_rejected_by: 'telegram',
  });
  if (!rpc.error && rpc.data) {
    return { ok: Boolean(rpc.data.ok), message: rpc.data.message || 'Reddedildi.' };
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, message: `Ret RPC calismadi: ${rpc.error?.message || 'yetki yok'}` };
  }
  const { data, error } = await db.from('bank_transactions').update({
    onay_durumu: 'reddedildi',
    bizimhesap_durumu: 'iptal',
    bizimhesap_mesaj: 'Telegram tek tık reddedildi.',
    updated_at: new Date().toISOString(),
  }).eq('id', id).select('id');
  if (error) throw error;
  if (!data?.length) return { ok: false, message: 'Ret yazılamadı; Supabase RLS/update yetkisi kontrol edilmeli.' };
  return { ok: true, message: 'Reddedildi.' };
}

async function handleCallback(callback) {
  const chatId = callback.message?.chat?.id;
  if (!allowed(chatId)) return tg('answerCallbackQuery', { callback_query_id: callback.id, text: 'Yetkisiz sohbet' });
  const [scope, action, idText] = String(callback.data || '').split(':');
  if (scope !== 'bank') return;
  const id = Number(idText);
  if (!id) return tg('answerCallbackQuery', { callback_query_id: callback.id, text: 'Kayıt ID yok' });
  const result = action === 'approve' ? await approveBankTransaction(id) : await rejectBankTransaction(id);
  await tg('answerCallbackQuery', { callback_query_id: callback.id, text: result.message.slice(0, 190) });
  await tg('sendMessage', { chat_id: chatId, text: `#${id}: ${result.message}` });
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  if (!allowed(chatId)) return tg('sendMessage', { chat_id: chatId, text: 'Bu sohbet yetkili değil.' });
  const text = String(message.text || '').trim().toLowerCase();
  if (message.photo?.length || message.document?.mime_type?.startsWith('image/')) return handlePhoto(message);
  if (text === '/start') return tg('sendMessage', { chat_id: chatId, text: 'Banka ekran görüntüsünü gönder. /onay ile bekleyenleri gör.' });
  if (text === '/onay' || text === '/banka') return sendWaitingRows(chatId, 'Banka onay kuyruğu');
}

async function handleUpdate(update) {
  if (update.callback_query) return handleCallback(update.callback_query);
  if (update.message) return handleMessage(update.message);
}

async function poll() {
  requireEnv();
  let offset = Number(process.env.TELEGRAM_OFFSET || 0);
  for (;;) {
    const updates = await tg('getUpdates', { offset, timeout: POLL_TIMEOUT, allowed_updates: ['message', 'callback_query'] });
    for (const update of updates) {
      offset = update.update_id + 1;
      try {
        await handleUpdate(update);
      } catch (error) {
        const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
        if (chatId) await tg('sendMessage', { chat_id: chatId, text: `Hata: ${error.message}` });
      }
    }
  }
}

function escapeHtml(text) {
  return String(text || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

if (require.main === module) {
  poll().catch(error => {
    console.error('RESULT: FAILED');
    console.error(error.message || error);
    process.exit(1);
  });
}

module.exports = {
  handleUpdate,
  approveBankTransaction,
  rejectBankTransaction,
  runParser,
};
