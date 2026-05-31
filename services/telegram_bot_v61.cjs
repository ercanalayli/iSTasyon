// AperiON v61 Telegram Bot Service
// Minimal read-only /stok command handler.
// This file does not mutate live stock, finance, or ledger data.

const { Client } = require('pg');
const {
  searchProductForTelegram,
  formatTelegramProductReply,
  ACTIVE_COMPANY
} = require('./product_matcher_v61.cjs');

const TELEGRAM_API = 'https://api.telegram.org/bot';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;
const ALLOWED_CHAT_IDS = String(process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
  .split(',')
  .map(x => x.trim())
  .filter(Boolean);

function isAllowedChat(chatId) {
  if (!ALLOWED_CHAT_IDS.length) return true;
  return ALLOWED_CHAT_IDS.includes(String(chatId));
}

function parseStockCommand(text) {
  const clean = String(text || '').trim();
  const match = clean.match(/^\/stok\s+(.+)$/i);
  if (!match) return null;
  return match[1].trim();
}

async function sendTelegramMessage(chatId, text) {
  if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN missing');
  const res = await fetch(`${TELEGRAM_API}${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });
  if (!res.ok) throw new Error(`Telegram send failed: ${res.status}`);
  return res.json();
}

async function withDb(fn) {
  if (!DATABASE_URL) throw new Error('DATABASE_URL missing');
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function handleStockCommand(chatId, keyword) {
  return withDb(async db => {
    const result = await searchProductForTelegram(db, keyword);
    const reply = formatTelegramProductReply(result);
    return sendTelegramMessage(chatId, reply);
  });
}

async function handleTelegramUpdate(update) {
  const message = update && update.message ? update.message : null;
  if (!message || !message.chat) return { ignored: true, reason: 'no_message' };

  const chatId = message.chat.id;
  if (!isAllowedChat(chatId)) {
    return { ignored: true, reason: 'chat_not_allowed' };
  }

  const text = message.text || '';
  const stockKeyword = parseStockCommand(text);

  if (stockKeyword) {
    await sendTelegramMessage(chatId, `ALAYLI Medikal ürün kontrolü yapılıyor: ${stockKeyword}`);
    await handleStockCommand(chatId, stockKeyword);
    return { ok: true, command: 'stok', company: ACTIVE_COMPANY };
  }

  if (text.startsWith('/')) {
    await sendTelegramMessage(chatId, 'Komut desteklenmiyor. Örnek: /stok jender belbantlı');
    return { ok: true, command: 'unsupported' };
  }

  await sendTelegramMessage(chatId, 'Ürün kontrolü için örnek komut: /stok jender belbantlı');
  return { ok: true, command: 'help' };
}

async function telegramWebhookHandler(req, res) {
  try {
    const result = await handleTelegramUpdate(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('[telegram_bot_v61]', error);
    res.status(200).json({ ok: false, error: error.message });
  }
}

module.exports = {
  parseStockCommand,
  handleTelegramUpdate,
  telegramWebhookHandler,
  sendTelegramMessage
};
