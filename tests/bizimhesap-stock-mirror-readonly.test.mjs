import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stockQueryPaths, formatStockMirrorReport, stockMirrorSourcesReady, lookupStockMirror } from '../functions/shared/bizimhesap-stock-mirror.js';

const sql = fs.readFileSync(new URL('../migrations/20261012_aperion_bh_inventory_search_service_role_only.sql', import.meta.url),'utf8');
const webhook = fs.readFileSync(new URL('../functions/telegram/webhook.js', import.meta.url),'utf8');
const paths = stockQueryPaths('  Jender   large ');
assert.equal(paths.query,'Jender large');
assert.match(paths.stock,/aperion_bh_inventory_search_v1/);
assert.match(paths.freshness,/aperion_bh_freshness_v3/);
assert.equal(stockQueryPaths('a'),null);
assert.equal(stockQueryPaths('%**'),null);
assert.ok(!paths.stock.includes('stock_raw'));

const now = new Date('2026-10-12T19:08:00Z').toISOString();
const healthy = [
 { source:'warehouses', source_kind:'API_MIRROR', record_count:2, freshness:'FRESH', connection_status:'OK', last_success_at:now },
 { source:'inventory:AAAA', source_kind:'API_MIRROR', freshness:'FRESH', connection_status:'OK', last_success_at:now },
 { source:'inventory:BBBB', source_kind:'API_MIRROR', freshness:'FRESH', connection_status:'OK', last_success_at:now }
];
const rows = [
 { title:'JENDER LARGE 7li',qty:'45',warehouse_id:'AAAA',source_health:'FRESH' },
 { title:'JENDER LARGE 7li',qty:'0',warehouse_id:'BBBB',source_health:'FRESH' }
];
const result = formatStockMirrorReport(paths,healthy,rows);
assert.match(result,/45/);
assert.match(result,/Depo AAAA/);
assert.match(result,/Depo BBBB/);
assert.match(result,/12\.10\.2026/);
assert.ok(result.includes('\n')); // native Telegram newlines
assert.ok(!result.includes('\\n')); // never display slash-n
assert.match(formatStockMirrorReport(paths,healthy,[{title:'JENDER',qty:null,warehouse_id:'AAAA',source_health:'FRESH'}]),/miktar doğrulanamadı/);
assert.match(formatStockMirrorReport(paths,healthy,[]),/sonuç bulunamadı/);
assert.match(formatStockMirrorReport(paths,healthy,null,{mirrorOk:false}),/okunamadı/);
assert.match(formatStockMirrorReport(paths,null,rows),/doğrulanamadı/);
assert.match(formatStockMirrorReport(paths,[],rows),/doğrulanamadı/);
assert.match(formatStockMirrorReport(paths,healthy.map((x,i)=>i===1?{...x,freshness:'STALE'}:x),rows),/doğrulanamadı/);
assert.match(formatStockMirrorReport(paths,healthy.map((x,i)=>i===1?{...x,source_kind:'HISTORICAL_IMPORT'}:x),rows),/doğrulanamadı/);
assert.match(formatStockMirrorReport(paths,healthy.map((x,i)=>i===2?{...x,connection_status:'FAILED'}:x),rows),/doğrulanamadı/);
assert.match(formatStockMirrorReport(paths,healthy.map(x=>({...x,last_success_at:null})),rows),/doğrulanamadı/);
assert.match(formatStockMirrorReport(paths,healthy.slice(0,2),rows),/doğrulanamadı/);
assert.match(formatStockMirrorReport(paths,healthy.map(x=>x.source==='warehouses'?{...x,record_count:3}:x),rows),/doğrulanamadı/);
assert.match(formatStockMirrorReport(paths,healthy,[{...rows[0],source_health:'STALE'}]),/doğrulanamadı/);


assert.equal(stockMirrorSourcesReady(healthy),true);
assert.equal(stockMirrorSourcesReady([]),false);
assert.equal(stockMirrorSourcesReady(healthy.slice(1)),false);
const calls=[];
const simulated = await lookupStockMirror('Jender large', async path => {
  calls.push(path);
  return path.includes('aperion_bh_freshness_v3')
    ? {ok:true,data:healthy} : {ok:true,data:rows};
});
assert.equal(calls.length,2,'Fresh sources MUST request the product view');
assert.match(calls[1],/aperion_bh_inventory_search_v1/);
assert.match(simulated,/Depo AAAA: 45/);
assert.match(simulated,/Depo BBBB: 0/);
const staleCalls=[];
const blocked = await lookupStockMirror('Jender', async path => {
  staleCalls.push(path);
  if(path.includes('aperion_bh_freshness_v3'))
    return {ok:true,data:healthy.map((x,i)=>i===1?{...x,freshness:'STALE'}:x)};
  throw Error('MUST NOT request product view when source stale');
});
assert.equal(staleCalls.length,1,'Stale sources must not query product view');
assert.match(blocked,/güncelliği doğrulanamadı/);
assert.match(await lookupStockMirror('Jender',async()=>({ok:false,error:'http_401'})),/doğrulanamadı/);
const sourceOnly=[];
const noProduct = await lookupStockMirror('Jender',async path=>{
  sourceOnly.push(path);
  return {ok:true,data: path.includes('aperion_bh_freshness_v3')?healthy:[]};
});
assert.equal(sourceOnly.length,2,'Empty product result is allowed only AFTER product query');
assert.match(noProduct,/sonuç bulunamadı/);
const failStock = await lookupStockMirror('Jender',async path=>{
  if(path.includes('aperion_bh_freshness_v3'))return {ok:true,data:healthy};
  throw Error('temporarily offline');
});
assert.match(failStock,/okunamadı/);
assert.match(await lookupStockMirror('A',async()=>{throw Error('No HTTP on invalid query')}),/Kullanım/);

assert.match(sql,/CREATE OR REPLACE VIEW public\.aperion_bh_inventory_search_v1/);
assert.match(sql,/REVOKE ALL PRIVILEGES[^;]+FROM PUBLIC, anon, authenticated/i);
assert.match(sql,/REVOKE ALL PRIVILEGES[^;]+FROM service_role/i);
assert.match(sql,/GRANT SELECT[^;]+TO service_role/i);
assert.doesNotMatch(sql,/GRANT\s+(?:ALL|SELECT)[^;]+TO\s+(?:anon|authenticated)/i);
assert.doesNotMatch(sql,/INSERT INTO|UPDATE\s+public\.|DELETE FROM/i);
assert.ok(webhook.includes('lookupStockMirror(query, path => sbFetch(env, path))'));
assert.ok(webhook.includes("stock_report_version: 'api-inventory-mirror-v2-stock-query'"));
const handler = webhook.split('async function handleStokIntent(env, chatId, query) {')[1].split('async function handleDurumIntent')[0];
assert.doesNotMatch(handler, /\/rest\/v1\/stock_raw\?/);
assert.ok(handler.includes('lookupStockMirror'));
assert.ok(!handler.includes("preview.includes('doğrulanamadı')"));
console.log('PASS: API mirrored inventory read-only, freshness, no stale fallback, SQL service-role privileges');
