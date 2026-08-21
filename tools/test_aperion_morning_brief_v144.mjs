import assert from "node:assert/strict";
import { buildMorningBrief, buildDailyFinancialStatements } from "../workers/aperion-morning-brief/src/index.js";

class Statement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.params = []; }
  bind(...params) { this.params = params; return this; }
  async all() { return { results: this.db.rows(this.sql) }; }
  async first() { return this.db.rows(this.sql)[0] || null; }
}
const db = {
  prepare(sql) { return new Statement(this, sql); },
  rows(sql) {
    if (sql.includes("FROM source_health")) return [{ source_id: "google_drive", status: "confirmed", checked_at: "2026-08-21T05:00:00Z" }];
    if (sql.includes("FROM connector_registry")) return [
      { connector_key: "google_drive", title: "Google Drive", status: "active", maturity: "verified" },
      { connector_key: "gmail", title: "Gmail", status: "inactive", maturity: "declared" }
    ];
    if (sql.includes("FROM commitment_timeline")) return [
      { commitment_type: "payable", title: "TedarikÃ§i Ã¶demesi", amount: 1250, currency: "TRY", status: "open", priority: "high", truth_state: "confirmed", approval_required: 1, time_bucket: "approaching" },
      { commitment_type: "received_order", title: "Hakan Atasert sipariÅŸi", status: "open", truth_state: "confirmed", approval_required: 0, time_bucket: "upcoming" }
    ];
    if (sql.includes("FROM work_items")) return [{ title: "Fiyat eÅŸleÅŸmesini kontrol et", status: "planned", approval_required: 0 }];
    if (sql.includes("FROM approval_queue")) return [{ id: "a1", status: "needs_review" }];
    if (sql.includes("FROM telegram_captures")) return [{ id: 1, status: "pending_review" }];
    if (sql.includes("FROM aperion_devices")) return [{ device_name: "Ofis", status: "online" }];
    return [];
  }
};

const brief = await buildMorningBrief(db, new Date("2026-08-21T06:00:00Z"));
assert.equal(brief.dateKey, "2026-08-21");
assert.match(brief.text, /GÃ¼naydÄ±n AperiON/);
assert.match(brief.text, /Hakan Atasert sipariÅŸi/);
assert.match(brief.text, /ONAY_GEREKLI/);
assert.match(brief.text, /Gmail: KAYNAK EKSÄ°K/);
assert.match(brief.text, /mali kayÄ±t oluÅŸturulmadÄ±/);
assert.ok(brief.text.length < 4096);
assert.ok(brief.counts.priorities <= 3);
console.log("AperiON morning brief v144 tests passed");

const env = { SUPABASE_URL: "", SUPABASE_ANON_KEY: "" };
const statements = await buildDailyFinancialStatements(env, db, new Date("2026-08-21T06:00:00Z"));
assert.match(statements, /GÃœNLÃœK GELÄ°R TABLOSU/);
assert.match(statements, /GÃœNLÃœK BÄ°LANÃ‡O/);
assert.match(statements, /kesin bilanÃ§o deÄŸildir/);
