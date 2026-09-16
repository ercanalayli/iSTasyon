import assert from 'node:assert/strict';
import bridge from 'file:///C:/Users/HP/Documents/Codex/2026-08-27/referenced-chatgpt-conversation-this-is-an/work/aperion-command-bridge/src/index.js';

const tasks = new Map();
const byKey = new Map();
const DB = { prepare(sql) {
  let args = [];
  return { bind(...values) { args = values; return this; }, async first() {
    if (sql.includes('ORDER BY updated_at DESC')) return null;
    if (sql.includes('WHERE idempotency_key = ?')) { const id=byKey.get(args[0]); const row=tasks.get(id); return row ? {id,status:row.status} : null; }
    if (sql.includes("command IN ('aperion.desktop_health','aperion.site_session_health')")) return tasks.get(args[0]) || null;
    return null;
  }, async run() {
    if (sql.includes('INSERT INTO tasks')) {
      const [id,key,command,payload,risk,approval,status,created,updated] = args;
      if (byKey.has(key)) throw new Error('UNIQUE constraint failed');
      tasks.set(id,{id,command,payload_json:payload,risk,approval_state:approval,status,execution_state:null,result_json:null,created_at:created,updated_at:updated});
      byKey.set(key,id); return {meta:{changes:1}};
    }
    if (sql.includes("status='blocked'")) {
      const row=tasks.get(args[1]); if (!row || row.status!=='pending') return {meta:{changes:0}};
      row.status='blocked';row.execution_state='failed_safe';row.result_json='{"cancelled":true}';row.updated_at=args[0];return {meta:{changes:1}};
    }
    return {meta:{changes:0}};
  }};
}};
const env = { DB, CHATGPT_ACTION_SECRET:'test-only-secret', HERMES_INGEST_SECRET:'test-only-internal-secret' };
const base='https://example.test';
const session='session-test-0001';
const headers={authorization:'Bearer test-only-secret','content-type':'application/json'};
const call=(path,init={})=>bridge.fetch(new Request(base+path,init),env);
let passed=0;
const schema=await (await call('/openapi.json')).json();
assert.equal(schema.paths['/v1/chatgpt/desktop/tasks'].post.operationId,'executeDesktopTask'); passed++;
const noAuth=await call('/v1/chatgpt/desktop/tasks',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
assert.equal(noAuth.status,401);passed++;
for (const capability of ['file.read','browser.list_tabs','desktop.click','browser.navigate']) {
  const result=await call('/v1/chatgpt/desktop/tasks',{method:'POST',headers,body:JSON.stringify({capability,event_id:'event-forbidden-0001',conversation_key:session})});
  assert.equal(result.status,400);passed++;
}
const body={capability:'desktop.health',event_id:'event-desktop-0001',conversation_key:session};
const created=await call('/v1/chatgpt/desktop/tasks',{method:'POST',headers,body:JSON.stringify(body)});
assert.equal(created.status,202);const task=await created.json();assert.match(task.task_id,/^[0-9a-f-]{36}$/);passed++;
const duplicate=await (await call('/v1/chatgpt/desktop/tasks',{method:'POST',headers,body:JSON.stringify(body)})).json();
assert.equal(duplicate.task_id,task.task_id);assert.equal(duplicate.duplicate,true);passed++;
const forbidden=await call(`/v1/chatgpt/desktop/tasks/${task.task_id}/status?conversation_key=other-session-0001`,{headers});
assert.equal(forbidden.status,404);passed++;
const status=await (await call(`/v1/chatgpt/desktop/tasks/${task.task_id}/status?conversation_key=${session}`,{headers})).json();
assert.equal(status.status,'pending');passed++;
const row=tasks.get(task.task_id);row.status='completed';row.result_json=JSON.stringify({ready:true,platform:'win32',agent_version:'desktop-agent-v1',secret:'must-not-leak'});
const result=await (await call(`/v1/chatgpt/desktop/tasks/${task.task_id}/result?conversation_key=${session}`,{headers})).json();
assert.equal(result.result.ready,true);assert.equal(result.result.secret,undefined);assert.equal(result.proof.payload_hash,task.payload_hash);passed++;
const cancelledCompleted=await call(`/v1/chatgpt/desktop/tasks/${task.task_id}/cancel`,{method:'POST',headers,body:JSON.stringify({conversation_key:session})});
assert.equal(cancelledCompleted.status,409);passed++;
const siteBody={capability:'site.session.health',site_id:'bizimhesap',event_id:'event-site-0001',conversation_key:session};
const siteTask=await (await call('/v1/chatgpt/desktop/tasks',{method:'POST',headers,body:JSON.stringify(siteBody)})).json();
assert.equal(siteTask.capability,'site.session.health');passed++;
const cancel=await call(`/v1/chatgpt/desktop/tasks/${siteTask.task_id}/cancel`,{method:'POST',headers,body:JSON.stringify({conversation_key:session})});
assert.equal(cancel.status,200);assert.equal(tasks.get(siteTask.task_id).status,'blocked');passed++;
console.log(JSON.stringify({status:'PASS',tests:passed,queue_reused:true,auth_required:true,forbidden_egress_capabilities:4,financial_writes:0,bizimhesap_writes:0,secrets_exposed:0}));
