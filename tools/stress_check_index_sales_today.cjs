const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const checks = [
  ['AperiON title exists', html.includes('AperiON')],
  ['Sales page title exists', html.includes('Satış Akışı') || html.includes('Satışlar')],
  ['Today button exists', html.includes("sM('today',this,1)") || html.includes('>Bugün</button>')],
  ['Today period support exists', html.includes("mode==='today'") || html.includes('label:\'Bugün\'')],
  ['Today metric variable exists', html.includes('todayM=met') || html.includes('todayM.ciro')],
  ['Today KPI card exists', html.includes('<div class="kpi-l">Bugün</div>') || html.includes('Bugün</div><div class="kpi-v">')],
  ['Yesterday metric still exists', html.includes('yday=met') || html.includes('yday.ciro')],
  ['Week metric still exists', html.includes('week=met') || html.includes('week.ciro')],
  ['Month metric still exists', html.includes('month=met') || html.includes('month.ciro')],
  ['Year metric still exists', html.includes('top=met') || html.includes('top.ciro')],
  ['sales_raw query exists', html.includes("db.from('sales_raw')")],
  ['Alayli row filter exists', html.includes('isAlayliRow')],
  ['Product rules still applied', html.includes('applyProductRules')]
];

let failed = 0;
console.log('AperiON live sales today stress check');
console.log('-------------------------------------');
for (const [name, ok] of checks) {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`);
  if (!ok) failed += 1;
}

const todayCount = (html.match(/Bugün/g) || []).length;
const salesRawCount = (html.match(/sales_raw/g) || []).length;
console.log('-------------------------------------');
console.log('Bugün occurrences:', todayCount);
console.log('sales_raw occurrences:', salesRawCount);

if (failed) {
  console.log(`RESULT: FAILED - ${failed} stress checks failed.`);
  process.exitCode = 1;
} else {
  console.log('RESULT: OK - live sales today patch passed static stress checks.');
}
