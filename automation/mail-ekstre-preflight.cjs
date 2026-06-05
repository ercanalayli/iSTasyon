const fs = require('fs');
const path = require('path');

const root = __dirname;
const outDir = path.join(root, 'logs');
fs.mkdirSync(outDir, { recursive: true });

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith('#') || !s.includes('=')) continue;
    const i = s.indexOf('=');
    const k = s.slice(0, i).trim();
    const v = s.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (k && process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnv(path.join(root, '.env'));
loadEnv(path.join(root, '..', '.env'));

const checks = [];
function add(area, name, ok, detail, severity = 'required') {
  checks.push({ area, name, ok: Boolean(ok), detail: String(detail || ''), severity });
}

const cfgPath = path.join(root, 'mail-ekstre-config.json');
const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : null;

add('config', 'mail-ekstre-config.json', Boolean(cfg), cfgPath);
add('config', 'mailbox', cfg?.mailbox === 'alaylimedikal@gmail.com', cfg?.mailbox || 'eksik');
add('config', 'company_id', cfg?.company_id === 'alayli', cfg?.company_id || 'eksik');
add('config', 'Google client id', Boolean(process.env.GOOGLE_CLIENT_ID), process.env.GOOGLE_CLIENT_ID ? 'var' : 'eksik');
add('config', 'Google client secret', Boolean(process.env.GOOGLE_CLIENT_SECRET), process.env.GOOGLE_CLIENT_SECRET ? 'var' : 'eksik');
add('config', 'Google refresh token', Boolean(process.env.GOOGLE_REFRESH_TOKEN), process.env.GOOGLE_REFRESH_TOKEN ? 'var' : 'eksik');
add('config', 'Drive ekstre folder id', Boolean(process.env.GDRIVE_EKSTRE_FOLDER_ID), process.env.GDRIVE_EKSTRE_FOLDER_ID || 'eksik', 'warning');
add('config', 'Supabase url', Boolean(process.env.SUPABASE_URL), process.env.SUPABASE_URL || 'eksik');
add('config', 'Supabase service key', Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), process.env.SUPABASE_SERVICE_ROLE_KEY ? 'var' : 'eksik');

for (const file of [
  'gmail-oauth-start.js',
  'gmail-oauth-finish.js',
  'gmail-probe-lite.js',
  'aperion-onay-monitor.js',
  'lib/gmail-auth.js',
  'lib/gmail-search.js',
  'lib/pending-normalize.js',
  'parsers/isbank-parser.js',
  'parsers/index.js',
  'sql/001_pending_bank_movements.sql',
  'sql/002_bizimhesap_queue.sql',
  'sql/003_approve_pending_to_queue.sql',
  'sql/005_ingest_mail_bank_movements.sql'
]) {
  add('file', file, fs.existsSync(path.join(root, file)), file);
}

const blocking = checks.filter(x => x.severity === 'required' && !x.ok);
const report = {
  generated_at: new Date().toISOString(),
  status: blocking.length ? 'BLOCKED' : 'OK',
  blocking_count: blocking.length,
  checks
};

const lines = [
  `AperiON Mail Ekstre preflight: ${report.status}`,
  `Blokaj: ${blocking.length}`,
  '',
  ...checks.map(c => `${c.ok ? 'OK' : c.severity === 'warning' ? 'UYARI' : 'BLOK'} [${c.area}] ${c.name}: ${c.detail}`)
];

fs.writeFileSync(path.join(outDir, 'mail-ekstre-preflight.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(outDir, 'mail-ekstre-preflight.txt'), lines.join('\n'));
console.log(lines.join('\n'));
process.exitCode = blocking.length ? 1 : 0;
