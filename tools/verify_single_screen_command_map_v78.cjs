const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

function ok(name, pass) {
  console.log(`${pass ? 'OK ' : 'FAIL'} ${name}`);
  if (!pass) process.exitCode = 1;
}

const zoneMatches = [...html.matchAll(/class="command-zone\s+[^"]+"/g)];

ok('desktop sidebar hidden', /@media\(min-width:769px\)[\s\S]*\.sb,\.sb-tog\{display:none!important\}/.test(html));
ok('main uses full viewport', /@media\(min-width:769px\)[\s\S]*\.main\{width:100vw;height:100vh\}/.test(html));
ok('command map exists', html.includes('id="aperionCommandMap"'));
ok('command map has 8 zones', zoneMatches.length === 8);
ok('bank zone clickable', /command-zone bank[\s\S]*gP\('finans',null\)[\s\S]*fT\('banka'\)/.test(html));
ok('approval zone clickable', /command-zone approval[\s\S]*gP\('gorevler',null\)/.test(html));
ok('income zone clickable', /command-zone income[\s\S]*gP\('finans',null\)/.test(html));
ok('sales zone clickable', /command-zone sales[\s\S]*gP\('satis',null\)/.test(html));
ok('product zone clickable', /command-zone product[\s\S]*gP\('stok',null\)/.test(html));
ok('customer zone clickable', /command-zone customer[\s\S]*gP\('cariler',null\)/.test(html));
ok('data zone clickable', /command-zone data[\s\S]*gP\('veri',null\)/.test(html));
ok('notification zone clickable', /command-zone notify[\s\S]*gP\('bildirim',null\)/.test(html));
ok('dashboard layout reserves command map row', /#pg-dashboard\{height:100%;display:grid;grid-template-rows:auto minmax\(0,1fr\);gap:12px\}/.test(html));
ok('report hub hidden in single screen dashboard', /#reportHubCard,\s*body\.dashboard-mode #financeCalendarCard\{display:none!important\}/.test(html));
ok('npm script registered', pkg.scripts && pkg.scripts['verify:single-screen-command-map'] === 'node tools/verify_single_screen_command_map_v78.cjs');
