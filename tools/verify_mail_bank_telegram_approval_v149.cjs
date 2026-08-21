const fs = require('fs');
const assert = require('assert');

const worker = fs.readFileSync('automation/mail-ekstre-worker-lite.js', 'utf8');
const webhook = fs.readFileSync('functions/telegram/webhook.js', 'utf8');
const workflow = fs.readFileSync('.github/workflows/mail-ekstre-pipeline.yml', 'utf8');

assert(worker.includes("TELEGRAM_NOTIFICATION_PREFIX = '[TELEGRAM_ONAY_KARTI]'"), 'notification marker missing');
assert(worker.includes("callback_data: `bm:a:${row.id}`"), 'approve callback missing');
assert(worker.includes("callback_data: `bm:r:${row.id}`"), 'reject callback missing');
assert(worker.includes(".in('status', ['pending', 'needs_review'])"), 'pending status guard missing');
assert(worker.includes('Mükerrer kontrolü uygulanmıştır'), 'duplicate safety copy missing');
assert(worker.includes('await dispatchPendingApprovals(db, report)'), 'dispatch is not wired to live ingest');

assert(webhook.includes("data.match(/^bm:([ar]):([0-9a-f-]{36})$/i)"), 'bank callback parser missing');
assert(webhook.includes("/rest/v1/rpc/approve_pending_bank_movement"), 'approve RPC missing');
assert(webhook.includes("/rest/v1/rpc/reject_pending_bank_movement"), 'reject RPC missing');
assert(webhook.includes("row.status === 'approved'"), 'approved-to-rejected guard missing');
assert(webhook.includes('clearCallbackButtons'), 'callback replay guard missing');

assert(workflow.includes('cron: "0 6 * * *"'), '09:00 Europe/Istanbul schedule missing');
assert(workflow.includes('TELEGRAM_BOT_TOKEN: ${{ secrets.TELEGRAM_BOT_TOKEN }}'), 'Telegram workflow secret mapping missing');
assert(workflow.includes('TELEGRAM_CHAT_IDS: ${{ secrets.TELEGRAM_CHAT_IDS }}'), 'Telegram chat mapping missing');

console.log('MAIL_BANK_TELEGRAM_APPROVAL_V149_OK');