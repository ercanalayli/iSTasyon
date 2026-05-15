import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const val = (flag, fallback) => (has(flag) ? args[args.indexOf(flag) + 1] : fallback);

const firma = val('--firma', 'alayli');
const year = val('--year', String(new Date().getFullYear()));
const dryRun = has('--dry-run');
const planOnly = has('--plan');
const commit = dryRun ? '' : '--commit';
const dataDir = path.join(__dirname, 'data');
const logPath = path.join(__dirname, 'aperion_veri_senkron_log.txt');
const statusPath = path.join(dataDir, 'aperion_last_sync.json');

mkdirSync(dataDir, { recursive: true });

const jobs = [
  {
    label: 'BizimHesap satis eksik gun kontrolu',
    file: 'bizimhesap_bot.js',
    args: ['--firma', firma],
    required: true,
  },
  {
    label: 'BizimHesap son islemler denetimi',
    file: 'bizimhesap_son_islemler_izle.js',
    args: ['--firma', firma],
    required: false,
  },
  {
    label: `BizimHesap masraf ${year}`,
    file: 'bizimhesap_masraf_cek.js',
    args: [commit, '--firma', firma, '--year', year, '--out', `masraf_${firma}_${year}.json`],
    required: true,
  },
  {
    label: 'BizimHesap urun ve stok kartlari',
    file: 'bizimhesap_urun_stok_cek.js',
    args: [commit, '--firma', firma, '--out', `urun_stok_${firma}.json`],
    required: true,
  },
];

const nowIso = () => new Date().toISOString();
const line = (text) => {
  const msg = `[${nowIso()}] ${text}`;
  console.log(msg);
  appendFileSync(logPath, `${msg}\n`, 'utf8');
};

const status = {
  firma,
  mode: dryRun ? 'dry-run' : 'commit',
  startedAt: nowIso(),
  finishedAt: null,
  ok: true,
  jobs: [],
};

function saveStatus() {
  writeFileSync(statusPath, JSON.stringify(status, null, 2), 'utf8');
}

function run(job) {
  const fullPath = path.join(__dirname, job.file);
  const cleanArgs = job.args.filter(Boolean);

  if (!existsSync(fullPath)) {
    const skipped = { label: job.label, file: job.file, status: job.required ? 'missing' : 'skipped', code: null };
    status.jobs.push(skipped);
    if (job.required) status.ok = false;
    line(`${job.required ? 'EKSIK' : 'ATLANDI'}: ${job.label} (${job.file})`);
    saveStatus();
    return;
  }

  if (planOnly) {
    status.jobs.push({ label: job.label, file: job.file, status: 'planned', code: 0, args: cleanArgs });
    line(`PLAN: node ${job.file} ${cleanArgs.join(' ')}`);
    saveStatus();
    return;
  }

  line(`BASLADI: ${job.label}`);
  const started = Date.now();
  const r = spawnSync(process.execPath, [fullPath, ...cleanArgs], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, NODE_PATH: path.join(__dirname, 'node_modules') },
    shell: false,
  });
  const code = r.status ?? 1;
  const item = {
    label: job.label,
    file: job.file,
    status: code === 0 ? 'ok' : 'failed',
    code,
    durationMs: Date.now() - started,
  };
  status.jobs.push(item);
  if (code !== 0) status.ok = false;
  line(`${code === 0 ? 'BITTI' : 'HATA'}: ${job.label} (${code})`);
  saveStatus();
}

line(`AperiON BizimHesap klon senkronu: firma=${firma}, mod=${status.mode}${planOnly ? ', plan' : ''}`);
for (const job of jobs) run(job);
status.finishedAt = nowIso();
saveStatus();
line(`SENKRON ${status.ok ? 'TAMAM' : 'KONTROL GEREKIYOR'}: ${statusPath}`);
if (!status.ok) process.exitCode = 1;
