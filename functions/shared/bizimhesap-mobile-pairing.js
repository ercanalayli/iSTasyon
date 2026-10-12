// Read-only BizimHesap mobile access grant: trusted Telegram only.
// Store only SHA-256 token digests; no BizimHesap passwords or cookies here.
export const BH_MOBILE_SCHEMA = [
  "CREATE TABLE IF NOT EXISTS bh_mobile_pair_grants (ticket_hash TEXT PRIMARY KEY, chat_id TEXT NOT NULL, user_id TEXT NOT NULL, telegram_message_id TEXT NOT NULL, issued_at_ms INTEGER NOT NULL, expires_at_ms INTEGER NOT NULL, claimed_at_ms INTEGER, session_hash TEXT, session_expires_at_ms INTEGER, revoked_at_ms INTEGER, UNIQUE(chat_id, telegram_message_id))",
  "CREATE UNIQUE INDEX IF NOT EXISTS bh_mobile_pair_session_unique ON bh_mobile_pair_grants(session_hash) WHERE session_hash IS NOT NULL"
];
export async function ensureBhMobileSchema(db) {
  if (!db) return false;
  try { for (const sql of BH_MOBILE_SCHEMA) await db.prepare(sql).run(); return true; }
  catch (_) { return false; }
}
export async function sha256Hex(raw) {
  const bytes = new TextEncoder().encode(String(raw));
  const output = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(output), x => x.toString(16).padStart(2,"0")).join("");
}
export function randomPairToken() {
  const bytes = new Uint8Array(32); crypto.getRandomValues(bytes);
  return Array.from(bytes, x => x.toString(16).padStart(2,"0")).join("");
}
export async function issueMobileTicket(db,{chatId,userId,messageId,now=Date.now()}) {
  if (!db || !chatId || !userId || !messageId) return {ok:false,error:"identity_missing"};
  if (!(await ensureBhMobileSchema(db))) return {ok:false,error:"pairing_store_unavailable"};
  const recent = await db.prepare(
    "SELECT COUNT(*) n FROM bh_mobile_pair_grants WHERE chat_id=? AND issued_at_ms>?"
  ).bind(String(chatId),now-60000).first();
  if (Number(recent?.n||0)>=3) return {ok:false,error:"rate_limited"};
  const token = randomPairToken(), hash = await sha256Hex(token);
  // A retry of one Telegram message cannot issue another handoff.
  const result = await db.prepare(
    "INSERT OR IGNORE INTO bh_mobile_pair_grants (ticket_hash,chat_id,user_id,telegram_message_id,issued_at_ms,expires_at_ms) VALUES(?,?,?,?,?,?)"
  ).bind(hash,String(chatId),String(userId),String(messageId),now,now+10*60*1000).run();
  if ((result?.meta?.changes??0)!==1) return {ok:false,error:"duplicate_or_unavailable"};
  return {ok:true,token,expiresInSeconds:600};
}
export async function revokeMobileTickets(db,{chatId,now=Date.now()}) {
  if (!(await ensureBhMobileSchema(db))) return {ok:false,error:"pairing_store_unavailable"};
  const result = await db.prepare(
    "UPDATE bh_mobile_pair_grants SET revoked_at_ms=? WHERE chat_id=? AND revoked_at_ms IS NULL"
  ).bind(now,String(chatId)).run();
  return {ok:true,revoked:Number(result?.meta?.changes??0)};
}
