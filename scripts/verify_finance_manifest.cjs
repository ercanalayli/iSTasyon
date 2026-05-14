const fs = require('fs');

const requiredFiles = [
  'APERION_FINANCE_CHANGELOG.md',
  'FINANCE_SETUP.md',
  'NEXT_ACTIONS_FINANCE.md',
  'finans-takvimi.html',
  'aperion-finans-takvimi-live.html',
  'finance_dashboard_embed.html',
  'SUPABASE_FINANCE_INSTALL_ALL.sql',
  'supabase_finans_takvimi_schema.sql',
  'supabase_finans_validation_safe.sql',
  'supabase_finans_health_check.sql',
  'finance_import_bridge.js',
  'finance_approval_center.js',
  'finance_approval_actions.js',
  'finance_supabase_adapter.js',
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
  '.github/workflows/finance-full-check.yml'
];

const requiredContent = [
  { file: 'SUPABASE_FINANCE_INSTALL_ALL.sql', text: 'finance_calendar_records', label: 'ana finans tablosu' },
  { file: 'SUPABASE_FINANCE_INSTALL_ALL.sql', text: 'moka_united_movements', label: 'Moka tablosu' },
  { file: 'finance_smoke_test.cjs', text: 'testMokaPipeline', label: 'Moka smoke test' },
  { file: 'finance_smoke_test.cjs', text: 'testSalesDashboardAdapterSource', label: 'satış adapter smoke test' },
  { file: 'turkiye_business_calendar.js', text: '2027-03-09', label: '2027 Ramazan takvimi' },
  { file: 'turkiye_business_calendar.js', text: '2027-05-16', label: '2027 Kurban takvimi' },
  { file: 'package.json', text: 'finance-smoke', label: 'finance smoke script' },
  { file: 'package.json', text: 'moka-pipeline-demo', label: 'Moka demo script' },
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
