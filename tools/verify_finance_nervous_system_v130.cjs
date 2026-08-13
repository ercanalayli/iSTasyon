const fs = require('fs');
const sql = fs.readFileSync('migrations/0002_finance_nervous_system.sql', 'utf8');
const doc = fs.readFileSync('docs/APERION_FINANCE_NERVOUS_SYSTEM.md', 'utf8');
const os = fs.readFileSync('docs/APERION_LIFE_AND_COMPANY_OS.md', 'utf8');
function ok(name, value) { if (!value) throw new Error('FAIL ' + name); console.log('OK  ' + name); }
['evidence_inbox','parties','proposed_finance_entries','reconciliation_results','execution_jobs','sync_cursors'].forEach(t => ok(t, sql.includes('CREATE TABLE IF NOT EXISTS ' + t)));
ok('one economic event guard', sql.includes('economic_event_key TEXT NOT NULL UNIQUE'));
ok('one execution per proposal', sql.includes('proposal_id INTEGER NOT NULL UNIQUE'));
ok('approval foreign key', sql.includes('FOREIGN KEY(approval_id) REFERENCES approval_queue(id)'));
ok('GPT-CODEX audit tag', doc.includes('[GPT-CODEX KAYDI]'));
ok('action-time approval', doc.includes('action-time user approval'));
ok('explicit stale data rule', doc.includes('never represented as zero'));
ok('finance is a specialist module', doc.includes('one specialist module'));
ok('life and company scope', os.includes('Personal life') && os.includes('Company'));
ok('graduated permissions', os.includes('Observe:') && os.includes('Verify:'));
console.log('Finance nervous system verification passed.');
