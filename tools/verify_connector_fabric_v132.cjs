const fs = require('fs');
const sql = fs.readFileSync('migrations/0004_universal_connector_fabric.sql','utf8');
const api = fs.readFileSync('functions/api/connectors.js','utf8');
function ok(n,v){if(!v)throw new Error('FAIL '+n);console.log('OK  '+n)}
['connector_registry','connector_capabilities','connector_sync_jobs','canonical_events'].forEach(t=>ok(t,sql.includes('CREATE TABLE IF NOT EXISTS '+t)));
['apsiyon','hattat','bizimhesap','whatsapp','telegram','gmail','google_calendar'].forEach(k=>ok('seed '+k,sql.includes("('"+k+"'")));
ok('Apsiyon aidat capability',sql.includes('read_home_dues'));
ok('Hattat accounting capability',sql.includes('read_tax_and_accounting_status'));
ok('action-time write control',sql.includes("'write','action_time'"));
ok('provider-neutral event model',sql.includes('canonical_events')&&sql.includes('event_type'));
ok('connector health endpoint',api.includes('source_health')&&api.includes('connector_capabilities'));
console.log('Universal connector fabric verification passed.');
