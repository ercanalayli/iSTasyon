import { authenticateDevice, claimNextDeviceCommand, completeDeviceCommand } from '../../telegram/device-bridge.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

async function authorized(request, env) {
  const device = await authenticateDevice(env, request);
  return device || null;
}

export async function onRequestGet({ request, env }) {
  const device = await authorized(request, env);
  if (!device) return json({ ok: false, error: 'unauthorized_device' }, 401);
  const command = await claimNextDeviceCommand(env, device);
  return json({ ok: true, command: command || null });
}

export async function onRequestPost({ request, env }) {
  const device = await authorized(request, env);
  if (!device) return json({ ok: false, error: 'unauthorized_device' }, 401);
  let body;
  try {
    body = await request.json();
  } catch (_error) {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  const result = await completeDeviceCommand(env, device, body);
  const telegramToken = env.HERMES_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN;
  if (result.ok && telegramToken) {
    const icon = body.ok ? '✅' : '⚠️';
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: result.command.chat_id,
        text: `${icon} Masaüstü komut sonucu\n${result.result_summary}`
      })
    }).catch(() => null);
  }
  return json(result, result.status || (result.ok ? 200 : 400));
}
