const SECRET_PATTERNS = [
  /\b(?:password|parola|sifre|şifre|token|api[_ -]?key|secret|otp|cvv|cvc)\s*[:=]\s*\S+/i,
  /\b(?:sk-[a-z0-9_-]{12,}|ghp_[a-z0-9]{20,}|eyJ[a-z0-9_-]{20,}\.)/i,
  /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/i,
];

export function normalize(value = '') {
  return String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr-TR');
}

export async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function containsSecret(value) {
  return SECRET_PATTERNS.some((pattern) => pattern.test(String(value)));
}

export function createMemoryStore() {
  return { sources: new Map(), facts: new Map(), decisions: new Map(), conflicts: new Map(), sync: new Map(), stats: { duplicates: 0, secrets_rejected: 0, unchanged_sources: 0 } };
}

function factIdentity(fact) {
  return `${normalize(fact.subject)}|${normalize(fact.predicate)}|${normalize(fact.object)}|${normalize(fact.scope || 'aperion')}`;
}

function subjectPredicate(fact) {
  return `${normalize(fact.subject)}|${normalize(fact.predicate)}|${normalize(fact.scope || 'aperion')}`;
}

export async function ingestSource(store, source, payload = {}) {
  const contentHash = await sha256(source.content || '');
  const previous = store.sources.get(source.sourceKey);
  if (previous?.contentHash === contentHash) {
    store.stats.unchanged_sources += 1;
    previous.lastSyncedAt = source.ingestedAt || new Date().toISOString();
    store.sync.set(source.sourceKey, { status: 'unchanged', contentHash, cursor: source.cursor || null });
    return { unchanged: true, facts: 0, decisions: 0 };
  }
  const now = source.ingestedAt || new Date().toISOString();
  store.sources.set(source.sourceKey, { ...source, content: undefined, contentHash, ingestedAt: now, lastSyncedAt: now });
  store.sync.set(source.sourceKey, { status: source.adapterStatus === 'BLOCKED_PLATFORM_ACCESS' ? 'blocked' : 'synced', contentHash, cursor: source.cursor || null });
  let acceptedFacts = 0;
  let acceptedDecisions = 0;
  for (const candidate of payload.facts || []) {
    const fact = { scope: 'aperion', confidence: 0.7, status: 'active', authority: 'document', ...candidate };
    if (containsSecret(`${fact.subject} ${fact.predicate} ${fact.object}`)) { store.stats.secrets_rejected += 1; continue; }
    const key = factIdentity(fact);
    const existing = store.facts.get(key);
    if (existing) {
      existing.lastSeen = now;
      existing.sourceKeys.add(source.sourceKey);
      store.stats.duplicates += 1;
      continue;
    }
    const slot = subjectPredicate(fact);
    const activeAlternatives = [...store.facts.values()].filter((item) => item.slot === slot && item.status === 'active' && normalize(item.object) !== normalize(fact.object));
    const explicitCorrection = fact.authority === 'user_correction';
    if (explicitCorrection) {
      for (const old of activeAlternatives) { old.status = 'superseded'; old.validTo = fact.validFrom || now; old.supersededBy = key; }
    } else if (activeAlternatives.length) {
      fact.status = 'needs_review';
      for (const old of activeAlternatives) {
        old.status = 'needs_review';
        const pair = [old.key, key].sort().join('|');
        store.conflicts.set(pair, { conflictKey: pair, subject: fact.subject, predicate: fact.predicate, factA: old.key, factB: key, status: 'needs_review' });
      }
    }
    store.facts.set(key, { ...fact, key, slot, firstSeen: now, lastSeen: now, sourceKeys: new Set([source.sourceKey]), supersedes: explicitCorrection && activeAlternatives[0]?.key || null });
    acceptedFacts += 1;
  }
  for (const candidate of payload.decisions || []) {
    if (containsSecret(candidate.decision)) { store.stats.secrets_rejected += 1; continue; }
    const key = normalize(`${candidate.scope || 'aperion'}|${candidate.decision}|${candidate.effectiveDate || ''}`);
    if (store.decisions.has(key)) { store.stats.duplicates += 1; continue; }
    if (candidate.supersedes && store.decisions.has(candidate.supersedes)) {
      const old = store.decisions.get(candidate.supersedes); old.status = 'superseded'; old.supersededBy = key;
    }
    store.decisions.set(key, { ...candidate, key, sourceKey: source.sourceKey, status: candidate.status || 'active' });
    acceptedDecisions += 1;
  }
  return { unchanged: false, facts: acceptedFacts, decisions: acceptedDecisions };
}

export function memoryContext(store, query = '') {
  const needle = normalize(query);
  const match = (value) => !needle || normalize(value).includes(needle) || needle.includes(normalize(value));
  return {
    query,
    active_facts: [...store.facts.values()].filter((f) => ['active','needs_review'].includes(f.status) && (match(f.subject) || match(f.predicate) || match(f.object))).map(serializeFact),
    active_decisions: [...store.decisions.values()].filter((d) => d.status === 'active' && (match(d.scope || '') || match(d.decision))),
    open_conflicts: [...store.conflicts.values()].filter((c) => c.status === 'needs_review' && (match(c.subject) || match(c.predicate))),
    sources: [...store.sources.values()].filter((s) => !needle || match(s.sourceKey) || match(s.filePath || '')),
  };
}

function serializeFact(fact) { return { ...fact, sourceKeys: [...fact.sourceKeys] }; }
export function serializeStore(store) { return { sources: [...store.sources.values()], facts: [...store.facts.values()].map(serializeFact), decisions: [...store.decisions.values()], conflicts: [...store.conflicts.values()], sync: [...store.sync.entries()].map(([sourceKey,value]) => ({sourceKey,...value})), stats: store.stats }; }
