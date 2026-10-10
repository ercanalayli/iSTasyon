import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseCashTransferIntent } from '../functions/telegram/webhook.js';
import { parseUniversalCommand } from '../functions/telegram/universal-command-router.js';

const root = path.resolve(import.meta.dirname, '..');
const webhookSource = fs.readFileSync(path.join(root,'functions','telegram','webhook.js'),'utf8');

const intent = parseCashTransferIntent('Nakit Kasadan Ercan Nakit Kasaya 3500 TL transfer');
assert(intent);
assert.equal(intent.amount,3500);
assert.equal(intent.requires_approval,true);
assert.equal(intent.creates_finance_record,false);
assert.equal(intent.sends_to_bizimhesap,false);

const universal = parseUniversalCommand('10 TL Ercan nakit kasa dan Akbank a');
assert(universal);
assert.equal(universal.code,'bizimhesap.cash_transfer_post');
assert.equal(universal.risk,'approval_required');
assert.equal(universal.executionMode,'prepare_only');

assert.match(webhookSource,/cash_transfer_test/);
assert.match(webhookSource,/test_mode:\s*true/);
assert.match(webhookSource,/live_write_enabled:\s*false/);
assert.match(webhookSource,/TEST MODU[^\n]*YAZMA KİLİTLİ/);
assert.match(webhookSource,/TEST ONAY[^\n]*YAZMA YOK/);
assert.match(webhookSource,/test_approved/);
assert.doesNotMatch(webhookSource,/cash_transfer_test[\s\S]{0,2500}command:\s*['"]bizimhesap_process['"]/);

console.log(JSON.stringify({
  ok:true,
  status:'PASS',
  parser:'OK',
  production_intent:'approval_required_prepare_only',
  telegram_test_card:'UNMISTAKABLY_TEST_ONLY',
  live_write_enabled:false,
  test_to_live_queue:'BLOCKED'
}));
