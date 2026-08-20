const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_LEDGER = path.resolve(__dirname, '..', 'artifacts', 'telegram-finance-result-ledger.json');

function resolveChatId(env = process.env) {
  return String(
    env.TELEGRAM_CHAT_ID ||
    env.TELEGRAM_ALLOWED_CHAT_ID ||
    env.APERION_TELEGRAM_CHAT_ID ||
    String(env.TELEGRAM_CHAT_IDS || '').split(',').map(value => value.trim()).find(Boolean) ||
    ''
  ).trim();
}

function formatMoney(value, currency = 'TRY') {
  return Number(value).toLocaleString('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildCaption(result) {
  const lines = [
    '[GPT-CODEX KAYDI]',
    '✅ AperiON gerçek işlem sonucu',
    `Durum: ${result.status || 'BAŞARILI'}`,
    `İşlem kimliği: ${result.transactionId}`,
    `Tarih: ${result.date || '-'}`,
    `Kaynak: ${result.sourceAccount || '-'}`,
    `Hedef: ${result.targetAccount || '-'}`,
    `Tutar: ${formatMoney(result.amount, result.currency || 'TRY')}`,
  ];
  if (result.newBalance !== undefined && result.newBalance !== null && result.newBalance !== '') {
    lines.push(`Yeni bakiye: ${formatMoney(result.newBalance, result.currency || 'TRY')}`);
  }
  if (result.description) lines.push(`Açıklama: ${result.description}`);
  lines.push('Kayıt BizimHesap ekranında doğrulandı; görsel kanıt ektedir.');
  return lines.join('\n').slice(0, 1024);
}

function readLedger(ledgerPath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

function writeLedger(ledgerPath, ledger) {
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  const temporaryPath = `${ledgerPath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(ledger, null, 2), 'utf8');
  fs.renameSync(temporaryPath, ledgerPath);
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.webp') return 'image/webp';
  return 'image/png';
}

async function sendFinanceResult(result, options = {}) {
  if (result?.verified !== true) throw new Error('Telegram sonucu yalnızca verified=true olan işlem için gönderilebilir.');
  if (!result.transactionId) throw new Error('transactionId gerekli.');
  if (!Number.isFinite(Number(result.amount))) throw new Error('Geçerli amount gerekli.');
  if (!result.proofPath || !fs.existsSync(result.proofPath)) throw new Error('Görsel kanıt bulunamadı.');

  const proofStat = fs.statSync(result.proofPath);
  if (!proofStat.isFile() || proofStat.size === 0) throw new Error('Görsel kanıt boş veya dosya değil.');
  if (proofStat.size > 10 * 1024 * 1024) throw new Error('Görsel kanıt Telegram fotoğraf sınırını aşıyor (10 MB).');

  const env = options.env || process.env;
  const token = options.token || env.TELEGRAM_BOT_TOKEN || env.APERION_TELEGRAM_BOT_TOKEN || '';
  const chatId = String(options.chatId || resolveChatId(env));
  const allowedChatId = String(env.TELEGRAM_ALLOWED_CHAT_ID || env.APERION_TELEGRAM_CHAT_ID || chatId);
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN gerekli.');
  if (!chatId) throw new Error('Telegram chat hedefi gerekli.');
  if (allowedChatId && chatId !== allowedChatId) throw new Error('Telegram chat hedefi izin verilen sohbetle eşleşmiyor.');

  const ledgerPath = options.ledgerPath || DEFAULT_LEDGER;
  const idempotencyKey = crypto.createHash('sha256')
    .update(`finance-result:${result.transactionId}`)
    .digest('hex');
  const ledger = readLedger(ledgerPath);
  if (ledger[idempotencyKey]) {
    return { ok: true, duplicate: true, ...ledger[idempotencyKey] };
  }

  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('caption', buildCaption(result));
  form.append('photo', new Blob([fs.readFileSync(result.proofPath)], {
    type: contentTypeFor(result.proofPath),
  }), path.basename(result.proofPath));

  const fetchImpl = options.fetchImpl || fetch;
  const response = await fetchImpl(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    body: form,
  });
  const bodyText = await response.text();
  let body;
  try { body = JSON.parse(bodyText); } catch { body = null; }
  if (!response.ok || !body?.ok) {
    throw new Error(`Telegram görsel sonucu gönderilemedi (HTTP ${response.status}).`);
  }

  const receipt = {
    transactionId: String(result.transactionId),
    chatId,
    messageId: body.result?.message_id || null,
    sentAt: new Date().toISOString(),
    proofFile: path.basename(result.proofPath),
  };
  ledger[idempotencyKey] = receipt;
  writeLedger(ledgerPath, ledger);
  return { ok: true, duplicate: false, ...receipt };
}

module.exports = {
  DEFAULT_LEDGER,
  buildCaption,
  resolveChatId,
  sendFinanceResult,
};
