const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const schema=fs.readFileSync(path.join(root,'migrations','0001_aperion_control_plane.sql'),'utf8');
const webhook=fs.readFileSync(path.join(root,'functions','telegram','webhook.js'),'utf8');
const preflight=fs.readFileSync(path.join(root,'functions','api','telegram-preflight.js'),'utf8');
const checks=[
 ['quick_notes table',/CREATE TABLE IF NOT EXISTS quick_notes/.test(schema)],
 ['source health table',/CREATE TABLE IF NOT EXISTS source_health/.test(schema)],
 ['approval queue table',/CREATE TABLE IF NOT EXISTS approval_queue/.test(schema)],
 ['action log table',/CREATE TABLE IF NOT EXISTS action_log/.test(schema)],
 ['decision log table',/CREATE TABLE IF NOT EXISTS decision_log/.test(schema)],
 ['entity aliases table',/CREATE TABLE IF NOT EXISTS entity_aliases/.test(schema)],
 ['bank balances table',/CREATE TABLE IF NOT EXISTS last_bank_balances/.test(schema)],
 ['idempotency keys',/idempotency_key TEXT NOT NULL UNIQUE/.test(schema)],
 ['webhook prefers D1',/if \(env\.APERION_DB\)/.test(webhook)&&/store:'cloudflare_d1'/.test(webhook)],
 ['telegram duplicate guard',/ON CONFLICT\(source,source_message_id\)/.test(webhook)],
 ['preflight checks D1',/async function checkD1/.test(preflight)&&/const d1 = await checkD1/.test(preflight)],
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'OK ':'ERR'} ${name}`);if(!ok)failed++;}
if(failed){console.error(`D1 control plane verification failed: ${failed}`);process.exit(1);}
console.log('D1 control plane verification passed.');
