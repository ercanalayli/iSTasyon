const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const FIRMA = valueArg('--firma', 'alayli');
const COMMIT = args.includes('--commit');
const LIMIT = valueArg('--limit', process.env.BANK_WATCH_LIMIT || '10');

function valueArg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

function runBot() {
  const botArgs = ['bizimhesap_banka_bot.js', '--firma', FIRMA, '--limit', LIMIT];
  if (COMMIT) botArgs.push('--commit', '--save');
  const result = spawnSync(process.execPath, botArgs, {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, NODE_PATH: process.env.NODE_PATH || `${__dirname}\\node_modules`, BANK_TABLE: process.env.BANK_TABLE || 'bank_transactions' },
    shell: false,
  });
  if (result.status !== 0) process.exitCode = result.status || 1;
}

runBot();
