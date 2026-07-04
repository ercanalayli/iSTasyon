const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sqlPath = path.join(root, 'supabase_security_hardening_v77.sql');
const pkgPath = path.join(root, 'package.json');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function check(name, ok, detail = '') {
  return { name, ok: Boolean(ok), detail };
}

const sql = read(sqlPath);
const pkg = JSON.parse(read(pkgPath));

const checks = [
  check('hardening sql exists', fs.existsSync(sqlPath), sqlPath),
  check('firma helper uses auth.uid', /kullanici_firma_idler\(\)[\s\S]*auth\.uid\(\)/.test(sql)),
  check('helper pins search_path', /set\s+search_path\s*=\s*public/i.test(sql)),
  check('pending movement approval revokes anon', /revoke\s+execute\s+on\s+function\s+public\.approve_pending_bank_movement\(uuid,\s*text\)\s+from\s+anon/i.test(sql)),
  check('legacy bank approval revokes anon', /revoke\s+execute\s+on\s+function\s+public\.approve_bank_transaction_v58\(bigint,\s*text\)\s+from\s+anon/i.test(sql)),
  check('finance paid action revokes anon', /revoke\s+execute\s+on\s+function\s+public\.finance_calendar_mark_paid\(bigint,\s*numeric,\s*text,\s*text\)\s+from\s+anon/i.test(sql)),
  check('finance done action revokes anon', /revoke\s+execute\s+on\s+function\s+public\.finance_calendar_mark_done\(bigint,\s*text,\s*text\)\s+from\s+anon/i.test(sql)),
  check('finance postpone action revokes anon', /revoke\s+execute\s+on\s+function\s+public\.finance_calendar_postpone\(bigint,\s*date,\s*text,\s*text\)\s+from\s+anon/i.test(sql)),
  check('finance reject action revokes anon', /revoke\s+execute\s+on\s+function\s+public\.finance_calendar_reject\(bigint,\s*text,\s*text\)\s+from\s+anon/i.test(sql)),
  check('finance create plan revokes anon', /revoke\s+execute\s+on\s+function\s+public\.finance_calendar_create_plan\(text,\s*text,\s*text,\s*text,\s*text,\s*text,\s*text,\s*text,\s*text,\s*numeric,\s*date,\s*date,\s*text,\s*text,\s*text,\s*text,\s*text,\s*text\)\s+from\s+anon/i.test(sql)),
  check('bank_transactions broad anon policies dropped', sql.includes('drop policy if exists "bank_transactions anon approval update"')),
  check('banka_raw broad anon policy dropped', sql.includes('drop policy if exists "banka_raw anon all"')),
  check('bizimhesap_events anon write dropped', sql.includes('drop policy if exists "bizimhesap_events anon write"')),
  check('product_raw anon write dropped', sql.includes('drop policy if exists "product_raw anon write"')),
  check('audit_logs anon insert dropped', sql.includes('drop policy if exists "audit_logs anon insert"')),
  check('bank_transactions anon select revoked', /revoke\s+select\s+on\s+public\.bank_transactions\s+from\s+anon/i.test(sql)),
  check('banka_raw anon select revoked', /revoke\s+select\s+on\s+public\.banka_raw\s+from\s+anon/i.test(sql)),
  check('product_raw anon select revoked', /revoke\s+select\s+on\s+public\.product_raw\s+from\s+anon/i.test(sql)),
  check('audit_logs anon select revoked', /revoke\s+select\s+on\s+public\.audit_logs\s+from\s+anon/i.test(sql)),
  check('anon table writes revoked', /revoke\s+insert,\s*update,\s*delete\s+on\s+public\.bank_transactions\s+from\s+anon/i.test(sql)),
  check('authenticated table writes revoked', /revoke\s+insert,\s*update,\s*delete\s+on\s+public\.bank_transactions\s+from\s+authenticated/i.test(sql)),
  check('anon sequence access revoked', /revoke\s+usage,\s*select\s+on\s+sequence\s+%s\s+from\s+anon/i.test(sql)),
  check('authenticated sequence access revoked', /revoke\s+usage,\s*select\s+on\s+sequence\s+%s\s+from\s+authenticated/i.test(sql)),
  check('authenticated read policies recreated by firma', /create\s+policy\s+"bank_transactions authenticated read"[\s\S]*firma_id\s+in\s+\(select\s+public\.kullanici_firma_idler\(\)\)/i.test(sql)),
  check('pgrst reload included', /notify\s+pgrst,\s*'reload schema'/i.test(sql)),
  check('npm script registered', pkg.scripts && pkg.scripts['verify:supabase-security-hardening'] === 'node tools/verify_supabase_security_hardening_v77.cjs'),
];

let okCount = 0;
for (const item of checks) {
  if (item.ok) okCount += 1;
  console.log(`${item.ok ? 'OK' : 'FAIL'} ${item.name}${item.detail ? ` - ${item.detail}` : ''}`);
}

const failed = checks.filter((item) => !item.ok);
console.log(`\nSupabase security hardening checks: ${okCount}/${checks.length}`);
if (failed.length) {
  process.exitCode = 1;
}
