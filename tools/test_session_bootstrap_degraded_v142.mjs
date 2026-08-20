import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/session-bootstrap.js';

const secret = 's'.repeat(40);
const db = {
  prepare(sql) {
    return {
      async first() {
        if (sql.includes('working_state_snapshots ORDER BY')) {
          return { snapshot_key: 'latest', state_json: '{"step":"verify"}', evidence_refs_json: '[]' };
        }
        if (sql.includes('COUNT(*)')) return { checkpoints: 1, active_facts: 2, snapshots: 1 };
        if (sql.includes('session_checkpoints ORDER BY')) return { checkpoint_key: 'cp-1', completed_json: '[]', pending_json: '[]', blockers_json: '[]', evidence_refs_json: '[]' };
        return null;
      },
      async all() {
        if (sql.includes('FROM objectives')) throw new Error('no such table: objectives');
        if (sql.includes('FROM work_items')) return { results: [{ work_key: 'work-1', title: 'Test' }] };
        return { results: [] };
      },
    };
  },
};

const request = new Request('https://example.test/api/session-bootstrap', {
  headers: { authorization: `Bearer ${secret}` },
});
const response = await onRequestGet({ request, env: { APERION_DB: db, APERION_BRIDGE_SECRET: secret } });
const body = await response.json();

assert.equal(response.status, 200);
assert.equal(body.ok, true);
assert.equal(body.degraded, true);
assert.deepEqual(body.bootstrap_health.blocked_sources, ['objectives']);
assert.equal(body.bootstrap_health.sources.objectives.status, 'blocked');
assert.deepEqual(body.objectives, []);
assert.equal(body.work_items[0].work_key, 'work-1');
assert.equal(body.last_checkpoint.checkpoint_key, 'cp-1');
assert.equal(body.last_working_state.state.step, 'verify');

const healthResponse = await onRequestGet({
  request: new Request('https://example.test/api/session-bootstrap?health=1'),
  env: { APERION_DB: db },
});
const health = await healthResponse.json();
assert.equal(healthResponse.status, 200);
assert.equal(health.version, 'v142');
assert.equal(health.data_access, 'protected');

console.log('AperiON degraded session bootstrap v142 testi geçti.');
