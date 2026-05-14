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

function testMokaPipeline() {
  execSync('node moka_bank_pipeline.cjs test_data/moka_bank_sample.csv alayli', { stdio: 'pipe' });
  const out = readJson('./finance_imports/moka_approval_queue_alayli_demo.json');
  assert(out.queue.length === 2, 'Moka pipeline 2 kayıt üretmeli');
  assert(out.summary.total === 305000, 'Moka pipeline toplamı 305000 olmalı');
  assert(out.queue.every(r => r.record_type === 'tahsilat'), 'Moka kayıtları tahsilat olmalı');
  assert(out.queue.every(r => r.approval_status === 'onay_bekliyor'), 'Moka kayıtları onay beklemeli');
  console.log('OK Moka pipeline');
}

function testSalesSummaryFile() {
  const p = 'data/sales_report_summary_2025_2026.json';
  assert(fs.existsSync(p), 'Satış özet JSON dosyası yok');
  const j = readJson(p);
  assert(j.grand_total.Toplam === 46028223.72, 'Satış genel toplamı beklenen değer değil');
  console.log('OK sales summary');
}

function testSalesDashboardAdapterSource() {
  const p = 'sales_dashboard_adapter.js';
  assert(fs.existsSync(p), 'Satış dashboard adapter dosyası yok');
  const src = fs.readFileSync(p, 'utf8');
  assert(src.includes('buildSalesDashboard'), 'buildSalesDashboard fonksiyonu yok');
  assert(src.includes('top_customers'), 'top_customers üretimi yok');
  assert(src.includes('top_products'), 'top_products üretimi yok');
  assert(src.includes('top_categories'), 'top_categories üretimi yok');
  assert(src.includes('buildFinanceQueueFromSalesDashboard'), 'Satıştan finans kuyruğu üretimi yok');
  console.log('OK sales dashboard adapter source');
}

function testCommandCenterFiles() {
  assert(fs.existsSync('finance-command-center.html'), 'Finans Komuta Merkezi HTML yok');
  assert(fs.existsSync('finance-command-center-live.html'), 'Live-ready Finans Komuta Merkezi HTML yok');
  assert(fs.existsSync('supabase_finance_command_center_schema.sql'), 'Komuta Merkezi şema SQL yok');
  assert(fs.existsSync('supabase_finance_command_center_seed.sql'), 'Komuta Merkezi seed SQL yok');
  assert(fs.existsSync('SUPABASE_COMMAND_CENTER_INSTALL.sql'), 'Komuta Merkezi tek dosya SQL yok');
  assert(fs.existsSync('supabase_command_center_health_check.sql'), 'Komuta Merkezi health check SQL yok');
  const html = fs.readFileSync('finance-command-center.html', 'utf8');
  const live = fs.readFileSync('finance-command-center-live.html', 'utf8');
  assert(html.includes('Bugün Ödenecekler'), 'Bugün Ödenecekler alanı yok');
  assert(html.includes('Bugün Tahsil Edilecekler'), 'Bugün Tahsil Edilecekler alanı yok');
  assert(html.includes('Yapılacaklar'), 'Yapılacaklar alanı yok');
  assert(html.includes('Telegram Alarm Merkezi'), 'Telegram Alarm Merkezi yok');
  assert(live.includes('finance_command_center_records'), 'Live ekran Supabase komuta merkezi tablosunu okumuyor');
  assert(live.includes('DEMO MOD'), 'Live ekran demo fallback içermiyor');
  assert(!html.includes('<canvas'), 'Finans Komuta Merkezi grafik/canvas içermemeli');
  assert(!live.includes('<canvas'), 'Live Finans Komuta Merkezi grafik/canvas içermemeli');
  const schema = fs.readFileSync('supabase_finance_command_center_schema.sql', 'utf8');
  const installer = fs.readFileSync('SUPABASE_COMMAND_CENTER_INSTALL.sql', 'utf8');
  const health = fs.readFileSync('supabase_command_center_health_check.sql', 'utf8');
  assert(schema.includes('finance_command_center_records'), 'Komuta merkezi ana tablo yok');
  assert(schema.includes('finance_telegram_alarm_queue'), 'Telegram alarm kuyruğu yok');
  assert(schema.includes('finance_command_center_action_log'), 'Aksiyon log tablosu yok');
  assert(installer.includes('finance_command_center_records'), 'Tek dosya kurulumda ana tablo yok');
  assert(installer.includes('finance_telegram_alarm_queue'), 'Tek dosya kurulumda Telegram kuyruğu yok');
  assert(installer.includes('finance_command_center_action_log'), 'Tek dosya kurulumda aksiyon logu yok');
  assert(health.includes('finance_command_center_records'), 'Health check ana tabloyu kontrol etmiyor');
  assert(health.includes('finance_command_center_late'), 'Health check gecikenleri kontrol etmiyor');
  assert(health.includes('finance_telegram_alarm_queue'), 'Health check alarm kuyruğunu kontrol etmiyor');
  console.log('OK finance command center files');
}

function testSchemaFiles() {
  assert(fs.existsSync('supabase_finans_takvimi_schema.sql'), 'Şema SQL yok');
  assert(fs.existsSync('supabase_finans_demo_seed.sql'), 'Seed SQL yok');
  assert(fs.existsSync('supabase_finans_validation_safe.sql'), 'Safe validation SQL yok');
  assert(fs.existsSync('supabase_finans_health_check.sql'), 'Health check SQL yok');
  const schema = fs.readFileSync('supabase_finans_takvimi_schema.sql', 'utf8');
  assert(schema.includes('finance_calendar_records'), 'finance_calendar_records şemada yok');
  assert(schema.includes('moka_united_movements'), 'moka_united_movements şemada yok');
  console.log('OK schema files');
}

function testBusinessCalendarSource() {
  const p = 'turkiye_business_calendar.js';
  assert(fs.existsSync(p), 'Türkiye iş günü takvimi dosyası yok');
  const src = fs.readFileSync(p, 'utf8');
  assert(src.includes("['2026-05-30', 'Kurban Bayramı 4. Gün']"), '2026 Kurban Bayramı 4. gün yok');
  assert(src.includes("['2027-03-09', 'Ramazan Bayramı 1. Gün']"), '2027 Ramazan Bayramı 1. gün yok');
  assert(src.includes("['2027-05-16', 'Kurban Bayramı 1. Gün']"), '2027 Kurban Bayramı 1. gün yok');
  assert(src.includes('actualPaymentDate'), 'actualPaymentDate fonksiyonu yok');
  assert(src.includes('isBusinessDay'), 'isBusinessDay fonksiyonu yok');
  console.log('OK business calendar source');
}

function main() {
  testSchemaFiles();
  testCommandCenterFiles();
  testSalesSummaryFile();
  testSalesDashboardAdapterSource();
  testBusinessCalendarSource();
  testPipeline();
  testMokaPipeline();
  console.log('AperiON Finans smoke test başarılı.');
}

main();
