import { sendTelegram } from "../../workers/aperion-morning-brief/src/index.js";

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

async function query(db, sql, ...params) {
  try {
    return { ok: true, row: await db.prepare(sql).bind(...params).first() };
  } catch (error) {
    return { ok: false, error: String(error && error.message || error) };
  }
}

async function sourceProbe(env, table) {
  const base = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  if (!base || !key) return { ok: false, detail: "kimlik bilgisi eksik" };
  try {
    const response = await fetch(`${base}/rest/v1/${table}?select=*&limit=1`, {
      headers: { apikey: key, authorization: `Bearer ${key}` }
    });
    return { ok: response.ok, detail: response.ok ? "okundu" : `HTTP ${response.status}` };
  } catch (_error) {
    return { ok: false, detail: "bağlantı hatası" };
  }
}

function istanbulDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export async function onRequestGet({ env }) {
  return json({
    ok: true,
    service: "aperion-daily-e2e",
    version: "v145",
    configured: Boolean(env.APERION_DB && env.TELEGRAM_BOT_TOKEN && env.MORNING_BRIEF_DISPATCH_SECRET)
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.MORNING_BRIEF_DISPATCH_SECRET || request.headers.get("authorization") !== `Bearer ${env.MORNING_BRIEF_DISPATCH_SECRET}`) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const date = istanbulDate();
  await env.APERION_DB.prepare("CREATE TABLE IF NOT EXISTS daily_e2e_runs (run_key TEXT PRIMARY KEY,checked_at TEXT NOT NULL,status TEXT NOT NULL,checks_json TEXT NOT NULL,telegram_message_id TEXT,created_at TEXT NOT NULL DEFAULT (datetime('now')),updated_at TEXT NOT NULL DEFAULT (datetime('now')))").run();
  const existing = await query(env.APERION_DB, "SELECT status FROM daily_e2e_runs WHERE run_key=?", `e2e:${date}`);
  if (existing.row) return json({ ok: true, skipped: true, status: existing.row.status });

  const [brief, chat, sourceHealth, sales, customers, expenses] = await Promise.all([
    query(env.APERION_DB, "SELECT status,telegram_message_id,sent_at FROM morning_brief_runs WHERE run_key=?", `morning:${date}`),
    query(env.APERION_DB, "SELECT config_value FROM telegram_security_config WHERE config_key='allowed_chat_id'"),
    query(env.APERION_DB, "SELECT COUNT(*) AS total,SUM(CASE WHEN status IN ('ok','confirmed') THEN 1 ELSE 0 END) AS healthy FROM source_health"),
    sourceProbe(env, "sales_raw"),
    sourceProbe(env, "customers"),
    sourceProbe(env, "masraf_raw")
  ]);

  const checks = [
    { name: "09:00 Telegram brifingi", ok: brief.ok && brief.row?.status === "sent" && Boolean(brief.row?.telegram_message_id), detail: brief.row?.status || "kayıt yok" },
    {
      name: "D1 kontrol düzlemi",
      ok: sourceHealth.ok && Number(sourceHealth.row?.total || 0) > 0 && Number(sourceHealth.row?.healthy || 0) === Number(sourceHealth.row?.total || 0),
      detail: sourceHealth.ok ? `${sourceHealth.row?.healthy || 0}/${sourceHealth.row?.total || 0} sağlıklı kaynak` : "okunamadı"
    },
    { name: "Telegram hedef kimliği", ok: chat.ok && Boolean(chat.row?.config_value), detail: chat.row?.config_value ? "yapılandırıldı" : "eksik" },
    { name: "Satış kaynağı", ...sales },
    { name: "Cari kaynağı", ...customers },
    { name: "Gider kaynağı", ...expenses }
  ];

  let allOk = checks.every(check => check.ok);
  let messageId = null;
  if (chat.row?.config_value && env.TELEGRAM_BOT_TOKEN) {
    try {
      const lines = [
        allOk ? "✅ APERİON UÇTAN UCA DOĞRULANDI" : "⚠️ APERİON UÇTAN UCA KONTROL",
        `Tarih: ${date} · 09:05`,
        ...checks.map(check => `${check.ok ? "✅" : "❌"} ${check.name}: ${check.detail}`),
        "",
        "Bu kontrol mali kayıt oluşturmadı."
      ];
      const sent = await sendTelegram(env.TELEGRAM_BOT_TOKEN, chat.row.config_value, lines.join("\n"));
      messageId = String(sent.message_id);
    } catch (error) {
      allOk = false;
      checks.push({ name: "Telegram teyit gönderimi", ok: false, detail: String(error && error.message || error).slice(0, 200) });
    }
  } else {
    allOk = false;
    checks.push({ name: "Telegram teyit gönderimi", ok: false, detail: "hedef veya bot anahtarı eksik" });
  }

  await env.APERION_DB.prepare("INSERT INTO daily_e2e_runs(run_key,checked_at,status,checks_json,telegram_message_id) VALUES(?,datetime('now'),?,?,?)")
    .bind(`e2e:${date}`, allOk ? "passed" : "failed", JSON.stringify(checks), messageId).run();
  return json({ ok: allOk, status: allOk ? "passed" : "failed", checks, messageId }, allOk ? 200 : 503);
}
