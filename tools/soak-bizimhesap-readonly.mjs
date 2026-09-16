import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const worker = 'C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge\\src\\windows-worker.js';
const evidence = path.resolve('evidence', 'bizimhesap-always-available-soak.json');
const durationMs = 60 * 60 * 1000;
const intervalMs = 60 * 1000;
const startedAt = Date.now();
const probes = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function probe() {
  return new Promise(resolve => {
    const started = Date.now();
    const child = spawn(process.execPath, [worker, '--site-availability-check'], {
      windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk.toString().slice(0, 2000); });
    const timer = setTimeout(() => child.kill(), 90_000);
    child.once('error', error => { clearTimeout(timer); resolve({ at: new Date().toISOString(), state: 'ERROR', reason: error.code, durationMs: Date.now() - started }); });
    child.once('exit', code => {
      clearTimeout(timer);
      let state = 'ERROR';
      try { state = JSON.parse(output).state || state; } catch {}
      resolve({ at: new Date().toISOString(), state, exitCode: code, durationMs: Date.now() - started });
    });
  });
}

do {
  probes.push(await probe());
  const result = {
    startedAt: new Date(startedAt).toISOString(),
    observedUntil: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    requiredMs: durationMs,
    completed: Date.now() - startedAt >= durationMs,
    probeCount: probes.length,
    readyCount: probes.filter(item => item.state === 'READY').length,
    failedCount: probes.filter(item => item.state !== 'READY').length,
    maxProbeMs: Math.max(...probes.map(item => item.durationMs)),
    probes
  };
  await fs.writeFile(evidence, JSON.stringify(result, null, 2));
  if (result.completed) break;
  await sleep(Math.min(intervalMs, Math.max(0, durationMs - (Date.now() - startedAt))));
} while (true);
