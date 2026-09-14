import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createMemoryStore, ingestSource, serializeStore } from '../functions/shared/project-memory.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (m) => m.slice(1))), '..');
const checkOnly = process.argv.includes('--check');
const inputArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
const inputPath = path.resolve(ROOT, inputArg || 'data/chatgpt-project-sync-v158.json');
const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const checkedAt = new Date().toISOString();
const store = createMemoryStore();
const results = [];

for (const thread of input.threads) {
  if (!thread.readable) {
    results.push({ id: thread.id, status: 'not_readable', facts: 0, decisions: 0 });
    continue;
  }
  const contentHash = crypto.createHash('sha256').update(`${thread.id}|${thread.updated_at}|${thread.content_fingerprint}`).digest('hex');
  if (thread.previous_content_hash && thread.previous_content_hash === contentHash) {
    results.push({ id: thread.id, status: 'skipped_unchanged', content_hash: contentHash, facts: 0, decisions: 0 });
    continue;
  }
  const source = {
    sourceKey: `chatgpt:${thread.id}`,
    sourceType: 'chatgpt_conversation',
    projectRef: input.project.id,
    conversationRef: thread.id,
    sourceDate: new Date(thread.updated_at * 1000).toISOString(),
    adapterStatus: 'VISIBLE_AND_INGESTIBLE',
    ingestedAt: checkedAt,
    cursor: JSON.stringify({ updated_at: thread.updated_at, fingerprint: thread.content_fingerprint }),
    content: `${thread.id}|${thread.updated_at}|${thread.content_fingerprint}`,
  };
  const result = await ingestSource(store, source, { facts: thread.facts || [], decisions: thread.decisions || [] });
  results.push({ id: thread.id, status: 'ingested', content_hash: contentHash, ...result });
}

const snapshot = serializeStore(store);
const q = (value) => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const sql = ['PRAGMA foreign_keys = ON;'];
for (const s of snapshot.sources) {
  const thread = input.threads.find((item) => `chatgpt:${item.id}` === s.sourceKey);
  sql.push(`INSERT INTO memory_sources(source_key,source_type,project_ref,conversation_ref,source_date,content_hash,last_synced_at,adapter_status,metadata_json) VALUES(${q(s.sourceKey)},${q(s.sourceType)},${q(s.projectRef)},${q(s.conversationRef)},${q(s.sourceDate)},${q(s.contentHash)},${q(s.lastSyncedAt)},${q(s.adapterStatus)},${q(JSON.stringify({title:thread.title,updated_at:thread.updated_at,pages_read:thread.pages_read,turns_read:thread.turns_read,access_surface:input.discovery.surface}))}) ON CONFLICT(source_key) DO UPDATE SET source_date=excluded.source_date,content_hash=excluded.content_hash,last_synced_at=excluded.last_synced_at,adapter_status=excluded.adapter_status,metadata_json=excluded.metadata_json;`);
}
for (const f of snapshot.facts) {
  sql.push(`INSERT INTO memory_facts(fact_key,subject,predicate,object_value,scope,valid_from,valid_to,confidence,status,authority,first_seen,last_seen) VALUES(${q(f.key)},${q(f.subject)},${q(f.predicate)},${q(f.object)},${q(f.scope)},${q(f.validFrom)},${q(f.validTo)},${f.confidence},${q(f.status)},${q(f.authority)},${q(f.firstSeen)},${q(f.lastSeen)}) ON CONFLICT(fact_key) DO UPDATE SET last_seen=excluded.last_seen;`);
  for (const sourceKey of f.sourceKeys) sql.push(`INSERT OR IGNORE INTO memory_fact_sources(fact_id,source_id,observed_at) SELECT f.id,s.id,${q(f.lastSeen)} FROM memory_facts f,memory_sources s WHERE f.fact_key=${q(f.key)} AND s.source_key=${q(sourceKey)};`);
}
for (const d of snapshot.decisions) sql.push(`INSERT INTO memory_decisions(decision_key,decision,scope,effective_date,status,source_id,created_at,updated_at) SELECT ${q(d.key)},${q(d.decision)},${q(d.scope)},${q(d.effectiveDate)},${q(d.status)},s.id,datetime('now'),datetime('now') FROM memory_sources s WHERE s.source_key=${q(d.sourceKey)} ON CONFLICT(decision_key) DO UPDATE SET updated_at=datetime('now');`);
for (const s of snapshot.sync) sql.push(`INSERT INTO memory_sync_state(source_key,cursor,content_hash,checkpoint_json,status,last_synced_at,last_error) VALUES(${q(s.sourceKey)},${q(s.cursor)},${q(s.contentHash)},${q(JSON.stringify({project_id:input.project.id,incremental:true}))},${q(s.status)},datetime('now'),NULL) ON CONFLICT(source_key) DO UPDATE SET cursor=excluded.cursor,content_hash=excluded.content_hash,checkpoint_json=excluded.checkpoint_json,status=excluded.status,last_synced_at=excluded.last_synced_at,last_error=NULL;`);

const sqlPath = path.join(ROOT, '.wrangler', 'chatgpt-project-incremental-v158.sql');
if (!checkOnly) {
  fs.mkdirSync(path.dirname(sqlPath), { recursive: true });
  fs.writeFileSync(sqlPath, `${sql.join('\n')}\n`);
}
const proof = {
  checked_at: checkedAt,
  version: 'v158',
  project: input.project,
  discovery_surface: input.discovery.surface,
  discovered_threads: input.threads.length,
  readable_threads: input.threads.filter((thread) => thread.readable).length,
  ingested_threads: results.filter((result) => result.status === 'ingested').length,
  skipped_unchanged_threads: results.filter((result) => result.status === 'skipped_unchanged').length,
  pages_read: input.threads.reduce((sum, thread) => sum + (thread.pages_read || 0), 0),
  turns_read: input.threads.reduce((sum, thread) => sum + (thread.turns_read || 0), 0),
  rate_limit_retries: input.threads.reduce((sum, thread) => sum + (thread.rate_limit_retries || 0), 0),
  backoff_policy: 'exponential 1s,2s,4s,8s,16s; maximum five retries per page',
  dry_run: {
    facts: snapshot.facts.length,
    decisions: snapshot.decisions.length,
    provenance_links: snapshot.facts.reduce((sum, fact) => sum + fact.sourceKeys.length, 0),
    duplicates: snapshot.stats.duplicates,
    conflicts: snapshot.conflicts.length,
    secrets_rejected: snapshot.stats.secrets_rejected,
  },
  threads: results,
  exclusions: ['dated balances and transaction rows', 'credentials, tokens and secrets', 'assistant-only claims', 'temporary implementation status'],
  live_d1: null,
  automation: null,
  financial_writes: 0,
  bizimhesap_writes: 0,
  messages_sent: 0,
};
const proofPath = path.join(ROOT, 'state', 'chatgpt-project-incremental-sync-verification.json');
try {
  const previous = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
  if (previous.live_d1) proof.live_d1 = previous.live_d1;
  if (previous.automation) proof.automation = previous.automation;
} catch {}
if (!checkOnly) fs.writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify({ sqlPath, proofPath, proof }, null, 2));
