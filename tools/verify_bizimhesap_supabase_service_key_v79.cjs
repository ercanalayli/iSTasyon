const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = [
  'bizimhesap_bot.js',
  'bizimhesap_masraf_cek.js',
  'bizimhesap_urun_stok_cek.js',
  'bizimhesap_son_islemler_izle.js',
];

const checks = [];

function add(file, label, ok, detail = '') {
  checks.push({ file, label, ok, detail });
  console.log(`${ok ? 'OK' : 'FAIL'} ${file} :: ${label}${detail ? ` - ${detail}` : ''}`);
}

for (const file of targets) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const serviceIndex = source.indexOf('process.env.SUPABASE_SERVICE_ROLE_KEY');
  const publishableIndex = source.search(/process\.env\.SUPABASE_(?:KEY|PUBLISHABLE_KEY|ANON_KEY)|sb_publishable_/);
  add(file, 'service role key is supported', serviceIndex !== -1);
  add(
    file,
    'service role key has priority over publishable/anon key',
    serviceIndex !== -1 && (publishableIndex === -1 || serviceIndex < publishableIndex),
  );
  add(file, 'Supabase client does not persist auth session', /createClient\([^)]*\{\s*auth:\s*\{\s*persistSession:\s*false\s*\}/s.test(source));
}

const failed = checks.filter(x => !x.ok);
if (failed.length) {
  console.error(`RESULT: FAILED ${failed.length}/${checks.length}`);
  process.exit(1);
}

console.log(`RESULT: OK ${checks.length}/${checks.length}`);
