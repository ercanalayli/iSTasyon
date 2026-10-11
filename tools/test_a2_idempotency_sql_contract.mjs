import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// STATIC CONTRACT TEST ONLY. This does not connect to or modify production DB.
const sql=readFileSync('specs/a2_sale_intent_postgres_NOT_DEPLOYED.sql','utf8');
assert.match(sql,/DESIGN PROPOSAL ONLY \(DO NOT AUTO-APPLY\)/);
assert.match(sql,/UNIQUE\s*\(\s*company_key\s*,\s*source_id\s*\)/i);
assert.match(sql,/a2_unique_company_erp_guid/);
assert.match(sql,/ENABLE ROW LEVEL SECURITY/i);
assert.match(sql,/REVOKE ALL[^;]+FROM anon,authenticated/i);
assert.match(sql,/status='APPROVED'/);
assert.match(sql,/approved_proposal_sha256=proposal_sha256/);
assert.match(sql,/approval_expires_at>now\(\)/);
assert.match(sql,/RETURNING id/);
assert.match(sql,/OUTCOME_UNKNOWN/);
assert.match(sql,/NEVER automatically retry/);
assert.match(sql,/CREATE TRIGGER aperion_a2_intent_guard_on_write/);
assert.match(sql,/sale_intent_identity_immutable/);
assert.match(sql,/sale_approval_immutable/);
assert.match(sql,/sale_illegal_status_transition/);
assert.match(sql,/sale_approval_invalid_or_expired/);
assert.match(sql,/sale_readback_evidence_required/);
assert.doesNotMatch(sql,/https?:\/\/[^ \n]*bizimhesap/);
console.log('A2_IDEMPOTENCY_STATIC_CONTRACT_PASS · NOT_DEPLOYED · NO_DB_EXECUTION · NO_FINANCIAL_POST');
