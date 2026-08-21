function html(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function money(value) {
  return Number(value || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' TL';
}

function safeString(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function safeNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function normalizeRow(row) {
  const duplicateKey = safeString(row?.duplicate_key, 300);
  if (!duplicateKey) return null;
  return {
    duplicate_key: duplicateKey,
    company_id: safeString(row?.company_id || 'alayli', 80) || 'alayli',
    bank_name: safeString(row?.bank_name || row?.bank, 120),
    transaction_date: safeString(row?.transaction_date, 10),
    transaction_time: safeString(row?.transaction_time, 8),
    description: safeString(row?.description, 1000),
    amount_in: safeNumber(row?.amount_in),
    amount_out: Math.abs(safeNumber(row?.amount_out)),
    balance_after: row?.balance_after == null ? null : safeNumber(row.balance_after),
    confidence_score: Math.max(0, Math.min(100, safeNumber(row?.confidence_score))),
    suggested_counterparty: safeString(row?.suggested_counterparty, 300),
    confirmed_counterparty: safeString(row?.confirmed_counterparty, 300),
    counterparty_confirmed: row?.counterparty_confirmed ? 1 : 0,
    source: safeString(row?.source || 'gmail_bank_statement', 120),
    source_ref: safeString(row?.mail_id || row?.statement_id || row?.source_ref, 300),
    raw_json: JSON.stringify(row),
  };
}

export function bankApprovalCard(row) {
  const amountIn = safeNumber(row.amount_in);
  const amountOut = Math.abs(safeNumber(row.amount_out));
  const direction = amountIn > 0 ? 'TAHSÄ°LAT' : 'Ã–DEME';
  const amount = amountIn > 0 ? amountIn : amountOut;
  const confidence = safeNumber(row.confidence_score);
  const confidenceIcon = confidence >= 90 ? 'ğŸŸ¢' : confidence >= 75 ? 'ğŸŸ ' : 'ğŸ”´';
  const counterparty = row.confirmed_counterparty || row.suggested_counterparty || 'EÅLEÅME GEREKLÄ°';
  return [
    '<b>ğŸ¦ BANKA HAREKETÄ° ONAYI</b>',
    '',
    `<b>${direction} â€¢ ${money(amount)}</b>`,
    `ğŸ› <b>Banka:</b> ${html(row.bank_name || '-')}`,
    `ğŸ“… <b>Tarih:</b> ${html(row.transaction_date || '-')}`,
    `ğŸ‘¤ <b>KarÅŸÄ± taraf:</b> ${html(counterparty)}`,
    `ğŸ“ <b>AÃ§Ä±klama:</b> ${html(row.description || '-')}`,
    `${confidenceIcon} <b>EÅŸleÅŸme gÃ¼veni:</b> ${confidence.toLocaleString('tr-TR')}%`,
    '',
    confidence < 84 || !row.counterparty_confirmed
      ? '<b>âš ï¸ Ä°nceleme:</b> Cari veya iÅŸlem tÃ¼rÃ¼ kesinleÅŸmeden kayÄ±t tamamlanmayacaktÄ±r.'
      : '<b>âœ… Kontrol:</b> Onaydan sonra BizimHesap gÃ¼venlik kuyruÄŸuna aktarÄ±lÄ±r.',
    '<i>MÃ¼kerrer kontrolÃ¼ uygulanmÄ±ÅŸtÄ±r. Onay, cari eÅŸleÅŸtirme ve son kayÄ±t doÄŸrulamasÄ±nÄ± kaldÄ±rmaz.</i>',
  ].join('\n');
}

export async function resolveTelegramChatId(db, env) {
  const configured = safeString(env.TELEGRAM_ALLOWED_CHAT_IDS || env.TELEGRAM_ALLOWED_CHAT_ID || env.TELEGRAM_CHAT_ID, 200);
  if (configured) return configured.split(',').map((item) => item.trim()).find(Boolean) || '';
  const row = await db.prepare("SELECT config_value FROM telegram_security_config WHERE config_key='allowed_chat_id'").first().catch(() => null);
  if (row?.config_value) return safeString(row.config_value, 100);
  const legacy = await db.prepare("SELECT chat_id FROM quick_notes WHERE chat_id IS NOT NULL AND chat_id <> '' GROUP BY chat_id ORDER BY COUNT(*) DESC LIMIT 1").first().catch(() => null);
  return safeString(legacy?.chat_id, 100);
}

export async function sendBankApproval(env, chatId, row) {
  if (!env.TELEGRAM_BOT_TOKEN || !chatId) throw new Error('telegram_not_configured');
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: bankApprovalCard(row),
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: 'âœ… ONAYLA', callback_data: `bm:a:${row.id}` },
          { text: 'âŒ REDDET', callback_data: `bm:r:${row.id}` },
        ]],
      },
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok !== true) throw new Error(body.description || `telegram_http_${response.status}`);
  return body.result?.message_id || null;
}

export async function ingestBankRows(db, env, inputRows) {
  const rows = Array.isArray(inputRows) ? inputRows.slice(0, 500) : [];
  let inserted = 0;
  let duplicate = 0;
  let invalid = 0;
  const created = [];
  for (const input of rows) {
    const row = normalizeRow(input);
    if (!row) {
      invalid += 1;
      continue;
    }
    const id = crypto.randomUUID();
    const result = await db.prepare(`INSERT OR IGNORE INTO bank_statement_movements
      (id,company_id,duplicate_key,bank_name,transaction_date,transaction_time,description,amount_in,amount_out,balance_after,confidence_score,suggested_counterparty,confirmed_counterparty,counterparty_confirmed,source,source_ref,raw_json,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'needs_review')`)
      .bind(id,row.company_id,row.duplicate_key,row.bank_name,row.transaction_date,row.transaction_time,row.description,row.amount_in,row.amount_out,row.balance_after,row.confidence_score,row.suggested_counterparty,row.confirmed_counterparty,row.counterparty_confirmed,row.source,row.source_ref,row.raw_json)
      .run();
    if (Number(result.meta?.changes || 0) > 0) {
      inserted += 1;
      created.push({ ...row, id });
    } else {
      duplicate += 1;
    }
  }

  const pendingCards = await db.prepare(`SELECT * FROM bank_statement_movements
    WHERE status IN ('pending','needs_review') AND (telegram_message_id IS NULL OR telegram_message_id='')
    ORDER BY created_at LIMIT 50`).all();
  const notificationRows = pendingCards.results || created;
  const chatId = await resolveTelegramChatId(db, env);
  let telegramSent = 0;
  const telegramFailures = [];
  for (const row of notificationRows) {
    try {
      const messageId = await sendBankApproval(env, chatId, row);
      await db.prepare("UPDATE bank_statement_movements SET telegram_message_id=?,approval_note='[TELEGRAM_ONAY_KARTI]',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?")
        .bind(String(messageId || ''), row.id).run();
      telegramSent += 1;
    } catch (error) {
      telegramFailures.push({ id: row.id, error: error.message || String(error) });
    }
  }
  return { input: rows.length, inserted, duplicate, invalid, notification_candidates: notificationRows.length, telegram_configured: Boolean(env.TELEGRAM_BOT_TOKEN && chatId), telegram_sent: telegramSent, telegram_failed: telegramFailures.length, failures: telegramFailures.slice(0, 10) };
}

export async function readBankMovement(db, movementId) {
  return db.prepare('SELECT * FROM bank_statement_movements WHERE id=?').bind(movementId).first();
}

export async function decideBankMovement(db, movementId, action, chatId) {
  const row = await readBankMovement(db, movementId);
  if (!row) return { ok: false, error: 'not_found' };
  if (action === 'reject') {
    if (row.status === 'approved' || row.status === 'queued') return { ok: false, error: 'already_approved', row };
    if (row.status === 'rejected') return { ok: true, duplicate: true, status: 'rejected', row };
    await db.prepare("UPDATE bank_statement_movements SET status='rejected',decided_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),decided_by=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status IN ('pending','needs_review')")
      .bind(`telegram:${chatId}`, movementId).run();
    return { ok: true, status: 'rejected', row };
  }
  if (row.status === 'rejected') return { ok: false, error: 'already_rejected', row };
  if (row.status === 'approved' || row.status === 'queued') return { ok: true, duplicate: true, status: row.status, row };
  const queueId = crypto.randomUUID();
  const idempotencyKey = `bank:${row.duplicate_key}`;
  await db.batch([
    db.prepare("UPDATE bank_statement_movements SET status='queued',decided_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),decided_by=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status IN ('pending','needs_review')")
      .bind(`telegram:${chatId}`, movementId),
    db.prepare("INSERT OR IGNORE INTO bank_posting_queue(id,movement_id,company_id,status,payload_json,idempotency_key) VALUES (?,?,?,'pending_match',?,?)")
      .bind(queueId, movementId, row.company_id || 'alayli', row.raw_json, idempotencyKey),
  ]);
  return { ok: true, status: 'queued', row };
}

