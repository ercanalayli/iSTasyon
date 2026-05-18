import fs from 'fs';

let failed = 0;

function read(path) {
  return fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
}

function check(name, ok) {
  console.log(`${ok ? 'OK ' : 'ERR'} ${name}`);
  if (!ok) failed++;
}

const planPath = 'finance/AperiON_Financial_Statement_Engine_v54.md';
const sqlPath = 'finance/AperiON_Financial_Statement_Engine_SQL_v54.sql';
const seedPath = 'finance/AperiON_Financial_Statement_Engine_Seed_v54.sql';
const healthPath = 'finance/AperiON_Financial_Statement_Engine_Healthcheck_v54.sql';
const previewPath = 'preview/aperion_v53_financial_center_preview.html';
const cloudflarePath = 'deploy/AperiON_Cloudflare_Pages_Setup.md';

const plan = read(planPath);
const sql = read(sqlPath);
const seed = read(seedPath);
const health = read(healthPath);
const preview = read(previewPath);
const cloudflare = read(cloudflarePath);

console.log('AperiON Financial Statement Engine v54 Verify');
console.log('------------------------------------------------');

check('v54 plan exists', Boolean(plan));
check('v54 SQL exists', Boolean(sql));
check('v54 seed exists', Boolean(seed));
check('v54 healthcheck exists', Boolean(health));
check('v53 preview exists', Boolean(preview));
check('Cloudflare Pages setup exists', Boolean(cloudflare));

check('Plan defines finance_events_v54', plan.includes('finance_events_v54'));
check('Plan defines financial_statement_engine', plan.includes('financial_statement_engine'));
check('SQL creates finance_events_v54', sql.includes('create table if not exists finance_events_v54'));
check('SQL creates finance_ledger_v54', sql.includes('create table if not exists finance_ledger_v54'));
check('SQL has event to ledger function', sql.includes('finance_event_to_ledger_v54'));
check('SQL has income statement view', sql.includes('financial_income_statement_v54_view'));
check('SQL has balance sheet view', sql.includes('financial_balance_sheet_v54_view'));
check('SQL has KPI summary view', sql.includes('financial_kpi_summary_v54_view'));
check('SQL has reconciliation alerts view', sql.includes('financial_reconciliation_alerts_v54_view'));
check('SQL maps sale event', sql.includes("e.event_type = 'sale'"));
check('SQL maps collection event', sql.includes("e.event_type = 'collection'"));
check('SQL maps payment event', sql.includes("e.event_type = 'payment'"));
check('SQL maps Moka collection', sql.includes("e.event_type = 'moka_collection'"));
check('SQL maps Moka bank transfer', sql.includes("e.event_type = 'moka_bank_transfer'"));

check('Seed uses safe demo company', seed.includes('ALAYLI_DEMO_V54'));
check('Seed includes sale demo', seed.includes("'sale'"));
check('Seed includes COGS demo', seed.includes('cost_of_goods_sold'));
check('Seed includes Moka demo', seed.includes('moka_collection'));
check('Seed rebuilds ledger', seed.includes('finance_rebuild_ledger_v54'));

check('Healthcheck queries event table', health.includes('finance_events_v54'));
check('Healthcheck queries ledger table', health.includes('finance_ledger_v54'));
check('Healthcheck queries income statement', health.includes('financial_income_statement_v54_view'));
check('Healthcheck queries balance sheet', health.includes('financial_balance_sheet_v54_view'));
check('Healthcheck queries KPI', health.includes('financial_kpi_summary_v54_view'));
check('Healthcheck queries alerts', health.includes('financial_reconciliation_alerts_v54_view'));

check('Preview has dynamic income statement', preview.includes('Dinamik Gelir Tablosu'));
check('Preview has dynamic balance sheet', preview.includes('Dinamik Bilanço'));
check('Preview has zero keyboard actions', preview.includes('Zero Keyboard'));
check('Cloudflare setup has project name', cloudflare.includes('aperion-istasyon'));

console.log('------------------------------------------------');
if (failed) {
  console.log(`RESULT: FAILED - ${failed} kontrol eksik.`);
  process.exitCode = 1;
} else {
  console.log('RESULT: OK - Financial Statement Engine v54 verification passed.');
}
