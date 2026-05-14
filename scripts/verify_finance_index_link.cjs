const fs = require('fs');
const path = require('path');

const indexPath = path.join(process.cwd(), 'index.html');
const checks = [
  {
    name: 'Finans Takvimi başlatıcı linki',
    test: html => html.includes('finans-takvimi.html')
  },
  {
    name: 'AperiON Finans marker veya metni',
    test: html => html.includes('APERION_FINANCE_CALENDAR_LINK_V1') || html.includes('Finans Takvimi')
  },
  {
    name: 'Mevcut AperiON title korunmuş',
    test: html => html.includes('<title>AperiON - ErpaltH</title>')
  },
  {
    name: 'Sidebar yapısı korunmuş',
    test: html => html.includes('class="sb-nav"') || html.includes("class='sb-nav'")
  }
];

function main() {
  if (!fs.existsSync(indexPath)) {
    console.error('index.html bulunamadı.');
    process.exit(1);
  }
  const html = fs.readFileSync(indexPath, 'utf8');
  const failed = [];
  checks.forEach(check => {
    const ok = check.test(html);
    console.log(`${ok ? 'OK' : 'FAIL'} - ${check.name}`);
    if (!ok) failed.push(check.name);
  });
  if (failed.length) {
    console.error('Finans index doğrulaması başarısız:', failed.join(', '));
    process.exit(1);
  }
  console.log('AperiON Finans index doğrulaması başarılı.');
}

main();
