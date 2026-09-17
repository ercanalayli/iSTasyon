import { onRequestGet, onRequestPost } from '../../../functions/api/project-memory.js';
import { authorized } from '../../../functions/api/session-checkpoint.js';
import { recallMemory, recordRecallAcceptance } from '../../../functions/shared/memory-recall.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') {
      return Response.json({ ok: true, service: 'aperion-memory-ingest', dataAccess: 'protected' }, {
        headers: { 'cache-control': 'no-store' },
      });
    }
    if (url.pathname === '/v1/recall') {
      if (!await authorized(request, env)) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
      try {
        if (request.method === 'GET') return Response.json(await recallMemory(env.APERION_DB, url.searchParams.get('q')));
        if (request.method === 'POST') return Response.json({ ok: true, ...await recordRecallAcceptance(env.APERION_DB, await request.json()) });
        return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, POST' } });
      } catch (error) {
        return Response.json({ ok: false, error: String(error.message || error).slice(0, 100) }, { status: 400 });
      }
    }
    if (url.pathname !== '/v1/memory') return new Response('Not found', { status: 404 });
    if (request.method === 'GET') return onRequestGet({ request, env });
    if (request.method === 'POST') return onRequestPost({ request, env });
    return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, POST' } });
  },
};
