const fs = require('fs');
const path = require('path');

const root = process.cwd();
const indexPath = path.join(root, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('❌ index.html bulunamadı.');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');
let changed = false;

function replaceOnce(label, from, to) {
  if (html.includes(to)) {
    console.log(`✅ ${label}: zaten uygulanmış.`);
    return;
  }
  if (!html.includes(from)) {
    console.error(`❌ ${label}: hedef alan bulunamadı.`);
    process.exit(1);
  }
  html = html.replace(from, to);
  changed = true;
  console.log(`✅ ${label}: uygulandı.`);
}

replaceOnce(
  'Ana finans kartı aksiyon linkleri',
  '<a href="finans-takvimi.html" class="mini-action primary">Takvimi Aç</a>',
  '<a href="nakit-komuta-v57.html" class="mini-action primary">Nakit Komuta v57</a>\n              <a href="gelen-ekstreler-v57.html" class="mini-action">Gelen Ekstreler</a>\n              <a href="finans-takvimi.html" class="mini-action">Takvimi Aç</a>'
);

replaceOnce(
  'Sol menü Para preview linkleri',
  '<div class="sb-item" onclick="gP(\'finans\',this);setTimeout(()=>document.querySelector(\'.ft-tab[onclick*=banka]\')?.click(),60)"><span class="sb-ico">BK</span><span><span class="sb-lbl">Banka Islem</span><span class="sb-sub">ekstre, onay, BizimHesap</span></span></div>',
  '<div class="sb-item" onclick="gP(\'finans\',this);setTimeout(()=>document.querySelector(\'.ft-tab[onclick*=banka]\')?.click(),60)"><span class="sb-ico">BK</span><span><span class="sb-lbl">Banka Islem</span><span class="sb-sub">ekstre, onay, BizimHesap</span></span></div>\n      <a class="sb-item" href="nakit-komuta-v57.html" style="text-decoration:none"><span class="sb-ico">NK</span><span><span class="sb-lbl">Nakit Komuta</span><span class="sb-sub">v57 preview, kesin kayıt yok</span></span></a>\n      <a class="sb-item" href="gelen-ekstreler-v57.html" style="text-decoration:none"><span class="sb-ico">GE</span><span><span class="sb-lbl">Gelen Ekstreler</span><span class="sb-sub">Gmail/Drive intake</span></span></a>'
);

if (changed) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('✅ index.html preview linkleri güncellendi.');
} else {
  console.log('✅ Değişiklik gerekmiyor.');
}
