import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseUniversalCommand } from '../functions/telegram/universal-command-router.js';
import postingPlan from './bank_posting_plan.cjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bridgeRoot = 'C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge';
const bridgeIndex = fs.readFileSync(path.join(bridgeRoot, 'src', 'index.js'), 'utf8');
const bridgeWorker = fs.readFileSync(path.join(bridgeRoot, 'src', 'windows-worker.js'), 'utf8');

const commands = [
  'Nakit kasadan Ercan kasaya 3500 TL transfer',
  'Murat Ticaret için fatura oluştur',
  'Ahmet carisine 1250 TL tahsilat kaydet',
].map(text => ({ text, parsed: parseUniversalCommand(text) }));
for (const row of commands) {
  assert.equal(row.parsed?.risk, 'approval_required');
  assert.equal(row.parsed?.executionMode, 'prepare_only');
  assert.equal(row.parsed?.approvalPolicy, 'explicit_single_use');
}

const fixtures = [
  {
    id: 'dry-transfer-001', bank_name: 'VakıfBank', transaction_date: '2026-09-14',
    amount_in: 3500, description: 'IS BANKASI HESAPLAR ARASI VIRMAN',
    duplicate_key: 'dry:transfer:001', confidence_score: 95,
  },
  {
    id: 'dry-cari-001', bank_name: 'İş Bankası', transaction_date: '2026-09-14',
    amount_in: 1250, description: 'GELEN EFT MURAT TICARET TARAFINDAN AKTARILAN',
    suggested_counterparty: 'MURAT TICARET', counterparty_confirmed: true,
    duplicate_key: 'dry:cari:001', confidence_score: 96,
  },
  {
    id: 'dry-invoice-001', bank_name: 'İş Bankası', transaction_date: '2026-09-14',
    amount_out: 890, description: 'TURKCELL FATURA ODEMESI',
    suggested_counterparty: 'TURKCELL', duplicate_key: 'dry:invoice:001', confidence_score: 90,
  },
];
const plans = fixtures.map(postingPlan.classifyBankMovement);
assert.equal(plans[0].plan.kind, 'bank_transfer');
assert.ok(plans[0].plan.source_account);
assert.ok(plans[0].plan.target_account);
assert.equal(plans[1].plan.counterparty, 'MURAT TICARET');
assert.equal(plans[1].plan.kind, 'customer_collection');
assert.equal(plans[2].plan.kind, 'utility_bill_payment');
for (const plan of plans) {
  assert.ok(plan.duplicate_key);
  assert.match(plan.plan.next_step_after_user_approval, /approval|approve_pending_bank_movement/i);
}

const guards = {
  cloudRiskMap: /\["bizimhesap\.cash_transfer_post",\s*"write"\]/.test(bridgeIndex),
  cloudApprovalRequired: bridgeIndex.includes('risk === "write" ? "required" : "not_required"'),
  claimRequiresApproval: bridgeIndex.includes("risk = 'write' AND approval_state = 'approved'"),
  localGuardedWrites: bridgeWorker.includes('GUARDED_WRITE_COMMANDS') && bridgeWorker.includes('beginExecution(task)'),
  duplicateLedger: bridgeWorker.includes('replay_completed') && bridgeWorker.includes('ambiguous_started'),
  mfaOnlyNotification: /captcha\|mfa\|GIRIS_ONAYI_GEREKLI/i.test(bridgeWorker),
};
for (const value of Object.values(guards)) assert.equal(value, true);

const evidence = {
  checkedAt: new Date().toISOString(),
  status: 'PASS',
  mode: 'fixture_dry_run_plus_live_wiring_inspection',
  financialWrites: 0,
  bizimHesapWrites: 0,
  messagesSent: 0,
  commandParsing: commands,
  plans,
  guards,
  approvalQueueStage: 'approve_pending_bank_movement RPC -> bizimhesap_queue.status=ready_for_bizimhesap',
};
const output = path.join(root, 'evidence', 'production-readiness-command-path-v159.json');
if (!process.argv.includes('--no-write')) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify({ status: evidence.status, scenarios: plans.length, guards, output: process.argv.includes('--no-write') ? null : output, financialWrites: 0 }, null, 2));
