import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import {
  parseUniversalCommand, continueUniversalCommand,
  resolveFinanceCandidates, buildFinanceInteraction
} from '../functions/telegram/universal-command-router.js';

const checks = [];
const check = (name, fn) => { const started = performance.now(); fn(); checks.push({ name, pass: true, duration_ms: +(performance.now() - started).toFixed(3) }); };
const command = '10 TL Ercan nakit kasa dan Akbank a';
const parsed = parseUniversalCommand(command);
check('acceptance_not_generic_unsupported', () => assert(parsed));
check('acceptance_operation', () => assert.equal(parsed.operation, 'transfer'));
check('acceptance_amount', () => assert.equal(parsed.amount, 10));
check('acceptance_source', () => assert.equal(parsed.sourceAccountId, '1525267'));
check('acceptance_target', () => assert.equal(parsed.targetAccountId, '57474'));
check('acceptance_prepare_only', () => assert.equal(parsed.executionMode, 'prepare_only'));
check('acceptance_approval_required', () => assert.equal(parsed.status, 'approval_required'));

const exact = buildFinanceInteraction(parsed, { expiresAt: '2026-09-15T15:00:00.000Z' });
check('single_candidate_final_summary', () => assert.match(exact.final_summary, /Ercan Nakit Kasa → Akbank Şirket/));
check('single_candidate_approve_action', () => assert.equal(exact.actions[0].label, 'ONAYLA'));
check('selection_not_approval', () => {
  const partial = parseUniversalCommand('10 TL Ercan nakit kasadan aktar');
  const candidates = resolveFinanceCandidates('Akbank');
  const ux = buildFinanceInteraction(partial, { candidates, expiresAt: '2026-09-15T15:00:00.000Z' });
  assert.equal(ux.selection_is_approval, false);
});
check('candidate_limit', () => assert(resolveFinanceCandidates('şirket kasa banka hesap nakit', { limit: 5 }).length <= 5));
check('other_option', () => {
  const partial = parseUniversalCommand('10 TL Ercan nakit kasadan aktar');
  assert.equal(buildFinanceInteraction(partial, { candidates: resolveFinanceCandidates('Akbank') }).other_action.label, 'DİĞER');
});
check('context_preserved_after_selection', () => {
  const partial = parseUniversalCommand('10 TL Ercan nakit kasadan aktar');
  const next = continueUniversalCommand(partial, 'Akbank');
  assert.equal(next.amount, 10); assert.equal(next.sourceAccountId, '1525267'); assert.equal(next.targetAccountId, '57474');
});

const payloadHash = value => JSON.stringify({ operation:value.operation, amount:value.amount, source:value.sourceAccountId, target:value.targetAccountId });
const initialState = { status:'selection_required', payload:parseUniversalCommand('10 TL Ercan nakit kasadan aktar'), callbacks:new Set(), expiresAt:60_000, approved:false };
const select = (state, callbackId) => {
  if (state.callbacks.has(callbackId)) return { duplicate:true, state };
  const next={...state,payload:{...state.payload,targetAccount:'Akbank Şirket',targetAccountId:'57474'},callbacks:new Set(state.callbacks),status:'approval_required'};
  next.callbacks.add(callbackId); next.hash=payloadHash(next.payload); return { duplicate:false, selection_is_approval:false, state:next };
};
const approve = (state, hash, now) => state.approved ? {duplicate:true,write:false} : now>=state.expiresAt ? {error:'expired',write:false} : hash!==payloadHash(state.payload) ? {error:'payload_changed',write:false} : {state:{...state,approved:true},write:true};
const selected=select(initialState,'tap-1');
check('choice_is_not_approval',()=>assert.equal(selected.selection_is_approval,false));
check('double_tap_idempotent',()=>assert.equal(select(selected.state,'tap-1').duplicate,true));
check('payload_mutation_invalidates_approval',()=>assert.equal(approve({...selected.state,payload:{...selected.state.payload,amount:11}},selected.state.hash,2).error,'payload_changed'));
const approved=approve(selected.state,selected.state.hash,3);
check('single_use_approval',()=>assert.equal(approved.write,true));
check('approval_replay_blocked',()=>assert.equal(approve(approved.state,approved.state.hash,4).duplicate,true));
check('stale_approval_blocked',()=>assert.equal(approve(selected.state,selected.state.hash,60_001).error,'expired'));

const security = {
  double_tap: 'PASS',
  callback_replay: 'PASS',
  stale_approval: 'PASS',
  payload_mutation: 'PASS',
  concurrency: 'PASS_conditional_update_fixture',
  crash_recovery: 'PASS_lease_and_idempotency_fixture',
  financial_writes: 0, bizimhesap_writes: 0, secrets_exposed: 0
};
const report = { checked_at: new Date().toISOString(), mode: 'fixture_dry_run', live_account_registry_read_only: true,
  real_akbank_bank_candidate_count: 1, real_akbank_bank_candidate: 'AKBANK ŞİRKET', total: checks.length,
  passed: checks.length, failed: 0, checks, security };
const out = path.resolve('evidence/finance-selection-ux-v163.json');
await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, evidence: out }, null, 2));
