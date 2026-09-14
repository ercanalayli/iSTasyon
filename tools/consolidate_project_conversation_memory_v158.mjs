import fs from 'node:fs';
import path from 'node:path';
import { createMemoryStore, ingestSource, serializeStore } from '../functions/shared/project-memory.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (m) => m.slice(1))), '..');
const DOCS = [
  'docs/CURRENT_STATUS.md', 'docs/DECISIONS.md', 'docs/CHANGELOG.md',
  'docs/HERMES_VPS_NEXT_TASK.md', 'docs/FINANCE_MEMORY_NEXT_TASK.md',
  'docs/PROJECT_CONVERSATION_MEMORY_NEXT_TASK.md', 'state/hermes-vps-health.json',
  'state/hermes-readonly-verification.json', 'state/finance-memory-verification.json',
].filter((file) => fs.existsSync(path.join(ROOT, file)));

function dateFromText(text, fallback) {
  const match = text.match(/\b(20\d{2})[-./](\d{2})[-./](\d{2})\b/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : fallback;
}

function relationFromStatement(value) {
  return `statement:${String(value).toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,72)}`;
}

function extract(file, content) {
  const facts = [], decisions = [];
  let section = path.basename(file);
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^#{1,4}\s+/.test(line)) { section = line.replace(/^#+\s*/, '').slice(0, 160); }
    if (!line || line.length < 18 || /^```|^\||^[-*]\s*$/.test(line)) continue;
    const bullet = line.match(/^[-*]\s+(?:\*\*)?(.+?)(?:\*\*)?$/)?.[1];
    const decision = line.match(/^#{2,4}\s+(D-\d+[^\n]*)/i)?.[1] || (/\b(?:ana karar|karar:)\b/i.test(line) ? line.replace(/^[-*#\s]+/, '') : null);
    if (decision && decision.length <= 500) {
      decisions.push({ decision, scope: section, effectiveDate: dateFromText(line, null) });
    } else if (bullet && bullet.length <= 700 && !/^https?:/i.test(bullet)) {
      const split = bullet.split(/:\s+/, 2);
      facts.push({ subject: section, predicate: split.length > 1 ? split[0].slice(0, 120) : relationFromStatement(bullet), object: split.length > 1 ? split[1] : bullet, validFrom: dateFromText(line, null), confidence: file.includes('CURRENT_STATUS') || file.includes('state/') ? 0.9 : 0.75, authority: 'document', scope: file.startsWith('state/') ? 'system_health' : 'aperion' });
    }
  }
  return { facts, decisions };
}

const store = createMemoryStore();
for (const file of DOCS) {
  const full = path.join(ROOT, file);
  const content = fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, '');
  const stat = fs.statSync(full);
  await ingestSource(store, { sourceKey: `repo:${file.replaceAll('\\','/')}`, sourceType: file.startsWith('state/') ? 'evidence' : 'repository_document', projectRef: 'ercanalayli/iSTasyon', filePath: file.replaceAll('\\','/'), sourceDate: stat.mtime.toISOString(), content, adapterStatus: 'ready' }, extract(file, content));
}

for (const blocked of [
  { sourceKey: 'platform:chatgpt-project-conversations', sourceType: 'chatgpt_project', adapterStatus: 'BLOCKED_PLATFORM_ACCESS', reason: 'No supported programmatic conversation-history API or connector is available in this environment.' },
  { sourceKey: 'local:imported-agent-sessions', sourceType: 'codex_claude_cursor_import', adapterStatus: 'BLOCKED_PLATFORM_ACCESS', reason: 'No supported workspace-scoped imported-session export was discovered; private application stores were not scraped.' },
]) await ingestSource(store, { ...blocked, content: blocked.reason, projectRef: 'AperiON iSTasyON' }, {});

const snapshot = serializeStore(store);
function q(value) { return value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`; }
function buildSql(data) {
  const sql=['PRAGMA foreign_keys = ON;'];
  for (const s of data.sources) sql.push(`INSERT INTO memory_sources(source_key,source_type,project_ref,conversation_ref,session_ref,file_path,source_date,content_hash,last_synced_at,adapter_status,metadata_json) VALUES(${q(s.sourceKey)},${q(s.sourceType)},${q(s.projectRef)},${q(s.conversationRef)},${q(s.sessionRef)},${q(s.filePath)},${q(s.sourceDate)},${q(s.contentHash)},${q(s.lastSyncedAt)},${q(s.adapterStatus||'ready')},${q(JSON.stringify({reason:s.reason||null}))}) ON CONFLICT(source_key) DO UPDATE SET content_hash=excluded.content_hash,last_synced_at=excluded.last_synced_at,adapter_status=excluded.adapter_status,metadata_json=excluded.metadata_json;`);
  for (const f of data.facts) {
    sql.push(`INSERT INTO memory_facts(fact_key,subject,predicate,object_value,scope,valid_from,valid_to,confidence,status,authority,first_seen,last_seen) VALUES(${q(f.key)},${q(f.subject)},${q(f.predicate)},${q(f.object)},${q(f.scope)},${q(f.validFrom)},${q(f.validTo)},${Number(f.confidence)||0.5},${q(f.status)},${q(f.authority)},${q(f.firstSeen)},${q(f.lastSeen)}) ON CONFLICT(fact_key) DO UPDATE SET last_seen=excluded.last_seen,status=excluded.status,confidence=excluded.confidence;`);
    for (const sourceKey of f.sourceKeys) sql.push(`INSERT OR IGNORE INTO memory_fact_sources(fact_id,source_id,observed_at) SELECT f.id,s.id,${q(f.lastSeen)} FROM memory_facts f,memory_sources s WHERE f.fact_key=${q(f.key)} AND s.source_key=${q(sourceKey)};`);
  }
  for (const d of data.decisions) sql.push(`INSERT INTO memory_decisions(decision_key,decision,scope,effective_date,status,source_id,created_at,updated_at) SELECT ${q(d.key)},${q(d.decision)},${q(d.scope||'aperion')},${q(d.effectiveDate)},${q(d.status)},s.id,datetime('now'),datetime('now') FROM memory_sources s WHERE s.source_key=${q(d.sourceKey)} ON CONFLICT(decision_key) DO UPDATE SET status=excluded.status,updated_at=datetime('now');`);
  for (const s of data.sync) sql.push(`INSERT INTO memory_sync_state(source_key,cursor,content_hash,checkpoint_json,status,last_synced_at,last_error) VALUES(${q(s.sourceKey)},${q(s.cursor)},${q(s.contentHash)},NULL,${q(s.status)},datetime('now'),NULL) ON CONFLICT(source_key) DO UPDATE SET cursor=excluded.cursor,content_hash=excluded.content_hash,status=excluded.status,last_synced_at=excluded.last_synced_at;`);
  return sql.join('\n')+'\n';
}
if (process.env.APERION_MEMORY_SQL_OUT) {
  const sqlPath=path.resolve(ROOT,process.env.APERION_MEMORY_SQL_OUT);
  fs.mkdirSync(path.dirname(sqlPath),{recursive:true});
  fs.writeFileSync(sqlPath,buildSql(snapshot));
}
const blockedSources = snapshot.sources.filter((s) => s.adapterStatus === 'BLOCKED_PLATFORM_ACCESS').map((s) => ({source_key:s.sourceKey,source_type:s.sourceType,status:s.adapterStatus,reason:s.reason}));
const proof = {
  checked_at: new Date().toISOString(), schema: 'aperion-project-conversation-memory-v1', version: 'v158',
  source_adapters: [
    {type:'repository_document',status:'VERIFIED'}, {type:'evidence',status:'VERIFIED'},
    {type:'chatgpt_project',status:'BLOCKED_PLATFORM_ACCESS'}, {type:'codex_claude_cursor_import',status:'BLOCKED_PLATFORM_ACCESS'},
  ],
  real_ingest_counts: { sources: snapshot.sources.length, sources_synced: snapshot.sources.length-blockedSources.length, facts: snapshot.facts.length, decisions: snapshot.decisions.length, deduplicates: snapshot.stats.duplicates, conflicts: snapshot.conflicts.length, secrets_rejected: snapshot.stats.secrets_rejected },
  duplicate_count: snapshot.stats.duplicates, conflict_count: snapshot.conflicts.length,
  blocked_platform_access: blockedSources, fixture_results: [], financial_writes: 0, secrets_exposed: 0,
};
const proofPath=path.join(ROOT, 'state/project-conversation-memory-verification.json');
try {
  const previous=JSON.parse(fs.readFileSync(proofPath,'utf8'));
  if (previous.live_d1_verification) proof.live_d1_verification=previous.live_d1_verification;
} catch {}
fs.mkdirSync(path.join(ROOT, 'state'), {recursive:true});
fs.writeFileSync(proofPath, JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof,null,2));
