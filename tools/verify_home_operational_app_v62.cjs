const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const checks = [
  ['operational app label', /AperiON Operational Finance App/.test(html)],
  ['cockpit main panel', /income-cockpit-main/.test(html)],
  ['live operations board', /Live Operations Board/.test(html)],
  ['component panel', /App Components/.test(html)],
  ['action buttons', /Gelire İn[\s\S]*Gidere İn[\s\S]*Banka Onay[\s\S]*Finans Merkezi/.test(html)],
  ['pipeline steps', /incomePipelineStep\('Satış'[\s\S]*incomePipelineStep\('Gider'[\s\S]*incomePipelineStep\('Banka'[\s\S]*incomePipelineStep\('Onay'/.test(html)],
  ['operation bars', /incomeBar\('Tahsilat gerçekleşme'[\s\S]*incomeBar\('Ödeme gerçekleşme'/.test(html)],
  ['decision state', /commandState=/.test(html) && /Karar durumu/.test(html)],
  ['three column app shell css', /#pg-dashboard \.income-head\{[\s\S]*grid-template-columns:minmax\(0,1\.05fr\) minmax\(340px,\.72fr\) minmax\(280px,\.48fr\)/.test(html)],
  ['responsive cockpit css', /@media\(max-width:1320px\)[\s\S]*#pg-dashboard \.income-head\{grid-template-columns:minmax\(0,1fr\) minmax\(300px,\.78fr\)/.test(html)]
];

console.log('AperiON Home Operational App v62 Verify');
console.log('---------------------------------------');
let ok = true;
for (const [label, pass] of checks) {
  console.log(`${pass ? 'OK ' : 'ERR'} - ${label}`);
  if (!pass) ok = false;
}
console.log('---------------------------------------');
if (!ok) {
  console.error('RESULT: FAIL - Ana ekran operasyonel veri uygulamasi kurgusu eksik.');
  process.exit(1);
}
console.log('RESULT: OK - Ana ekran Retool/Geckoboard mantiginda operasyonel app kurgusuna geçti.');
