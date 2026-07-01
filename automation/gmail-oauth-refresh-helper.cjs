const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const mode = (process.argv[2] || process.env.OAUTH_MODE || 'start').toLowerCase();
const code = process.argv[3] || process.env.GOOGLE_OAUTH_CODE || '';
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob';
const mailbox = process.env.GMAIL_MAILBOX || 'alaylimedikal@gmail.com';

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!clientId) fail('GOOGLE_CLIENT_ID GitHub secret eksik.');
if (!clientSecret) fail('GOOGLE_CLIENT_SECRET GitHub secret eksik.');
if (mailbox !== 'alaylimedikal@gmail.com') fail(`Yanlis Gmail hesabi: ${mailbox}`);

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
const outDir = path.join(__dirname, 'logs');
fs.mkdirSync(outDir, { recursive: true });

async function start() {
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    login_hint: mailbox,
  });
  console.log('GMAIL_OAUTH_URL_BEGIN');
  console.log(url);
  console.log('GMAIL_OAUTH_URL_END');
  fs.writeFileSync(path.join(outDir, 'gmail-oauth-url.txt'), `${url}\n`, 'utf8');
  console.log('Bu linki ac, sadece alaylimedikal@gmail.com ile izin ver, Google code degerini kopyala.');
  console.log('Sonra workflowu mode=finish ve google_oauth_code=CODE ile tekrar calistir.');
}

async function finish() {
  if (!code) fail('GOOGLE_OAUTH_CODE gerekli. Workflow input google_oauth_code alanina Google code girilmeli.');
  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    fail('Refresh token gelmedi. Start modunu tekrar calistir; izin ekraninda alaylimedikal@gmail.com secili ve prompt=consent olmali.');
  }
  console.log('GOOGLE_REFRESH_TOKEN_BEGIN');
  console.log(tokens.refresh_token);
  console.log('GOOGLE_REFRESH_TOKEN_END');
  fs.writeFileSync(path.join(outDir, 'gmail-refresh-token.txt'), `${tokens.refresh_token}\n`, 'utf8');
  console.log('Bu refresh token degerini GitHub Repository Secret GOOGLE_REFRESH_TOKEN olarak guncelle.');
}

if (mode === 'start') {
  start().catch((error) => fail(error.message || String(error)));
} else if (mode === 'finish') {
  finish().catch((error) => fail(error.message || String(error)));
} else {
  fail(`Bilinmeyen mode: ${mode}. start veya finish kullan.`);
}
