const fs = require('fs');
const path = require('path');

const indexPath = path.join(process.cwd(), 'index.html');
const marker = 'APERION_FINANCE_CALENDAR_LINK_V1';

const sidebarSnippet = `
<!-- ${marker}: sidebar link -->
<div class="sb-item" onclick="window.location.href='finans-takvimi.html'">
  <div class="sb-ico">💰</div>
  <div>
    <div class="sb-lbl">Finans Takvimi</div>
    <span class="sb-sub">Nakit Akışı Merkezi</span>
  </div>
</div>
<!-- /${marker}: sidebar link -->
`;

const floatingSnippet = `
<!-- ${marker}: floating safe link -->
<a href="finans-takvimi.html" title="AperiON Finans Takvimi" style="position:fixed;right:18px;bottom:18px;z-index:9999;background:#2563EB;color:#fff;text-decoration:none;border-radius:999px;padding:12px 16px;font:800 12px Inter,Arial,sans-serif;box-shadow:0 12px 28px rgba(37,99,235,.25)">💰 Finans Takvimi</a>
<!-- /${marker}: floating safe link -->
`;

function backup(file) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${file}.backup-${stamp}`;
  fs.copyFileSync(file, backupPath);
  return backupPath;
}

function inject() {
  if (!fs.existsSync(indexPath)) throw new Error('index.html bulunamadı');
  let html = fs.readFileSync(indexPath, 'utf8');
  if (html.includes(marker)) {
    console.log('Finans Takvimi linki zaten var. İşlem yapılmadı.');
    return;
  }
  const backupPath = backup(indexPath);
  console.log('Yedek alındı:', backupPath);

  const sbNavIndex = html.indexOf('<div class="sb-nav"');
  if (sbNavIndex >= 0) {
    const insertAt = html.indexOf('>', sbNavIndex) + 1;
    html = html.slice(0, insertAt) + sidebarSnippet + html.slice(insertAt);
    fs.writeFileSync(indexPath, html, 'utf8');
    console.log('Sidebar içine Finans Takvimi linki eklendi.');
    return;
  }

  const bodyClose = html.lastIndexOf('</body>');
  if (bodyClose >= 0) {
    html = html.slice(0, bodyClose) + floatingSnippet + html.slice(bodyClose);
    fs.writeFileSync(indexPath, html, 'utf8');
    console.log('Sidebar bulunamadı. Floating Finans Takvimi linki eklendi.');
    return;
  }

  throw new Error('Güvenli ekleme noktası bulunamadı. index.html değiştirilmedi.');
}

try {
  inject();
} catch (err) {
  console.error('HATA:', err.message || err);
  process.exit(1);
}
