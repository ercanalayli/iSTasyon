const required = ['BIZIMHESAP_EMAIL', 'BIZIMHESAP_PASSWORD'];

console.log('AperiON BizimHesap Actions secret preflight');

try {
  require('dotenv').config();
} catch {
  // dotenv is optional for local diagnostics; GitHub Actions uses env directly.
}

const missing = required.filter(name => !String(process.env[name] || '').trim());
for (const name of required) {
  const value = String(process.env[name] || '');
  console.log(`${value.trim() ? 'OK' : 'MISS'} ${name}${value ? ` len=${value.length}` : ''}`);
}

if (missing.length) {
  console.error(`RESULT: BLOCKED missing GitHub secrets: ${missing.join(', ')}`);
  console.error('GitHub > Settings > Secrets and variables > Actions > Repository secrets icine eklenmeli.');
  process.exit(2);
}

console.log('RESULT: OK - BizimHesap secrets available to workflow.');
