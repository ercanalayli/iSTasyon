// AperiON critical-source health: operational metadata only; never expose ERP records or keys.
// FAIL-CLOSED: if GitHub, Supabase or either freshness check cannot be verified, status is CRITICAL.
const json=(body,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store, max-age=0','x-content-type-options':'nosniff'}
});
const GH='https://api.github.com/repos/ercanalayli/iSTasyon/actions/workflows/bizimhesap-ode-live-mirror.yml/runs?per_page=5';
const REQUIRED=['bizimhesap_events','bizimhesap_hesap_hareketleri','sales_raw'];
const PUBLIC_RUN='https://github.com/ercanalayli/iSTasyon/actions/runs/';
async function fetchJson(url,headers,timeoutMs=10000){
  const response=await fetch(url,{headers,signal:AbortSignal.timeout(timeoutMs),cf:{cacheTtl:0}});
  if(!response.ok)throw Error('HTTP_'+response.status);
  return response.json();
}
const failed=(name,reason)=>({name,state:'CRITICAL',reason,last_success_at:null});
async function checkGithub(){
  try{
    const payload=await fetchJson(GH,{'Accept':'application/vnd.github+json',
      'User-Agent':'AperiON-Critical-Health/1.0'},10000);
    const runs=payload?.workflow_runs||[];
    if(!runs.length)return {state:'CRITICAL',reason:'NO_WORKFLOW_RUNS',last_success_at:null,latest_run_url:null};
    const latest=runs[0],success=runs.find(r=>r.status==='completed'&&r.conclusion==='success');
    const successTime=success?.updated_at||success?.run_started_at||null;
    const age=successTime?Date.now()-Date.parse(successTime):Infinity;
    const successRecent=Number.isFinite(age)&&age>=0&&age<=10*60*1000;
    const currentFailed=latest.status==='completed'&&latest.conclusion!=='success';
    return {state:currentFailed||!successRecent?'CRITICAL':'OK',
      reason:currentFailed?'LAST_RUN_'+String(latest.conclusion||'FAILED').toUpperCase():
        !success?'NO_VERIFIED_SUCCESS':!successRecent?'LAST_SUCCESS_TOO_OLD':'VERIFIED_GITHUB_RUN_RECENT',
      last_success_at:successTime,latest_run_at:latest.created_at||null,
      latest_run_status:String(latest.status||'unknown'),
      latest_run_conclusion:String(latest.conclusion||'pending'),
      latest_run_url:latest.id?PUBLIC_RUN+latest.id:null};
  }catch(e){return {state:'CRITICAL',reason:'WORKFLOW_STATUS_UNAVAILABLE',last_success_at:null,latest_run_url:null};}
}
async function checkSourceHealth(env){
  const origin=String(env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=String(env.SUPABASE_SERVICE_ROLE_KEY||'');
  if(!/^https:\/\/[-a-z0-9.]+\.supabase\.co$/.test(origin)||key.length<25)
    return {state:'CRITICAL',reason:'SOURCE_CREDENTIALS_UNAVAILABLE',sources:[]};
  try{
    const url=origin+'/rest/v1/aperion_bh_freshness_v3?select=source,source_kind,last_success_at,freshness,connection_status&limit=25';
    const rows=await fetchJson(url,{'apikey':key,'Authorization':'Bearer '+key,
      'Accept':'application/json'},10000);
    if(!Array.isArray(rows))throw Error('INVALID_SOURCE_HEALTH');
    const items=REQUIRED.map(source=>{
      const match=rows.find(r=>r.source===source);
      return match?{source,state:match.freshness==='FRESH'&&match.connection_status==='OK'?'OK':'CRITICAL',
        last_success_at:match.last_success_at||null,source_kind:match.source_kind||'unknown'}:
        {source,state:'CRITICAL',last_success_at:null,source_kind:'missing'};
    });
    const current=rows.filter(r=>r.source_kind==='API_MIRROR'&&r.freshness==='FRESH'&&r.connection_status==='OK').length;
    return {state:items.every(x=>x.state==='OK')?'OK':'CRITICAL',
      reason:items.some(x=>x.state==='CRITICAL')?'FINANCIAL_SOURCE_STALE_OR_UNVERIFIED':'FINANCIAL_SOURCE_FRESH',
      fresh_api_mirrors:current, required_sources:REQUIRED.length,sources:items};
  }catch(e){return {state:'CRITICAL',reason:'SOURCE_HEALTH_READ_FAILED',sources:[]};}
}
// Cache only the publicly visible workflow health, not ERP data or tokens.
// A short cache prevents GitHub's unauthenticated API from being rate-limited by UI polling.
async function checkGithubCached(){
  const storage=typeof caches!=='undefined'?caches.default:null;
  if(!storage)return checkGithub();
  const key=new Request('https://aperion-istasyon.pages.dev/__health_cache/gh_ode_mirror_v1');
  try{
    const cached=await storage.match(key);
    if(cached)return cached.json();
  }catch(_){}
  const fresh=await checkGithub();
  if(fresh.state==='OK'||fresh.reason!=='WORKFLOW_STATUS_UNAVAILABLE'){
    try{
      await storage.put(key,new Response(JSON.stringify(fresh),{
        headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=75'}
      }));
    }catch(_){}
  }
  return fresh;
}
export async function onRequestGet({env}){
  const [mirror,sources]=await Promise.all([checkGithubCached(),checkSourceHealth(env)]);
  const critical=mirror.state!=='OK'||sources.state!=='OK';
  return json({ok:true,service:'aperion-critical-sync-watch',version:'v1',
    checked_at:new Date().toISOString(),state:critical?'CRITICAL':'OK',
    critical,read_only:true,financial_posting:false,monitoring:'poll-based-not-webhook',
    refresh_interval_seconds:30,upstream_cache_may_delay:true,
    mirror,sources,
    operator_message:critical?
      'KRİTİK: BizimHesap → ÖDE veya finansal kaynak güncelliği doğrulanmadı. Finansal otomatik kapanış yasak.':
      'Kaynakların son kontrolü başarılı; bağımsız işlem mutabakatı yine gereklidir.'});
}
