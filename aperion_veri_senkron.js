const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const firma = args.includes('--firma') ? args[args.indexOf('--firma') + 1] : 'alayli';
const year = args.includes('--year') ? args[args.indexOf('--year') + 1] : String(new Date().getFullYear());
const commit = args.includes('--dry-run') ? '' : '--commit';

function run(label, file, extra) {
  console.log(`\n[AperiON] ${label}`);
  const r = spawnSync(process.execPath, [file, ...extra.filter(Boolean)], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, NODE_PATH: `${__dirname}\\node_modules` },
    shell: false,
  });
  if (r.status !== 0) process.exitCode = r.status || 1;
}

run('BizimHesap satis eksik gun kontrolu', 'bizimhesap_bot.js', []);
run(`BizimHesap masraf ${year}`, 'bizimhesap_masraf_cek.js', [commit, '--firma', firma, '--year', year, '--out', `masraf_${firma}_${year}.json`]);

