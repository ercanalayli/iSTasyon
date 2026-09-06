const fs = require('node:fs');
const assert = require('node:assert/strict');

const migration = fs.readFileSync('migrations/0018_chatgpt_memory_bridge.sql', 'utf8');
const bootstrap = fs.readFileSync('functions/api/session-bootstrap.js', 'utf8');

for (const table of ['external_conversation_sources', 'memory_import_runs', 'memory_candidates']) {
  assert(migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `missing table: ${table}`);
}
for (const memory of [
  'identity.profession.accountant',
  'aperion.interface.telegram_primary',
  'aperion.reliability.no_false_success',
  'finance.safety.uncertain_to_review',
  'company.diaper.end_to_end_flow',
  'family.ege.relationship',
]) {
  assert(migration.includes(memory), `missing memory: ${memory}`);
}
for (const forbidden of ['297352', 'password=', 'api_key=', 'bot_token=']) {
  assert(!migration.toLowerCase().includes(forbidden), `secret-like value leaked: ${forbidden}`);
}
assert(bootstrap.includes("'durable_memory'"));
assert(bootstrap.includes("'memory_sources'"));
assert(bootstrap.includes("'memory_import'"));
assert(bootstrap.includes("version: 'v153'"));

console.log('AperiON ChatGPT memory bridge v153: OK');
