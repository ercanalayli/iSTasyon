const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'finance_imports', 'hattat', 'hattat_monthly_payment_plan_verify.json');
const script = path.join(root, 'tools', 'build_hattat_monthly_payment_plan_v108.cjs');

try {
  execFileSync(process.execPath, [script, `--out=${out}`], { cwd: root, stdio: 'pipe' });
  const plan = JSON.parse(fs.readFileSync(out, 'utf8'));
  const checks = [
    ['kaynak adı', plan.source === 'hattat_musavir_monthly_payment_list'],
    ['en az altı PDF', plan.summary.files >= 6],
    ['ödeme adayları', plan.summary.payment_candidates > 0],
    ['tahakkuk notu', /tahakkuk/i.test(plan.payment_status_note || '')],
    ['banka ödemesi varsayımı yok', plan.finance_calendar_items.every((item) => item.payment_status === 'unknown')],
    ['mükerrer anahtarlar', new Set(plan.finance_calendar_items.map((item) => item.source_id)).size === plan.finance_calendar_items.length],
    ['vade ve tutar', plan.finance_calendar_items.every((item) => item.original_due_date && item.expected_amount > 0)],
  ];
  for (const [name, ok] of checks) console.log(`${ok ? 'OK' : 'HATA'}: ${name}`);
  if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
  else console.log('SONUC: BASARILI');
} catch (error) {
  console.error('SONUC: BASARISIZ'); console.error(error.message || error); process.exitCode = 1;
}
