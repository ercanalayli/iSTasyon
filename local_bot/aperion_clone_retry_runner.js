import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(process.env.APERION_PROJECT_DIR || path.join(__dirname, '..'));
const syncFile = path.join(projectDir, 'aperion_veri_senkron.js');
const healthFile = path.join(projectDir, 'aperion_clone_health_check.cjs');
const logDir = path.join(projectDir, 'logs');
const logFile = path.join(logDir, 'aperion_clone_retry_runner.log');
const maxAttempts = Number(process.env.APERION_RETRY_ATTEMPTS || 2);

fs.mkdirSync(logDir, { recursive: true });

function log(text) {
  const line = `[${new Date().toISOString()}] ${text}`;
  console.log(line);
  fs.appendFileSync(logFile, `${line}\n`, 'utf8');
}

function runOnce(attempt) {
  log(`BASLADI attempt=${attempt}`);
  const result = spawnSync(process.execPath, [syncFile, '--firma', 'alayli'], {
    cwd: projectDir,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: false,
    env: { ...process.env, APERION_PROJECT_DIR: projectDir, NODE_PATH: path.join(projectDir, 'node_modules') },
  });
  if (result.stdout) fs.appendFileSync(logFile, result.stdout, 'utf8');
  if (result.stderr) fs.appendFileSync(logFile, result.stderr, 'utf8');
  const code = result.status ?? 1;
  log(`${code === 0 ? 'BASARILI' : 'HATA'} attempt=${attempt} code=${code}`);
  return code;
}

function runHealthCheck() {
  if (!fs.existsSync(healthFile)) {
    log('SAGLIK KONTROLU ATLANDI: aperion_clone_health_check.cjs yok');
    return 1;
  }
  log('SAGLIK KONTROLU BASLADI');
  const result = spawnSync(process.execPath, [healthFile], {
    cwd: projectDir,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: false,
    env: { ...process.env, APERION_PROJECT_DIR: projectDir, NODE_PATH: path.join(projectDir, 'node_modules') },
  });
  if (result.stdout) {
    process.stdout.write(result.stdout);
    fs.appendFileSync(logFile, result.stdout, 'utf8');
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
    fs.appendFileSync(logFile, result.stderr, 'utf8');
  }
  const code = result.status ?? 1;
  log(`SAGLIK KONTROLU ${code === 0 ? 'BASARILI' : 'HATA'} code=${code}`);
  return code;
}

let lastCode = 1;
for (let i = 1; i <= maxAttempts; i += 1) {
  lastCode = runOnce(i);
  if (lastCode === 0) break;
  if (i < maxAttempts) {
    log('Tekrar denemeden once 60 saniye bekleniyor');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 60000);
  }
}

if (lastCode !== 0) {
  log('SONUC: BASARISIZ - tum denemeler hata verdi');
  process.exitCode = lastCode;
} else {
  const healthCode = runHealthCheck();
  if (healthCode === 0) {
    log('SONUC: BASARILI');
  } else {
    log('SONUC: BASARISIZ - saglik kontrolu gecmedi');
    process.exitCode = healthCode;
  }
}
