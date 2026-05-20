const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectDir = process.env.APERION_PROJECT_DIR || 'C:\\Users\\HP\\Desktop\\ErpaltH';
const syncFile = path.join(projectDir, 'aperion_veri_senkron.js');
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
  log('SONUC: BASARILI');
}
