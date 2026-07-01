const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const root = __dirname;
const outDir = path.join(root, 'logs');
fs.mkdirSync(outDir, { recursive: true });

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith('#') || !s.includes('=')) continue;
    const i = s.indexOf('=');
    const key = s.slice(0, i).trim();
    const value = s.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(label, fn, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const message = error.message || String(error);
      const transient = /premature close|econnreset|etimedout|socket|network|fetch failed/i.test(message);
      if (!transient || attempt === retries) break;
      console.log(`${label} gecici hata, tekrar deneniyor (${attempt}/${retries}): ${message}`);
      await sleep(1500 * attempt);
    }
  }
  throw lastError;
}

function classify(error) {
  const message = error.message || String(error);
  if (/invalid_grant/i.test(message)) {
    return {
      code: 'invalid_grant',
      action: 'GOOGLE_REFRESH_TOKEN gecersiz/iptal olmus. alaylimedikal@gmail.com icin yeni Gmail OAuth refresh token uretilip GitHub secret olarak guncellenmeli.',
    };
  }
  if (/invalid_client/i.test(message)) {
    return {
      code: 'invalid_client',
      action: 'GOOGLE_CLIENT_ID veya GOOGLE_CLIENT_SECRET hatali. GitHub repository secrets kontrol edilmeli.',
    };
  }
  if (/premature close|econnreset|etimedout|socket|network|fetch failed/i.test(message)) {
    return {
      code: 'oauth_network',
      action: 'Google OAuth token istegi baglantida koptu. Tekrar denenebilir; devam ederse refresh token yenileme yapilmali.',
    };
  }
  return {
    code: 'unknown',
    action: 'Gmail OAuth hatasi incelenmeli.',
  };
}

async function main() {
  loadEnv(path.join(root, '.env'));
  loadEnv(path.join(root, '..', '.env'));

  const mailbox = process.env.GMAIL_MAILBOX || 'alaylimedikal@gmail.com';
  const report = {
    checked_at: new Date().toISOString(),
    mailbox,
    ok: false,
    code: '',
    action: '',
    found_count: 0,
    error: '',
  };

  try {
    if (!process.env.GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID eksik');
    if (!process.env.GOOGLE_CLIENT_SECRET) throw new Error('GOOGLE_CLIENT_SECRET eksik');
    if (!process.env.GOOGLE_REFRESH_TOKEN) throw new Error('GOOGLE_REFRESH_TOKEN eksik');
    if (mailbox !== 'alaylimedikal@gmail.com') throw new Error(`Yanlis mailbox: ${mailbox}`);

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost'
    );
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    await withRetry('Google access token', () => auth.getAccessToken());

    const gmail = google.gmail({ version: 'v1', auth });
    const query = `to:${mailbox} newer_than:1d`;
    const res = await withRetry('Gmail probe', () => gmail.users.messages.list({ userId: 'me', q: query, maxResults: 1 }));
    const messages = res.data.messages || [];
    report.ok = true;
    report.code = 'ok';
    report.action = 'Gmail OAuth calisiyor.';
    report.found_count = messages.length;
    report.query = query;
  } catch (error) {
    const info = classify(error);
    report.ok = false;
    report.code = info.code;
    report.action = info.action;
    report.error = error.message || String(error);
  }

  fs.writeFileSync(path.join(outDir, 'gmail-oauth-check.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
