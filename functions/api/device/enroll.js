import { enrollDevice } from '../../telegram/device-bridge.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch (_error) {
    return json({ ok: false, error: 'invalid_json' }, 400);
  }
  const result = await enrollDevice(env, body);
  return json(result, result.status || (result.ok ? 200 : 400));
}

export function onRequestGet() {
  return json({ ok: false, error: 'method_not_allowed' }, 405);
}
