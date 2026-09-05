const VERSION = "v144";
const CRON = "0 6 * * *";
const CLOSED = new Set(["completed", "cancelled", "verified", "tamamlandi", "iptal"]);

async function all(db, sql, ...params) {
  try {
    const result = await db.prepare(sql).bind(...params).all();
    return { ok: true, rows: result.results || [] };
  } catch (error) {
    return { ok: false, rows: [], error: String(error && error.message || error) };
  }
}

async function first(db, sql, ...params) {
  try {
    return { ok: true, row: await db.prepare(sql).bind(...params).first() };
  } catch (error) {
    return { ok: false, row: null, error: String(error && error.message || error) };
  }
}

function istanbulParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(date).reduce((out, item) => ({ ...out, [item.type]: item.value }), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function label(item) {
  if (Number(item.approval_required)) return "ONAY_GEREKLI";
  if (item.truth_state && !["confirmed", "verified"].includes(String(item.truth_state).toLowerCase())) return "BILGI_GEREKLI";
  return "OTOMATIK";
}

function short(text, max = 110) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function moneyTr(value) {
  return `${(Number(value) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
}

async function supabaseRows(env, path) {
  const base = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  if (!base || !key) return { ok: false, rows: [] };
  try {
    const response = await fetch(`${base}${path}`, { headers: { apikey: key, authorization: `Bearer ${key}` } });
    const rows = await response.json();
    return { ok: response.ok && Array.isArray(rows), rows: Array.isArray(rows) ? rows : [] };
  } catch (_error) { return { ok: false, rows: [] }; }
}

function sumField(rows, ...fields) {
  return rows.reduce((total, row) => total + (fields.map((field) => Number(row[field])).find(Number.isFinite) || 0), 0);
}

function dateScopes(now) {
  const stamp = istanbulParts(now);
  return { today: stamp.date, month: `${stamp.date.slice(0, 7)}-01`, year: `${stamp.date.slice(0, 4)}-01-01` };
}

export async function buildDailyFinancialStatements(env, db, now = new Date()) {
  const scope = dateScopes(now);
  const [sales, expenses, fifo, stock, customers, banks] = await Promise.all([
    supabaseRows(env, `/rest/v1/sales_raw?select=tarih,ciro,satis_kdv_haric&firma_id=eq.alayli&tarih=gte.${scope.year}&tarih=lte.${scope.today}&limit=5000`),
    supabaseRows(env, `/rest/v1/masraf_raw?select=tarih,tutar,toplam&firma_id=eq.alayli&tarih=gte.${scope.year}&tarih=lte.${scope.today}&limit=5000`),
    supabaseRows(env, `/rest/v1/fifo_sales_profit_view?select=tarih,net_sales,fifo_cost,net_profit&firma_id=eq.alayli&tarih=gte.${scope.year}&tarih=lte.${scope.today}&limit=5000`),
    supabaseRows(env, "/rest/v1/product_raw?select=miktar,alis_fiyat,cekilme_tarihi&firma_id=eq.alayli&limit=5000"),
    supabaseRows(env, "/rest/v1/customers?select=bakiye,bakiye_tipi,updated_at&firma_id=eq.alayli&limit=5000"),
    all(db, "SELECT bank_name,balance,balance_date FROM last_bank_balances")
  ]);
  const filterFrom = (rows, from) => rows.filter((row) => String(row.tarih || "") >= from && String(row.tarih || "") <= scope.today);
  const incomeLine = (label, from) => {
    if (!sales.ok || !expenses.ok) return `• ${label}: BILGI_GEREKLI — satış/gider kaynağı okunamadı`;
    const revenue = sumField(filterFrom(sales.rows, from), "satis_kdv_haric", "ciro");
    const expense = sumField(filterFrom(expenses.rows, from), "toplam", "tutar");
    const fifoRows = fifo.ok ? filterFrom(fifo.rows, from) : [];
    const profit = fifoRows.length ? sumField(fifoRows, "net_profit") - expense : null;
    return `• ${label}: satış ${moneyTr(revenue)} · gider ${moneyTr(expense)} · ${profit == null ? "net kâr: FIFO KAYNAK EKSİK" : `net kâr ${moneyTr(profit)}`}`;
  };
  const bankTotal = banks.ok ? sumField(banks.rows, "balance") : null;
  const stockValue = stock.ok ? stock.rows.reduce((sum, row) => sum + (Number(row.miktar) || 0) * (Number(row.alis_fiyat) || 0), 0) : null;
  const cariNet = customers.ok ? sumField(customers.rows, "bakiye") : null;
  return [
    "\nGÜNLÜK GELİR TABLOSU — YÖNETİM TASLAĞI",
    incomeLine("Bugün", scope.today),
    incomeLine("Bu ay", scope.month),
    incomeLine("Bu yıl", scope.year),
    fifo.ok ? "• FIFO maliyet kaynağı: doğrulandı" : "• BILGI_GEREKLI — FIFO maliyet kaynağı yok; kesin kâr hesaplanmadı",
    "\nGÜNLÜK BİLANÇO — KISMİ GÖRÜNÜM",
    `• Banka: ${bankTotal == null ? "KAYNAK OKUNAMADI" : moneyTr(bankTotal)}`,
    `• Stok (kayıtlı alış fiyatı): ${stockValue == null ? "KAYNAK OKUNAMADI" : moneyTr(stockValue)}`,
    `• Cari net bakiye: ${cariNet == null ? "KAYNAK OKUNAMADI" : moneyTr(cariNet)}`,
    "• BILGI_GEREKLI — kasa, vergi, borçlar ve özkaynak tamamlanmadan kesin bilanço değildir"
  ].join("\n");
}

function categoryRows(rows, types) {
  const wanted = new Set(types);
  return rows.filter((row) => wanted.has(String(row.commitment_type || "").toLowerCase()) && !CLOSED.has(String(row.status || "").toLowerCase()));
}

function section(title, sourceOk, rows, emptyText) {
  const lines = [`\n${title}`];
  if (!sourceOk) return lines.concat("• BILGI_GEREKLI — KAYNAK OKUNAMADI");
  if (!rows.length) return lines.concat(`• BILGI_GEREKLI — ${emptyText}`);
  return lines.concat(rows.slice(0, 5).map((row) => {
    const amount = Number.isFinite(Number(row.amount)) ? ` · ${Number(row.amount).toLocaleString("tr-TR")} ${row.currency || "TRY"}` : "";
    const date = row.due_at || row.expected_at ? ` · ${short(row.due_at || row.expected_at, 16)}` : "";
    return `• ${label(row)} — ${short(row.title)}${amount}${date}`;
  }));
}

function sourceLine(key, connector, health) {
  const c = connector.get(key);
  const h = health.get(key);
  const verified = c && ["active", "connected"].includes(String(c.status).toLowerCase()) && h && ["confirmed", "ok"].includes(String(h.status).toLowerCase());
  if (verified) return `• OTOMATIK — ${c.title || key}: doğrulandı (${short(h.checked_at || h.last_success_at, 16)})`;
  const reason = h ? `${h.status}${h.message ? ` — ${short(h.message, 65)}` : ""}` : c ? `${c.status}/${c.maturity}` : "kayıt yok";
  return `• BILGI_GEREKLI — ${c && c.title || key}: KAYNAK EKSİK (${reason})`;
}

export async function buildMorningBrief(db, now = new Date()) {
  const [healthQ, connectorQ, commitmentQ, workQ, approvalQ, captureQ, deviceQ] = await Promise.all([
    all(db, "SELECT source_id,status,message,last_success_at,checked_at FROM source_health"),
    all(db, "SELECT connector_key,title,maturity,status FROM connector_registry"),
    all(db, "SELECT commitment_type,title,counterparty,amount,currency,due_at,expected_at,status,priority,truth_state,next_action,approval_required,time_bucket FROM commitment_timeline WHERE status NOT IN ('completed','cancelled','verified') ORDER BY CASE time_bucket WHEN 'overdue' THEN 0 WHEN 'approaching' THEN 1 ELSE 2 END, COALESCE(due_at,expected_at) LIMIT 80"),
    all(db, "SELECT title,due_at,status,approval_required FROM work_items WHERE status NOT IN ('completed','cancelled','verified','done') ORDER BY CASE WHEN due_at IS NULL THEN 1 ELSE 0 END,due_at LIMIT 30"),
    all(db, "SELECT id,item_type,status,created_at FROM approval_queue WHERE status IN ('needs_review','pending','awaiting_approval') ORDER BY created_at LIMIT 20"),
    all(db, "SELECT id,media_type,status,created_at FROM telegram_captures WHERE status IN ('pending_review','captured') ORDER BY created_at DESC LIMIT 20"),
    all(db, "SELECT device_name,status,last_seen_at FROM aperion_devices ORDER BY last_seen_at DESC LIMIT 10")
  ]);

  const connectors = new Map(connectorQ.rows.map((row) => [row.connector_key, row]));
  const health = new Map(healthQ.rows.map((row) => [row.source_id, row]));
  const commitments = commitmentQ.rows;
  const openWork = workQ.rows;
  const approvals = approvalQ.rows;
  const captures = captureQ.rows;
  const priorities = [];
  for (const row of commitments.filter((x) => x.time_bucket === "overdue" || String(x.priority).toLowerCase() === "high")) {
    priorities.push({ text: `${row.title}${row.next_action ? ` — ${row.next_action}` : ""}`, tag: label(row) });
    if (priorities.length === 3) break;
  }
  for (const row of openWork) {
    if (priorities.length === 3) break;
    priorities.push({ text: row.title, tag: Number(row.approval_required) ? "ONAY_GEREKLI" : "OTOMATIK" });
  }
  if (priorities.length < 3 && approvals.length) priorities.push({ text: `${approvals.length} bekleyen onay incelenecek`, tag: "ONAY_GEREKLI" });

  const stamp = istanbulParts(now);
  const lines = [
    `Günaydın AperiON — ${stamp.date} ${stamp.time}`,
    "Salt okunur sabah brifingi · mali kayıt oluşturulmadı",
    "\n1) KAYNAK SAĞLIĞI",
    ...["gmail", "google_drive", "google_calendar", "bizimhesap", "bank_statements"].map((key) => sourceLine(key, connectors, health)),
    "\n2) BUGÜNÜN EN FAZLA 3 ÖNCELİĞİ",
    ...(priorities.length ? priorities.slice(0, 3).map((p, i) => `${i + 1}. ${p.tag} — ${short(p.text, 130)}`) : ["• BILGI_GEREKLI — doğrulanmış öncelik kaydı yok"]),
    ...section("\n3) ALINAN SİPARİŞLER", commitmentQ.ok, categoryRows(commitments, ["received_order", "sales_order", "customer_order", "alinan_siparis"]), "doğrulanmış açık kayıt yok"),
    ...section("\n4) VERİLEN SİPARİŞLER", commitmentQ.ok, categoryRows(commitments, ["purchase_order", "supplier_order", "placed_order", "verilen_siparis"]), "doğrulanmış açık kayıt yok"),
    ...section("\n5) TAHSİLATLAR", commitmentQ.ok, categoryRows(commitments, ["receivable", "collection", "tahsilat"]), "doğrulanmış açık kayıt yok"),
    ...section("\n6) ÖDEMELER", commitmentQ.ok, categoryRows(commitments, ["payable", "payment", "odeme"]), "doğrulanmış açık kayıt yok"),
    "\n7) YAPILACAKLAR / TAKVİM",
    ...(workQ.ok ? (openWork.length ? openWork.slice(0, 5).map((row) => `• ${Number(row.approval_required) ? "ONAY_GEREKLI" : "OTOMATIK"} — ${short(row.title)}${row.due_at ? ` · ${short(row.due_at, 16)}` : ""}`) : ["• BILGI_GEREKLI — doğrulanmış açık görev yok"]) : ["• BILGI_GEREKLI — KAYNAK OKUNAMADI"]),
    "\n8) ONAYLAR VE BELGELER",
    `• ${approvalQ.ok ? (approvals.length ? "ONAY_GEREKLI" : "BILGI_GEREKLI") : "BILGI_GEREKLI"} — ${approvalQ.ok ? `${approvals.length} bekleyen onay` : "onay kuyruğu okunamadı"}`,
    `• ${captureQ.ok ? (captures.length ? "BILGI_GEREKLI" : "OTOMATIK") : "BILGI_GEREKLI"} — ${captureQ.ok ? `${captures.length} incelenecek Telegram belge/fotoğrafı` : "belge kuyruğu okunamadı"}`,
    "\n9) OTOMASYON DURUMU",
    `• ${deviceQ.ok && deviceQ.rows.some((d) => String(d.status).toLowerCase() === "online") ? "OTOMATIK — masaüstü köprüsü çevrimiçi" : "BILGI_GEREKLI — masaüstü köprüsü doğrulanamadı"}`,
    "\n10) APERİON ÖNERİSİ",
    priorities.length ? `• Önce: ${short(priorities[0].text, 150)}` : "• Kaynakları doğrula; eksik veriden karar üretme."
  ];
  return { text: lines.join("\n").slice(0, 3900), dateKey: stamp.date, counts: { priorities: priorities.length, approvals: approvals.length, captures: captures.length } };
}

async function ensureSchema(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS morning_brief_runs (run_key TEXT PRIMARY KEY,scheduled_at TEXT NOT NULL,cron TEXT,status TEXT NOT NULL,telegram_message_id TEXT,summary TEXT,created_at TEXT NOT NULL DEFAULT (datetime('now')),updated_at TEXT NOT NULL DEFAULT (datetime('now')),sent_at TEXT)").run();
}

export async function sendTelegram(token, chatId, text) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true })
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new Error(`Telegram gönderimi başarısız: ${payload.description || response.status}`);
  return payload.result;
}

export async function runMorningBrief(env, options = {}) {
  if (!env.APERION_DB) throw new Error("APERION_DB bağlı değil");
  const telegramToken = env.HERMES_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
  if (!telegramToken) throw new Error("Hermes Telegram anahtarı yapılandırılmadı");
  await ensureSchema(env.APERION_DB);
  const chat = await first(env.APERION_DB, "SELECT config_value FROM telegram_security_config WHERE config_key='allowed_chat_id'");
  if (!chat.ok || !chat.row || !chat.row.config_value) throw new Error("allowed_chat_id yapılandırılmadı");
  const now = options.now || new Date(options.scheduledAt || Date.now());
  const brief = await buildMorningBrief(env.APERION_DB, now);
  const financial = await buildDailyFinancialStatements(env, env.APERION_DB, now);
  const headerEnd = brief.text.indexOf("\n\n1) KAYNAK SAĞLIĞI");
  const combinedText = headerEnd > 0
    ? `${brief.text.slice(0, headerEnd)}${financial}\n${brief.text.slice(headerEnd)}`.slice(0, 3900)
    : `${brief.text}${financial}`.slice(0, 3900);
  const runKey = `morning:${brief.dateKey}`;
  const existing = await first(env.APERION_DB, "SELECT status FROM morning_brief_runs WHERE run_key=?", runKey);
  if (existing.ok && existing.row && existing.row.status === "sent") return { ok: true, skipped: true, runKey };
  await env.APERION_DB.prepare("INSERT INTO morning_brief_runs(run_key,scheduled_at,cron,status,summary,updated_at) VALUES(?,?,?,?,?,datetime('now')) ON CONFLICT(run_key) DO UPDATE SET scheduled_at=excluded.scheduled_at,cron=excluded.cron,status='sending',summary=excluded.summary,updated_at=datetime('now')")
    .bind(runKey, now.toISOString(), options.cron || CRON, "sending", JSON.stringify(brief.counts)).run();
  try {
    const sent = await sendTelegram(telegramToken, chat.row.config_value, combinedText);
    await env.APERION_DB.prepare("UPDATE morning_brief_runs SET status='sent',telegram_message_id=?,sent_at=datetime('now'),updated_at=datetime('now') WHERE run_key=?").bind(String(sent.message_id), runKey).run();
    return { ok: true, skipped: false, runKey, messageId: sent.message_id };
  } catch (error) {
    await env.APERION_DB.prepare("UPDATE morning_brief_runs SET status='failed',summary=?,updated_at=datetime('now') WHERE run_key=?").bind(short(error && error.message || error, 300), runKey).run();
    throw error;
  }
}

export default {
  async scheduled(controller, env, ctx) {
    const dispatchUrl = controller.cron === "5 6 * * *" ? env.E2E_DISPATCH_URL : env.BRIEF_DISPATCH_URL;
    if (dispatchUrl && env.MORNING_BRIEF_DISPATCH_SECRET) {
      ctx.waitUntil(fetch(dispatchUrl, {
        method: "POST",
        headers: {
          "authorization": `Bearer ${env.MORNING_BRIEF_DISPATCH_SECRET}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ scheduledAt: controller.scheduledTime, cron: controller.cron })
      }).then(async (response) => {
        if (!response.ok) throw new Error(`Planlı dağıtım başarısız: ${response.status} ${await response.text()}`);
      }));
      return;
    }
    ctx.waitUntil(runMorningBrief(env, { scheduledAt: controller.scheduledTime, cron: controller.cron }));
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/health") return new Response("Not found", { status: 404 });
    const chat = env.APERION_DB ? await first(env.APERION_DB, "SELECT 1 AS ok FROM telegram_security_config WHERE config_key='allowed_chat_id'") : { ok: false };
    return Response.json({ ok: true, service: "aperion-morning-brief", version: VERSION, cronUtc: CRON, timezone: "Europe/Istanbul", localTime: "09:00", dispatchConfigured: Boolean(env.BRIEF_DISPATCH_URL && env.MORNING_BRIEF_DISPATCH_SECRET), databaseConfigured: Boolean(env.APERION_DB), telegramTokenConfigured: Boolean(env.HERMES_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN), chatConfigured: Boolean(chat.ok && chat.row) });
  }
};
