const fs = require('fs');
const sql = fs.readFileSync('migrations/0003_universal_goal_engine.sql', 'utf8');
const api = fs.readFileSync('functions/api/os-overview.js', 'utf8');
function ok(name, value) { if (!value) throw new Error('FAIL ' + name); console.log('OK  ' + name); }
['life_domains','objectives','observations','hypotheses','plans','work_items','outcomes','memory_items'].forEach(t => ok(t, sql.includes('CREATE TABLE IF NOT EXISTS ' + t)));
ok('nested objectives', sql.includes('parent_objective_id'));
ok('truth states', sql.includes('truth_state TEXT NOT NULL'));
ok('thesis attack protocol', sql.includes('strongest_attack') && sql.includes('failure_conditions'));
ok('approval linked work', sql.includes('approval_required') && sql.includes('REFERENCES approval_queue'));
ok('idempotent actions', sql.includes('idempotency_key TEXT UNIQUE'));
ok('verification and learning', sql.includes('verified_at') && sql.includes('learning'));
ok('privacy classes', sql.includes('highly_private'));
ok('overview source health', api.includes('source_health') && api.includes('generated_at'));
console.log('Universal goal engine verification passed.');
