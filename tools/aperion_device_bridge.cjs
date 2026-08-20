'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SECRET_DIR = path.join(ROOT, 'local-secrets');
const SECRET_FILE = path.join(SECRET_DIR, 'aperion-device.env');
const ENROLL_REQUEST_FILE = path.join(SECRET_DIR, 'aperion-enroll-request.json');
const DEFAULT_BASE_URL = 'https://aperion-istasyon.pages.dev';
const POLL_INTERVAL_MS = 3000;

const TARGETS = Object.freeze({
  bizimhesap: { title: 'BizimHesap', url: 'https://bizimhesap.com/web/ngn/newportal' },
  gmail: { title: 'Gmail', url: 'https://mail.google.com/mail/u/0/#inbox' },
  drive: { title: 'Google Drive', url: 'https://drive.google.com/drive/my-drive' },
  calendar: { title: 'Google Takvim', url: 'https://calendar.google.com/calendar/u/0/r' },
  telegram: { title: 'Telegram Web', url: 'https://web.telegram.org/k/' },
  whatsapp: { title: 'WhatsApp Web', url: 'https://web.whatsapp.com/' },
  aperion: { title: 'AperiON', url: 'https://aperion-istasyon.pages.dev/aperion-ust-akil' }
});

function parseEnv(text) {
  const output = {};
  for (const line of String(text || '').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) output[match[1]] = match[2];
  }
  return output;
}

function readConfig() {
  if (!fs.existsSync(SECRET_FILE)) throw new Error('AperiON cihaz anahtarı bulunamadı; önce --enroll çalıştırın.');
  const config = parseEnv(fs.readFileSync(SECRET_FILE, 'utf8'));
  if (!config.APERION_DEVICE_ID || !config.APERION_DEVICE_TOKEN) throw new Error('AperiON cihaz anahtarı eksik.');
  return {
    baseUrl: config.APERION_BASE_URL || DEFAULT_BASE_URL,
    deviceId: config.APERION_DEVICE_ID,
    token: config.APERION_DEVICE_TOKEN
  };
}

function enrollmentPayload(deviceId, timestamp, nonce) {
  return ['aperion-device-enroll-v1', deviceId, String(timestamp), nonce].join('\n');
}

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (_error) {
    throw new Error(`Sunucu geçersiz JSON döndürdü (${response.status}).`);
  }
}

function prepareEnrollmentRequest() {
  const bootstrapSecret = process.env.TELEGRAM_BOT_TOKEN || '';
  if (!bootstrapSecret) throw new Error('TELEGRAM_BOT_TOKEN yalnızca ilk eşleştirme için bu işlem ortamında bulunmalı.');

  const existing = fs.existsSync(SECRET_FILE) ? parseEnv(fs.readFileSync(SECRET_FILE, 'utf8')) : {};
  const deviceId = existing.APERION_DEVICE_ID || `windows-${crypto.randomUUID()}`;
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(32).toString('base64url');
  const proof = crypto.createHmac('sha256', bootstrapSecret)
    .update(enrollmentPayload(deviceId, timestamp, nonce))
    .digest('hex');
  const baseUrl = process.env.APERION_BASE_URL || existing.APERION_BASE_URL || DEFAULT_BASE_URL;
  fs.mkdirSync(SECRET_DIR, { recursive: true });
  fs.writeFileSync(ENROLL_REQUEST_FILE, JSON.stringify({
    base_url: baseUrl,
    device_id: deviceId,
    device_name: `${os.hostname()} / Windows`,
    timestamp,
    nonce,
    proof
  }), { encoding: 'utf8', mode: 0o600 });
  console.log(`Tek kullanımlık AperiON eşleştirme isteği hazırlandı: ${deviceId}`);
}

async function enrollFromRequest() {
  if (!fs.existsSync(ENROLL_REQUEST_FILE)) throw new Error('Tek kullanımlık eşleştirme isteği bulunamadı.');
  const request = JSON.parse(fs.readFileSync(ENROLL_REQUEST_FILE, 'utf8'));
  const baseUrl = request.base_url || DEFAULT_BASE_URL;
  const response = await fetch(`${baseUrl}/api/device/enroll`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      device_id: request.device_id,
      device_name: request.device_name,
      timestamp: request.timestamp,
      nonce: request.nonce,
      proof: request.proof
    })
  });
  const result = await readJson(response);
  if (!response.ok || !result.ok || !result.device_token) {
    throw new Error(`Cihaz eşleştirmesi başarısız: ${result.error || response.status}`);
  }
  fs.mkdirSync(SECRET_DIR, { recursive: true });
  fs.writeFileSync(
    SECRET_FILE,
    [
      `APERION_BASE_URL=${baseUrl}`,
      `APERION_DEVICE_ID=${result.device_id}`,
      `APERION_DEVICE_TOKEN=${result.device_token}`,
      ''
    ].join('\n'),
    { encoding: 'utf8', mode: 0o600 }
  );
  fs.rmSync(ENROLL_REQUEST_FILE, { force: true });
  console.log(`AperiON cihazı eşleştirildi: ${result.device_id}`);
  console.log(`Yetki kapsamı: ${(result.scopes || []).join(', ')}`);
}

function openTarget(targetKey) {
  const target = TARGETS[targetKey];
  if (!target) return { ok: false, summary: `İzin verilmeyen masaüstü hedefi reddedildi: ${targetKey}` };
  const child = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', target.url], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();
  return { ok: true, summary: `${target.title} bu bilgisayarda açıldı.` };
}

async function fetchCommand(config) {
  const response = await fetch(`${config.baseUrl}/api/device/commands`, {
    headers: { authorization: `Bearer ${config.token}` }
  });
  const result = await readJson(response);
  if (!response.ok || !result.ok) throw new Error(`Komut kuyruğu okunamadı: ${result.error || response.status}`);
  return result.command || null;
}

async function submitResult(config, command, outcome) {
  const response = await fetch(`${config.baseUrl}/api/device/commands`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      command_id: command.id,
      ok: outcome.ok,
      result_summary: outcome.summary
    })
  });
  const result = await readJson(response);
  if (!response.ok || !result.ok) throw new Error(`Komut sonucu bildirilemedi: ${result.error || response.status}`);
}

async function tick(config) {
  const command = await fetchCommand(config);
  if (!command) return false;
  const outcome = command.command === 'desktop_open_url'
    ? openTarget(command.target)
    : { ok: false, summary: `İzin verilmeyen cihaz komutu reddedildi: ${command.command}` };
  await submitResult(config, command, outcome);
  console.log(`[${new Date().toISOString()}] #${command.id}: ${outcome.summary}`);
  return true;
}

async function run() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--prepare-enroll')) {
    prepareEnrollmentRequest();
    return;
  }
  if (args.has('--enroll-from-request')) {
    await enrollFromRequest();
    return;
  }
  if (args.has('--enroll')) {
    prepareEnrollmentRequest();
    await enrollFromRequest();
    return;
  }
  if (args.has('--self-test')) {
    if (Object.keys(TARGETS).length !== 7) throw new Error('İzin listesi hedef sayısı beklenmiyor.');
    if (TARGETS.bizimhesap.url !== 'https://bizimhesap.com/web/ngn/newportal') throw new Error('BizimHesap hedefi bozuldu.');
    console.log('AperiON cihaz köprüsü öz testi geçti.');
    return;
  }
  const config = readConfig();
  if (args.has('--once')) {
    await tick(config);
    return;
  }
  console.log(`AperiON cihaz köprüsü çalışıyor: ${config.deviceId}`);
  for (;;) {
    try {
      await tick(config);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
