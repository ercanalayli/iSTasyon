import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createMemoryStore, ingestSource, memoryContext, containsSecret } from '../functions/shared/project-memory.js';

const results=[];
async function test(name,fn){await fn();results.push({name,status:'PASS'});}
const src=(key,content=key)=>({sourceKey:key,sourceType:'fixture',content,ingestedAt:'2026-09-14T10:00:00Z'});

await test('same fact two sources -> one fact and two provenance',async()=>{const s=createMemoryStore();const f={subject:'Furkan Batkı',predicate:'role',object:'ALAYLI çalışanı'};await ingestSource(s,src('a'),{facts:[f]});await ingestSource(s,src('b'),{facts:[f]});assert.equal(s.facts.size,1);assert.equal([...s.facts.values()][0].sourceKeys.size,2);});
await test('user correction supersedes old fact',async()=>{const s=createMemoryStore();await ingestSource(s,src('a'),{facts:[{subject:'X',predicate:'role',object:'old'}]});await ingestSource(s,src('b'),{facts:[{subject:'X',predicate:'role',object:'new',authority:'user_correction',validFrom:'2026-09-14'}]});assert.equal([...s.facts.values()].filter(f=>f.status==='superseded').length,1);assert.equal([...s.facts.values()].filter(f=>f.status==='active')[0].object,'new');});
await test('conflicting sources -> needs_review conflict',async()=>{const s=createMemoryStore();await ingestSource(s,src('a'),{facts:[{subject:'X',predicate:'role',object:'A'}]});await ingestSource(s,src('b'),{facts:[{subject:'X',predicate:'role',object:'B'}]});assert.equal(s.conflicts.size,1);assert.equal([...s.facts.values()].filter(f=>f.status==='needs_review').length,2);});
await test('dated decision change keeps history',async()=>{const s=createMemoryStore();await ingestSource(s,src('a'),{decisions:[{decision:'old',scope:'ops',effectiveDate:'2026-01-01'}]});const old=[...s.decisions.keys()][0];await ingestSource(s,src('b'),{decisions:[{decision:'new',scope:'ops',effectiveDate:'2026-09-14',supersedes:old}]});assert.equal(s.decisions.size,2);assert.equal(s.decisions.get(old).status,'superseded');});
await test('secret-like material is not persisted',async()=>{const s=createMemoryStore();assert.equal(containsSecret('password=do-not-store'),true);await ingestSource(s,src('a'),{facts:[{subject:'service',predicate:'password',object:'password=do-not-store'}]});assert.equal(s.facts.size,0);assert.equal(s.stats.secrets_rejected,1);});
await test('unchanged source hash creates no duplicate',async()=>{const s=createMemoryStore();const source=src('a','same');await ingestSource(s,source,{facts:[{subject:'X',predicate:'p',object:'v'}]});const r=await ingestSource(s,source,{facts:[{subject:'X',predicate:'p',object:'v'}]});assert.equal(r.unchanged,true);assert.equal(s.facts.size,1);});
await test('entity lookup returns provenance and active facts',async()=>{const s=createMemoryStore();await ingestSource(s,src('a'),{facts:[{subject:'Furkan Batkı',predicate:'role',object:'ALAYLI çalışanı'}]});const c=memoryContext(s,'Furkan Batkı');assert.equal(c.active_facts.length,1);assert.deepEqual(c.active_facts[0].sourceKeys,['a']);});
await test('ChatGPT unavailable degrades gracefully',async()=>{const s=createMemoryStore();await ingestSource(s,{...src('platform:chatgpt','blocked'),sourceType:'chatgpt_project',adapterStatus:'BLOCKED_PLATFORM_ACCESS'},{});assert.equal([...s.sources.values()][0].adapterStatus,'BLOCKED_PLATFORM_ACCESS');assert.equal(memoryContext(s,'').active_facts.length,0);});

const proofPath=new URL('../state/project-conversation-memory-verification.json',import.meta.url);
const schema=fs.readFileSync(new URL('../migrations/0022_project_conversation_memory.sql',import.meta.url),'utf8');
for(const table of ['memory_sources','memory_facts','memory_fact_sources','memory_decisions','memory_conflicts','memory_sync_state']) assert.match(schema,new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
const api=fs.readFileSync(new URL('../functions/api/project-memory.js',import.meta.url),'utf8');
for(const view of ['facts','decisions','conflicts','sources','sync','context']) assert.ok(api.includes(`'${view}'`)||api.includes(`${view}:`),`missing API view ${view}`);
const proof=JSON.parse(fs.readFileSync(proofPath,'utf8'));proof.fixture_results=results;fs.writeFileSync(proofPath,JSON.stringify(proof,null,2)+'\n');
console.log(`PASS ${results.length}/${results.length}`);
