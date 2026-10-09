function json(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
  });
}
function base64Url(bytes){
  let binary='';
  for(const byte of bytes) binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
}
async function sha256(value){
  const bytes=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function hmac(secret,value){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value));
  return base64Url(new Uint8Array(signature));
}
function safeEqual(a,b){
  a=String(a||'');b=String(b||'');
  if(a.length!==b.length)return false;
  let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);
  return x===0;
}
export async function onRequestPost({request,env}){
  const secret=String(env.APERION_BRIDGE_SECRET||'');
  if(secret.length<32)return json({ok:false,error:'verifier_not_configured'},503);
  try{
    const body=await request.json();
    const timestamp=Number(body.timestamp||0);
    const digest=String(body.digest||'');
    const token=String(body.token||'');
    const payload_json=String(body.payload_json||'');
    if(!timestamp||Math.abs(Date.now()-timestamp)>5*60*1000)return json({ok:false,error:'expired'},401);
    const calculatedDigest=await sha256(payload_json);
    if(!safeEqual(calculatedDigest,digest))return json({ok:false,error:'digest_mismatch'},401);
    const expected=await hmac(secret,timestamp+'\n'+digest);
    if(!safeEqual(expected,token))return json({ok:false,error:'signature_mismatch'},401);
    return json({ok:true});
  }catch(error){
    return json({ok:false,error:'verify_failed',message:String(error?.message||error).slice(0,160)},400);
  }
}
