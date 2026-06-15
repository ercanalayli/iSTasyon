const required = ['BIZIMHESAP_EMAIL', 'BIZIMHESAP_PASSWORD'];
const EXPECTED_EMAIL = 'alaylimedikal@gmail.com';

console.log('AperiON BizimHesap Actions secret preflight');

try {
  require('dotenv').config();
} catch {
  // dotenv is optional for local diagnostics; GitHub Actions uses env directly.
}

const missing = required.filter(name => !String(process.env[name] || '').trim());
const email = String(process.env.BIZIMHESAP_EMAIL || '').trim().toLocaleLowerCase('tr-TR');
for (const name of required) {
  const value = String(process.env[name] || '');
  console.log(`${value.trim() ? 'OK' : 'MISS'} ${name}${value ? ` len=${value.length}` : ''}`);
}

if (missing.length) {
  console.error(`RESULT: BLOCKED missing GitHub secrets: ${missing.join(', ')}`);
  console.error('GitHub > Settings > Secrets and variables > Actions > Repository secrets icine eklenmeli.');
  process.exit(2);
}

if (email !== EXPECTED_EMAIL) {
  console.error(`RESULT: BLOCKED wrong BizimHesap email. Expected ${EXPECTED_EMAIL}, got len=${email.length}.`);
  console.error('Yanlis mail kullanilmayacak. GitHub Actions repository secret BIZIMHESAP_EMAIL tam olarak alaylimedikal@gmail.com olmali.');
  process.exit(3);
}

console.log('RESULT: OK - BizimHesap secrets available to workflow.');
