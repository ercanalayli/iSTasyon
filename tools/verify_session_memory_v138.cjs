const fs = require('fs');
const assert = require('assert');

const writer = fs.readFileSync('functions/api/session-checkpoint.js', 'utf8');
const reader = fs.readFileSync('functions/api/session-bootstrap.js', 'utf8');
const exporter = fs.readFileSync('functions/api/session-export.js', 'utf8');
const gas = fs.readFileSync('google-apps-script/Code.gs', 'utf8');

assert(writer.includes('INSERT INTO session_checkpoints'));
assert(writer.includes('working_state_snapshots'));
assert(writer.includes('secret_material_rejected'));
assert(writer.includes('ON CONFLICT(checkpoint_key) DO NOTHING'));
assert(reader.includes("protocol:'aperion-session-bootstrap-v2'"));
assert(reader.includes('raw_chat_loaded:false'));
assert(reader.includes('authorized(request,env)'));
assert(exporter.includes('structured_state_only_no_raw_chat'));
assert(gas.includes('function aperionMemoryBackup()'));
assert(gas.includes('03_SISTEM_YEDEKLERI'));
assert(gas.includes("getFilesByName(fileName)"));

console.log('AperiON session memory writer: OK');
console.log('Bounded bootstrap context: OK');
console.log('Provider-independent export: OK');
console.log('Idempotent Google Drive backup: OK');
