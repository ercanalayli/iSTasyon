import test from "node:test";
import assert from "node:assert/strict";
import {issueMobileTicket,revokeMobileTickets} from "../functions/shared/bizimhesap-mobile-pairing.js";
import {ensurePairStore,validTicket,claimTicket,checkSession,renewSession,revokeSession,matchingOrigin,sessionCookie} from "../workers/aperion-bizimhesap-free/src/mobile-pairing.js";

// Minimal stateful D1 contract stub: table creation, unique idempotency and atomic claims.
class MemoryD1 {
  constructor(){this.rows=[];}
  prepare(query){
    const db=this;let vals=[];
    return {
      bind(...args){vals=args;return this;},
      async run(){
        if(query.startsWith("CREATE ")) return {meta:{changes:0}};
        if(query.includes("INSERT OR IGNORE INTO bh_mobile_pair_grants")){
          const [hash,chat,user,msg,issued,expires]=vals;
          if(db.rows.some(r=>r.chat_id===chat&&r.telegram_message_id===msg||r.ticket_hash===hash)) return {meta:{changes:0}};
          db.rows.push({ticket_hash:hash,chat_id:chat,user_id:user,telegram_message_id:msg,issued_at_ms:issued,expires_at_ms:expires,claimed_at_ms:null,session_hash:null,session_expires_at_ms:null,revoked_at_ms:null});
          return {meta:{changes:1}};
        }
        if(query.includes("UPDATE bh_mobile_pair_grants SET revoked_at_ms=? WHERE chat_id=?")){
          let count=0;for(const r of db.rows)if(r.chat_id===vals[1]&&r.revoked_at_ms===null){r.revoked_at_ms=vals[0];count++}
          return {meta:{changes:count}};
        }
        throw new Error("unexpected D1 write: "+query.slice(0,70));
      },
      async first(){
        if(query.startsWith("SELECT COUNT(*) n FROM bh_mobile_pair_grants")){
          return {n:db.rows.filter(r=>r.chat_id===vals[0]&&r.issued_at_ms>vals[1]).length};
        }
        if(query.startsWith("SELECT ticket_hash FROM bh_mobile_pair_grants")){
          const r=db.rows.find(r=>r.ticket_hash===vals[0]&&r.expires_at_ms>vals[1]&&r.claimed_at_ms===null&&r.revoked_at_ms===null);
          return r?{ticket_hash:r.ticket_hash}:null;
        }
        if(query.includes("UPDATE bh_mobile_pair_grants SET claimed_at_ms=?")){
          const r=db.rows.find(x=>x.ticket_hash===vals[3]&&x.claimed_at_ms===null&&x.revoked_at_ms===null&&x.expires_at_ms>vals[4]);
          if(!r)return null;[r.claimed_at_ms,r.session_hash,r.session_expires_at_ms]=vals.slice(0,3);return {ticket_hash:r.ticket_hash};
        }
        if(query.startsWith("SELECT chat_id,session_expires_at_ms FROM bh_mobile_pair_grants")){
          const r=db.rows.find(x=>x.session_hash===vals[0]&&x.session_expires_at_ms>vals[1]&&x.revoked_at_ms===null&&x.claimed_at_ms!==null);
          return r?{chat_id:r.chat_id,session_expires_at_ms:r.session_expires_at_ms}:null;
        }
        if(query.includes("UPDATE bh_mobile_pair_grants SET session_hash=?")){
          const r=db.rows.find(x=>x.session_hash===vals[2]&&x.session_expires_at_ms>vals[3]&&x.revoked_at_ms===null);
          if(!r)return null;r.session_hash=vals[0];r.session_expires_at_ms=vals[1];return {ticket_hash:r.ticket_hash};
        }
        if(query.includes("UPDATE bh_mobile_pair_grants SET revoked_at_ms=? WHERE session_hash=?")){
          const r=db.rows.find(x=>x.session_hash===vals[1]&&x.revoked_at_ms===null);
          if(!r)return null;r.revoked_at_ms=vals[0];return {ticket_hash:r.ticket_hash};
        }
        throw new Error("unexpected D1 read: "+query.slice(0,75));
      }
    };
  }
}
const request=(url,headers={})=>new Request(url,{headers});
const sessReq=(token)=>request("https://aperion-bizimhesap-free.example/setup",{cookie:"bh_mobile_access="+token});
test("issue/claim once, reject concurrent replays and detect expiry",async()=>{
 const db=new MemoryD1();assert.equal(await ensurePairStore(db),true);
 const issued=await issueMobileTicket(db,{chatId:"111",userId:"111",messageId:"55",now:1e9});
 assert.equal(issued.ok,true);assert.equal(db.rows.length,1);
 assert.equal(await validTicket(db,issued.token,1e9),true);
 const claim=await claimTicket(db,issued.token,1e9+50);
 assert.equal(claim.ok,true);
 assert.equal(await validTicket(db,issued.token,1e9+51),false);
 assert.equal((await claimTicket(db,issued.token,1e9+51)).ok,false);
 assert.equal((await issueMobileTicket(db,{chatId:"111",userId:"111",messageId:"55",now:1e9+52})).ok,false);
 assert.equal((await checkSession(db,sessReq(claim.session),1e9+60))?.chat_id,"111");
 const exp=await issueMobileTicket(db,{chatId:"111",userId:"111",messageId:"56",now:1e9+70000});
 assert.equal(exp.ok,true);
 assert.equal(await validTicket(db,exp.token,1e9+70000+600001),false);
 assert.equal((await claimTicket(db,exp.token,1e9+70000+600001)).ok,false);
});
test("rotation invalidates prior cookie; /bhiptal invalidates all active sessions",async()=>{
 const db=new MemoryD1(),at=2e9;
 const tok=await issueMobileTicket(db,{chatId:"23",userId:"23",messageId:"1",now:at});
 const claimed=await claimTicket(db,tok.token,at+1);
 const oldReq=sessReq(claimed.session);
 const renewed=await renewSession(db,oldReq,at+2);
 assert.equal(renewed.ok,true);
 assert.equal(await checkSession(db,oldReq,at+3),null);
 const newReq=sessReq(renewed.session);
 assert.ok(await checkSession(db,newReq,at+3));
 const revoked=await revokeMobileTickets(db,{chatId:"23",now:at+4});
 assert.equal(revoked.ok,true);assert.equal(revoked.revoked,1);
 assert.equal(await checkSession(db,newReq,at+5),null);
 assert.equal((await renewSession(db,newReq,at+5)).ok,false);
});
test("device self-revoke, tampered token, revoked ticket and missing store fail closed",async()=>{
 const db=new MemoryD1(),at=3e9;
 assert.equal(await ensurePairStore(null),false);
 assert.equal(await validTicket(null,"a".repeat(64),at),false);
 const token=await issueMobileTicket(db,{chatId:"44",userId:"44",messageId:"1",now:at});
 assert.equal(await validTicket(db,token.token.slice(1),at),false);
 const claimed=await claimTicket(db,token.token,at+1);
 assert.equal(await revokeSession(db,sessReq(claimed.session),at+2),true);
 assert.equal(await checkSession(db,sessReq(claimed.session),at+3),null);
 const next=await issueMobileTicket(db,{chatId:"44",userId:"44",messageId:"2",now:at+61000});
 assert.equal((await revokeMobileTickets(db,{chatId:"44",now:at+61001})).revoked,1);
 assert.equal(await validTicket(db,next.token,at+61002),false);
});
test("CSRF origin guard and cookie attributes",()=>{
 assert.equal(matchingOrigin(request("https://example.com/setup/start",{origin:"https://attacker.test"})),false);
 assert.equal(matchingOrigin(request("https://example.com/setup/start",{origin:"https://example.com"})),true);
 assert.equal(matchingOrigin(request("https://example.com/setup/start")),false);
 const cookie=sessionCookie("a".repeat(64));
 assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Lax/);
 assert.doesNotMatch(cookie,/Domain=/);
});
