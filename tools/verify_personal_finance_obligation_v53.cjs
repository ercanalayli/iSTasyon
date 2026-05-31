const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sqlPath = path.join(root, 'finance', 'AperiON_Personal_Finance_Obligation_SQL_v53.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const required = [
  'personal_finance_obligations',
  'personal_finance_payments',
  'personal_finance_budget_rules',
  'personal_finance_alerts',
  'personal_finance_documents',
  'personal_finance_calc_next_due',
  'personal_finance_obligation_live_v53_view',
  'personal_finance_summary_v53_view',
  'personal_finance_alarm_feed_v53_view',
  'personal_finance_budget_status_v53_view',
  'personal_finance_category_template_v53_view',
  'scope',
  'expense_group',
  'expense_type',
  'next_due_date',
  'expected_amount',
  'average_amount',
  'verification_status',
  'alarm_days_before',
  'document_url',
  'telegram_file_id',
  'Kredi Kartlari',
  'Arac Giderleri',
  'Abonelikler',
  'Borc / Alacak'
];

const checks = required.map((token) => ({ name: token, ok: sql.includes(token) }));
let failed = 0;

console.log('AperiON v53 Personal Finance Obligation Verify');
console.log('---------------------------------------------');
for (const check of checks) {
  console.log(`${check.ok ? 'OK ' : 'ERR'} ${check.name}`);
  if (!check.ok) failed += 1;
}
console.log('---------------------------------------------');

if (failed) {
  console.log(`RESULT: FAILED - ${failed} kontrol eksik.`);
  process.exitCode = 1;
} else {
  console.log('RESULT: OK - v53 personal finance obligation SQL verified.');
}
