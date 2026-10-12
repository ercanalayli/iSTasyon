// Cloudflare Worker: hashed, one-time mobile pairing + revocable 30-day device session.
// This is a *device pairing*, not a persisted BizimHesap password/browser session.
// No financial POST permitted anywhere in this module.
const MS_DAY=86400000;
export const SESSION_MS=30*MS_DAY;
export const PAIRING_SCHEMA=[
 "CREATE TABLE IF NOT EXISTS bh_mobile_pair_grants (ticket_hash TEXT PRIMARY KEY, chat_id TEXT NOT NULL, user_id TEXT NOT NULL, telegram_message_id TEXT NOT NULL, issued_at_ms INTEGER NOT NULL, expires_at_ms INTEGER NOT NULL, claimed_at_ms INTEGER, session_hash TEXT, session_expires_at_ms INTEGER, revoked_at_ms INTEGER, UNIQUE(chat_id, telegram_message_id))",
 "CREATE UNIQUE INDEX IF NOT EXISTS bh_mobile_pair_session_unique ON bh_mobile_pair_grants(session_hash) WHERE session_hash IS NOT NULL"
];
export async function ensurePairStore(db) {
 if (!db) return false;
 try {for(const sql of PAIRING_SCHEMA) await db.prepare(sql).run();return true;}
 catch (_){return false;}
}
export async function sha256Hex(raw){
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(raw)));
 return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,"0")).join("");
}
export function token32(){
 const b=new Uint8Array(32);crypto.getRandomValues(b);
 return Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");
}
export function matchingOrigin(request) {
 const actual=request.headers.get("origin")||"";
 return Boolean(actual && actual===new URL(request.url).origin);
}
export function getMobileCookie(request){
 const raw=request.headers.get("cookie")||"";
 const match=raw.match(/(?:^|;\s*)bh_mobile_access=([0-9a-f]{64})(?:;|$)/);
 return match?.[1]||"";
}
export const sessionCookie=(token,maxAge=2592000)=>
 "bh_mobile_access="+token+"; Path=/setup; Max-Age="+maxAge+
 "; HttpOnly; Secure; SameSite=Strict";
export async function validTicket(db,token,now=Date.now()){
 if (!/^[0-9a-f]{64}$/.test(token)||!(await ensurePairStore(db)))return false;
 const row=await db.prepare("SELECT ticket_hash FROM bh_mobile_pair_grants WHERE ticket_hash=? AND expires_at_ms>? AND claimed_at_ms IS NULL AND revoked_at_ms IS NULL LIMIT 1")
  .bind(await sha256Hex(token),now).first();
 return Boolean(row);
}
export async function claimTicket(db,token,now=Date.now()){
 if (!/^[0-9a-f]{64}$/.test(token)||!(await ensurePairStore(db)))return {ok:false};
 const session=token32(),sessionHash=await sha256Hex(session);
 // Atomic UPDATE prevents simultaneous duplicate/replayed claims.
 const row=await db.prepare("UPDATE bh_mobile_pair_grants SET claimed_at_ms=?,session_hash=?,session_expires_at_ms=? WHERE ticket_hash=? AND claimed_at_ms IS NULL AND revoked_at_ms IS NULL AND expires_at_ms>? RETURNING ticket_hash")
  .bind(now,sessionHash,now+SESSION_MS,await sha256Hex(token),now).first();
 return row?{ok:true,session}:{ok:false};
}
export async function checkSession(db,request,now=Date.now()){
 const token=getMobileCookie(request);
 if(!token || !(await ensurePairStore(db)))return null;
 return db.prepare("SELECT chat_id,session_expires_at_ms FROM bh_mobile_pair_grants WHERE session_hash=? AND session_expires_at_ms>? AND revoked_at_ms IS NULL AND claimed_at_ms IS NOT NULL LIMIT 1")
   .bind(await sha256Hex(token),now).first();
}
export async function renewSession(db,request,now=Date.now()){
 const old=getMobileCookie(request);
 if(!old||!(await ensurePairStore(db)))return {ok:false};
 const newToken=token32(),hash=await sha256Hex(newToken);
 const row=await db.prepare("UPDATE bh_mobile_pair_grants SET session_hash=?,session_expires_at_ms=? WHERE session_hash=? AND session_expires_at_ms>? AND revoked_at_ms IS NULL RETURNING ticket_hash")
   .bind(hash,now+SESSION_MS,await sha256Hex(old),now).first();
 return row?{ok:true,session:newToken}:{ok:false};
}
export async function revokeSession(db,request,now=Date.now()){
 const old=getMobileCookie(request);
 if(!old||!(await ensurePairStore(db)))return false;
 const row=await db.prepare("UPDATE bh_mobile_pair_grants SET revoked_at_ms=? WHERE session_hash=? AND revoked_at_ms IS NULL RETURNING ticket_hash")
   .bind(now,await sha256Hex(old)).first();
 return Boolean(row);
}
