'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { assertDistinctVisibleSourceRows } = require('./source_row_guard.cjs');
test('distinct source rows pass', () => {
  assert.deepEqual(assertDistinctVisibleSourceRows([{key:'A'},{key:'B'}],r=>r.key,'bank'), {checkedRows:2,distinctKeys:2,safeWithinWindow:true});
});
test('same date amount and payment method in separate rows block rather than merge', () => {
  const rows=[{key:'company|cari|2026-10-13|1000|bank'},{key:'company|cari|2026-10-13|1000|bank'}];
  assert.throws(()=>assertDistinctVisibleSourceRows(rows,r=>r.key,'customer_payment'),e=>{
    assert.equal(e.code,'SOURCE_IDENTITY_COLLISION');assert.equal(e.firstIndex,0);assert.equal(e.secondIndex,1);
    assert.doesNotMatch(e.message,/company\|cari/);return true;
  });
});
test('identical bank ledger rows in one viewport are blocked',()=>{
  assert.throws(()=>assertDistinctVisibleSourceRows([{satir_hash:'same'},{satir_hash:'same'}],r=>r.satir_hash,'bank_ledger'),{code:'SOURCE_IDENTITY_COLLISION'});
});
test('no source key is not a valid row identity',()=>{
  assert.throws(()=>assertDistinctVisibleSourceRows([{key:''}],r=>r.key,'payment'),{code:'SOURCE_IDENTITY_MISSING'});
});
test('empty viewport does not prove full source coverage',()=>{
  const r=assertDistinctVisibleSourceRows([],x=>x.key,'bank');assert.equal(r.checkedRows,0);assert.equal(r.safeWithinWindow,true);
});
