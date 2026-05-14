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
  { file: 'package.json', text: 'finance-smoke', label: 'finance smoke script' },
  { file: 'package.json', text: 'moka-pipeline-demo', label: 'Moka demo script' },
  { file: 'package.json', text: 'command-center-inject-index', label: 'Komuta Merkezi index inject script' },
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
