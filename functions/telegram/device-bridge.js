const DEVICE_SCOPES = Object.freeze(['desktop_open_url']);

function clean(value) {
  return String(value || '').trim();
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value || '')));
  return bytesToHex(new Uint8Array(digest));
}

async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(secret || '')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return bytesToHex(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))));
}

function constantTimeHexEqual(left, right) {
  const a = clean(left).toLowerCase();
  const b = clean(right).toLowerCase();
  let different = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    different |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return different === 0;
}

export async function ensureDeviceSchema(db) {
  if (!db) return false;
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS aperion_devices (
      device_id TEXT PRIMARY KEY,
      device_name TEXT NOT NULL,
      token_sha256 TEXT NOT NULL,
      allowed_chat_id TEXT NOT NULL,
      scopes_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen_at TEXT
    )`).run();
    await db.prepare(`CREATE TABLE IF NOT EXISTS aperion_device_nonces (
      nonce TEXT PRIMARY KEY,
      used_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`).run();
    await db.prepare(`CREATE TABLE IF NOT EXISTS aperion_device_commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      command_key TEXT NOT NULL UNIQUE,
      chat_id TEXT NOT NULL,
      command TEXT NOT NULL,
      target TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      claimed_by TEXT,
      result_summary TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      claimed_at TEXT,
      completed_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`).run();
    return true;
  } catch (_error) {
    return false;
  }
}

async function readAllowedChatId(env) {
  if (!env.APERION_DB) return '';
  try {
    const row = await env.APERION_DB.prepare(
      `SELECT config_value FROM telegram_security_config WHERE config_key='allowed_chat_id'`
    ).first();
    return clean(row?.config_value);
  } catch (_error) {
    return '';
  }
}

export function enrollmentPayload(deviceId, timestamp, nonce) {
  return ['aperion-device-enroll-v1', clean(deviceId), String(timestamp), clean(nonce)].join('\n');
}

export async function enrollDevice(env, body) {
  if (!env.APERION_DB || !(await ensureDeviceSchema(env.APERION_DB))) {
    return { ok: false, status: 503, error: 'device_store_unavailable' };
  }
  if (!env.TELEGRAM_BOT_TOKEN) return { ok: false, status: 503, error: 'bootstrap_secret_unavailable' };

  const deviceId = clean(body?.device_id);
  const deviceName = clean(body?.device_name).slice(0, 100) || 'AperiON Windows';
  const nonce = clean(body?.nonce);
  const timestamp = Number(body?.timestamp);
  const proof = clean(body?.proof);
  if (!/^[a-zA-Z0-9._-]{8,120}$/.test(deviceId) || !/^[a-zA-Z0-9_-]{20,160}$/.test(nonce)) {
    return { ok: false, status: 400, error: 'invalid_device_request' };
  }
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
    return { ok: false, status: 401, error: 'expired_enrollment_request' };
  }
  const expectedProof = await hmacHex(env.TELEGRAM_BOT_TOKEN, enrollmentPayload(deviceId, timestamp, nonce));
  if (!constantTimeHexEqual(proof, expectedProof)) return { ok: false, status: 403, error: 'invalid_enrollment_proof' };

  const allowedChatId = await readAllowedChatId(env);
  if (!allowedChatId) return { ok: false, status: 503, error: 'telegram_owner_not_configured' };
  try {
    await env.APERION_DB.prepare('INSERT INTO aperion_device_nonces (nonce) VALUES (?)').bind(nonce).run();
  } catch (_error) {
    return { ok: false, status: 409, error: 'enrollment_replay_rejected' };
  }

  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = bytesToBase64Url(tokenBytes);
  const tokenHash = await sha256Hex(token);
  await env.APERION_DB.prepare(`INSERT INTO aperion_devices
    (device_id,device_name,token_sha256,allowed_chat_id,scopes_json,status,updated_at)
    VALUES (?,?,?,?,?,'active',datetime('now'))
    ON CONFLICT(device_id) DO UPDATE SET
      device_name=excluded.device_name,
      token_sha256=excluded.token_sha256,
      allowed_chat_id=excluded.allowed_chat_id,
      scopes_json=excluded.scopes_json,
      status='active',
      updated_at=datetime('now')`
  ).bind(deviceId, deviceName, tokenHash, allowedChatId, JSON.stringify(DEVICE_SCOPES)).run();

  return {
    ok: true,
    status: 200,
    device_id: deviceId,
    device_token: token,
    allowed_chat_id: allowedChatId,
    scopes: DEVICE_SCOPES
  };
}

export async function authenticateDevice(env, request) {
  if (!env.APERION_DB || !(await ensureDeviceSchema(env.APERION_DB))) return null;
  const authorization = clean(request.headers.get('authorization'));
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const tokenHash = await sha256Hex(match[1]);
  const row = await env.APERION_DB.prepare(`SELECT device_id,device_name,allowed_chat_id,scopes_json
    FROM aperion_devices WHERE token_sha256=? AND status='active' LIMIT 1`).bind(tokenHash).first();
  if (!row) return null;
  await env.APERION_DB.prepare(`UPDATE aperion_devices SET last_seen_at=datetime('now'),updated_at=datetime('now') WHERE device_id=?`)
    .bind(row.device_id).run();
  return {
    deviceId: row.device_id,
    deviceName: row.device_name,
    allowedChatId: String(row.allowed_chat_id),
    scopes: JSON.parse(row.scopes_json || '[]')
  };
}

export async function queueDeviceCommand(env, { commandKey, chatId, command, target }) {
  if (!env.APERION_DB || !(await ensureDeviceSchema(env.APERION_DB))) {
    return { ok: false, error: 'device_store_unavailable' };
  }
  try {
    const row = await env.APERION_DB.prepare(`INSERT INTO aperion_device_commands
      (command_key,chat_id,command,target,status) VALUES (?,?,?,?,'pending')
      ON CONFLICT(command_key) DO NOTHING RETURNING id`)
      .bind(commandKey, String(chatId), command, target).first();
    if (row?.id) return { ok: true, id: row.id, store: 'cloudflare_d1', duplicate: false };
    const existing = await env.APERION_DB.prepare('SELECT id,status FROM aperion_device_commands WHERE command_key=?')
      .bind(commandKey).first();
    return { ok: true, id: existing?.id || null, status: existing?.status, store: 'cloudflare_d1', duplicate: true };
  } catch (error) {
    return { ok: false, error: error?.message || 'device_queue_failed' };
  }
}

export async function claimNextDeviceCommand(env, device) {
  if (!device?.scopes?.includes('desktop_open_url')) return null;
  return env.APERION_DB.prepare(`UPDATE aperion_device_commands
    SET status='processing',claimed_by=?,claimed_at=datetime('now'),updated_at=datetime('now')
    WHERE id=(
      SELECT id FROM aperion_device_commands
      WHERE status='pending' AND chat_id=? AND command='desktop_open_url'
      ORDER BY id ASC LIMIT 1
    ) AND status='pending'
    RETURNING id,command,target,created_at`)
    .bind(device.deviceId, device.allowedChatId).first();
}

export async function completeDeviceCommand(env, device, body) {
  const commandId = Number(body?.command_id);
  const ok = Boolean(body?.ok);
  const summary = clean(body?.result_summary).slice(0, 1000);
  if (!Number.isInteger(commandId) || commandId <= 0 || !summary) {
    return { ok: false, status: 400, error: 'invalid_command_result' };
  }
  const row = await env.APERION_DB.prepare(`UPDATE aperion_device_commands
    SET status=?,result_summary=?,completed_at=datetime('now'),updated_at=datetime('now')
    WHERE id=? AND claimed_by=? AND status='processing'
    RETURNING id,chat_id,target,status`)
    .bind(ok ? 'completed' : 'failed', summary, commandId, device.deviceId).first();
  if (!row) return { ok: false, status: 409, error: 'command_not_claimed_by_device' };
  return { ok: true, status: 200, command: row, result_summary: summary };
}

export async function deviceHealth(env) {
  if (!env.APERION_DB || !(await ensureDeviceSchema(env.APERION_DB))) {
    return { configured: false, activeDeviceCount: 0, pendingCommandCount: 0 };
  }
  const [devices, commands] = await Promise.all([
    env.APERION_DB.prepare(`SELECT COUNT(*) AS count FROM aperion_devices WHERE status='active'`).first(),
    env.APERION_DB.prepare(`SELECT COUNT(*) AS count FROM aperion_device_commands WHERE status='pending'`).first()
  ]);
  return {
    configured: Number(devices?.count || 0) > 0,
    activeDeviceCount: Number(devices?.count || 0),
    pendingCommandCount: Number(commands?.count || 0)
  };
}
