const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');
fs.mkdirSync(dataDir, { recursive: true });

loadEnv(path.join(root, '.env'));

const DEFAULT_SUPABASE_URL = 'https://iilfwosoroflzubkaryj.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW';
const SECURE_SERVICE_SECRET = path.join(root, '.aperion-secrets', 'supabase_service_role.secure');
const LEGACY_PROFILE_DIR = 'C:\\Users\\HP\\Desktop\\ErpaltH\\.bizimhesap-profile';
const SUPABASE_URL = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
const HAS_SECURE_SERVICE_SECRET = fs.existsSync(SECURE_SERVICE_SECRET);
const PROFILE_DIRS = [process.env.BIZIMHESAP_PROFILE_DIR, path.join(root, '.bizimhesap-profile'), LEGACY_PROFILE_DIR].filter(Boolean);
const HAS_SESSION_PROFILE = PROFILE_DIRS.some(dir => fs.existsSync(dir));
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const outJson = path.join(dataDir, 'aperion_system_preflight.json');
const outTxt = path.join(dataDir, 'aperion_system_preflight.txt');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const i = trimmed.indexOf('=');
    const key = trimmed.slice(0, i).trim();
    const value = trimmed.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function monthStart(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

function readJson(file, fallback = null) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

async function existsObject(name) {
  const { error } = await db.from(name).select('*').limit(1);
  return { ok: !error, detail: error?.message || 'var' };
}

async function countRows(table, filters = []) {
  let q = db.from(table).select('*', { count: 'exact', head: true });
  for (const f of filters) q = q[f.op](f.col, f.val);
  const { count, error } = await q;
  return { count: count || 0, error: error?.message || null };
}

async function rpcCheck(fn, payload) {
  try {
    const { error } = await db.rpc(fn, payload);
    return { ok: !error, detail: error?.message || 'var' };
  } catch (error) {
    return { ok: false, detail: error.message };
  }
}

function taskState(taskName) {
  const r = spawnSync('schtasks', ['/Query', '/TN', taskName, '/FO', 'LIST', '/V'], {
    encoding: 'utf8',
    stdio: 'pipe',
    shell: false,
  });
  const text = `${r.stdout || ''}\n${r.stderr || ''}`;
  if (r.status !== 0) return { ok: false, detail: 'görev bulunamadı' };
  const enabled = /Scheduled Task State:\s+Enabled/i.test(text);
  const next = (text.match(/Next Run Time:\s+(.+)/i) || [])[1]?.trim() || '-';
  const last = (text.match(/Last Run Time:\s+(.+)/i) || [])[1]?.trim() || '-';
  const result = (text.match(/Last Result:\s+(.+)/i) || [])[1]?.trim() || '-';
  return { ok: enabled, detail: `${enabled ? 'Enabled' : 'Disabled'} · next=${next} · last=${last} · result=${result}` };
}

function add(checks, area, name, ok, detail, severity = 'required') {
  checks.push({ area, name, ok: Boolean(ok), detail: String(detail || ''), severity });
}

async function main() {
  const checks = [];
  const now = new Date();
  const today = isoDate(now);
  const yesterday = isoDate(addDays(now, -1));
  const mStart = monthStart(now);
  const lastSync = readJson(path.join(dataDir, 'aperion_last_sync.json'), {});

  add(checks, 'config', 'BizimHesap persistent session', HAS_SESSION_PROFILE, HAS_SESSION_PROFILE ? 'profile var' : 'profile eksik', 'required');
  add(checks, 'config', 'BizimHesap password or session', Boolean(process.env.BIZIMHESAP_PASSWORD) || HAS_SESSION_PROFILE, process.env.BIZIMHESAP_PASSWORD ? 'password var' : (HAS_SESSION_PROFILE ? 'kalici oturum var' : 'eksik'), 'required');
  add(checks, 'config', 'Supabase secure local write secret', HAS_SERVICE_KEY || HAS_SECURE_SERVICE_SECRET, HAS_SERVICE_KEY ? 'environment var' : (HAS_SECURE_SERVICE_SECRET ? 'DPAPI encrypted file' : 'eksik'), 'required');
  add(checks, 'config', 'Supabase read key', Boolean(SUPABASE_URL && SUPABASE_KEY), SUPABASE_URL, 'required');
  add(checks, 'bot', 'last sync ok', lastSync?.ok === true, lastSync?.finishedAt || 'son senkron yok', 'required');
  for (const task of [
    'AperiON_BizimHesap_Klon_Saatlik',
    'AperiON_Ofis_Sabah_0805_Klon_Kontrol',
    'AperiON_Ofis_0800_Uyandir',
    'AperiON_Ofis_2000_Uyku',
  ]) {
    const st = taskState(task);
    add(checks, 'windows task', task, st.ok, st.detail, task.includes('Klon') ? 'required' : 'warning');
  }

  const salesToday = await countRows('sales_raw', [{ op: 'eq', col: 'firma_id', val: 'alayli' }, { op: 'eq', col: 'tarih', val: today }]);
  const salesYday = await countRows('sales_raw', [{ op: 'eq', col: 'firma_id', val: 'alayli' }, { op: 'eq', col: 'tarih', val: yesterday }]);
  const salesMonth = await countRows('sales_raw', [{ op: 'eq', col: 'firma_id', val: 'alayli' }, { op: 'gte', col: 'tarih', val: mStart }, { op: 'lte', col: 'tarih', val: today }]);
  add(checks, 'sales', 'today sales_raw', !salesToday.error && salesToday.count > 0, salesToday.error || `${salesToday.count} kayıt`, 'required');
  add(checks, 'sales', 'yesterday sales_raw', !salesYday.error && salesYday.count > 0, salesYday.error || `${salesYday.count} kayıt`, 'required');
  add(checks, 'sales', 'month sales_raw', !salesMonth.error && salesMonth.count > 0, salesMonth.error || `${salesMonth.count} kayıt`, 'required');

  const masrafMonth = await countRows('masraf_raw', [{ op: 'eq', col: 'firma_id', val: 'alayli' }, { op: 'gte', col: 'tarih', val: mStart }, { op: 'lte', col: 'tarih', val: today }]);
  const productRaw = await countRows('product_raw', [{ op: 'eq', col: 'firma_id', val: 'alayli' }]);
  add(checks, 'expenses', 'month masraf_raw', !masrafMonth.error && masrafMonth.count > 0, masrafMonth.error || `${masrafMonth.count} kayıt`, 'required');
  add(checks, 'stock', 'product_raw', !productRaw.error && productRaw.count > 0, productRaw.error || `${productRaw.count} kayıt`, 'required');

  for (const table of ['banka_raw', 'bank_transactions']) {
    const exists = await existsObject(table);
    const count = exists.ok ? await countRows(table, [{ op: 'eq', col: 'firma_id', val: 'alayli' }]) : { count: 0, error: exists.detail };
    add(checks, 'bank', table, exists.ok && !count.error, count.error || `${count.count} kayıt`, 'warning');
  }

  for (const table of [
    'finance_calendar_items',
    'finance_calendar_drawer_view',
    'finance_calendar_summary_view',
    'finance_calendar_action_log',
  ]) {
    const exists = await existsObject(table);
    add(checks, 'finance calendar', table, exists.ok, exists.detail, 'required');
  }
  const calMonth = await countRows('finance_calendar_drawer_view', [{ op: 'gte', col: 'calendar_date', val: mStart }, { op: 'lte', col: 'calendar_date', val: `${today}` }]);
  add(checks, 'finance calendar', 'current month calendar rows', !calMonth.error && calMonth.count > 0, calMonth.error || `${calMonth.count} kayıt`, 'required');

  for (const table of [
    'finance_account_cards',
    'finance_account_movements',
    'finance_due_plans',
    'aperion_approval_center',
    'bizimhesap_posting_queue',
    'bank_transactions_raw',
    'cash_transaction_suggestions',
  ]) {
    const exists = await existsObject(table);
    add(checks, 'cash command v57', table, exists.ok, exists.detail, 'warning');
  }

  const telegramToken = Boolean(process.env.TELEGRAM_BOT_TOKEN || process.env.APERION_TELEGRAM_BOT_TOKEN);
  const telegramChat = Boolean(process.env.TELEGRAM_ALLOWED_CHAT_ID || process.env.APERION_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_IDS);
  const bankApproveRpc = await rpcCheck('approve_bank_transaction_v58', { p_bank_transaction_id: 0, p_approved_by: 'preflight' });
  const bankRejectRpc = await rpcCheck('reject_bank_transaction_v58', { p_bank_transaction_id: 0, p_rejected_by: 'preflight' });
  add(checks, 'config', 'Supabase write path', HAS_SERVICE_KEY || HAS_SECURE_SERVICE_SECRET || (bankApproveRpc.ok && bankRejectRpc.ok), HAS_SERVICE_KEY ? 'service role var' : (HAS_SECURE_SERVICE_SECRET ? 'secure local runner' : 'approval RPC var'), 'required');
  add(checks, 'telegram', 'bot token', telegramToken, telegramToken ? 'var' : 'eksik', 'warning');
  add(checks, 'telegram', 'chat id', telegramChat, telegramChat ? 'var' : 'eksik', 'warning');
  add(checks, 'telegram', 'bank image bot file', fs.existsSync(path.join(root, 'telegram', 'aperion_bank_image_bot.cjs')), 'telegram/aperion_bank_image_bot.cjs', 'warning');
  add(checks, 'telegram', 'bank approve rpc', bankApproveRpc.ok, bankApproveRpc.detail, 'required');
  add(checks, 'telegram', 'bank reject rpc', bankRejectRpc.ok, bankRejectRpc.detail, 'required');

  const blocking = checks.filter(c => c.severity === 'required' && !c.ok);
  const warnings = checks.filter(c => c.severity === 'warning' && !c.ok);
  const report = {
    generated_at: now.toISOString(),
    status: blocking.length ? 'BLOCKED' : warnings.length ? 'WARNING' : 'OK',
    blocking_count: blocking.length,
    warning_count: warnings.length,
    checks,
  };

  const lines = [
    `AperiON sistem ön kontrol: ${report.status}`,
    `Tarih: ${report.generated_at}`,
    `Blokaj: ${blocking.length} · Uyarı: ${warnings.length}`,
    '',
    ...checks.map(c => `${c.ok ? 'OK' : c.severity === 'required' ? 'BLOK' : 'UYARI'} [${c.area}] ${c.name}: ${c.detail}`),
  ];
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2), 'utf8');
  fs.writeFileSync(outTxt, lines.join('\n'), 'utf8');
  console.log(lines.join('\n'));
  process.exitCode = blocking.length ? 1 : warnings.length ? 2 : 0;
}

main().catch(error => {
  console.error('RESULT: FAILED');
  console.error(error.message || error);
  process.exit(1);
});
