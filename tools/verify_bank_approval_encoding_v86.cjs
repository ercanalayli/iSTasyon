const fs = require('fs');
const { execFileSync } = require('child_process');

const page = fs.readFileSync('banka_onay.html', 'utf8');
const parser = fs.readFileSync('banka_gorsel_parser.js', 'utf8');
const requiredPageTokens = ['function repairText', 'function repairValue', '\\ufffd\\s*cret\\ufffd', 'Ekstre kanıtı'];
const requiredParserTokens = ['\\uFFFD\\s*CRET\\uFFFD', '\\u00dcCRET\\u0130'];

for (const token of requiredPageTokens) {
  if (!page.includes(token)) throw new Error(`banka_onay.html encoding guard missing: ${token}`);
}
for (const token of requiredParserTokens) {
  if (!parser.includes(token)) throw new Error(`banka_gorsel_parser.js OCR encoding guard missing: ${token}`);
}

execFileSync(process.execPath, ['--check', 'banka_gorsel_parser.js'], { stdio: 'inherit' });
console.log('OK: Banka onay ekrani ve gorsel parser karakter onarim korumalari bulundu.');
