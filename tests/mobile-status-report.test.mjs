import test from "node:test";
import assert from "node:assert/strict";
import { buildMobileStatusReport } from "../functions/shared/mobile-status-report.js";
const ok = (source) => ({source,source_kind:"API_MIRROR",
  freshness:"FRESH",connection_status:"OK",last_success_at:"2026-10-12T17:00:00Z"});

test("fresh products do not mask old finance", () => {
 const r=buildMobileStatusReport({stockRow:{tarih:"2026-09-09"},
 eventRow:{created_at:"2026-09-09T08:57:29Z"},
 sources:[ok("customers"),ok("products"),ok("inventory:one"),
 {source:"bizimhesap_events",source_kind:"HISTORICAL_IMPORT",freshness:"STALE",
 connection_status:"NO_LIVE_SYNC_EVIDENCE",last_success_at:"2026-09-09T08:57:29Z"}],freshnessOk:true});
 assert.match(r,/Cari: GÜNCEL API/);
 assert.match(r,/Ürün: GÜNCEL API/);
 assert.match(r,/KRİTİK: 5\/5/);
 assert.match(r,/Finansal otomatik kapanış YASAK/);
 assert.match(r,/Stok geçmişi \(stock_raw\): 2026-09-09/);
});
test("missing health source fails closed", () => {
 const r=buildMobileStatusReport({stockRow:null,eventRow:null,sources:null,freshnessOk:false});
 assert.match(r,/güncelliği doğrulanamadı/);
 assert.match(r,/Finansal otomatik kapanış YASAK/);
 assert.doesNotMatch(r,/GÜNCEL API/);
});
test("all healthy metadata still requires ERP record verification", () => {
 const all=["bizimhesap_events","bizimhesap_hesap_hareketleri",
 "sales_raw","e_invoice_live","payment_collection_live"].map(ok);
 const r=buildMobileStatusReport({stockRow:null,eventRow:null,sources:all,freshnessOk:true});
 assert.match(r,/bağımsız doğrulanmalı/);
 assert.match(r,/kayıt yazıldığını doğrulamaz/);
});
