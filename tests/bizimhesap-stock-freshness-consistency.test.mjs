import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stockQueryPaths, formatStockMirrorReport } from '../functions/shared/bizimhesap-stock-mirror.js';

const sql=fs.readFileSync(new URL('../migrations/20261012_aperion_bh_stock_freshness_consistent_v2.sql',import.meta.url),'utf8');
const original=fs.readFileSync(new URL('../migrations/20261012_aperion_bh_inventory_search_service_role_only.sql',import.meta.url),'utf8');
const base='public.aperion_bh_inventory_search_v1';
assert.match(sql,/CREATE OR REPLACE VIEW public\.aperion_bh_inventory_search_v1/);
assert.match(sql,/JOIN public\.aperion_bh_freshness_v3 AS f ON f\.source=s\.source_type/);
assert.match(sql,/f\.freshness='FRESH'/);
assert.match(sql,/f\.connection_status='OK'/);
assert.match(sql,/f\.source_kind='API_MIRROR'/);
assert.match(sql,/f\.last_success_at >= now\(\) - interval '180 minutes'/);
assert.match(sql,/s\.checked_at >= now\(\) - interval '180 minutes'/);
assert.doesNotMatch(sql,/JOIN aperion_internal\.bh_sync_health_v1/);
assert.match(sql,/REVOKE ALL PRIVILEGES[^;]+FROM PUBLIC, anon, authenticated, service_role/);
assert.match(sql,/GRANT SELECT[^;]+TO service_role/);
assert.doesNotMatch(sql,/\bINSERT INTO\b|\bUPDATE\b\s+public\.|\bDELETE FROM\b|\bDROP\s+VIEW\b/i);
assert.doesNotMatch(sql,/coalesce\([^\n]*qty[^\n]*,\s*0\)/i);
for(const column of ['warehouse_id','product_id','title','barcode','qty','last_success_at','source_health','mirror_checked_at']){
  assert.ok(sql.includes(column),column+' missing');
  assert.ok(original.includes(column),column+' missing from original');
}
const p=stockQueryPaths('Jender');
assert.ok(p.stock.includes(base));
assert.ok(p.freshness.includes('aperion_bh_freshness_v3'));
const liveClock='2026-10-12T20:15:00.000Z';
const depots=[{source:'warehouses',source_kind:'API_MIRROR',record_count:2,freshness:'FRESH',connection_status:'OK',last_success_at:liveClock},
{source:'inventory:AAAA',source_kind:'API_MIRROR',freshness:'FRESH',connection_status:'OK',last_success_at:liveClock},
{source:'inventory:BBBB',source_kind:'API_MIRROR',freshness:'FRESH',connection_status:'OK',last_success_at:liveClock}];
const row=[{title:'Jender',qty:'4',warehouse_id:'AAAA',source_health:'FRESH'}];
assert.match(formatStockMirrorReport(p,depots,row),/Depo AAAA: 4/);
assert.match(formatStockMirrorReport(p,depots,[{...row[0],source_health:'STALE'}]),/Miktar gösterilmedi/);
assert.match(formatStockMirrorReport(p,depots.map((x,i)=>i===1?{...x,freshness:'STALE'}:x),row),/güncelliği doğrulanamadı/);
console.log('PASS: Stock source 180min, view row health, private SELECT-only and stale fail closed.');
