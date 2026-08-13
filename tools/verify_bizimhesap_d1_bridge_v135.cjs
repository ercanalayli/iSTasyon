const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const bot = fs.readFileSync(path.join(root, 'bizimhesap_bot.js'), 'utf8');
const ingest = fs.readFileSync(path.join(root, 'functions/api/bizimhesap-sales-sync.js'), 'utf8');
const summary = fs.readFileSync(path.join(root, 'functions/api/bizimhesap-sales-summary.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const checks = [
  ['bot has D1 bridge URL', /APERION_BRIDGE_URL/.test(bot)],
  ['bot requires bridge secret', /APERION_BRIDGE_SECRET/.test(bot)],
  ['bot sends bearer credential', /authorization:\s*`Bearer/.test(bot)],
  ['bot prefers D1 before Supabase compatibility path', bot.indexOf('d1SalesWrite(') < bot.indexOf('db.from(SUPABASE.table).insert')],
  ['ingest rejects unauthorized writes', /error:\s*'unauthorized'/.test(ingest)],
  ['ingest limits batch size', /incoming\.length\s*>\s*500/.test(ingest)],
  ['ingest uses canonical event identity', /bizimhesap:sale:/.test(ingest)],
  ['ingest is idempotent', /ON CONFLICT\(event_key\) DO UPDATE/.test(ingest)],
  ['ingest records evidence', /evidence_ref/.test(ingest)],
  ['summary reads confirmed sales', /event_type='sale\.invoice'.*truth_state='confirmed'/s.test(summary)],
  ['summary reports D1 source', /cloudflare_d1\.canonical_events/.test(summary)],
  ['package script registered', pkg.scripts?.['verify:bizimhesap:d1-bridge'] === 'node tools/verify_bizimhesap_d1_bridge_v135.cjs'],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK ' : 'ERR'} ${label}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log('BizimHesap -> Cloudflare D1 bridge v135 verified.');
