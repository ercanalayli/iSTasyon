const fs = require('node:fs');
const assert = require('node:assert/strict');

const migration = fs.readFileSync('migrations/0017_aperion_core_mandate.sql', 'utf8');
const bootstrap = fs.readFileSync('functions/api/session-bootstrap.js', 'utf8');

for (const role of ['üst akıl', 'ikinci beyin', 'hayat koçu', 'CEO', 'CFO', 'dijital çalışan']) {
  assert(migration.includes(role), `missing role: ${role}`);
}
assert(migration.includes('aperion.core_mandate'));
assert(migration.includes('aperion.core_roles'));
assert(migration.includes('aperion.core_mission'));
assert(bootstrap.includes("'core_mandate'"));
assert(bootstrap.includes("version: 'v143'"));

console.log('AperiON core mandate v143: OK');
