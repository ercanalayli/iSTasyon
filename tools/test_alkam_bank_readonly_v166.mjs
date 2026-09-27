import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decideBankMovement } from '../functions/shared/bank-approvals.js';

function mockDb(initialRow) {
  let row = { ...initialRow };
  const state = { batchCalls:0, updates:[], inserts:[] };
  return {
    state,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (/SELECT \* FROM bank_statement_movements WHERE id=\?/i.test(sql)) return { ...row };
              return null;
            },
            async run() {
              if (/UPDATE bank_statement_movements SET status='approved_read_only'/i.test(sql)) {
                row = { ...row, status:'approved_read_only', approval_note:'[ALKAM_ISTASYON_READ_ONLY]' };
                state.updates.push('approved_read_only');
                return { meta:{ changes:1 } };
              }
              if (/UPDATE bank_statement_movements SET status='rejected'/i.test(sql)) {
                row = { ...row, status:'rejected' };
                state.updates.push('rejected');
                return { meta:{ changes:1 } };
              }
              if (/INSERT/i.test(sql)) state.inserts.push(sql);
              return { meta:{ changes:1 } };
            }
          };
        }
      };
    },
    async batch(statements) {
      state.batchCalls += 1;
      for (const statement of statements) {
        if (statement?.run) await statement.run();
      }
      return [];
    }
  };
}

const alkam = mockDb({
  id:'00000000-0000-4000-8000-000000000001',
  company_id:'alkam',
  status:'needs_review',
  duplicate_key:'HALKBANK|2026-09-25|16000',
  raw_json:'{}'
});
const a = await decideBankMovement(alkam,'00000000-0000-4000-8000-000000000001','approve','123');
assert.equal(a.ok,true);
assert.equal(a.status,'approved_read_only');
assert.equal(a.posting_route,'istasyon_read_only');
assert.equal(a.financial_write,0);
assert.equal(alkam.state.batchCalls,0,'ALKAM must never enter generic bank_posting_queue');
assert.deepEqual(alkam.state.updates,['approved_read_only']);

const alayli = mockDb({
  id:'00000000-0000-4000-8000-000000000002',
  company_id:'alayli',
  status:'needs_review',
  duplicate_key:'TEST|ALAYLI',
  raw_json:'{}'
});
const b = await decideBankMovement(alayli,'00000000-0000-4000-8000-000000000002','approve','123');
assert.equal(b.ok,true);
assert.equal(b.status,'queued');
assert.equal(alayli.state.batchCalls,1,'ALAYLI should keep the existing generic queue path');

const webhook = fs.readFileSync(new URL('../functions/telegram/webhook.js', import.meta.url),'utf8');
assert(webhook.includes("decision.status === 'approved_read_only'"));
assert(webhook.includes("row.company_id === 'alkam'"));
assert(webhook.includes('BizimHesap kuyruğuna aktarılmadı'));

const endpoint = fs.readFileSync(new URL('../functions/api/alkam-bank-review.js', import.meta.url),'utf8');
assert(endpoint.includes("company_id='alkam'"));
assert(endpoint.includes("posting_route:'read_only'"));
assert(endpoint.includes('financial_write:0'));
assert(endpoint.includes('authorized(request, env)'));

console.log(JSON.stringify({
  status:'PASS',
  alkam_approval:'approved_read_only',
  generic_posting_queue_calls_for_alkam:alkam.state.batchCalls,
  alayli_existing_queue_path_preserved:alayli.state.batchCalls===1,
  protected_read_endpoint:true,
  financial_writes:0
},null,2));
