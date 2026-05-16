const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const backupPath = path.join(root, 'index.backup-before-kar-zekasi-v39.html');

let html = fs.readFileSync(indexPath, 'utf8');

if (html.includes('Kâr Zekası') || html.includes('Kar Zekasi')) {
  console.log('Kâr Zekası menü bağlantısı zaten var. İşlem yapılmadı.');
  process.exit(0);
}

fs.writeFileSync(backupPath, html, 'utf8');

const staticAfter = `<div class="sb-item" onclick="gP('finans',this)"><span class="sb-ico">FN</span><span class="sb-lbl">Finans Özeti</span></div>`;
const staticInsert = `${staticAfter}\n    <div class="sb-item" onclick="window.open('finans.html','_blank')"><span class="sb-ico">KZ</span><span class="sb-lbl">Kâr Zekası</span></div>`;

if (html.includes(staticAfter)) {
  html = html.replace(staticAfter, staticInsert);
}

const dynamicAfter = `<div class="sb-item" onclick="gP('finans',this)"><span class="sb-ico">FN</span><span><span class="sb-lbl">Finans Merkezi</span><span class="sb-sub">gelir, gider, net sonuc</span></span></div>`;
const dynamicInsert = `${dynamicAfter}\n      <div class="sb-item" onclick="window.open('finans.html','_blank')"><span class="sb-ico">KZ</span><span><span class="sb-lbl">Kâr Zekası</span><span class="sb-sub">SMM, stok, gider, net kâr</span></span></div>`;

if (html.includes(dynamicAfter)) {
  html = html.replace(dynamicAfter, dynamicInsert);
} else {
  throw new Error('Aktif nav.innerHTML içindeki Finans Merkezi satırı bulunamadı. index.html değişmiş olabilir.');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Kâr Zekası menü bağlantısı eklendi.');
console.log('Yedek:', backupPath);
