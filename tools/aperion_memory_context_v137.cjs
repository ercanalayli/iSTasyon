const crypto = require('crypto');

const SECRET_PATTERNS = [
  /\b(?:otp|tek kullanımlık şifre|doğrulama kodu)\b/i,
  /\b(?:cvv|cvc)\b/i,
  /(?:şifre|sifre|parola|password)\s*[:=]/i,
  /\b(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|recovery code)\s*[:=]/i
];

function normalizeTurkish(value = '') {
  return String(value)
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9çğıöşü]+/g, ' ')
    .trim();
}

function stableKey(prefix, value) {
  return `${prefix}-${crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 20)}`;
}

function containsSecret(text) {
  return SECRET_PATTERNS.some((pattern) => pattern.test(String(text)));
}

function classifyMemoryCandidate(text, metadata = {}) {
  const raw = String(text || '').trim();
  const normalized = normalizeTurkish(raw);
  if (!raw) return { decision: 'reject', reason: 'empty' };
  if (containsSecret(raw)) return { decision: 'reject', reason: 'secret_material' };

  let memoryType = 'transient';
  let decision = 'do_not_promote';
  if (/\b(her zaman|tercih ederim|istemiyorum|seviyorum)\b/.test(normalized)) {
    memoryType = 'preference';
    decision = 'candidate';
  }
  if (/\b(kural|zorunlu|muhakkak|asla|onaysiz|onaysız|gerektirir|yapilmaz|yapılmaz)\b/.test(normalized)) {
    memoryType = 'business_rule';
    decision = 'needs_review';
  }
  if (/\b(cari|firma|tedarikci|tedarikçi|musteri|müşteri|hesap|adres)\b/.test(normalized)) {
    memoryType = 'entity_fact';
    decision = 'needs_review';
  }
  if (metadata.completed === true) {
    memoryType = 'outcome';
    decision = 'candidate';
  } else if (metadata.occurredAt) {
    memoryType = 'episode';
    decision = 'candidate';
  }
  if (metadata.supersedes) {
    memoryType = 'superseding_fact';
    decision = 'needs_review';
  }

  return {
    memoryKey: stableKey('memory', `${memoryType}|${normalized}`),
    decision,
    memoryType,
    statement: raw,
    sourceRef: metadata.sourceRef || null,
    entityRef: metadata.entityRef || null,
    objectiveRef: metadata.objectiveRef || null,
    privacyClass: metadata.privacyClass || 'private',
    confidence: Number.isFinite(metadata.confidence) ? metadata.confidence : 0.5,
    validFrom: metadata.validFrom || metadata.occurredAt || null,
    validUntil: metadata.validUntil || null,
    supersedes: metadata.supersedes || null
  };
}

function scoreTokens(queryTokens, text) {
  const haystack = new Set(normalizeTurkish(text).split(' ').filter(Boolean));
  return queryTokens.reduce((score, token) => score + (haystack.has(token) ? 1 : 0), 0);
}

function resolveReference(input, state = {}) {
  const normalized = normalizeTurkish(input);
  const queryTokens = normalized.split(' ').filter((t) => t.length > 2);
  const now = Date.parse(state.now || new Date().toISOString());

  const objectives = (state.objectives || []).filter((item) => item.status !== 'completed');
  const objective = objectives
    .map((item) => ({ item, score: scoreTokens(queryTokens, `${item.title} ${item.objectiveKey}`) }))
    .sort((a, b) => b.score - a.score)[0];

  const workItems = (state.workItems || []).filter((item) => !['completed', 'cancelled', 'verified'].includes(item.status));
  const work = workItems
    .map((item) => {
      const lexical = scoreTokens(queryTokens, `${item.title} ${item.workKey}`);
      const objectiveBoost = objective && item.objectiveKey === objective.item.objectiveKey ? 4 : 0;
      const recency = Number.isFinite(Date.parse(item.updatedAt)) ? Date.parse(item.updatedAt) / 1e13 : 0;
      return { item, score: lexical * 10 + objectiveBoost + recency };
    })
    .sort((a, b) => b.score - a.score)[0];

  const entity = (state.entities || [])
    .map((item) => ({ item, score: Math.max(...(item.aliases || [item.name]).map((a) => normalized.includes(normalizeTurkish(a)) ? 10 : 0)) }))
    .sort((a, b) => b.score - a.score)[0];

  const validMemories = (state.memories || []).filter((item) => {
    if (item.status && item.status !== 'active') return false;
    if (item.validUntil && Date.parse(item.validUntil) < now) return false;
    return true;
  });
  const memory = validMemories
    .map((item) => {
      const lexical = scoreTokens(queryTokens, item.statement || '');
      const timeBoost = /\b(gecen ay|önceki|daha once)\b/.test(normalized) && item.occurredAt ? 2 : 0;
      return { item, score: lexical + timeBoost };
    })
    .sort((a, b) => b.score - a.score)[0];

  let role = state.activeRole || null;
  if (/\btedarikci\b/.test(normalized)) role = 'supplier';
  if (/\bmusteri\b/.test(normalized)) role = 'customer';

  const chosenObjective = objective && objective.score > 0 ? objective.item : (work ? objectives.find((o) => o.objectiveKey === work.item.objectiveKey) : state.activeObjective);
  return {
    objectiveKey: chosenObjective?.objectiveKey || null,
    workKey: work?.item.workKey || null,
    entityRef: entity && entity.score > 0 ? entity.item.entityRef : state.activeEntityRef || null,
    role,
    memoryKey: memory && memory.score > 0 ? memory.item.memoryKey : null,
    nextAction: work?.item.nextAction || state.nextAction || null,
    reasons: {
      objective: objective?.score || 0,
      work: work?.score || 0,
      entity: entity?.score || 0,
      memory: memory?.score || 0
    }
  };
}

function assembleContext({ threadKey, input, state, recentTurns = [], rules = [], evidence = [], tokenBudget = 1800 }) {
  const resolution = resolveReference(input, state);
  const selectedMemories = (state.memories || []).filter((m) => m.status === 'active' && (
    m.memoryKey === resolution.memoryKey ||
    m.entityRef === resolution.entityRef ||
    m.objectiveRef === resolution.objectiveKey
  ));
  const boundedTurns = recentTurns.slice(-8);
  const estimatedTokens = Math.ceil(JSON.stringify({ input, resolution, selectedMemories, boundedTurns, rules, evidence }).length / 4);
  if (estimatedTokens > tokenBudget) {
    while (boundedTurns.length > 2 && Math.ceil(JSON.stringify({ input, resolution, selectedMemories, boundedTurns, rules, evidence }).length / 4) > tokenBudget) {
      boundedTurns.shift();
    }
  }
  const manifest = {
    contextKey: stableKey('context', `${threadKey}|${input}|${Date.now()}`),
    threadKey,
    resolution,
    recentTurnRefs: boundedTurns.map((t) => t.turnKey),
    memoryRefs: selectedMemories.map((m) => m.memoryKey),
    evidenceRefs: evidence.map((e) => e.evidenceRef),
    ruleRefs: rules.map((r) => r.ruleKey),
    estimatedTokens: Math.ceil(JSON.stringify({ input, resolution, selectedMemories, boundedTurns, rules, evidence }).length / 4)
  };
  return { manifest, context: { input, resolution, recentTurns: boundedTurns, memories: selectedMemories, rules, evidence } };
}

module.exports = { normalizeTurkish, containsSecret, classifyMemoryCandidate, resolveReference, assembleContext };
