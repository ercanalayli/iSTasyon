const clean=v=>String(v||'').trim();

function bytesToBase64Url(bytes){
  let binary='';
  for(const b of bytes) binary+=String.fromCharCode(b);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
}
export function randomToken(bytes=32){
  const out=new Uint8Array(bytes); crypto.getRandomValues(out); return bytesToBase64Url(out);
}
export async function sha256Hex(value){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value||'')));
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function ensureDashboardSchema(db){
  if(!db) return false;
  try{
    await db.prepare(`CREATE TABLE IF NOT EXISTS istasyon_dashboard_pair_requests(
      browser_nonce TEXT PRIMARY KEY,
      code_sha256 TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at TEXT NOT NULL,
      approved_at TEXT,
      session_token_sha256 TEXT,
      session_expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`).run();
    return true;
  }catch(_){return false}
}
export async function allowedChatId(env){
  if(!env.APERION_DB) return '';
  try{
    const row=await env.APERION_DB.prepare("SELECT config_value FROM telegram_security_config WHERE config_key='allowed_chat_id' LIMIT 1").first();
    return clean(row?.config_value);
  }catch(_){return ''}
}
export async function authenticateDashboard(request,env){
  if(!env.APERION_DB || !(await ensureDashboardSchema(env.APERION_DB))) return null;
  const m=clean(request.headers.get('authorization')).match(/^Bearer\s+(.+)$/i);
  if(!m) return null;
  const hash=await sha256Hex(m[1]);
  const row=await env.APERION_DB.prepare(`SELECT browser_nonce,session_expires_at
    FROM istasyon_dashboard_pair_requests
    WHERE session_token_sha256=? AND status='issued' AND session_expires_at > datetime('now')
    LIMIT 1`).bind(hash).first();
  return row||null;
}
export const json=(data,status=200)=>new Response(JSON.stringify(data),{
  status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});
