import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const wrangler=JSON.parse(readFileSync(new URL('../workers/ercanalayli-telegram-safe/wrangler.jsonc',import.meta.url),'utf8'));
assert.equal(wrangler.name,'aperion-command-bridge','Git integration must match actual existing Worker');
assert.equal(wrangler.main,'index.mjs');
assert.equal(wrangler.d1_databases?.[0]?.binding,'APERION_DB');
assert.equal(wrangler.vars,undefined,'never put credentials in public Worker configuration');
assert.equal(wrangler.triggers,undefined,'do not alter active webhook or cron triggers');
assert.equal(wrangler.routes,undefined,'do not modify production routing');
const stagingInstructions=readFileSync(new URL('../workers/ercanalayli-telegram-safe/README_GIT_NATIVE_STAGING.md',import.meta.url),'utf8');
assert.match(stagingInstructions,/wrangler@4\.125\.0 versions upload --config wrangler\.jsonc/);
assert.match(stagingInstructions,/worker.*production|üretim/i);
import {handleTelegramRequest} from '../workers/ercanalayli-telegram-safe/index.mjs';

const seen=new Map(),posted=[];
const db={prepare(sql){
  if(sql.includes('CREATE TABLE'))return {run:async()=>({success:true})};
  if(sql.includes('INSERT OR IGNORE'))return {bind:(id,chat,message,command)=>({
    run:async()=>{if(!seen.has(id))seen.set(id,{chat,message,command,status:'pending'});return {success:true};}
  })};
  if(sql.includes("status='processing'"))return {bind:(id,chat,message,command)=>({
    run:async()=>{const x=seen.get(id);if(x && x.chat===chat && x.message===message &&
      x.command===command && ['pending','failed'].includes(x.status)) {
      x.status='processing';return {meta:{changes:1}};
    }return {meta:{changes:0}};}
  })};
  if(sql.includes('delivered_at=CASE'))return {bind:(status,_,id)=>({
    run:async()=>{const x=seen.get(id);if(x)x.status=status;return {success:true};}
  })};
  throw Error('UNEXPECTED_SQL:'+sql);
}};
const config={
  TELEGRAM_BOT_TOKEN:'synthetic-test-token',
  TELEGRAM_WEBHOOK_SECRET:'synthetic-test-secret',
  APERION_TELEGRAM_OWNER_USER_ID:'12345',
  APERION_DB:db
};
const old=globalThis.fetch;
globalThis.fetch=async(url,opts)=>{
  posted.push({url:String(url),method:opts?.method||'GET',data:opts?.body?JSON.parse(opts.body):null});
  if(String(url).includes('api.telegram.org'))return new Response(JSON.stringify({ok:true,result:{message_id:1}}),{status:200,headers:{'content-type':'application/json'}});
  if(String(url)==='https://aperion-istasyon.pages.dev/api/telegram-a1-verified'){
    return new Response(JSON.stringify({ok:true,source:'APERION_A1_CANONICAL_READONLY',
      verified_at:new Date().toISOString(),version:'A1-20261013-v2',gross_total_kurus:16474032}),
      {status:200,headers:{'content-type':'application/json'}});
  }
  throw Error('OUTBOUND_HOST_FORBIDDEN');
};
const endpoint='https://test.example/telegram/webhook';
let seq=10;
function request(command,overrides={},customConfig=config) {
  const id=overrides.update_id??++seq;
  const message={message_id:overrides.message_id??id,
    chat:{id:overrides.chat_id??12345,type:overrides.chat_type??'private'},
    from:{id:overrides.user_id??12345,is_bot:false},
    text:command};
  const headers={'content-type':'application/json',
    'x-telegram-bot-api-secret-token':overrides.secret??'synthetic-test-secret'};
  return handleTelegramRequest(new Request(endpoint,{method:'POST',headers,
    body:JSON.stringify({update_id:id,message})}),customConfig);
}
try {
  const before=posted.length;
  const health=await handleTelegramRequest(new Request('https://test.example/healthz'),config);
  const status=await health.json();
  assert.equal(status.mode,'READ_ONLY_NO_FINANCIAL_POST');
  assert.equal(health.status,200);
  assert.equal(posted.length,before,'GET /healthz must not contact Telegram or change webhook');
  assert.equal(JSON.stringify(status).includes('0075B067'),false);
  assert.equal(JSON.stringify(status).includes('synthetic-test-token'),false);
  assert.equal((await request('DURUM',{secret:'wrong'})).status,403);
  assert.equal((await request('DURUM',{user_id:4444})).status,403);
  assert.equal((await request('DURUM',{chat_type:'group'})).status,403);
  assert.equal((await request('DURUM',{}, {...config,APERION_DB:null})).status,503);
  assert.equal(posted.length,before,'unauthorized POST must not send Telegram');

  const dur=await request('DURUM',{update_id:101,message_id:101});
  assert.equal(dur.status,200);
  assert.equal((await dur.json()).financeWrites,0);
  assert.match(posted.at(-1).data.text,/finansal POST yapmaz/);
  assert.equal(posted.length,1);

  const duplicate=await request('DURUM',{update_id:101,message_id:101});
  assert.equal((await duplicate.json()).duplicate,true);
  assert.equal(posted.length,1,'duplicate owner update must not resend');

  const a1=await request('A1 DURUM',{update_id:102,message_id:102});
  assert.equal(a1.status,200);
  assert.match(posted.at(-1).data.text,/Canlı, kanıtlı rapor kaynağı henüz bağlanmadı/);
  assert.doesNotMatch(posted.at(-1).data.text,/164.740,30/);
  assert.match(posted.at(-1).data.text,/9.000 TL lojistik iptal edildi/);

  const gamze=await request('GAMZE ONAY',{update_id:103,message_id:103});
  assert.equal(gamze.status,200);
  assert.match(posted.at(-1).data.text,/YENİ FATURA OLUŞTURULMADI/);
  assert.match(posted.at(-1).data.text,/FCB82CD3053A491986C6B2D1C9F5D329/);
  assert.equal(posted.filter(x=>x.url.includes('bizimhesap.com')).length,0);

  const live=await request('/A1',{update_id:104,message_id:104}, {
    ...config,APERION_A1_VERIFIED_READ_URL:'https://aperion-istasyon.pages.dev/api/telegram-a1-verified',
    APERION_A1_READ_SECRET:'synthetic-read-token'
  });
  assert.equal(live.status,200);
  assert.match(posted.at(-1).data.text,/164.740,32 TL/);
  assert.match(posted.at(-1).data.text,/snapshot/);
  const a1Network=posted.filter(x=>x.url.includes('/api/telegram-a1-verified'));
  assert.equal(a1Network.length,1);
  assert.ok(!posted.some(x=>x.url.includes('/setWebhook')));
  assert.ok(posted.filter(x=>x.url.includes('api.telegram.org')).every(x=>x.url.endsWith('/sendMessage')));
  assert.ok(posted.every(x=>x.method!=='POST'||x.url.includes('api.telegram.org')));
  console.log('APERION_OWNER_TELEGRAM_SAFE_PASS: auth, D1 dedup, no GET mutation, no ERP POST, no static finance, conditional verified A1');
}finally { globalThis.fetch=old; }
