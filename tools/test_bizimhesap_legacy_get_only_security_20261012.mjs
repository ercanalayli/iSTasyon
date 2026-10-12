import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { legacyB2BRequestGuard, safeVendorId } from '../supabase/functions/bizimhesap-b2b/legacy-read-guard.js';

const src=readFileSync(new URL('../supabase/functions/bizimhesap-b2b/index.ts',import.meta.url),'utf8');
const allowed=['customers','products','warehouses','suppliers','abstract','supplierabstract','inventory'];
for(const action of allowed) {
  assert.deepEqual(legacyB2BRequestGuard('GET',action),{allowed:true});
  assert.equal(legacyB2BRequestGuard('POST',action).status,405);
}
for(const action of ['process_queue','debug_raw']) {
  const x=legacyB2BRequestGuard('GET',action);
  assert.equal(x.status,403);
  assert.equal(x.allowed,false);
}
assert.equal(legacyB2BRequestGuard('DELETE','customers').status,405);
assert.equal(legacyB2BRequestGuard('PUT','customers').status,405);
assert.equal(legacyB2BRequestGuard('GET',null).status,400);
assert.equal(legacyB2BRequestGuard('GET','addinvoice').status,400);
assert.equal(legacyB2BRequestGuard('GET','/abstract/..').status,400);
for(const id of ['219C65ACD6C24DB6AA977C9F49561B19','ca0f19_01','8a0f-1212']) assert.equal(safeVendorId(id),id);
for(const id of ['../addinvoice','a/b','x?x=y','x%2Fy','abc#def',' ',null,'a'.repeat(101)]) assert.equal(safeVendorId(id),null);

assert.match(src,/legacyB2BRequestGuard\(req\.method, action\)/);
assert.match(src,/const guard = legacyB2BRequestGuard[\s\S]*if \(!guard\.allowed\)/);
assert.match(src,/const guard = legacyB2BRequestGuard[\s\S]*const supabase = sb\(\)/);
assert.match(src,/safeVendorId\(/);
assert.match(src,/const \{ token \} = await getCreds/);
assert.doesNotMatch(src,/bhPost\s*\(|processQueue\s*\(|process_queue|debug_raw|method:\s*['"]POST['"]/i);
assert.match(src,/financialWrites: 0/);
assert.match(src,/UPSTREAM_READ_UNAVAILABLE/);
assert.doesNotMatch(src,/error\.message\s*}\s*\),/);
console.log('PASS legacy BizimHesap service: GET allowlist, queue POST impossible, vendor ID and error guarded');
