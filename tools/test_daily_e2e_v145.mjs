import assert from "node:assert/strict";
import { onRequestGet, onRequestPost } from "../functions/api/daily-e2e-check.js";

class Statement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.params = [];
  }

  bind(...params) {
    this.params = params;
    return this;
  }

  async first() {
    if (this.sql.includes("FROM daily_e2e_runs")) {
      return this.db.existingRun ? { status: this.db.existingRun } : null;
    }
    if (this.sql.includes("FROM morning_brief_runs")) {
      return this.db.briefSent ? { status: "sent", telegram_message_id: "brief-1", sent_at: "2026-08-21T06:00:01Z" } : null;
    }
    if (this.sql.includes("FROM telegram_security_config")) {
      return this.db.chatConfigured ? { config_value: "123456" } : null;
    }
    if (this.sql.includes("FROM source_health")) {
      const rows = [...this.db.health.values()];
      return { total: rows.length, healthy: rows.filter(row => ["ok", "confirmed"].includes(row.status)).length };
    }
    return null;
  }

  async run() {
    if (this.sql.includes("INSERT INTO source_health")) {
      this.db.health.set(this.params[0], { status: this.params[1], message: this.params[3] });
    }
    if (this.sql.includes("INSERT INTO daily_e2e_runs")) {
      this.db.savedRun = { runKey: this.params[0], status: this.params[1], checks: JSON.parse(this.params[2]), messageId: this.params[3] };
    }
    return { success: true };
  }
}

function database(options = {}) {
  return {
    health: new Map(),
    existingRun: options.existingRun || "",
    briefSent: options.briefSent !== false,
    chatConfigured: options.chatConfigured !== false,
    savedRun: null,
    prepare(sql) {
      return new Statement(this, sql);
    }
  };
}

function environment(db) {
  return {
    APERION_DB: db,
    TELEGRAM_BOT_TOKEN: "test-token",
    MORNING_BRIEF_DISPATCH_SECRET: "test-secret",
    SUPABASE_URL: "https://supabase.example",
    SUPABASE_SERVICE_ROLE_KEY: "test-key"
  };
}

function request(secret = "test-secret") {
  return new Request("https://aperion.example/api/daily-e2e-check", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` }
  });
}

let failingTable = "";
let telegramMessages = 0;
globalThis.fetch = async url => {
  const value = String(url);
  if (value.includes("api.telegram.org")) {
    telegramMessages += 1;
    return new Response(JSON.stringify({ ok: true, result: { message_id: 99 } }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  }
  const failed = failingTable && value.includes(`/${failingTable}?`);
  return new Response(JSON.stringify(failed ? { error: "probe failed" } : []), {
    status: failed ? 503 : 200,
    headers: { "content-type": "application/json" }
  });
};

{
  const db = database();
  const response = await onRequestGet({ env: environment(db) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).configured, true);
}

{
  const db = database();
  const response = await onRequestPost({ request: request("wrong"), env: environment(db) });
  assert.equal(response.status, 401);
}

{
  failingTable = "";
  telegramMessages = 0;
  const db = database();
  const response = await onRequestPost({ request: request(), env: environment(db) });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.status, "passed");
  assert.equal(db.health.size, 5);
  assert.equal(db.savedRun.status, "passed");
  assert.equal(telegramMessages, 1);
}

{
  failingTable = "masraf_raw";
  telegramMessages = 0;
  const db = database();
  const response = await onRequestPost({ request: request(), env: environment(db) });
  const payload = await response.json();
  assert.equal(response.status, 503);
  assert.equal(payload.status, "failed");
  assert.equal(db.savedRun.status, "failed");
  assert.ok(payload.checks.some(check => check.name.includes("Gider") && !check.ok));
  assert.equal(telegramMessages, 1);
}

{
  failingTable = "";
  const db = database({ briefSent: false });
  const response = await onRequestPost({ request: request(), env: environment(db) });
  const payload = await response.json();
  assert.equal(response.status, 503);
  assert.ok(payload.checks.some(check => check.name.includes("09:00") && !check.ok));
}

{
  telegramMessages = 0;
  const db = database({ existingRun: "passed" });
  const response = await onRequestPost({ request: request(), env: environment(db) });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.skipped, true);
  assert.equal(telegramMessages, 0);
}

console.log("AperiON daily E2E v145 tests passed");
