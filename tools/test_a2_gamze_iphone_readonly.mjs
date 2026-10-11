import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {onRequest} from '../functions/api/a2-gamze-summary.js';
const token='a2-gamze-test-telegram-session';
const hash=createHash('sha256').update(token).digest('hex');
let queryCount=0;
const db={
  prepare(sql){
    queryCount++;
    if(sql.includes('CREATE TABLE'))return {run:async()=>({success:true})};
    if(sql.includes('session_token_sha256=?'))return {bind(v){
      return {first:async()=>v===hash?{browser_nonce:'ios-verified-session',session_expires_at:'2099-01-01'}:null};
    }};
    throw Error('UNEXPECTED_SQL');
  }
};
const env={APERION_DB:db};
const request=(method,t)=>new Request('https://aperion.example/api/a2-gamze-summary',{
  method,headers:t?{Authorization:'Bearer '+t}:{}
});
const response=async(method,t,e=env)=>onRequest({request:request(method,t),env:e});
assert.equal((await response('POST',token)).status,405);
assert.equal(queryCount,0,'POST may not access database');
const noAuth=await response('GET');
assert.equal(noAuth.status,401);
assert.equal(JSON.stringify(await noAuth.json()).includes('953192'),false);
const bad=await response('GET','wrong-token');
assert.equal(bad.status,401);
const unavailable=await response('GET',token,{});
assert.equal(unavailable.status,401);
const oldFetch=globalThis.fetch;
try{
  globalThis.fetch=()=>{throw Error('EXTERNAL_NETWORK_PROHIBITED')};
  const valid=await response('GET',token);
  assert.equal(valid.status,200);
  assert.equal(valid.headers.get('cache-control'),'private, no-store, max-age=0');
  const b=await valid.json();
  assert.equal(b.ok,true);
  assert.equal(b.source,'APPROVED_LOCAL_PROPOSAL_NOT_ERP');
  assert.equal(b.sourceId,'WA-20261010-GAMZE');
  assert.equal(b.invoiceType,3);
  assert.equal(b.packageCount,66);
  assert.equal(b.invoiceTotalKurus,953192);
  assert.equal(b.vatKurus,86653);
  assert.equal(b.discountKurus,26801);
  assert.deepEqual(b.lines.map(x=>x.packages),[36,12,12,6]);
  assert.equal(b.lines.reduce((sum,x)=>sum+x.totalKurus,0),953192);
  assert.equal(b.erpPosted,false);
  assert.equal(b.postingAllowed,false);
  assert.equal(b.financialWrites,0);
  assert.equal(b.eInvoice,false);
  assert.equal(b.receiptToCash,false);
}finally{globalThis.fetch=oldFetch;}
const handler=readFileSync('functions/api/a2-gamze-summary.js','utf8');
const page=readFileSync('a2-gamze.html','utf8');
for(const content of [handler,page]){
  assert.equal(content.includes('addinvoice'),false);
  assert.equal(content.includes('bizimhesap_queue'),false);
  assert.equal(content.includes('service_role'),false);
  assert.equal(content.includes('api_token'),false);
}
assert.match(page,/\/api\/a2-gamze-erp-preflight/);
assert.match(page,/\/api\/a2-gamze-summary/);
assert.match(page,/Telegram/);
assert.match(page,/postingAllowed/);
assert.match(page,/getElementById/);
assert.doesNotMatch(page,/innerHTML/);
console.log('A2_GAMZE_IPHONE_READONLY_PASS · OWNER_SESSION_REQUIRED · 4 LINES · NO_FINANCIAL_POST');