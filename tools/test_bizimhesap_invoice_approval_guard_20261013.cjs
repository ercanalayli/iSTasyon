'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {
 existingSaleGuard,payloadFingerprint,verifyRecordedInvoiceApproval,checkInvoicePreflight
}=require('./lib/bizimhesap_invoice_approval_guard.cjs');

const known=existingSaleGuard('WA-20261010-GAMZE');
assert.equal(known.blocked,true);
assert.equal(known.existingGuid,'FCB82CD3053A491986C6B2D1C9F5D329');
assert.deepEqual(known.historicalGuids,[
  'A782C5B8C1D64F649F4A8010F937F923',
  'FCB82CD3053A491986C6B2D1C9F5D329'
]);
assert.equal(known.firstCancellationReadbackVerified,false);
assert.equal(known.reissuedCustomerCardMatchVerified,false);
assert.equal(known.responseTotal,'9531.92');
assert.equal(known.providerLineReadbackVerified,false);
assert.equal(known.eInvoiceIssuedVerified,false);
const base={
 firmId:'A'.repeat(32),invoiceNo:'',invoiceType:3,
 note:'Order WA-20261101-OTHER',
 dates:{invoiceDate:'2026-11-01T12:00:00+03:00',dueDate:'2026-11-01T12:00:00+03:00',deliveryDate:'2026-11-01T12:00:00+03:00'},
 customer:{customerId:'B'.repeat(32),title:'Synthetic test'},
 amounts:{currency:'TL',gross:'10.00',discount:'0.00',net:'10.00',tax:'1.00',total:'11.00'},
 details:[{productId:'C'.repeat(32),productName:'TEST',quantity:1,
  unitPrice:'10.00',grossPrice:'10.00',discount:'0.00',net:'10.00',
  taxRate:'10.00',tax:'1.00',total:'11.00'}]
};
const p=checkInvoicePreflight({
 sourceReference:'WA-20261101-OTHER',
 idempotencyKey:'WA-20261101-OTHER:NORMAL_SALE:v1',invoice:base
});
assert.equal(p.blocked,false);
assert.match(p.fingerprint,/^[a-f0-9]{64}$/);
assert.equal(payloadFingerprint(base),p.fingerprint);
assert.notEqual(payloadFingerprint({...base,amounts:{...base.amounts,total:'12.00'}}),p.fingerprint);
assert.throws(()=>checkInvoicePreflight({...p,sourceReference:'WA-20261101-OTHER',idempotencyKey:'other',invoice:base}));
assert.throws(()=>checkInvoicePreflight({
 sourceReference:'WA-20261101-OTHER',idempotencyKey:'WA-20261101-OTHER:NORMAL_SALE:v1',
 invoice:{...base,details:[{...base.details[0],grossPrice:'0.00'}]}
}),/gross_price_missing/);

// Same order once GUID exists must be blocked even when submitted with a
// different preview, approval flag, product mapping or idempotency key.
assert.equal(checkInvoicePreflight({
 sourceReference:'WA-20261010-GAMZE',
 idempotencyKey:'ARBITRARY',invoice:{amounts:{total:'1.00'}}
}).blocked,true);

// User-shared successful addinvoice response is not sufficient to declare
// e-Invoice issued, payment posted or line-level reconciliation complete.
const draft={ ...base, note:'Order WA-20261101-OTHER'};
const row={
 id:'D'.repeat(8)+'-'+['D'.repeat(4),'D'.repeat(4),'D'.repeat(4),'D'.repeat(12)].join('-'),
 status:'approved',source_type:'bizimhesap_invoice',approved_by:'owner',
 approved_at:'2026-11-01T11:59:00Z',suggested_amount:11,
 approval_description:JSON.stringify({
   confirmationText:'ONAYLIYORUM',sourceReference:'WA-20261101-OTHER',
   idempotencyKey:'WA-20261101-OTHER:NORMAL_SALE:v1',
   payloadSha256:payloadFingerprint(draft),approvedTotal:'11.00'
 })
};
const db=(r)=>({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:r,error:null})})})})});
(async()=>{
 const x=await verifyRecordedInvoiceApproval(db(row),{
  approvalId:row.id,sourceReference:'WA-20261101-OTHER',
  idempotencyKey:'WA-20261101-OTHER:NORMAL_SALE:v1',
  payloadHash:payloadFingerprint(draft),total:'11.00'
 });
 assert.equal(x.ok,true);
 await assert.rejects(verifyRecordedInvoiceApproval(db({...row,status:'pending'}),{
  approvalId:row.id,sourceReference:'WA-20261101-OTHER',
  idempotencyKey:'WA-20261101-OTHER:NORMAL_SALE:v1',
  payloadHash:payloadFingerprint(draft),total:'11.00'
 }),/not_recorded/);
 await assert.rejects(verifyRecordedInvoiceApproval(db({...row,approval_description:'{}'}),{
  approvalId:row.id,sourceReference:'WA-20261101-OTHER',
  idempotencyKey:'WA-20261101-OTHER:NORMAL_SALE:v1',
  payloadHash:payloadFingerprint(draft),total:'11.00'
 }),/does_not_match_preview/);
 const engine=fs.readFileSync(require.resolve('./bizimhesap_b2b_canonical.cjs'),'utf8');
 assert.match(engine,/checkInvoicePreflight/);
 assert.match(engine,/verifyRecordedInvoiceApproval/);
 assert.match(engine,/BIZIMHESAP_TOKEN_ROTATION_CONFIRMED/);
 assert.match(engine,/full_provider_duplicate_reconciliation_required/);
 assert.match(engine,/guardSingleInvoiceAttempt/);
 const guardedEngine=engine.slice(engine.indexOf('async function postApprovedInvoice('));
 assert.ok(guardedEngine.indexOf('checkInvoicePreflight({')<guardedEngine.indexOf('createBizimHesapClientFromCanonicalIntegration(env)'));
 // No network calls in this test; original Gamze sale is never posted again.
 console.log('PASS: known GUID duplicate lock, exact approval snapshot, token rotation, fail-closed preflight. ERP_POST=0');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
