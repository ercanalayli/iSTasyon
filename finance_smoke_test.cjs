const fs = require('fs');
const { execSync } = require('child_process');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function testPipeline() {
  execSync('node bizimhesap_finance_pipeline.cjs test_data/bizimhesap_finance_sample.csv alayli', { stdio: 'pipe' });
  const out = readJson('./finance_imports/approval_queue_alayli_demo.json');
  assert(out.queue.length === 5, 'Pipeline 5 kayıt üretmeli');
  assert(out.summary.total > 1900000, 'Pipeline toplam tutar beklenen aralıkta değil');
  assert(out.queue.every(r => r.approval_status === 'onay_bekliyor'), 'Tüm kayıtlar onay beklemeli');
  console.log('OK pipeline');
}

function testSalesSummaryFile() {
  const p = 'data/sales_report_summary_2025_2026.json';
  assert(fs.existsSync(p), 'Satış özet JSON dosyası yok');
  const j = readJson(p);
  assert(j.grand_total.Toplam === 46028223.72, 'Satış genel toplamı beklenen değer değil');
  console.log('OK sales summary');
}

function testSchemaFiles() {
  assert(fs.existsSync('supabase_finans_takvimi_schema.sql'), 'Şema SQL yok');
  assert(fs.existsSync('supabase_finans_demo_seed.sql'), 'Seed SQL yok');
  const schema = fs.readFileSync('supabase_finans_takvimi_schema.sql', 'utf8');
  assert(schema.includes('finance_calendar_records'), 'finance_calendar_records şemada yok');
  assert(schema.includes('moka_united_movements'), 'moka_united_movements şemada yok');
  console.log('OK schema files');
}

function main() {
  testSchemaFiles();
  testSalesSummaryFile();
  testPipeline();
  console.log('AperiON Finans smoke test başarılı.');
}

main();
