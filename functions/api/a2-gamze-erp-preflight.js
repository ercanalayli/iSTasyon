/**
 * AperiON A2 / read-only duplicate-risk preflight for WA-20261010-GAMZE.
 *
 * Uses the existing owner's Telegram-paired dashboard token to authorize
 * READ ONLY access to an existing, JWT-protected Supabase Edge Function.
 * NEVER accepts an arbitrary URL, source ID, customer GUID or write payload.
 * This route has NO financial POST, SQL writes or provider write credentials.
 *
 * Upstream request is GET /functions/v1/aperion-bizimhesap-readonly
 * ?action=abstract&musteriId=<fixed GUID>. Absence on that source does not
 * prove the sale has not been recorded elsewhere in BizimHesap.
 */
import {authenticateDashboard} from '../shared/istasyon-dashboard-auth.js';
import {GAMZE_CUSTOMER_GUID} from '../shared/gamze-normal-sale-proposal.js';
import {evaluateGamzeAbstractReadOnly} from '../shared/a2-gamze-abstract-preflight.js';

const json=(body,status=200)=>new Response(JSON.stringify({
  ...body,postingAllowed:false,financialWrites:0
}),{status,headers:{
  'content-type':'application/json; charset=utf-8',
  'cache-control':'private, no-store, max-age=0',
  'vary':'Authorization','x-content-type-options':'nosniff'
}});
export async function onRequest({request,env}){
  if(request.method!=='GET')return json({ok:false,status:'READ_ONLY',error:'METHOD_NOT_ALLOWED'},405);

  let owner=false;
  try{owner=Boolean(await authenticateDashboard(request,env));}
  catch{return json({ok:false,status:'SESSION_CHECK_FAILED'},503);}
  if(!owner)return json({ok:false,status:'OWNER_SESSION_REQUIRED'},401);

  const serviceUrl=String(env.SUPABASE_URL||'').replace(/\/+$/,'');
  const serviceKey=String(env.SUPABASE_SERVICE_ROLE_KEY||'');
  let base;
  try{base=new URL(serviceUrl)}catch{return json({ok:false,status:'READ_SOURCE_NOT_CONFIGURED'},503);}
  if(base.protocol!=='https:'||!base.hostname.endsWith('.supabase.co')||base.pathname!=='/'||
     !serviceKey) return json({ok:false,status:'READ_SOURCE_NOT_CONFIGURED'},503);
  const endpoint=new URL('/functions/v1/aperion-bizimhesap-readonly',base);
  endpoint.searchParams.set('action','abstract');
  endpoint.searchParams.set('musteriId',GAMZE_CUSTOMER_GUID);

  let upstream;
  try{
    upstream=await fetch(endpoint.href,{
      method:'GET',cache:'no-store',signal:AbortSignal.timeout(16000),
      headers:{apikey:serviceKey,authorization:'Bearer '+serviceKey,accept:'application/json'}
    });
  }catch{return json({ok:false,status:'SOURCE_UNAVAILABLE',error:'ERP_READ_FAILED'},502);}

  if(upstream.status===429||upstream.status===503)return json({
    ok:false,status:'SOURCE_RATE_LIMITED',error:'NO_NEGATIVE_CONCLUSION'
  },503);
  if(!upstream.ok)return json({
    ok:false,status:'SOURCE_UNAVAILABLE',error:'ERP_READ_REJECTED',
    upstreamStatus:upstream.status
  },502);
  let wrapped;
  try{wrapped=await upstream.json();}
  catch{return json({ok:false,status:'SOURCE_INSUFFICIENT',error:'INVALID_PROVIDER_JSON'},502);}
  if(!wrapped||wrapped.ok!==true||wrapped.action!=='abstract'||wrapped.source!=='bizimhesap_b2b'){
    return json({ok:false,status:'SOURCE_INSUFFICIENT',error:'UNTRUSTED_OR_FAILED_SOURCE'},502);
  }
  const evaluated=evaluateGamzeAbstractReadOnly(wrapped.data);
  return json({
    ok:true,module:'A2',source:'BIZIMHESAP_CUSTOMER_ABSTRACT_READONLY',
    checkedAt:wrapped.fetched_at||null,
    customerGuid:GAMZE_CUSTOMER_GUID,
    ...evaluated,
    note:'Only possible duplicates are identified. An absent match NEVER authorizes a sale POST.'
  });
}
