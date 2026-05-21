import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const val = (flag, fallback) => (has(flag) ? args[args.indexOf(flag) + 1] : fallback);

const firma = val('--firma', 'alayli');
const year = val('--year', String(new Date().getFullYear()));
const today = new Date();
const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const salesFrom = new Date(today);
salesFrom.setDate(salesFrom.getDate() - Number(val('--sales-days', '14')));
const salesFromIso = `${salesFrom.getFullYear()}-${String(salesFrom.getMonth() + 1).padStart(2, '0')}-${String(salesFrom.getDate()).padStart(2, '0')}`;
const dryRun = has('--dry-run');
const planOnly = has('--plan');
const commit = dryRun ? '' : '--commit';
const dataDir = path.join(__dirname, 'data');
const logPath = path.join(__dirname, 'aperion_veri_senkron_log.txt');
const statusPath = path.join(dataDir, 'aperion_last_sync.json');

mkdirSync(dataDir, { recursive: true });

const jobs = [
  {
    label: `BizimHesap satis kaynak yenileme ${salesFromIso} - ${todayIso}`,
    file: 'bizimhesap_bot.js',
    args: ['--firma', firma, '--gecmis', salesFromIso, todayIso],
    required: true,
  },
  {
    label: 'BizimHesap son islemler denetimi',
    file: 'bizimhesap_son_islemler_izle.js',
    args: ['--firma', firma, '--run-sync', '--resync-days', '45'],
    required: false,
  },
  {
    label: `BizimHesap masraf ${year}`,
    file: 'bizimhesap_masraf_cek.js',
    args: [commit, '--firma', firma, '--from', `${year}-01-01`, '--to', todayIso, '--limit', '5000', '--out', `masraf_${firma}_${year}.json`],
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

function diagnoseSyncFailure(output) {
  const text = String(output || '').toLocaleLowerCase('tr-TR');
  if (text.includes('ngnpasswordchangerequest') || text.includes('sifrenizi mi unuttunuz') || text.includes('şifrenizi mi unuttunuz')) {
    return 'BizimHesap giris dogrulamasi kontrol bekliyor';
  }
  if (text.includes('firma bulunamad') || text.includes('firma secilemedi') || text.includes('firma seçilemedi')) {
    return 'BizimHesap firma secim ekrani acilamadi';
  }
  if (text.includes('giris butonu') || text.includes('giriş butonu')) {
    return 'BizimHesap giris ekrani degismis olabilir';
  }
  return 'Senkron isi hata verdi, log kontrol edilmeli';
}

function runtimeFile(file) {
  if (!file.endsWith('.js')) return path.join(__dirname, file);
  const sourcePath = path.join(__dirname, file);
  const source = readFileSync(sourcePath, 'utf8');
  const isCommonJs = source.includes('require(') || source.includes('module.exports') || source.includes('__dirname');
  if (!isCommonJs) return sourcePath;
  const runtimePath = path.join(__dirname, `.__runtime_${path.basename(file, '.js')}.cjs`);
  writeFileSync(runtimePath, source, 'utf8');
  return runtimePath;
}

function runtimeScript(sourcePath) {
  if (!sourcePath.endsWith('.js')) return sourcePath;
  const source = readFileSync(sourcePath, 'utf8');
  const isCommonJs = source.includes('require(') || source.includes('module.exports') || source.includes('__dirname');
  if (!isCommonJs) return sourcePath;
  const runtimePath = path.join(__dirname, `.__runtime_${path.basename(sourcePath, '.js')}.cjs`);
  writeFileSync(runtimePath, source, 'utf8');
  return runtimePath;
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
  const runPath = runtimeFile(job.file);
  const r = spawnSync(process.execPath, [runPath, ...cleanArgs], {
    cwd: __dirname,
    stdio: 'pipe',
    encoding: 'utf8',
    env: { ...process.env, NODE_PATH: path.join(__dirname, 'node_modules') },
    shell: false,
  });
  if (r.stdout) {
    process.stdout.write(r.stdout);
    appendFileSync(logPath, r.stdout, 'utf8');
  }
  if (r.stderr) {
    process.stderr.write(r.stderr);
    appendFileSync(logPath, r.stderr, 'utf8');
  }
  const code = r.status ?? 1;
  const output = `${r.stdout || ''}\n${r.stderr || ''}`;
  const item = {
    label: job.label,
    file: job.file,
    status: code === 0 ? 'ok' : 'failed',
    code,
    durationMs: Date.now() - started,
  };
  if (code !== 0) item.issue = diagnoseSyncFailure(output);
  status.jobs.push(item);
  if (code !== 0) {
    status.ok = false;
    status.issue = status.issue || item.issue;
  }
  line(`${code === 0 ? 'BITTI' : 'HATA'}: ${job.label} (${code})`);
  saveStatus();
}

function pushSyncStatus() {
  if (planOnly || dryRun) {
    line('STATUS PUSH ATLANDI: plan/dry-run modu');
    return;
  }
  const candidates = [
    path.join(__dirname, 'local_bot', 'push_last_sync_status.js'),
    path.join(__dirname, 'push_last_sync_status.js'),
  ];
  const scriptPath = candidates.find(p => existsSync(p));
  if (!scriptPath) {
    line('STATUS PUSH ATLANDI: push_last_sync_status.js bulunamadi');
    return;
  }
  line(`STATUS PUSH BASLADI: ${scriptPath}`);
  const r = spawnSync(process.execPath, [runtimeScript(scriptPath)], {
    cwd: __dirname,
    stdio: 'pipe',
    encoding: 'utf8',
    env: { ...process.env, APERION_PROJECT_DIR: __dirname, NODE_PATH: path.join(__dirname, 'node_modules') },
    shell: false,
  });
  if (r.stdout) appendFileSync(logPath, r.stdout, 'utf8');
  if (r.stderr) appendFileSync(logPath, r.stderr, 'utf8');
  line(`${r.status === 0 ? 'STATUS PUSH BITTI' : 'STATUS PUSH HATA'}: ${r.status ?? 1}`);
}

line(`AperiON BizimHesap klon senkronu: firma=${firma}, mod=${status.mode}${planOnly ? ', plan' : ''}`);
for (const job of jobs) run(job);
status.finishedAt = nowIso();
saveStatus();
line(`SENKRON ${status.ok ? 'TAMAM' : 'KONTROL GEREKIYOR'}: ${statusPath}`);
pushSyncStatus();
if (!status.ok) process.exitCode = 1;
