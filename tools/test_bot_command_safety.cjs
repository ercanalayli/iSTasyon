'use strict';
const assert = require('node:assert/strict');
const { claimPendingBotCommand, guardSingleInvoiceAttempt } = require('./lib/bot_command_safety.cjs');

// Deterministic in-memory Supabase query mock. Never connects to a live
// financial source or posts a BizimHesap invoice.
function mockDb(rows) {
  return {
    from(name) {
      assert.equal(name, 'bot_commands');
      return {
        update(patch) {
          const filters = {};
          return {
            eq(key, value) { filters[key] = value; return this; },
            select() { return this; },
            async maybeSingle() {
              const row = rows.find(row => Object.entries(filters).every(([key, val]) => row[key] === val));
              if (!row) return { data: null, error: null };
              Object.assign(row, patch);
              return { data: { id: row.id }, error: null };
            }
          };
        },
        select() {
          const filters = {};
          let contains = {};
          return {
            eq(key, value) { filters[key] = value; return this; },
            contains(key, value) {
              assert.equal(key, 'params');
              contains = value;
              return this;
            },
            async order() {
              const matches = rows.filter(row =>
                Object.entries(filters).every(([key, val]) => row[key] === val) &&
                Object.entries(contains).every(([key, val]) => row.params?.[key] === val)
              );
              return { data: matches, error: null };
            }
          };
        }
      };
    }
  };
}
const invoice = (id, status, key = 'WA-20261010-GAMZE:NORMAL_SALE:v1') =>
  ({ id, command: 'bizimhesap_b2b_invoice', status, params: { idempotency_key: key } });

async function main() {
  const rows = [invoice(1820, 'pending', 'other'), invoice(1821, 'prepared')];
  const db = mockDb(rows);
  assert.equal(await claimPendingBotCommand(db, 1821), false, 'prepared must NEVER execute');
  assert.equal(rows[1].status, 'prepared');
  assert.equal(await claimPendingBotCommand(db, 1820), true, 'pending can be claimed once');
  assert.equal(await claimPendingBotCommand(db, 1820), false, 'second worker loses claim');
  assert.equal(rows[0].status, 'processing');

  const unique = [invoice(1821, 'processing')];
  const ok = await guardSingleInvoiceAttempt(mockDb(unique), unique[0].params.idempotency_key, 1821);
  assert.equal(ok.duplicate_blocked, false);

  await assert.rejects(
    guardSingleInvoiceAttempt(mockDb([invoice(1821, 'prepared')]), unique[0].params.idempotency_key, 1821),
    /invoice_not_atomically_claimed/
  );
  for (const state of ['pending', 'prepared', 'processing', 'failed']) {
    await assert.rejects(
      guardSingleInvoiceAttempt(mockDb([invoice(1821, 'processing'), invoice(1822, state)]), unique[0].params.idempotency_key, 1821),
      /invoice_duplicate_or_uncertain_attempt_requires_reconciliation/,
      state + ' same-key duplicate must block'
    );
  }
  const dup = await guardSingleInvoiceAttempt(
    mockDb([invoice(1821, 'processing'), { ...invoice(1822, 'completed'), result: 'prior_guid' }]),
    unique[0].params.idempotency_key, 1821
  );
  assert.equal(dup.duplicate_blocked, true);
  assert.equal(dup.prior_command_id, 1822);
  console.log('PASS: atomic command claim, prepared isolation, all-state duplicate guard (zero financial writes)');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
