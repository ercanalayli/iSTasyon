import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCashExpenseIntent } from '../functions/shared/cash-expense.js';
import { onRequestPost } from '../functions/telegram/webhook.js';

class FakeD1 {
  constructor() { this.quickNotes = new Map(); this.approvals = new Map(); this.nextId = 1; }
  prepare(sql) {
    const db = this;
    return {
      args: [], bind(...args) { this.args = args; return this; },
      async first() {
        if (sql.startsWith('INSERT INTO quick_notes')) {
          const key = String(this.args[0]);
          if (!db.quickNotes.has(key)) db.quickNotes.set(key, { id: db.nextId++ });
          return db.quickNotes.get(key);
        }
        if (sql.includes('WHERE idempotency_key=?')) {
          const row = [...db.approvals.values()].find(item => item.idempotency_key === this.args[0]);
          return row ? { id: row.id, status: row.status } : null;
        }
        if (sql.includes('FROM approval_queue WHERE id=?')) return db.approvals.get(this.args[0]) || null;
        throw new Error('Unsupported first SQL: ' + sql);
      },
      async run() {
        if (sql.startsWith('INSERT INTO approval_queue')) {
          const [id, payloadJson, evidenceRef, idempotencyKey] = this.args;
          if ([...db.approvals.values()].some(item => item.idempotency_key === idempotencyKey)) throw new Error('duplicate');
          db.approvals.set(id, { id, status: 'needs_review', payload_json: payloadJson, evidence_ref: evidenceRef, idempotency_key: idempotencyKey });
          return { success: true };
        }
        if (sql.startsWith('UPDATE approval_queue SET status=?')) {
          const [status, decidedBy, id] = this.args; const row = db.approvals.get(id);
          if (row?.status === 'needs_review') { row.status = status; row.decided_by = decidedBy; }
          return { success: true };
        }
        if (sql.includes("SET status='queued'")) { const row = db.approvals.get(this.args[0]); if (row?.status === 'approved_queueing') row.status = 'queued'; return { success: true }; }
        if (sql.includes("SET status='approved_queueing'")) {
          const id = this.args.at(-1); const row = db.approvals.get(id);
          if (row?.status === 'needs_review') row.status = 'approved_queueing';
          return { success: true };
        }
        if (sql.includes("status='approved_queue_failed'")) { const row = db.approvals.get(this.args[0]); if (row) row.status = 'approved_queue_failed'; return { success: true }; }
        throw new Error('Unsupported run SQL: ' + sql);
      }
    };
  }
}

const parsed = parseCashExpenseIntent("Ercan Nakit Kasa'dan 5.000 TL yemek odemesi", new Date('2026-08-21T06:00:00Z'));
assert.equal(parsed.source_account, 'ercan nakit');
assert.equal(parsed.expense_category, 'Yemek');
assert.equal(parsed.amount, 5000);
assert.equal(parsed.transaction_date, '2026-08-21');
assert.equal(parsed.sends_to_bizimhesap, false);

const calls = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  const body = options.body && typeof options.body === 'string' ? JSON.parse(options.body) : null;
  calls.push({ url: String(url), body });
  if (String(url).includes('/rest/v1/bot_commands')) return new Response(JSON.stringify([{ id: 77 }]), { status: 201 });
  return new Response(JSON.stringify({ ok: true, result: {} }), { status: 200 });
};

try {
  const db = new FakeD1();
  const env = { APERION_DB: db, TELEGRAM_BOT_TOKEN: 'test-token', TELEGRAM_WEBHOOK_SECRET: 'test-secret', TELEGRAM_ALLOWED_CHAT_IDS: '1497', SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-key' };
  const webhookRequest = body => new Request('https://test/telegram/webhook', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 'test-secret' }, body: JSON.stringify(body) });
  const update = { update_id: 1, message: { message_id: 148, chat: { id: 1497 }, text: "Ercan Nakit Kasa'dan 5.000 TL yemek odemesi" } };
  const response = await onRequestPost({ request: webhookRequest(update), env });
  const body = await response.json();
  assert.equal(body.intent, 'cash_expense');
  assert.equal(body.live_write_enabled, false);
  assert.equal(db.approvals.size, 1);
  assert.equal(calls.filter(call => call.url.includes('/rest/v1/bot_commands')).length, 0);

  const card = calls.find(call => call.url.endsWith('/sendMessage')).body;
  assert.match(card.text, /GERÇEK GİDER ONAYI/);
  assert.equal(card.parse_mode, 'HTML');
  const callbackData = card.reply_markup.inline_keyboard[0][0].callback_data;
  const callback = { update_id: 2, callback_query: { id: 'cb-148', data: callbackData, message: { chat: { id: 1497 } } } };
  const callbackResponse = await onRequestPost({ request: webhookRequest(callback), env });
  assert.equal((await callbackResponse.json()).callback_handled, true);
  assert.equal([...db.approvals.values()][0].status, 'queued');

  const queued = calls.find(call => call.url.includes('/rest/v1/bot_commands')).body;
  assert.equal(queued.command, 'bizimhesap_expense');
  assert.equal(queued.params.approved, true);
  assert.equal(queued.params.source_account, 'ercan nakit');
  assert.equal(queued.params.amount, 5000);

  const repeated = await onRequestPost({ request: webhookRequest(callback), env });
  assert.equal((await repeated.json()).callback_handled, true);
  assert.equal(calls.filter(call => call.url.includes('/rest/v1/bot_commands')).length, 1);

  const listener = fs.readFileSync(new URL('./aperion_command_listener.cjs', import.meta.url), 'utf8');
  assert.match(listener, /cmd\.command === 'bizimhesap_expense'/);
  assert.match(listener, /params\.approved !== true/);
  assert.match(listener, /hesapBakiyesiOku\(sourceAccount\)/);
  assert.match(listener, /sendFinanceResult\(/);
  assert.match(listener, /savePageDiagnostics\(page, proofName\)/);
  console.log('cash expense v148: OK');
} finally { globalThis.fetch = originalFetch; }
