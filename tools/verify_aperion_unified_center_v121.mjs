import fs from 'node:fs';

const html = fs.readFileSync('aperion-merkez.html', 'utf8');
const manifest = JSON.parse(fs.readFileSync('data/aperion_surface_inventory.json', 'utf8'));
const pwaManifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const legacyHome = fs.readFileSync('aperion-home-v3.html', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');
const rootHtml = fs.readdirSync('.').filter(file => file.endsWith('.html')).sort();
const inventoried = manifest.surfaces.map(item => item.file).sort();

function check(name, pass) {
  console.log(`${pass ? 'OK  ' : 'FAIL'} ${name}`);
  if (!pass) process.exitCode = 1;
}

check('unified center has one in-page workspace', (html.match(/id="moduleFrame"/g) || []).length === 1);
check('unified center has module registry', /const\s+MODULES\s*=/.test(html));
check('legacy catalog is visible and searchable', html.includes('id="legacySearch"') && html.includes('renderLegacy'));
check('safe-mode promise is visible', html.includes('Açık onay olmadan dış sisteme kayıt yok'));
check('ALAYLI Medikal is the active company', html.includes('ALAYLI Medikal') && html.includes('Aktif şirket'));
check('all root HTML files are inventoried', JSON.stringify(rootHtml) === JSON.stringify(inventoried));
check('no legacy screen was deleted', rootHtml.length >= 53);
check('PWA starts from unified center', pwaManifest.start_url.startsWith('/aperion-merkez.html'));
check('already-installed AP shortcut redirects to unified center', legacyHome.includes("location.replace('/aperion-merkez.html'"));
check('legacy mobile screen remains explicitly accessible', html.includes('/aperion-home-v3.html?legacy=1#approval'));
check('unified center registers PWA runtime', html.includes('/manifest.json') && html.includes('/aperion-mobile.js'));
check('offline fallback is unified center', serviceWorker.includes("caches.match('/aperion-merkez.html')"));
for (const file of [
  'aperion-home-v3.html',
  'aperion-finans-takvimi-live.html',
  'mail-ekstre-canli.html',
  'alayli-merkez.html',
  'aperion-is-merkezi.html'
]) {
  check(`module target exists: ${file}`, fs.existsSync(file));
}
