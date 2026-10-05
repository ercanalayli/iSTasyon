const SETUP_HASH = "2ae219a1021c5c4f386b778eaf1adf793aa5c9c865d3571e1acc5bfefc1fe61d";
const SETUP_EXPIRES = Date.parse("2026-10-06T20:00:00Z");
const COOKIE = "istasyon_owner";
const MAX_AGE = 60 * 60 * 24 * 90;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

function base64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlText(text) {
  return base64url(new TextEncoder().encode(text));
}

function decodeBase64url(value) {
  const pad = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const bin = atob(pad);
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

async function sha256Hex(value) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)));
  return [...new Uint8Array(hash)].map(x => x.toString(16).padStart(2, "0")).join("");
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))));
}

function parseCookies(request) {
  const out = {};
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k) out[k] = decodeURIComponent(rest.join("="));
  }
  return out;
}

async function makeSession(secret) {
  const payload = base64urlText(JSON.stringify({ sub: "owner", exp: Date.now() + MAX_AGE * 1000 }));
  const sig = await hmac(secret, payload);
  return payload + "." + sig;
}

async function validSession(request, secret) {
  const raw = parseCookies(request)[COOKIE] || "";
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return false;
  const expected = await hmac(secret, payload);
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return false;
  try {
    const data = JSON.parse(decodeBase64url(payload));
    return data?.sub === "owner" && Number(data?.exp || 0) > Date.now();
  } catch {
    return false;
  }
}

async function pg(env, table, params = {}) {
  const base = String(env.SUPABASE_URL || "").replace(/\/+$/, "");
  const key = String(env.SUPABASE_SERVICE_ROLE_KEY || "");
  if (!base || !key) throw new Error("supabase_secret_missing");
  const url = new URL(base + "/rest/v1/" + table);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    headers: { apikey: key, authorization: "Bearer " + key, accept: "application/json" },
    cf: { cacheTtl: 0, cacheEverything: false },
  });
  const text = await res.text();
  if (!res.ok) throw new Error("supabase_" + res.status + ":" + text.slice(0, 220));
  return text ? JSON.parse(text) : [];
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "health";
  const bridge = String(env.APERION_BRIDGE_SECRET || "");

  if (action === "health") {
    return json({ ok: true, service: "istasyon-live", version: "v1", html_host: "cloudflare-pages" });
  }

  if (action === "login") {
    const setup = String(url.searchParams.get("setup") || "");
    if (bridge.length < 32) return json({ ok: false, error: "session_secret_missing" }, 503);
    if (Date.now() > SETUP_EXPIRES) return json({ ok: false, error: "setup_expired" }, 403);
    if ((await sha256Hex(setup)) !== SETUP_HASH) return json({ ok: false, error: "setup_invalid" }, 403);
    const session = await makeSession(bridge);
    return new Response(null, {
      status: 302,
      headers: {
        location: "/istasyon.html",
        "set-cookie": COOKIE + "=" + encodeURIComponent(session) + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" + MAX_AGE,
        "cache-control": "no-store",
      },
    });
  }

  if (bridge.length < 32 || !(await validSession(request, bridge))) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  try {
    if (action === "cari") {
      const name = String(url.searchParams.get("name") || "").trim();
      if (!name) return json({ ok: false, error: "name_required" }, 400);
      const [masterRows, summaryRows, movements] = await Promise.all([
        pg(env, "istasyon_mukellefler", { select: "*", unvan: "eq." + name, limit: 1 }),
        pg(env, "istasyon_cari_ozet", { select: "*", mukellef: "eq." + name, limit: 1 }),
        pg(env, "istasyon_cari_hareketleri", { select: "*", mukellef: "eq." + name, order: "tarih.desc", limit: 160 }),
      ]);
      return json({ ok: true, master: masterRows[0] || null, summary: summaryRows[0] || null, movements });
    }

    const bankSelect = "banka_satir,tarih,tutar,aciklama,banka_cari,banka_durum,dekont_no,sinif,ledger_eslesme,onerilen_cari,kontrol_sonucu,notlar";
    const [summaryRows, mukellefler, cari, bankSummaryRows, bank, moka, promises, tasks, fees] = await Promise.all([
      pg(env, "istasyon_kokpit_ozet_v1", { select: "*", limit: 1 }),
      pg(env, "istasyon_mukellefler", { select: "unvan,tckn_vkn,tipi,vergi_dairesi,durum,notlar", order: "unvan.asc", limit: 250 }),
      pg(env, "istasyon_cari_ozet", { select: "*", order: "bakiye.desc", limit: 250 }),
      pg(env, "aperion_bank_summary_v1", { select: "*", limit: 1 }),
      pg(env, "aperion_bank_reconciliation", { select: bankSelect, order: "tarih.desc", limit: 240 }),
      pg(env, "aperion_bank_reconciliation", { select: bankSelect, sinif: "eq.MOKA", order: "tarih.desc", limit: 240 }),
      pg(env, "istasyon_odeme_sozleri", { select: "*", order: "source_row.desc", limit: 100 }),
      pg(env, "istasyon_gorevler", { select: "*", order: "source_row.desc", limit: 200 }),
      pg(env, "istasyon_muhasebe_ucretleri", { select: "*", order: "source_row.desc", limit: 300 }),
    ]);

    return json({
      ok: true,
      generated_at: new Date().toISOString(),
      summary: summaryRows[0] || null,
      mukellefler, cari,
      bank_summary: bankSummaryRows[0] || null,
      bank, moka, promises, tasks, fees,
    });
  } catch (error) {
    return json({ ok: false, error: "read_failed", detail: String(error?.message || error) }, 500);
  }
}
