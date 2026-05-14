/*
AperiON / ErpaltH iSTasyon
Supabase Finance Migration Runner

Amaç:
- supabase_finans_takvimi_schema.sql ve supabase_finans_demo_seed.sql dosyalarını kontrollü çalıştırmak.
- Bu dosya canlı projede çalıştırılmadan önce .env ayarları yapılmalıdır.

Güvenlik:
- Service role key sadece yerelde / güvenli ortamda kullanılmalı.
- Frontend içine service role key yazılmaz.
*/

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    lines.forEach(line => {
      const clean = line.trim();
      if (!clean || clean.startsWith('#')) return;
      const idx = clean.indexOf('=');
      if (idx <= 0) return;
      const key = clean.slice(0, idx).trim();
      const value = clean.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = process.env[key] || value;
    });
  }
}

async function runSqlFile(supabase, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const { data, error } = await supabase.rpc('exec_sql', { sql_text: sql });
  if (error) {
    throw new Error(`${path.basename(filePath)} çalıştırılamadı: ${error.message}`);
  }
  return data;
}

async function main() {
  loadEnv();
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const mode = process.argv.includes('--seed') ? 'schema+seed' : 'schema';

  if (!url || !serviceKey) {
    console.error('Eksik ortam değişkeni: SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const schemaPath = path.join(process.cwd(), 'supabase_finans_takvimi_schema.sql');
  const seedPath = path.join(process.cwd(), 'supabase_finans_demo_seed.sql');

  console.log('AperiON Finans migration başlıyor:', mode);
  console.log('Şema dosyası:', schemaPath);
  await runSqlFile(supabase, schemaPath);
  console.log('Şema tamamlandı.');

  if (mode === 'schema+seed') {
    console.log('Seed dosyası:', seedPath);
    await runSqlFile(supabase, seedPath);
    console.log('Demo seed tamamlandı.');
  }

  console.log('AperiON Finans migration başarılı.');
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
