import fs from 'node:fs';
import path from 'node:path';
import { createMemoryStore, ingestSource, serializeStore } from '../functions/shared/project-memory.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (m) => m.slice(1))), '..');
const SOURCE_KEY = 'chatgpt:6aa0f5c7-b6cc-83ed-b530-273afa4d4d54';
const checkedAt = new Date().toISOString();
const source = {
  sourceKey: SOURCE_KEY,
  sourceType: 'chatgpt_conversation',
  projectRef: 'g-p-6a3e6e2831bc8191b565d78f5dd74751',
  conversationRef: '6aa0f5c7-b6cc-83ed-b530-273afa4d4d54',
  sourceDate: '2026-09-09T10:26:22.987Z',
  adapterStatus: 'VISIBLE_AND_INGESTIBLE',
  ingestedAt: checkedAt,
  content: JSON.stringify({
    title: 'Sözleşmeye Erişim 090926 mail güzel',
    access: 'Codex supported list_threads/read_thread API',
    selection: 'durable operational facts and decisions only',
  }),
};

const payload = {
  facts: [
    { subject: 'AperiON 7/24 operasyon hedefi', predicate: 'çalışma modeli', object: 'Telefon üzerinden verilen komutlar AperiON tarafından Hermes VPS üzerinde, yerel bilgisayar kapalıyken de yürütülür.', scope: 'aperion_hermes', validFrom: '2026-09-09', confidence: 1, authority: 'user_correction' },
    { subject: 'AperiON 7/24 operasyon hedefi', predicate: 'uygulama yöntemi', object: 'Desteklenen işlemlerde API, API kapsamı dışındaki işlemlerde kalıcı sunucu tarayıcısı kullanılır.', scope: 'aperion_hermes', validFrom: '2026-09-09', confidence: 1, authority: 'user_correction' },
    { subject: 'AperiON BizimHesap oturumu', predicate: 'süreklilik yöntemi', object: 'Kalıcı tarayıcı profili ve şifreli kasa kullanılır; oturum kapanırsa otomatik giriş denenir, CAPTCHA veya SMS/MFA gerektiğinde kullanıcı çağrılır.', scope: 'aperion_hermes', validFrom: '2026-09-09', confidence: 1, authority: 'user_correction' },
    { subject: 'AperiON operasyon yürütümü', predicate: 'kontrol ve kanıt', object: 'İşlem öncesi mükerrer kayıt ve veri kontrolü yapılır; sonuç, kayıt ve kanıt kullanıcıya geri getirilir.', scope: 'aperion_hermes', validFrom: '2026-09-09', confidence: 1, authority: 'user_correction' },
    { subject: 'Hostinger Hermes VPS', predicate: 'hostname', object: 'srv1929456.hstgr.cloud', scope: 'aperion_hermes', validFrom: '2026-09-09', confidence: 0.9, authority: 'document' },
    { subject: 'Hostinger Hermes VPS', predicate: 'w3sb Hermes container', object: 'hermes-agent-w3sb-hermes-agent-1', scope: 'aperion_hermes', validFrom: '2026-09-09', confidence: 0.9, authority: 'document' },
    { subject: 'Hostinger Hermes VPS', predicate: '6fkt Hermes container', object: 'hermes-agent-6fkt-hermes-agent-1', scope: 'aperion_hermes', validFrom: '2026-09-09', confidence: 0.9, authority: 'document' },
    { subject: 'Hermes w3sb kurulumu', predicate: 'kalıcı kurulum dizini', object: '/docker/hermes-agent-w3sb', scope: 'aperion_hermes', validFrom: '2026-09-09', confidence: 0.9, authority: 'document' },
    { subject: 'Hermes 6fkt kurulumu', predicate: 'kalıcı kurulum dizini', object: '/docker/hermes-agent-6fkt', scope: 'aperion_hermes', validFrom: '2026-09-09', confidence: 0.9, authority: 'document' },
    { subject: 'Hostinger mobil web konsolu', predicate: 'operasyonel gözlem', object: 'Telefon kullanımında bağlantı düşürdüğü için kalıcı yönetim için güvenilir değildir.', scope: 'aperion_hermes', validFrom: '2026-09-09', confidence: 0.85, authority: 'document' },
  ],
  decisions: [
    { decision: 'Ödeme, transfer, kesin fatura veya e-fatura gönderimi otomatik yapılmaz; geri döndürülemez finansal işlem için açık kullanıcı onayı gerekir.', scope: 'aperion_finance_safety', effectiveDate: '2026-09-09' },
    { decision: 'BizimHesap fatura otomasyonunda kullanıcı onayı öncesinde yalnız taslak hazırlanır.', scope: 'aperion_finance_safety', effectiveDate: '2026-09-09' },
    { decision: 'Kullanıcı adı, parola ve tokenlar açık metin olarak gösterilmez veya ortak hafızaya taşınmaz.', scope: 'aperion_security', effectiveDate: '2026-09-09' },
    { decision: 'Hostinger mobil konsolunun bağlantı kararsızlığı nedeniyle kalıcı Hermes yönetimi yerel Codex üzerinden sürdürülür.', scope: 'aperion_hermes', effectiveDate: '2026-09-09' },
  ],
};

const store = createMemoryStore();
const first = await ingestSource(store, source, payload);
const second = await ingestSource(store, source, payload);
const snapshot = serializeStore(store);
const q = (value) => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const sql = ['PRAGMA foreign_keys = ON;'];
for (const s of snapshot.sources) sql.push(`INSERT INTO memory_sources(source_key,source_type,project_ref,conversation_ref,source_date,content_hash,last_synced_at,adapter_status,metadata_json) VALUES(${q(s.sourceKey)},${q(s.sourceType)},${q(s.projectRef)},${q(s.conversationRef)},${q(s.sourceDate)},${q(s.contentHash)},${q(s.lastSyncedAt)},${q(s.adapterStatus)},${q(JSON.stringify({title:'Sözleşmeye Erişim 090926 mail güzel',access_surface:'Codex supported list_threads/read_thread API'}))}) ON CONFLICT(source_key) DO UPDATE SET content_hash=excluded.content_hash,last_synced_at=excluded.last_synced_at,adapter_status=excluded.adapter_status,metadata_json=excluded.metadata_json;`);
for (const f of snapshot.facts) {
  sql.push(`INSERT INTO memory_facts(fact_key,subject,predicate,object_value,scope,valid_from,valid_to,confidence,status,authority,first_seen,last_seen) VALUES(${q(f.key)},${q(f.subject)},${q(f.predicate)},${q(f.object)},${q(f.scope)},${q(f.validFrom)},${q(f.validTo)},${f.confidence},${q(f.status)},${q(f.authority)},${q(f.firstSeen)},${q(f.lastSeen)}) ON CONFLICT(fact_key) DO UPDATE SET last_seen=excluded.last_seen;`);
  sql.push(`INSERT OR IGNORE INTO memory_fact_sources(fact_id,source_id,observed_at) SELECT f.id,s.id,${q(f.lastSeen)} FROM memory_facts f,memory_sources s WHERE f.fact_key=${q(f.key)} AND s.source_key=${q(SOURCE_KEY)};`);
}
for (const d of snapshot.decisions) sql.push(`INSERT INTO memory_decisions(decision_key,decision,scope,effective_date,status,source_id,created_at,updated_at) SELECT ${q(d.key)},${q(d.decision)},${q(d.scope)},${q(d.effectiveDate)},${q(d.status)},s.id,datetime('now'),datetime('now') FROM memory_sources s WHERE s.source_key=${q(SOURCE_KEY)} ON CONFLICT(decision_key) DO UPDATE SET updated_at=datetime('now');`);
sql.push(`INSERT INTO memory_sync_state(source_key,content_hash,status,last_synced_at,last_error) VALUES(${q(SOURCE_KEY)},${q(snapshot.sources[0].contentHash)},'synced',datetime('now'),NULL) ON CONFLICT(source_key) DO UPDATE SET content_hash=excluded.content_hash,status='synced',last_synced_at=excluded.last_synced_at,last_error=NULL;`);

const sqlPath = path.join(ROOT, '.wrangler', 'chatgpt-contract-access-v158.sql');
fs.mkdirSync(path.dirname(sqlPath), { recursive: true });
fs.writeFileSync(sqlPath, `${sql.join('\n')}\n`);
const proof = {
  checked_at: checkedAt,
  version: 'v158',
  classification: 'VISIBLE_AND_INGESTIBLE',
  supported_surface: 'Codex app list_threads + read_thread',
  source: { source_key: SOURCE_KEY, title: 'Sözleşmeye Erişim 090926 mail güzel', project_ref: source.projectRef, conversation_ref: source.conversationRef },
  dry_run: { first_pass: first, idempotent_second_pass: second, candidates: { facts: payload.facts.length, decisions: payload.decisions.length }, deduplicates_within_payload: snapshot.stats.duplicates, conflicts_within_payload: snapshot.conflicts.length, secrets_rejected: snapshot.stats.secrets_rejected },
  exclusions: ['financial transaction examples', 'credentials/tokens/secrets', 'assistant-only claims without durable corroboration', 'stale point-in-time blockers'],
  live_d1_preflight: { database_name: 'aperion-control-plane', database_id: '8f32b3b1-5451-4c9e-9bd2-5d3626e4a561', mode: 'read_only_select', related_active_rows_reviewed: true, conflicting_slots_found: 0 },
  live_d1_ingest: null,
  financial_writes: 0,
  bizimhesap_writes: 0,
  messages_sent: 0,
  secrets_persisted: 0,
};
const proofPath = path.join(ROOT, 'state', 'contract-access-chatgpt-ingest-verification.json');
try {
  const previous = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
  if (previous.live_d1_ingest) proof.live_d1_ingest = previous.live_d1_ingest;
  if (previous.live_d1_read_only_verification) proof.live_d1_read_only_verification = previous.live_d1_read_only_verification;
} catch {}
fs.writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify({ proofPath, sqlPath, proof }, null, 2));
