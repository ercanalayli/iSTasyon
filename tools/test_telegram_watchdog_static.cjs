#!/usr/bin/env node
const fs = require('node:fs');
const assert = require('node:assert/strict');

const script = fs.readFileSync('tools/ensure_telegram_webhook.cjs', 'utf8');
const workflow = fs.readFileSync('.github/workflows/telegram-watchdog.yml', 'utf8');

assert.match(script, /sendDirectAlert/);
assert.match(script, /TELEGRAM_CHAT_ID/);
assert.match(script, /if\(!ok\)/);
assert.match(workflow, /TELEGRAM_CHAT_ID: \$\{\{ secrets\.TELEGRAM_CHAT_ID \}\}/);
assert.match(workflow, /schedule:/);
assert.match(workflow, /cron: '\*\/15 \* \* \* \*'/);

console.log('telegram watchdog static checks: OK');
