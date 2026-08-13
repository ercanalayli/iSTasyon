const fs=require('fs');const s=fs.readFileSync('migrations/0005_commitment_timeline_engine.sql','utf8');const a=fs.readFileSync('functions/api/timeline.js','utf8');
function ok(n,v){if(!v)throw new Error('FAIL '+n);console.log('OK  '+n)}
ok('commitments',s.includes('CREATE TABLE IF NOT EXISTS commitments'));
ok('orders and payables generic type',s.includes('commitment_type'));
ok('timeline buckets',['overdue','approaching','upcoming','later'].every(x=>s.includes("'"+x+"'")));
ok('money optional',s.includes('amount REAL'));
ok('evidence and next action',s.includes('evidence_ref')&&s.includes('next_action'));
ok('linked commitments',s.includes('commitment_relations'));
ok('morning brief',s.includes('morning_commitment_brief'));
ok('timeline API',a.includes('commitment_timeline')&&a.includes('morning_commitment_brief'));
console.log('Commitment timeline verification passed.');
