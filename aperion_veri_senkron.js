import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, appendFileSync, readFileSync, unlinkSync } from 'node:fs';
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
const lockPath = path.join(dataDir, 'aperion_sync.lock.json');
const lockMaxAgeMs = Number(process.env.APERION_SYNC_LOCK_MAX_AGE_MS || 90 * 60 * 1000);

mkdirSync(dataDir, { recursive: true });

const jobs = [
  {
    label: `BizimHesap satis kaynak yenileme ${salesFromIso} - ${todayIso}`,
    file: 'bizimhesap_bot.js',
    args: ['--firma', firma, '--gecmis', salesFromIso, todayIso],
    required: true,
    timeoutMs: 300000,
  },
  {
    label: 'BizimHesap urun ve stok kartlari',
    file: 'bizimhesap_urun_stok_cek.js',
    args: [commit, '--firma', firma, '--out', `urun_stok_${firma}.json`],
    required: true,
    timeoutMs: 240000,
  },
  {
    label: `BizimHesap masraf ${year}`,
    file: 'bizimhesap_masraf_cek.js',
    args: [commit, '--firma', firma, '--from', `${year}-01-01`, '--to', todayIso, '--limit', '5000', '--out', `masraf_${firma}_${year}.json`],
    required: true,
    timeoutMs: 240000,
  },
  {
    label: 'BizimHesap son islemler denetimi',
    file: 'bizimhesap_son_islemler_izle.js',
    args: ['--firma', firma, '--resync-days', '45'],
    required: false,
    timeoutMs: 120000,
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

function readJsonSafe(filePath, fallback = null) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function acquireLock() {
  const lock = {
    pid: process.pid,
    firma,
    startedAt: nowIso(),
    projectDir: __dirname,
  };
  try {
    writeFileSync(lockPath, JSON.stringify(lock, null, 2), { encoding: 'utf8', flag: 'wx' });
    return true;
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const current = readJsonSafe(lockPath, {});
    const startedAt = current?.startedAt ? new Date(current.startedAt).getTime() : 0;
    const stale = !startedAt || Date.now() - startedAt > lockMaxAgeMs;
    if (stale) {
      unlinkSync(lockPath);
      writeFileSync(lockPath, JSON.stringify({ ...lock, replacedStaleLock: current }, null, 2), { encoding: 'utf8', flag: 'wx' });
      line(`ESKI KILIT TEMIZLENDI: ${lockPath}`);
      return true;
    }
    const message = `SENKRON KILITLI: Devam eden is var (${current?.startedAt || 'bilinmiyor'}, pid=${current?.pid || 'bilinmiyor'})`;
    status.ok = false;
    status.issue = message;
    status.finishedAt = nowIso();
    saveStatus();
    line(message);
    process.exitCode = 75;
    return false;
  }
}

function releaseLock() {
  try {
    const current = readJsonSafe(lockPath, {});
    if (!current?.pid || current.pid === process.pid) unlinkSync(lockPath);
  } catch {
    // Kilit zaten kalkmissa yapilacak is yok.
  }
}

function diagnoseSyncFailure(output) {
  const text = String(output || '').toLocaleLowerCase('tr-TR');
  if (text.includes('ngnpasswordchangerequest') || text.includes('sifrenizi mi unuttunuz') || text.includes('şifrenizi mi unuttunuz')) {
    return 'BizimHesap giris dogrulamasi kontrol bekliyor';
  }
  if (text.includes('giris tamamlanmadi') || text.includes('girisi tamamlanmadi') || text.includes('giriş tamamlanmadi') || text.includes('girişi tamamlanmadi') || text.includes('giris dogrulamasi') || text.includes('giriş dogrulamasi')) {
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

function isSessionFailure(issue) {
  return /BizimHesap giris|BizimHesap firma/i.test(String(issue || ''));
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
  const attempts = [];
  const execute = (attempt) => {
    const r = spawnSync(process.execPath, [runPath, ...cleanArgs], {
      cwd: __dirname,
      stdio: 'pipe',
      encoding: 'utf8',
      env: { ...process.env, NODE_PATH: path.join(__dirname, 'node_modules') },
      shell: false,
      timeout: job.timeoutMs || 300000,
    });
    if (r.stdout) {
      process.stdout.write(r.stdout);
      appendFileSync(logPath, r.stdout, 'utf8');
    }
    if (r.stderr) {
      process.stderr.write(r.stderr);
      appendFileSync(logPath, r.stderr, 'utf8');
    }
    const code = r.status ?? (r.error?.code === 'ETIMEDOUT' ? 124 : 1);
    const output = `${r.stdout || ''}\n${r.stderr || ''}`;
    const issue = code === 0 ? '' : diagnoseSyncFailure(output);
    attempts.push({ attempt, code, issue });
    return { code, output, error: r.error, issue };
  };
  let result = execute(1);
  if (result.code !== 0 && isSessionFailure(result.issue)) {
    line(`TEKRAR DENENECEK: ${job.label} (${result.issue})`);
    result = execute(2);
  }
  const code = result.code;
  const item = {
    label: job.label,
    file: job.file,
    status: code === 0 ? 'ok' : 'failed',
    code,
    required: job.required,
    attempts,
    durationMs: Date.now() - started,
  };
  if (code !== 0) item.issue = result.issue;
  if (result.error?.code === 'ETIMEDOUT') item.issue = `${job.label} sure sinirini asti`;
  status.jobs.push(item);
  if (code !== 0 && job.required) {
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

if (acquireLock()) {
  try {
    line(`AperiON BizimHesap klon senkronu: firma=${firma}, mod=${status.mode}${planOnly ? ', plan' : ''}`);
    for (const job of jobs) run(job);
    status.finishedAt = nowIso();
    saveStatus();
    line(`SENKRON ${status.ok ? 'TAMAM' : 'KONTROL GEREKIYOR'}: ${statusPath}`);
    pushSyncStatus();
    if (!status.ok) process.exitCode = 1;
  } finally {
    releaseLock();
  }
}
