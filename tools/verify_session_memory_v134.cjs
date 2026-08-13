const fs=require('fs');const s=fs.readFileSync('migrations/0006_session_memory_engine.sql','utf8');const a=fs.readFileSync('functions/api/session-bootstrap.js','utf8');
function ok(n,v){if(!v)throw new Error('FAIL '+n);console.log('OK  '+n)}
ok('session checkpoints',s.includes('session_checkpoints'));
ok('startup briefs',s.includes('startup_briefs'));
ok('last checkpoint',a.includes('ORDER BY created_at DESC LIMIT 1'));
ok('objectives',a.includes('objectives'));
ok('commitments',a.includes('commitment_timeline'));
ok('approvals',a.includes('approval_queue'));
ok('health first data',a.includes('source_health'));
ok('connectors',a.includes('connector_registry'));
console.log('Session memory verification passed.');
