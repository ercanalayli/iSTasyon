import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {evaluateGamzeAbstractReadOnly} from '../functions/shared/a2-gamze-abstract-preflight.js';
import {onRequest} from '../functions/api/a2-gamze-erp-preflight.js';

function check(v,status){
  const o=evaluateGamzeAbstractReadOnly(v);
  assert.equal(o.status,status);
  assert.equal(o.postingAllowed,false);
  assert.equal(o.absenceConfirmed,false);
  assert.equal(o.financialWrites,0);
  return o;
}
const ref=check({resultCode:1,data:[
  {invoiceNo:'M012026000000777',note:'APERION A2 WA-20261010-GAMZE',
   tutar:'9.531,92',tarih:'11.10.2026'}
]},'POSSIBLE_EXISTING_SALE');
assert.equal(ref.matches[0].basis,'SOURCE_REFERENCE');
assert.equal(ref.matches[0].amountKurus,953192);
const same=check({resultCode:'1',data:{rows:[
  {documentNo:'SALES-123',Amount:'9531.92',Date:'2026-10-11T13:20:00+03:00'}
]}},'POSSIBLE_EXISTING_SALE');
assert.equal(same.matches[0].basis,'DATE_AND_AMOUNT_POSSIBLE_MATCH');
check({resultCode:1,data:[{Amount:120,Date:'2026-10-11'}]},'NO_MATCH_NOT_PROOF');
check({resultCode:1,data:[]},'NO_MATCH_NOT_PROOF');
check({resultCode:0,data:[]},'SOURCE_INSUFFICIENT');
check({resultCode:1,error:'quota',data:[]},'SOURCE_INSUFFICIENT');
check(undefined,'SOURCE_INSUFFICIENT');
check({resultCode:1,data:{history:Array(350).fill({date:'2026-10-11'})}},'SOURCE_INSUFFICIENT');
check({resultCode:1,data:[{tutar:'9.531,92',tarih:'10.10.2026'}]},'NO_MATCH_NOT_PROOF');

const token='test-telegram-paired-dashboard-session';
const tokenHash=createHash('sha256').update(token).digest('hex');
const db={
  prepare(sql){
    return {
      async run(){return {success:true};},
      bind(value){return {async first(){
        if(sql.includes('FROM istasyon_dashboard_pair_requests')&&value===tokenHash){
          return {browser_nonce:'test',session_expires_at:'2099-01-01'};
        }
        return null;
      }};}
    };
  }
};
const env={APERION_DB:db,SUPABASE_URL:'https://testproject.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-only-dummy-key'};
async function request(method='GET',bearer=token,e=env){
  const headers=bearer?{authorization:'Bearer '+bearer}:{};
  return onRequest({request:new Request('https://aperion.example/api/a2-gamze-erp-preflight',{method,headers}),env:e});
}
const original=globalThis.fetch;
let calls=0;
try{
  globalThis.fetch=async(url,init)=>{
    calls++;
    assert.equal(init.method,'GET');
    assert.equal(new URL(url).origin,'https://testproject.supabase.co');
    assert.equal(new URL(url).pathname,'/functions/v1/aperion-bizimhesap-readonly');
    assert.equal(new URL(url).searchParams.get('action'),'abstract');
    assert.equal(new URL(url).searchParams.get('musteriId'),'219C65ACD6C24DB6AA977C9F49561B19');
    assert.equal(init.headers.authorization,'Bearer test-only-dummy-key');
    return new Response(JSON.stringify({
      ok:true,action:'abstract',source:'bizimhesap_b2b',fetched_at:'2026-10-11T15:00:00Z',
      data:{resultCode:1,data:[{Note:'WA-20261010-GAMZE',Total:'9531.92',Date:'11.10.2026'}]}
    }),{status:200});
  };
  assert.equal((await request('POST')).status,405);
  assert.equal((await request('GET','')).status,401);
  assert.equal((await request('GET','invalid')).status,401);
  assert.equal(calls,0,'unauthenticated request must not call ERP');
  const res=await request();
  assert.equal(res.status,200);
  assert.equal(res.headers.get('cache-control'),'private, no-store, max-age=0');
  const good=await res.json();
  assert.equal(good.status,'POSSIBLE_EXISTING_SALE');
  assert.equal(good.possibleDuplicate,true);
  assert.equal(good.postingAllowed,false);
  assert.equal(good.financialWrites,0);
  assert.equal(JSON.stringify(good).includes('test-only-dummy-key'),false);
  assert.equal(calls,1);
  globalThis.fetch=async()=>new Response(JSON.stringify({
    ok:true,action:'abstract',source:'bizimhesap_b2b',
    data:{resultCode:1,data:[]}
  }),{status:200});
  const no=await (await request()).json();
  assert.equal(no.status,'NO_MATCH_NOT_PROOF');
  assert.equal(no.absenceConfirmed,false);
  assert.equal(no.postingAllowed,false);
  globalThis.fetch=async()=>new Response('busy',{status:429});
  assert.equal((await (await request()).json()).status,'SOURCE_RATE_LIMITED');
  globalThis.fetch=async()=>new Response(JSON.stringify({ok:false,error:'401'}),{status:200});
  assert.equal((await (await request()).json()).status,'SOURCE_INSUFFICIENT');
  const bad=await request('GET',token,{...env,SUPABASE_URL:'https://attacker.example'});
  assert.equal(bad.status,503);
} finally {globalThis.fetch=original;}

const moduleCode=readFileSync('functions/api/a2-gamze-erp-preflight.js','utf8');
assert.equal(moduleCode.includes('SUPABASE_SERVICE_ROLE_KEY'),true);
assert.equal(moduleCode.includes('authenticateDashboard'),true);
assert.equal(moduleCode.includes('postingAllowed:true'),false);
assert.equal(moduleCode.includes('process_queue'),false);
assert.equal(moduleCode.includes('addinvoice'),false);
console.log('A2_GAMZE_ERP_READONLY_PREFLIGHT_PASS · FAIL_CLOSED · NO_FINANCIAL_POST');
