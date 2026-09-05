import { runMorningBrief } from "../../workers/aperion-morning-brief/src/index.js";

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export async function onRequestGet({ env }) {
  return json({
    ok: true,
    service: "aperion-morning-brief-dispatch",
    version: "v144",
    schedule: "09:00 Europe/Istanbul",
    dispatchSecretConfigured: Boolean(env.MORNING_BRIEF_DISPATCH_SECRET),
    databaseConfigured: Boolean(env.APERION_DB),
    telegramTokenConfigured: Boolean(env.HERMES_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN)
  });
}

export async function onRequestPost({ request, env }) {
  const expected = env.MORNING_BRIEF_DISPATCH_SECRET;
  const supplied = request.headers.get("authorization");
  if (!expected || supplied !== `Bearer ${expected}`) return json({ ok: false, error: "unauthorized" }, 401);
  try {
    const body = await request.json().catch(() => ({}));
    const result = await runMorningBrief(env, {
      scheduledAt: Number(body.scheduledAt) || Date.now(),
      cron: String(body.cron || "0 6 * * *")
    });
    return json(result);
  } catch (error) {
    return json({ ok: false, error: String(error && error.message || error).slice(0, 300) }, 500);
  }
}
