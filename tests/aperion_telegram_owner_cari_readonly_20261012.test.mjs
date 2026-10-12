import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ownerPrivateTelegram,parseCariSearch,cariLookupPath,selectUniqueFreshCustomer,
  summarizeVerifiedAbstract,readOwnerCariAbstract
} from '../functions/shared/bizimhesap-telegram-cari-read.js';

const webhook=fs.readFileSync(new URL('../functions/telegram/webhook.js',import.meta.url),'utf8');
const sql=fs.readFileSync(new URL('../migrations/20261012_aperion_bh_customer_owner_lookup_v1.sql',import.meta.url),'utf8');
const id='219C65ACD6C24DB6AA977C9F49561B19';
const owner={ok:true,hardened:true,chatId:'100001',userId:'100001'};
const message={chat:{id:100001,type:'private'},from:{id:100001},message_id:42,text:'/cariekstre Gamze'};
const match=[{customer_id:id,title:'Gamze Eczanesi',source_health:'FRESH',last_success_at:'2026-10-12T20:45:00Z'}];

assert.equal(ownerPrivateTelegram(owner,message),true);
assert.equal(ownerPrivateTelegram({...owner,hardened:false},message),false);
assert.equal(ownerPrivateTelegram({...owner,chatId:'other'},message),false);
assert.equal(ownerPrivateTelegram(owner,{...message,chat:{id:100001,type:'group'}}),false);
assert.equal(ownerPrivateTelegram(owner,{...message,from:{id:100002}}),false);
assert.equal(parseCariSearch('/cariekstre Gamze'),'Gamze');
assert.equal(parseCariSearch('/cariekstre@aperion_bot Gamze Eczanesi'),'Gamze Eczanesi');
assert.equal(parseCariSearch('/cariekstre X'),null);
assert.equal(parseCariSearch('/cariekstre ../../addinvoice'),null);
assert.equal(parseCariSearch('/cariekstre a%2Fb'),null);
assert.ok(cariLookupPath('Gamze Eczanesi').includes('aperion_bh_customer_owner_lookup_v1'));
assert.ok(!cariLookupPath('Gamze Eczanesi').includes('integrations'));
assert.equal(selectUniqueFreshCustomer(match).ok,true);
assert.equal(selectUniqueFreshCustomer([]).ok,false);
assert.equal(selectUniqueFreshCustomer([...match,...match]).error,'BİRDEN_FAZLA_CARİ');
assert.equal(selectUniqueFreshCustomer([{...match[0],source_health:'STALE'}]).ok,false);
assert.equal(selectUniqueFreshCustomer([{...match[0],customer_id:'../not-good'}]).ok,false);

const vendorSuccess={resultCode:1,data:[{documentDate:'2026-10-11',invoiceNo:'BLG-123',totalAmount:'1250.00'}]};
const good=summarizeVerifiedAbstract(vendorSuccess,{title:'Gamze Eczanesi',sourceLastSuccess:'2026-10-12T20:45:00Z',nowIso:'2026-10-12T20:50:00Z'});
assert.match(good,/BizimHesap cari ekstresi/);
assert.match(good,/BLG-123/);
assert.match(good,/2026-10-11/);
assert.match(good,/1250.00/);
assert.match(good,/yönü ve ekstre kapsamı ayrıca doğrulanmalı/);
assert.doesNotMatch(summarizeVerifiedAbstract({resultCode:0,data:vendorSuccess.data}, {title:'x'}), /BLG-123/);
assert.match(summarizeVerifiedAbstract({resultCode:1,data:{other:'unknown'}},{title:'x'}),/VERIFIED değil/);
assert.match(summarizeVerifiedAbstract({resultCode:1,data:[]},{title:'x'}),/kesin kanıt değil/);

const goodCalls=[];
const dbGet=async path=>{
  goodCalls.push(path);
  if(path.includes('customer_owner_lookup'))return {ok:true,data:match};
  if(path.includes('/integrations?'))return {ok:true,data:[{api_token:'server-only-secret'}]};
  throw Error('unplanned DB query');
};
const providerGet=async (path,token)=>{
  goodCalls.push(path);
  assert.equal(token,'server-only-secret');
  assert.match(path,/\/abstract\/219C65ACD6C24DB6AA977C9F49561B19$/);
  return {status:200,json:vendorSuccess};
};
const live=await readOwnerCariAbstract({env:{},message,identity:owner,dbGet,providerGet});
assert.match(live,/BLG-123/);
assert.equal(goodCalls.length,3);
assert.ok(!live.includes('server-only-secret'));

const unauthorizedCalls=[];
const denied=await readOwnerCariAbstract({message,identity:{...owner,hardened:false},
  dbGet:async path=>{unauthorizedCalls.push(path);throw Error('must not query');},
  providerGet:async()=>{throw Error('must not reach provider');}});
assert.match(denied,/YETKİLİ_ÖZEL_SOHBET_GEREKLİ/);
assert.equal(unauthorizedCalls.length,0);

const ambiguousCalls=[];
const ambiguous=await readOwnerCariAbstract({message,identity:owner,
  dbGet:async path=>{ambiguousCalls.push(path);return {ok:true,data:[...match,{...match[0],customer_id:'8'.repeat(32),title:'Gamze Medikal'}]};},
  providerGet:async()=>{throw Error('must not query ambiguous name');}});
assert.match(ambiguous,/Birden fazla cari/);
assert.equal(ambiguousCalls.length,1);

const staleCalls=[];
const stale=await readOwnerCariAbstract({message,identity:owner,
  dbGet:async path=>{staleCalls.push(path);return {ok:true,data:[{...match[0],source_health:'STALE'}]};},
  providerGet:async()=>{throw Error('never query stale');}});
assert.match(stale,/CARİ_KAYNAĞI_GÜNCEL_DEĞİL/);
assert.equal(staleCalls.length,1);

const rateLimit=await readOwnerCariAbstract({message,identity:owner,dbGet,
  providerGet:async()=>({status:429,json:{resultCode:1,data:[]}})});
assert.match(rateLimit,/SAĞLAYICI_HIZ_SINIRI/);
const transportOnly=await readOwnerCariAbstract({message,identity:owner,dbGet,
  providerGet:async()=>({status:200,json:{resultCode:0,data:vendorSuccess.data}})});
assert.match(transportOnly,/BİZİMHESAP_BAŞARI_KODU_YOK/);
assert.doesNotMatch(transportOnly,/BLG-123/);

assert.match(sql,/CREATE OR REPLACE VIEW public\.aperion_bh_customer_owner_lookup_v1/);
assert.match(sql,/source_type='customers'/);
assert.match(sql,/f\.freshness='FRESH'/);
assert.match(sql,/REVOKE ALL PRIVILEGES[\s\S]*FROM PUBLIC, anon, authenticated, service_role/);
assert.match(sql,/GRANT SELECT[\s\S]*TO service_role/);
assert.doesNotMatch(sql,/\bINSERT INTO\b|\bDELETE FROM\b|\bUPDATE\s+public\./i);
assert.match(webhook,/ownerPrivateTelegram\(identity, msg\)/);
assert.match(webhook,/readOwnerCariAbstract\(/);
assert.match(webhook,/owner_cari_read_requests/);
assert.match(webhook,/result\?\.meta\?\.changes===1/);
assert.match(webhook,/AbortSignal\.timeout\(18000\)/);
const segment=webhook.split('if (/^\\/cariekstre')[1]?.split('// P0: the retail-sale command')[0]||'';
assert.ok(segment.length>100,'expected route handler');
assert.doesNotMatch(segment,/\/addinvoice|process_queue|bhPost|update\(\{|DELETE FROM/i);
console.log('PASS: owner private single-cari read, no provider call on invalid/ambiguous/stale/unauth, no ERP write');
