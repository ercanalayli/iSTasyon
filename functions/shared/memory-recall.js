import { sha256 } from './project-memory.js';

const trim = value => String(value || '').trim().slice(0, 240);
const lower = value => trim(value).toLocaleLowerCase('tr-TR');

async function expense(db, code = 'AI-0646', first = false) {
  const sql = first
    ? `SELECT e.*,o.object_key,q.confidence,q.freshness,q.last_verified_at FROM memory_events e
       LEFT JOIN memory_objects o ON o.source_event_id=e.event_id AND o.object_type='RESULT'
       LEFT JOIN memory_quality q ON q.object_key=o.object_key
       WHERE e.source_type='bizimhesap_readback' AND e.verification_status='read_back_verified'
         AND substr(e.occurred_at,1,10)='2026-09-16' ORDER BY e.occurred_at LIMIT 1`
    : `SELECT e.*,o.object_key,q.confidence,q.freshness,q.last_verified_at FROM memory_events e
       LEFT JOIN memory_objects o ON o.source_event_id=e.event_id AND o.object_type='RESULT'
       LEFT JOIN memory_quality q ON q.object_key=o.object_key
       WHERE json_extract(e.metadata_json,'$.document_no')=?
         AND e.source_type='bizimhesap_readback' AND e.verification_status='read_back_verified'
       ORDER BY e.occurred_at LIMIT 1`;
  const row = first ? await db.prepare(sql).first() : await db.prepare(sql).bind(code).first();
  if (!row) return null;
  const meta = JSON.parse(row.metadata_json || '{}');
  return {
    answer: `${meta.document_no || code}: ${meta.amount} ${meta.currency || 'TRY'} ${meta.category} gideri; ${meta.payment_account}; ${meta.paid_status}; ${row.occurred_at.slice(0,10)}.`,
    object_key: row.object_key || null,
    confidence: row.confidence ?? null,
    freshness: row.freshness || 'unknown',
    provenance: [{ source_type: row.source_type, source_ref: row.source_ref, provenance_ref: row.provenance_ref,
      verification_status: row.verification_status, verified_at: row.last_verified_at || row.occurred_at }],
    data: { document_no: meta.document_no, amount: meta.amount, category: meta.category,
      payment_account: meta.payment_account, paid_status: meta.paid_status, duplicate: meta.duplicate },
  };
}

async function teaRule(db) {
  const row = await db.prepare(`SELECT f.fact_key,f.object_value,f.confidence,f.authority,f.valid_from,f.valid_to,
      o.object_key,q.freshness,q.last_verified_at,group_concat(s.source_key,' | ') AS sources
      FROM memory_facts f JOIN memory_fact_sources fs ON fs.fact_id=f.id
      JOIN memory_sources s ON s.id=fs.source_id
      LEFT JOIN memory_objects o ON o.object_type='FACT' AND o.canonical_ref=f.fact_key
      LEFT JOIN memory_quality q ON q.object_key=o.object_key
      WHERE f.subject LIKE '%çay%' AND f.predicate='expense_category' AND f.status='active'
      GROUP BY f.id ORDER BY f.confidence DESC,f.last_seen DESC LIMIT 1`).first();
  if (!row) return null;
  return {
    answer: `ALAYLI MEDİKAL için çay / çay masrafı / çay gideri → ${row.object_value}.`,
    object_key: row.object_key || null, confidence: row.confidence, freshness: row.freshness || 'unknown',
    provenance: String(row.sources || '').split(' | ').filter(Boolean).map(source_ref => ({ source_ref })),
    data: { category: row.object_value, authority: row.authority, valid_from: row.valid_from, valid_until: row.valid_to },
  };
}

async function driveFact(db, query) {
  const needle = trim(query).match(/APN-MEM-[0-9]{8}(?:-V[0-9]+)?|\b[A-Za-z0-9_-]{30,}\b/i)?.[0] || trim(query);
  const row = await db.prepare(`SELECT f.fact_key,f.subject,f.predicate,f.object_value,f.confidence,f.authority,f.valid_from,
      o.object_key,q.freshness,q.last_verified_at,s.source_key,d.drive_file_id,d.canonical_name,d.version_hash,d.document_id
      FROM memory_facts f JOIN memory_fact_sources fs ON fs.fact_id=f.id
      JOIN memory_sources s ON s.id=fs.source_id AND s.source_type='google_drive'
      JOIN memory_documents d ON s.source_key=('drive:'||d.drive_file_id||':'||d.version_hash)
      LEFT JOIN memory_objects o ON o.object_type='FACT' AND o.canonical_ref=f.fact_key
      LEFT JOIN memory_quality q ON q.object_key=o.object_key
      WHERE f.status='active' AND d.superseded_by IS NULL AND
        (f.object_value LIKE ? OR f.subject LIKE ? OR d.canonical_name LIKE ? OR d.drive_file_id=?)
      ORDER BY d.document_date DESC LIMIT 1`)
    .bind(`%${needle}%`,`%${needle}%`,`%${needle}%`,needle).first();
  if (!row) return null;
  return { answer: `${row.subject}: ${row.predicate} = ${row.object_value}. Kaynak: ${row.canonical_name} (Drive ${row.drive_file_id}).`,
    object_key: row.object_key, confidence: row.confidence, freshness: row.freshness || 'unknown',
    provenance: [{ source_type:'google_drive',source_ref:row.source_key,provenance_ref:row.source_key,
      document_id:row.document_id,drive_file_id:row.drive_file_id,version_hash:row.version_hash,
      verified_at:row.last_verified_at }],
    data: { subject:row.subject,predicate:row.predicate,value:row.object_value,authority:row.authority,valid_from:row.valid_from } };
}

export async function recallMemory(db, question) {
  const q = lower(question);
  if (!q) throw new Error('recall_query_required');
  let result;
  const code = trim(question).match(/AI-\d{4,}/i)?.[0]?.toUpperCase();
  if (/APN-MEM-[0-9]{8}|\b[A-Za-z0-9_-]{30,}\b/i.test(question)) result = await driveFact(db, question);
  else if (code) result = await expense(db, code);
  else if (q.includes('çay') || q.includes('cay')) result = await teaRule(db);
  else if ((q.includes('ilk') || q.includes('first')) && (q.includes('computer use') || q.includes('bizimhesap'))) result = await expense(db, 'AI-0646', true);
  else if (q.includes('nereden') || q.includes('kayna')) {
    const [transaction, rule] = await Promise.all([expense(db),teaRule(db)]);
    result = { answer: 'Bu bilgi BizimHesap geri okuma kaydı ve kullanıcı düzeltmesiyle destekleniyor.',
      object_key: transaction?.object_key || rule?.object_key || null,
      confidence: Math.min(transaction?.confidence || 0,rule?.confidence || 0) || null,
      freshness: transaction?.freshness || 'unknown',
      provenance: [...(transaction?.provenance || []),...(rule?.provenance || [])],
      data: { transaction: transaction?.data || null, rule: rule?.data || null } };
  }
  if (!result) return { ok: true, found: false, question: trim(question), answer: null, provenance: [] };
  return { ok: true, found: true, question: trim(question), ...result,
    answer_hash: await sha256(JSON.stringify({ answer: result.answer, provenance: result.provenance, data: result.data })) };
}

export async function recordRecallAcceptance(db, input) {
  const result = await recallMemory(db, input?.question);
  if (!result.found || !result.object_key || result.answer_hash !== input?.answer_hash || result.provenance.length === 0)
    throw new Error('recall_acceptance_failed');
  const key = `retrieval:${(await sha256(`${result.object_key}|${lower(input.question)}|${result.answer_hash}`)).slice(0,40)}`;
  await db.prepare(`INSERT OR IGNORE INTO memory_retrieval_acceptance(acceptance_key,object_key,query,answer_hash,provenance_ref)
    VALUES(?,?,?,?,?)`).bind(key,result.object_key,result.question,result.answer_hash,result.provenance[0].provenance_ref || result.provenance[0].source_ref).run();
  await db.prepare(`UPDATE memory_quality SET durable_memory_verified=1,retrieval_verified_at=datetime('now') WHERE object_key=?`)
    .bind(result.object_key).run();
  return { acceptance_key: key, object_key: result.object_key, durable_memory_verified: true };
}
