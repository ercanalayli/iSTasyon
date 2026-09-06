import { ensureFinancialDocumentSchema, financialEventReply, processFinancialCapture } from '../shared/financial-document.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

function token(env) { return env.HERMES_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN || ''; }

async function sendMessage(env, chatId, text) {
  const botToken = token(env);
  if (!botToken) return false;
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text })
  });
  return response.ok;
}

export async function onRequestGet() {
  return json({ ok: true, service: 'aperion-financial-document-processor', version: 'v152' });
}

export async function onRequestPost({ request, env }) {
  const expected = String(env.APERION_BRIDGE_SECRET || '');
  if (!expected || request.headers.get('authorization') !== `Bearer ${expected}`) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!env.APERION_DB) return json({ ok: false, error: 'database_unavailable' }, 503);
  await ensureFinancialDocumentSchema(env.APERION_DB);
  let body = {};
  try { body = await request.json(); } catch {}
  const capture = body.capture_id
    ? await env.APERION_DB.prepare('SELECT * FROM telegram_captures WHERE id=?').bind(body.capture_id).first()
    : await env.APERION_DB.prepare("SELECT * FROM telegram_captures WHERE extraction_status IS NULL OR extraction_status IN ('pending','failed') ORDER BY id DESC LIMIT 1").first();
  if (!capture) return json({ ok: true, processed: false, reason: 'no_pending_capture' });
  const result = await processFinancialCapture(env, capture);
  const reply = result.ok
    ? financialEventReply(result.event, result.saved, result.duplicate)
    : `⚠️ Belge okunamadı\nHata: ${result.error}\nBelge kuyrukta korundu; mali kayıt oluşturulmadı.`;
  const delivered = await sendMessage(env, capture.chat_id, reply);
  return json({ ok: result.ok, processed: true, capture_id: capture.id, status: result.saved?.status || 'failed', delivered, error: result.error || null }, result.ok ? 200 : 502);
}
