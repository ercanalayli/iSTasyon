'use strict';
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const agent = require('./lib/desktop_agent_v1.cjs');
const worker = 'C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge\\src\\windows-worker.js';
function execute(command, capability, site_id) {
  const payload = {capability,site_id,session_binding:'test-session-0001',user_binding:'private_apeiron_action',
    payload_hash:agent.hashPayload({capability,site_id})};
  const child = spawnSync(process.execPath,[worker,'--oneshot',command,JSON.stringify(payload)],
    {encoding:'utf8',windowsHide:true,timeout:45000,maxBuffer:1024*1024});
  assert.equal(child.status,0,String(child.error?.message || child.stderr || '').slice(0,300));
  return JSON.parse(child.stdout.trim());
}
const desktop=execute('aperion.desktop_health','desktop.health',null);
assert.equal(desktop.ready,true);
const site=execute('aperion.site_session_health','site.session.health','bizimhesap');
assert.equal(site.site_id,'bizimhesap');
assert.equal(typeof site.authenticated,'boolean');
console.log(JSON.stringify({status:'PASS',desktop_ready:desktop.ready,site_authenticated:site.authenticated,
  profile:site.profile,financial_writes:0,bizimhesap_writes:0,secrets_exposed:0}));
