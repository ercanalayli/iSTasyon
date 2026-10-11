import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {onRequest} from '../functions/api/a2-sale-review.js';

const token='fixture-secure-dashboard-token';
const hash=createHash('sha256').update(token).digest('hex');
const db={
 prepare(sql){
  return {
   async run(){return {success:true};},
   bind(value){return {async first(){
     if(sql.includes('FROM istasyon_dashboard_pair_requests')&&value===hash){
       return {browser_nonce:'fixture',session_expires_at:'2099-01-01'};
     }
     return null;
   }}}
  };
 }
};
async function request(method='GET', bearer='', env={APERION_DB:db}){
 const headers=bearer?{authorization:'Bearer '+bearer}:{};
 return onRequest({request:new Request('https://test.local/api/a2-sale-review',{method,headers}),env});
}
const post=await request('POST',token);
assert.equal(post.status,405);
assert.equal((await post.json()).error,'READ_ONLY_POST_DISABLED');
assert.equal((await request()).status,401);
assert.equal((await request('GET','invalid-token')).status,401);
assert.equal((await request('GET',token,{})).status,401);
const authorized=await request('GET',token);
assert.equal(authorized.status,200);
assert.equal(authorized.headers.get('cache-control'),'private, no-store, max-age=0');
const data=await authorized.json();
assert.equal(data.ok,true);
assert.equal(data.sourceId,'WA-20261010-GAMZE');
assert.equal(data.items.length,4);
assert.deepEqual(data.items.map(x=>x.quantity),[36,12,12,6]);
assert.equal(data.quantity,66);
assert.equal(data.amountsKurus.total,953192);
assert.equal(data.amountsKurus.tax,86653);
assert.equal(data.paymentBooked,false);
assert.equal(data.eFatura,false);
assert.equal(data.postingAvailable,false);
assert.equal(data.state,'PREPARED_REVIEW_ONLY');
assert.ok(data.postingBlockers.length>1);
assert.equal(data.apiPayload,undefined);
const route=readFileSync('functions/api/a2-sale-review.js','utf8');
const html=readFileSync('a2-satis.html','utf8');
const home=readFileSync('aperion-merkez.html','utf8');
assert.ok(!route.includes('fetch('),'review endpoint must not call third-party APIs');
assert.ok(!route.includes('process_queue'),'review endpoint may not dispatch queue');
assert.ok(html.includes('disabled>Satışı kaydet'),'post button must remain disabled');
assert.ok(html.includes("localStorage.getItem('istasyon_dashboard_token')"));
assert.ok(home.includes("a2:{title:'A2 · Satış İnceleme',url:'/a2-satis.html'}"));
console.log('A2_OWNER_REVIEW_AUTH_PASS · NO_FINANCIAL_WRITE · 4 SKU / 66 packs / 9531.92 TL');
