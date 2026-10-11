/**
 * AperiON - independent, owner-JWT authenticated BizimHesap read-only API.
 * STAGED NEW FUNCTION: leaves existing aperion-bizimhesap-readonly v1
 * untouched until all caller migrations and production tests pass.
 *
 * No sales posting, invoice creation, queue dispatch, or finance mutations.
 * Never enable verify_jwt=false for this function.
 */
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {authorizeOwnerRead} from './owner-authorization.js';

const ALLOWED=new Set(['customers','products','warehouses','suppliers','abstract','supplierabstract','inventory']);
const BASE='https://bizimhesap.com/api/b2b';
const reply=(body,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'private, no-store, max-age=0',
    'vary':'Authorization',
    'x-content-type-options':'nosniff'
  }
});
export async function handleRequest(req, runtime) {
  if(req.method!=='GET')return reply({ok:false,error:'READ_ONLY'},405);

  const url=String(runtime.SUPABASE_URL||'').replace(/\/+$/,'');
  const anonKey=String(runtime.SUPABASE_ANON_KEY||'');
  const serviceRoleKey=String(runtime.SUPABASE_SERVICE_ROLE_KEY||'');
  if (!/^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/.test(url) || !anonKey || !serviceRoleKey) {
    return reply({ok:false,error:'SOURCE_AUTH_CONFIG_MISSING'},503);
  }

  const authClient=runtime.createClient(url,anonKey,{
    auth:{persistSession:false,autoRefreshToken:false}
  });
  const dbClient=runtime.createClient(url,serviceRoleKey,{
    auth:{persistSession:false,autoRefreshToken:false}
  });
  const owner=await authorizeOwnerRead({request:req,anonKey,serviceRoleKey,authClient,dbClient});
  if(!owner.authorized)return reply({ok:false,error:owner.reason},401);

  const reqUrl=new URL(req.url), action=reqUrl.searchParams.get('action')||'health';
  if(action==='health')return reply({
    ok:true,service:'aperion-bizimhesap-owner-read',
    mode:'READ_ONLY',ownerAuthenticated:true,upstreamChecked:false
  });
  if(!ALLOWED.has(action))return reply({ok:false,error:'UNSUPPORTED_ACTION'},400);

  const id=reqUrl.searchParams.get('musteriId')||reqUrl.searchParams.get('depoId')||'';
  if(['abstract','supplierabstract','inventory'].includes(action) &&
     !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
    return reply({ok:false,error:'INVALID_ID'},400);
  }
  const {data,error}=await dbClient.from('integrations')
    .select('api_token').eq('provider','bizimhesap').eq('is_active',true).single();
  if(error||!data?.api_token)return reply({ok:false,error:'CREDENTIALS_UNAVAILABLE'},424);

  const path=action==='abstract'||action==='supplierabstract'?action+'/'+id:
    action==='inventory'?'inventory/'+id:action;
  let response;
  try {
    response=await runtime.fetch(BASE+'/'+path,{
      method:'GET',
      headers:{token:data.api_token,accept:'application/json'},
      signal:AbortSignal.timeout(18000)
    });
  }catch{return reply({ok:false,error:'UPSTREAM_UNAVAILABLE'},502);}
  if(response.status===429||response.status===503){
    return reply({ok:false,error:'UPSTREAM_RATE_LIMIT_OR_UNAVAILABLE',
      upstreamStatus:response.status,retryable:false},503);
  }
  if(!response.ok)return reply({
    ok:false,error:'UPSTREAM_HTTP_ERROR',upstreamStatus:response.status
  },response.status>=500?502:response.status);
  let result;
  try{result=await response.json();}
  catch{return reply({ok:false,error:'INVALID_UPSTREAM_JSON'},502);}
  return reply({
    ok:true,source:'bizimhesap_b2b',action,
    fetched_at:new Date().toISOString(),
    ownerAuthenticated:true,data:result
  });
}
if (typeof Deno!=='undefined' && typeof Deno.serve==='function') {
  Deno.serve(req=>handleRequest(req,{
    SUPABASE_URL:Deno.env.get('SUPABASE_URL'),
    SUPABASE_ANON_KEY:Deno.env.get('SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    createClient,
    fetch
  }));
}
