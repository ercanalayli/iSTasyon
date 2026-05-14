const fs = require('fs');
const path = require('path');

const indexPath = path.join(process.cwd(), 'index.html');
const required = [
  { text: 'finans-komuta-merkezi.html', label: 'Komuta Merkezi başlatıcı linki' },
  { text: 'Finans Komuta', label: 'Komuta Merkezi menü metni' }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  assert(fs.existsSync(indexPath), 'index.html bulunamadı');
  const html = fs.readFileSync(indexPath, 'utf8');
  required.forEach(item => {
    assert(html.includes(item.text), `index.html içinde ${item.label} bulunamadı`);
  });
  assert(html.includes('<title>AperiON - ErpaltH</title>'), 'AperiON title korunmamış görünüyor');
  console.log('AperiON Finans Komuta Merkezi index link doğrulaması başarılı.');
}

main();
