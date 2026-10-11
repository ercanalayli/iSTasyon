import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {authorizeOwnerRead,bearerToken} from '../supabase/functions/aperion-bizimhesap-owner-read/owner-authorization.js';

const bearer=v=>({headers:new Headers(v?{authorization:'Bearer '+v}:{})});
const anonKey='anon-fixture',serviceRoleKey='service-fixture',jwt='owner-user-jwt';
const received=[];
const clientFor=({valid=true,admin=true,error=false}={})=>{
  const authClient={auth:{getUser:async(t)=>{
    received.push(['jwt',t]);
    return valid?{data:{user:{id:'user-1'}},error:null}:{data:null,error:Error('invalid')};
  }}};
  const dbClient={from(name){
    assert.equal(name,'aperion_users');
    return {select(col){assert.equal(col,'rol');return {
      eq(key,value){
        assert.deepEqual([key,value],['user_id','user-1']);
        return {eq(k,v){assert.deepEqual([k,v],['rol','admin']);return {
          limit(n){assert.equal(n,1);return Promise.resolve(
            error?{data:null,error:Error('db inaccessible')}:{data:admin?[{rol:'admin'}]:[],error:null});
          }
        }}};
      }
    }}};
  }};
  return {authClient,dbClient};
};
for(const v of ['',anonKey,serviceRoleKey]){
  const before=received.length;
  const blocked=await authorizeOwnerRead({request:bearer(v),anonKey,serviceRoleKey,...clientFor()});
  assert.equal(blocked.authorized,false);
  assert.equal(received.length,before,'anonymous and server tokens should never become user auth');
}
assert.equal(bearerToken(new Headers({Authorization:'Basic x'})),'');
assert.equal((await authorizeOwnerRead({request:bearer(jwt),anonKey,serviceRoleKey,...clientFor({valid:false})})).authorized,false);
assert.equal((await authorizeOwnerRead({request:bearer(jwt),anonKey,serviceRoleKey,...clientFor({admin:false})})).authorized,false);
assert.equal((await authorizeOwnerRead({request:bearer(jwt),anonKey,serviceRoleKey,...clientFor({error:true})})).authorized,false);
assert.equal((await authorizeOwnerRead({request:bearer(jwt),anonKey,serviceRoleKey,...clientFor()})).authorized,true);

// Run the actual Edge handler in a mock-only Node VM module. This test never
// contacts Supabase, BizimHesap, or Cloudflare.
const path='supabase/functions/aperion-bizimhesap-owner-read/index.ts';
const edge=readFileSync(path,'utf8');
assert.match(edge,/Deno\.serve/);
assert.doesNotMatch(edge,/POST\s*\/\s*addinvoice|process_queue|SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]ey/);
const code=edge
  .replace(/^import \{createClient\} from .*;\s*$/m,'')
  .replace(/^import \{authorizeOwnerRead\} from .*;\s*$/m,'')
  .replace('export async function handleRequest','async function handleRequest');
const moduleUrl='data:text/javascript;charset=utf-8,'+encodeURIComponent(
  'const authorizeOwnerRead=globalThis.__aperionTestAuthorizeOwnerRead;\n'+code+'\nexport {handleRequest};\n'
);
globalThis.__aperionTestAuthorizeOwnerRead=authorizeOwnerRead;
let handleRequest;
try{handleRequest=(await import(moduleUrl)).handleRequest;}
finally{delete globalThis.__aperionTestAuthorizeOwnerRead;}
let vendorCalls=0,dbCalls=0;
function runtime(options={}){
  const isAdmin=options.admin!==false;
  const valid=options.valid!==false;
  return {
    SUPABASE_URL:'https://exampleproj.supabase.co',
    SUPABASE_ANON_KEY:anonKey,
    SUPABASE_SERVICE_ROLE_KEY:serviceRoleKey,
    createClient:(_url,key)=>{
      if(key===anonKey)return {auth:{getUser:async(token)=>valid&&token===jwt?
        {data:{user:{id:'user-1'}},error:null}:{data:null,error:'invalid_token'}}};
      assert.equal(key,serviceRoleKey);
      return {from(table){
        if(table==='aperion_users')return {select(){return {eq(){return {eq(){return {limit:async()=>({data:isAdmin?[{rol:'admin'}]:[],error:null})}}}}}}};
        assert.equal(table,'integrations');
        dbCalls++;
        return {select(){return {eq(){return {eq(){return {single:async()=>({data:{api_token:'vendor-api-token',api_key:'A'.repeat(32)},error:null})}}}}}}};
      }};
    },
    fetch:async(url,opts)=>{
      vendorCalls++;
      assert.equal(opts.method,'GET');
      assert.equal(opts.headers.token,'vendor-api-token');
      assert.equal(url,'https://bizimhesap.com/api/b2b/abstract/219C65ACD6C24DB6AA977C9F49561B19');
      return new Response(JSON.stringify({resultCode:1,data:[]}),{status:200});
    }
  };
}
const req=(method='GET',token=jwt,action='abstract&musteriId=219C65ACD6C24DB6AA977C9F49561B19')=>
  new Request('https://exampleproj.supabase.co/functions/v1/aperion-bizimhesap-owner-read?action='+action,{
    method,headers:token?{Authorization:'Bearer '+token}:{}
  });
assert.equal((await handleRequest(req('POST'),runtime())).status,405);
assert.equal((await handleRequest(req('GET',''),runtime())).status,401);
assert.equal((await handleRequest(req('GET',serviceRoleKey),runtime())).status,401);
assert.equal((await handleRequest(req('GET',anonKey),runtime())).status,401);
assert.equal((await handleRequest(req('GET',jwt),runtime({admin:false}))).status,401);
assert.equal((await handleRequest(req('GET',jwt),runtime({valid:false}))).status,401);
assert.equal(vendorCalls,0);
assert.equal(dbCalls,0);
const approved=await handleRequest(req(),runtime());
assert.equal(approved.status,200);
const json=await approved.json();
assert.equal(json.ok,true);
assert.equal(json.action,'abstract');
assert.equal(json.ownerAuthenticated,true);
assert.equal(json.source,'bizimhesap_b2b');
assert.equal(json.data.resultCode,1);
assert.equal(approved.headers.get('cache-control'),'private, no-store, max-age=0');
assert.equal(vendorCalls,1);
assert.equal(dbCalls,1);
const beforeVendor=vendorCalls;
const noCredentialsAnon=await handleRequest(req('GET',anonKey,'credential_status'),runtime());
assert.equal(noCredentialsAnon.status,401,'credential_status must require owner JWT');
const credentialResponse=await handleRequest(req('GET',jwt,'credential_status'),runtime());
assert.equal(credentialResponse.status,200);
const credentialStatus=await credentialResponse.json();
assert.equal(credentialStatus.ok,true);
assert.equal(credentialStatus.credentials.tokenConfigured,true);
assert.equal(credentialStatus.credentials.firmIdCandidatePresent,true);
assert.equal(credentialStatus.credentials.firmIdVerified,false);
assert.equal(credentialStatus.writeReady,false);
assert.equal(credentialStatus.verifiedProviderWriteAccess,false);
assert.equal(vendorCalls,beforeVendor,'configuration check must not contact BizimHesap');
assert.equal(JSON.stringify(credentialStatus).includes('vendor-api-token'),false);
assert.equal(JSON.stringify(credentialStatus).includes('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),false);
const sourceCode=readFileSync(path,'utf8');
assert.doesNotMatch(sourceCode,/BIZIMHESAP_TOKEN|BIZIMHESAP_FIRM_ID|fetch\\('https:\/\/bizimhesap.com\/api\/b2b\/addinvoice/);
console.log('APERION_OWNER_JWT_READONLY_GUARD_PASS · OWNER_CREDENTIAL_DIAGNOSTICS_PASS · NO_PROVIDER_WRITES');
