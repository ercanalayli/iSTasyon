import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildFinanceMemorySummary, dueRisk, ensureFinanceMemorySchema, extractFinanceMemory,
  financeMemoryDedupeKey, financeMemorySummaryText, financeObligationInternals,
  dueWarningKey, paymentMatchScore, safePaymentDecision, transitionObligationStatus,
} from '../functions/shared/finance-obligation-memory.js';
import { onRequestGet } from '../functions/api/financial-document-process.js';

const now = new Date('2026-07-19T09:00:00Z');
const cardText = `ALAYLI MEDIKAL\nİş Bankası Maximiles kredi kartı ekstresi\nKart ****3904
Hesap kesim tarihi: 12.07.2026\nSon ödeme tarihi: 22.07.2026
Toplam dönem borcu: 123.456,00 TL\nAsgari ödeme tutarı: 49.382,40 TL`;
const card = extractFinanceMemory(cardText);
assert.equal(card.kind, 'obligation');
assert.equal(card.obligation_type, 'credit_card');
assert.equal(card.scope, 'ALAYLI');
assert.equal(card.account_masked, '****3904');
assert.equal(card.statement_date, '2026-07-12');
assert.equal(card.due_date, '2026-07-22');
assert.equal(card.total_amount, 123456);
assert.equal(card.minimum_amount, 49382.4);
assert.equal(card.status, 'open');

const types = [
  ['ALAYLI GİB vergi bildirimi Vergi türü: KDV Tutar: 12.500 TL Son ödeme tarihi: 25.07.2026', 'tax'],
  ['ALAYLI SGK prim borcu Dönem: 06.2026 Tutar: 9.800 TL Vade tarihi: 26.07.2026', 'sgk'],
  ['ŞAHSİ kira ödenecek tutar 20.000 TL Vade tarihi 01.08.2026 Kurum: Ev Sahibi', 'rent'],
  ['ALAYLI kredi taksit ödenecek tutar 44.000 TL Son ödeme 03.08.2026 Banka: Akbank', 'loan'],
  ['ALAYLI Turkcell abonelik toplam 1.250 TL Son ödeme tarihi 28.07.2026', 'subscription'],
  ['ALAYLI elektrik faturası toplam 3.400 TL Son ödeme tarihi 29.07.2026 Kurum: Enerji AŞ', 'utility'],
  ['ALAYLI tedarikçi faturası Tedarikçi: Örnek Medikal Genel toplam 87.000 TL Vade tarihi 30.07.2026', 'supplier_invoice'],
];
for (const [fixture, expected] of types) assert.equal(extractFinanceMemory(fixture).obligation_type, expected);
assert.equal(extractFinanceMemory('ALAYLI GİB vergi bildirimi toplam 100 TL vade 22.07.2026 tahsilat başarısız').collection_state, 'failed');
assert.equal(extractFinanceMemory('ALAYLI GİB vergi bildirimi toplam 100 TL vade 22.07.2026 tahsilat başarılı').collection_state, 'successful');

const missingDue = extractFinanceMemory('ALAYLI İş Bankası kredi kartı ekstresi Toplam dönem borcu 5.000 TL Kart ****1111');
assert.equal(missingDue.status, 'needs_review');
assert.ok(missingDue.missing.includes('due_date'));

const key1 = await financeMemoryDedupeKey(card, 'fixture-card-1');
const key2 = await financeMemoryDedupeKey(card, 'fixture-card-1');
assert.equal(key1, key2);
assert.equal(await financeMemoryDedupeKey(card, 'a-different-message'), key1);
assert.equal(dueWarningKey({ obligation_key: 'obl-1' }, dueRisk('2026-07-22', now), '2026-07-19'), 'obl-1|HIGH|2026-07-19');

const payment = extractFinanceMemory(`ALAYLI İş Bankası FAST giden dekontu
İşlem tarihi: 22.07.2026\nİşlem tutarı: 123.456,00 TL\nKart ****3904`);
const obligation = { ...card, obligation_key: 'obl-fixture', status: 'open' };
const match = paymentMatchScore(obligation, payment);
assert.ok(match.score >= 0.85);
assert.equal(safePaymentDecision([obligation], payment).action, 'paid');

const ambiguousPayment = extractFinanceMemory('FAST giden dekontu İşlem tarihi: 22.07.2026 İşlem tutarı: 123.456,00 TL');
assert.equal(safePaymentDecision([obligation], ambiguousPayment).action, 'needs_review');

assert.deepEqual(dueRisk('2026-07-22', now), { status: 'due_soon', risk: 'HIGH', days_remaining: 3 });
assert.deepEqual(dueRisk('2026-07-26', now), { status: 'due_soon', risk: 'APPROACHING', days_remaining: 7 });
assert.deepEqual(dueRisk('2026-07-20', now), { status: 'due_soon', risk: 'CRITICAL', days_remaining: 1 });
assert.deepEqual(dueRisk('2026-07-27', now), { status: 'open', risk: 'NORMAL', days_remaining: 8 });
assert.deepEqual(dueRisk('2026-07-18', now), { status: 'overdue', risk: 'OVERDUE', days_remaining: -1 });
assert.equal(transitionObligationStatus('open', 'paid'), 'paid');
assert.equal(transitionObligationStatus('paid', 'archived'), 'archived');
assert.throws(() => transitionObligationStatus('open', 'archived'));

const rules = [{ alias_key: 'furkan batki', canonical_name: 'Furkan Batkı' }];
assert.equal(extractFinanceMemory('Furkan Batkı kira toplam 1000 TL vade tarihi 22.07.2026 kurum: Ev', { rules }).scope, 'SAHSI');
assert.equal(extractFinanceMemory('ALAYLI SGK toplam 1000 TL vade tarihi 22.07.2026').scope, 'ALAYLI');
const companyRules = [{ alias_key: 'yapi kredi adios 9954 erhan', canonical_name: 'Yapı Kredi Adios 9954 Erhan', scope: 'ALAYLI' }];
assert.equal(extractFinanceMemory('Yapı Kredi Adios 9954 Erhan kredi kartı toplam dönem borcu 1000 TL son ödeme tarihi 22.07.2026', { rules: companyRules }).scope, 'ALAYLI');
const personalRules = [{ alias_key: 'teb ercan', canonical_name: 'TEB Ercan', scope: 'SAHSI' }];
assert.equal(extractFinanceMemory('TEB Ercan kredi kartı toplam dönem borcu 1000 TL son ödeme tarihi 22.07.2026', { rules: personalRules }).scope, 'SAHSI');
assert.equal(extractFinanceMemory('ALAYLI TEB Ercan kredi kartı toplam dönem borcu 1000 TL son ödeme tarihi 22.07.2026', { rules: personalRules }).scope, 'BELIRSIZ');
const conflictingRules = [
  { alias_key: 'ortak kart', canonical_name: 'Ortak Kart', scope: 'ALAYLI' },
  { alias_key: 'ortak kart', canonical_name: 'Ortak Kart', scope: 'SAHSI' },
];
assert.equal(extractFinanceMemory('Ortak Kart kredi kartı toplam dönem borcu 1000 TL son ödeme tarihi 22.07.2026', { rules: conflictingRules }).scope, 'BELIRSIZ');

const summary = buildFinanceMemorySummary([
  { ...obligation, due_date: '2026-07-19' },
  { ...obligation, obligation_key: 'three', due_date: '2026-07-22', obligation_type: 'tax' },
  { ...obligation, obligation_key: 'seven', due_date: '2026-07-26', scope: 'SAHSI' },
  { ...obligation, obligation_key: 'late', due_date: '2026-07-18', obligation_type: 'sgk' },
  { ...obligation, obligation_key: 'paid', status: 'paid', paid_at: '2026-07-18' },
], now);
assert.equal(summary.today.length, 1);
assert.equal(summary.within3.length, 1);
assert.equal(summary.within7.length, 1);
assert.equal(summary.overdue.length, 1);
assert.equal(summary.recentlyPaid.length, 1);
assert.match(financeMemorySummaryText(summary), /GECİKENLER/);
assert.match(financeMemorySummaryText(summary), /ALAYLI/);
assert.match(financeMemorySummaryText(summary), /SAHSI/);

const schemaSql = [];
const schemaDb = { prepare(sql) { schemaSql.push(String(sql)); return { async run() { return { success: true }; } }; } };
await ensureFinanceMemorySchema(schemaDb);
assert.ok(schemaSql.some(sql => sql.includes('CREATE TABLE IF NOT EXISTS finance_obligations')));
assert.ok(schemaSql.some(sql => sql.includes('CREATE TABLE IF NOT EXISTS finance_payment_matches')));
assert.ok(schemaSql.some(sql => sql.includes('UNIQUE(obligation_key,risk_level,local_date)')));
assert.equal(financeObligationInternals.FINANCIAL_WRITES, 0);
const unauthenticatedSummary = await onRequestGet({
  request: new Request('https://example.test/api/financial-document-process?view=obligations'),
  env: { APERION_BRIDGE_SECRET: 'fixture-secret', APERION_DB: schemaDb },
});
assert.equal(unauthenticatedSummary.status, 401);

const evidence = {
  checked_at: new Date().toISOString(), schema_ok: true, extraction_tests_passed: true,
  supported_types: ['credit_card','tax','sgk','rent','loan','utility','supplier_invoice','subscription','payment'],
  dedupe_ok: true, due_engine_ok: true, payment_match_ok: true,
  ambiguous_payment_needs_review: true, lifecycle_ok: true, scope_separation_ok: true,
  morning_brief_or_summary_ok: true, financial_writes: 0, secrets_exposed: 0,
};
const stateDir = path.resolve('state');
fs.mkdirSync(stateDir, { recursive: true });
fs.writeFileSync(path.join(stateDir, 'finance-memory-verification.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log('finance obligation memory v157: OK');
