import { deviceHealth } from '../../telegram/device-bridge.js';

export async function onRequestGet({ env }) {
  const health = await deviceHealth(env);
  return new Response(JSON.stringify({ ok: true, service: 'aperion-device-bridge', ...health }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
