const fs = require('fs');

const requiredFiles = [
  'APERION_FINANCE_CHANGELOG.md',
  'FINANCE_SETUP.md',
  'NEXT_ACTIONS_FINANCE.md',
  'finans-takvimi.html',
  'finans-komuta-merkezi.html',
  'finance-command-center.html',
  'finance-command-center-live.html',
  'aperion-finans-takvimi-live.html',
  'finance_dashboard_embed.html',
  'SUPABASE_FINANCE_INSTALL_ALL.sql',
  'SUPABASE_COMMAND_CENTER_INSTALL.sql',
  'supabase_finans_takvimi_schema.sql',
  'supabase_finance_command_center_schema.sql',
  'supabase_finance_command_center_seed.sql',
  'supabase_command_center_health_check.sql',
  'supabase_finans_validation_safe.sql',
  'supabase_finans_health_check.sql',
  'finance_import_bridge.js',
  'finance_approval_center.js',
  'finance_approval_actions.js',
  'finance_supabase_adapter.js',
  'finance_command_center_adapter.js',
  'bizimhesap_finance_pipeline.cjs',
  'moka_bank_pipeline.cjs',
  'moka_united_reconciliation.js',
  'sales_dashboard_adapter.js',
  'turkiye_business_calendar.js',
  'finance_smoke_test.cjs',
  'finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql',
  'finance/AperiON_Risk_Alert_Dedup_Health_Check_v52.sql',
  'finance/AperiON_Risk_Alert_Dedup_Supabase_Runbook_v52.md',
  'finance/AperiON_v52_RELEASE_NOTES.md',
  'telegram/aperion_critical_risk_alert_v52.js',
  'telegram/aperion_critical_risk_alert_v52_test_runner.js',
  'telegram/AperiON_Risk_Alert_Dedup_Scheduler_v52.md',
  'telegram/AperiON_Risk_Alert_Dedup_Rollback_v52.md',
  'telegram/AperiON_Risk_Alert_Dedup_GoLive_Checklist_v52.md',
  'tools/verify_risk_alert_dedup_v52.js',
  'test_data/bizimhesap_finance_sample.csv',
  'test_data/moka_bank_sample.csv',
  'data/sales_report_summary_2025_2026.json',
  '.github/workflows/finance-smoke.yml',
  '.github/workflows/finance-inject-index.yml',
  '.github/workflows/finance-full-check.yml',
  '.github/workflows/command-center-inject-index.yml'
];

const requiredContent = [
  { file: 'SUPABASE_FINANCE_INSTALL_ALL.sql', text: 'finance_calendar_records', label: 'ana finans tablosu' },
  { file: 'SUPABASE_FINANCE_INSTALL_ALL.sql', text: 'moka_united_movements', label: 'Moka tablosu' },
  { file: 'SUPABASE_COMMAND_CENTER_INSTALL.sql', text: 'finance_command_center_records', label: 'Komuta Merkezi tek dosya ana tablo' },
  { file: 'SUPABASE_COMMAND_CENTER_INSTALL.sql', text: 'finance_telegram_alarm_queue', label: 'Komuta Merkezi tek dosya Telegram kuyruğu' },
  { file: 'SUPABASE_COMMAND_CENTER_INSTALL.sql', text: 'finance_command_center_action_log', label: 'Komuta Merkezi tek dosya aksiyon logu' },
  { file: 'supabase_command_center_health_check.sql', text: 'finance_command_center_records', label: 'Komuta Merkezi health check ana tablo' },
  { file: 'supabase_command_center_health_check.sql', text: 'finance_command_center_late', label: 'Komuta Merkezi health check gecikenler' },
  { file: 'supabase_command_center_health_check.sql', text: 'finance_telegram_alarm_queue', label: 'Komuta Merkezi health check alarm kuyruğu' },
  { file: 'finance-command-center.html', text: 'Bugün Ödenecekler', label: 'Komuta Merkezi ödenecekler' },
  { file: 'finance-command-center.html', text: 'Bugün Tahsil Edilecekler', label: 'Komuta Merkezi tahsil edilecekler' },
  { file: 'finance-command-center.html', text: 'Yapılacaklar', label: 'Komuta Merkezi yapılacaklar' },
  { file: 'finance-command-center.html', text: 'Telegram Alarm Merkezi', label: 'Telegram alarm merkezi kartı' },
  { file: 'finance-command-center-live.html', text: 'finance_command_center_records', label: 'Live Komuta Merkezi Supabase okuma' },
  { file: 'finance-command-center-live.html', text: 'DEMO MOD', label: 'Live Komuta Merkezi demo fallback' },
  { file: 'finans-komuta-merkezi.html', text: 'finance-command-center-live.html', label: 'Komuta Merkezi başlatıcı live link' },
  { file: 'supabase_finance_command_center_schema.sql', text: 'finance_command_center_records', label: 'Komuta Merkezi ana tablo' },
  { file: 'supabase_finance_command_center_schema.sql', text: 'finance_telegram_alarm_queue', label: 'Telegram alarm kuyruğu' },
  { file: 'supabase_finance_command_center_schema.sql', text: 'finance_command_center_action_log', label: 'Komuta Merkezi aksiyon logu' },
  { file: 'finance_command_center_adapter.js', text: 'summarizeCommandCenter', label: 'Komuta Merkezi adapter özetleme' },
  { file: 'finance_smoke_test.cjs', text: 'testMokaPipeline', label: 'Moka smoke test' },
  { file: 'finance_smoke_test.cjs', text: 'testCommandCenterFiles', label: 'Komuta Merkezi smoke test' },
  { file: 'finance_smoke_test.cjs', text: 'testSalesDashboardAdapterSource', label: 'satış adapter smoke test' },
  { file: 'turkiye_business_calendar.js', text: '2027-03-09', label: '2027 Ramazan takvimi' },
  { file: 'turkiye_business_calendar.js', text: '2027-05-16', label: '2027 Kurban takvimi' },
  { file: 'finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql', text: 'risk_alert_sent_log', label: 'v52 risk alarm log tablosu' },
  { file: 'finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql', text: 'risk_alert_can_send_v52', label: 'v52 tekrar alarm kontrol RPC' },
  { file: 'finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql', text: 'risk_alert_mark_sent_v52', label: 'v52 alarm gönderildi log RPC' },
  { file: 'finance/AperiON_Risk_Alert_Dedup_Health_Check_v52.sql', text: 'risk_alert_sent_log table', label: 'v52 health check tablo kontrolü' },
  { file: 'finance/AperiON_Risk_Alert_Dedup_Health_Check_v52.sql', text: 'risk_alert_can_send_v52', label: 'v52 health check RPC kontrolü' },
  { file: 'finance/AperiON_Risk_Alert_Dedup_Health_Check_v52.sql', text: 'can_send_readonly_check', label: 'v52 health check güvenli fonksiyon kontrolü' },
  { file: 'finance/AperiON_Risk_Alert_Dedup_Supabase_Runbook_v52.md', text: 'Supabase SQL Editor', label: 'v52 Supabase runbook SQL Editor adımı' },
  { file: 'finance/AperiON_Risk_Alert_Dedup_Supabase_Runbook_v52.md', text: 'AperiON_Risk_Alert_Dedup_Health_Check_v52.sql', label: 'v52 Supabase runbook health check adımı' },
  { file: 'finance/AperiON_Risk_Alert_Dedup_Supabase_Runbook_v52.md', text: 'can_send_readonly_check', label: 'v52 Supabase runbook read-only kontrolü' },
  { file: 'finance/AperiON_v52_RELEASE_NOTES.md', text: 'AperiON v52', label: 'v52 release notes sürüm başlığı' },
  { file: 'finance/AperiON_v52_RELEASE_NOTES.md', text: 'Risk Alert Dedup', label: 'v52 release notes modül adı' },
  { file: 'finance/AperiON_v52_RELEASE_NOTES.md', text: 'npm run verify:finance-v52', label: 'v52 release notes doğrulama komutu' },
  { file: 'telegram/aperion_critical_risk_alert_v52.js', text: 'buildRiskKey', label: 'v52 deterministic risk key' },
  { file: 'telegram/aperion_critical_risk_alert_v52.js', text: 'risk_alert_can_send_v52', label: 'v52 cooldown kontrol çağrısı' },
  { file: 'telegram/aperion_critical_risk_alert_v52.js', text: 'risk_alert_mark_sent_v52', label: 'v52 gönderim log çağrısı' },
  { file: 'telegram/AperiON_Risk_Alert_Dedup_Scheduler_v52.md', text: 'AperiON_Risk_Alert_Dedup_Health_Check_v52.sql', label: 'v52 scheduler health check adımı' },
  { file: 'telegram/AperiON_Risk_Alert_Dedup_Scheduler_v52.md', text: 'RESULT: OK - no new risk alert to send', label: 'v52 scheduler cooldown beklenen çıktı' },
  { file: 'telegram/AperiON_Risk_Alert_Dedup_Scheduler_v52.md', text: 'v51 dosyası silinmez', label: 'v52 scheduler geri dönüş güvenliği' },
  { file: 'telegram/AperiON_Risk_Alert_Dedup_Rollback_v52.md', text: 'Rollback sadece scheduler', label: 'v52 rollback kapsamı' },
  { file: 'telegram/AperiON_Risk_Alert_Dedup_Rollback_v52.md', text: 'risk_alert_sent_log', label: 'v52 rollback log korunur' },
  { file: 'telegram/AperiON_Risk_Alert_Dedup_Rollback_v52.md', text: 'npm run telegram:critical-risk-v51', label: 'v52 rollback v51 komutu' },
  { file: 'telegram/AperiON_Risk_Alert_Dedup_GoLive_Checklist_v52.md', text: 'Go-Live Checklist v52', label: 'v52 go-live checklist başlığı' },
  { file: 'telegram/AperiON_Risk_Alert_Dedup_GoLive_Checklist_v52.md', text: 'v52 canlıya alınabilir / alınamaz', label: 'v52 go-live final onay alanı' },
  { file: 'telegram/AperiON_Risk_Alert_Dedup_GoLive_Checklist_v52.md', text: 'Rollback planı', label: 'v52 go-live rollback kontrolü' },
  { file: '.github/workflows/finance-full-check.yml', text: 'telegram/**', label: 'v52 Telegram workflow trigger' },
  { file: '.github/workflows/finance-full-check.yml', text: 'finance/**', label: 'v52 finance SQL workflow trigger' },
  { file: '.github/workflows/finance-full-check.yml', text: 'verify:finance-v52', label: 'v52 workflow toplu doğrulama adımı' },
  { file: '.env.example', text: 'TELEGRAM_BOT_TOKEN', label: 'Telegram bot token env örneği' },
  { file: '.env.example', text: 'TELEGRAM_CHAT_ID', label: 'Telegram chat id env örneği' },
  { file: '.env.example', text: 'RISK_ALERT_COOLDOWN_MINUTES', label: 'v52 cooldown env örneği' },
  { file: 'FINANCE_SETUP.md', text: 'v52 tekrar alarm engeli', label: 'v52 kurulum rehberi başlığı' },
  { file: 'FINANCE_SETUP.md', text: 'AperiON_Risk_Alert_Dedup_SQL_v52.sql', label: 'v52 SQL kurulum rehberi' },
  { file: 'FINANCE_SETUP.md', text: 'RISK_ALERT_COOLDOWN_MINUTES', label: 'v52 env kurulum rehberi' },
  { file: 'package.json', text: 'finance-smoke', label: 'finance smoke script' },
  { file: 'package.json', text: 'moka-pipeline-demo', label: 'Moka demo script' },
  { file: 'package.json', text: 'command-center-inject-index', label: 'Komuta Merkezi index inject script' },
  { file: 'package.json', text: 'telegram:critical-risk-v52', label: 'v52 kritik risk alarm script' },
  { file: 'package.json', text: 'verify:risk-alert-dedup-v52', label: 'v52 tekrar alarm verify script' },
  { file: 'package.json', text: 'verify:finance-v52', label: 'v52 toplu doğrulama script' },
  { file: '.gitignore', text: 'aperion-finans-config.js', label: 'config ignore kuralı' }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const missing = requiredFiles.filter(file => !fs.existsSync(file));
  assert(missing.length === 0, 'Eksik finans dosyaları: ' + missing.join(', '));

  requiredContent.forEach(item => {
    assert(fs.existsSync(item.file), `${item.file} yok; ${item.label} kontrol edilemedi`);
    const content = fs.readFileSync(item.file, 'utf8');
    assert(content.includes(item.text), `${item.file} içinde ${item.label} bulunamadı`);
  });

  console.log('AperiON Finans manifest doğrulaması başarılı.');
  console.log('Kontrol edilen dosya sayısı:', requiredFiles.length);
  console.log('Kontrol edilen içerik kuralı:', requiredContent.length);
}

main();
