const fs = require("fs");
const path = require("path");

const root = process.cwd();
const sqlPath = path.join(root, "finance", "AperiON_Cash_Command_Center_SQL_v57.sql");

const requiredTokens = [
  "finance_account_cards",
  "finance_account_movements",
  "finance_documents",
  "finance_due_plans",
  "moka_pos_rules",
  "moka_pos_collections",
  "moka_pos_installments",
  "bank_mail_inbox",
  "bank_statement_files",
  "bank_transactions_raw",
  "cash_transaction_suggestions",
  "aperion_finance_entries",
  "aperion_finance_entry_lines",
  "aperion_finance_entry_source_links",
  "aperion_approval_center",
  "bizimhesap_posting_queue",
  "bizimhesap_posting_log",
  "cash_approval_log",
  "finance_reconciliation_logs",
  "create_moka_pos_installment_plan",
  "approve_and_queue_finance_entry",
  "finance_account_cards_live_v57_view",
  "finance_account_balance_summary_v57_view",
  "moka_pos_expected_v57_view",
  "finance_due_today_v57_view",
  "finance_due_week_v57_view",
  "finance_due_month_v57_view",
  "finance_cash_position_v57_view",
  "cash_dashboard_period_metrics_v57_view",
  "cash_approval_waiting_v57_view",
  "finance_reconciliation_status_v57_view",
  "cash_forecast_v57_view",
  "Varsayılan 40 Günlük Taksit Planı",
  "first_installment_delay_days",
  "installment_interval_days",
  "dry_run boolean not null default true",
  "Onaysız hiçbir hareket kesin finans kaydı"
];

function fail(message) {
  console.error("❌ " + message);
  process.exitCode = 1;
}

function pass(message) {
  console.log("✅ " + message);
}

if (!fs.existsSync(sqlPath)) {
  fail("SQL dosyası bulunamadı: " + sqlPath);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, "utf8");

pass("SQL dosyası bulundu: finance/AperiON_Cash_Command_Center_SQL_v57.sql");

for (const token of requiredTokens) {
  if (!sql.includes(token)) {
    fail("Eksik içerik: " + token);
  } else {
    pass("Bulundu: " + token);
  }
}

const forbiddenTokens = [
  "1K",
  "1M",
  "Kısaltılmış tutar",
  "otomatik kesin kayıt",
  "onaysız processed"
];

for (const token of forbiddenTokens) {
  if (sql.includes(token)) {
    fail("Riskli / yasak içerik bulundu: " + token);
  }
}

const tableCount = (sql.match(/create table if not exists/gi) || []).length;
const viewCount = (sql.match(/create or replace view/gi) || []).length;
const functionCount = (sql.match(/create or replace function/gi) || []).length;

console.log("");
console.log("📊 v57 SQL özet:");
console.log("- Tablo sayısı:", tableCount);
console.log("- View sayısı:", viewCount);
console.log("- Fonksiyon sayısı:", functionCount);

if (tableCount < 15) fail("Beklenen tablo sayısı düşük görünüyor.");
if (viewCount < 8) fail("Beklenen view sayısı düşük görünüyor.");
if (functionCount < 2) fail("Beklenen fonksiyon sayısı düşük görünüyor.");

if (process.exitCode) {
  console.error("");
  console.error("❌ v57 Cash Command Center verify başarısız.");
  process.exit(process.exitCode);
}

console.log("");
console.log("✅ v57 Cash Command Center verify başarılı.");
