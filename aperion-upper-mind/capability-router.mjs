const CAPABILITIES = Object.freeze({
  daily_planning: {
    label: 'Gün ve İş Yönetimi',
    signals: ['bugün', 'gunum', 'görev', 'toplantı', 'son tarih', 'öncelik', 'planla', 'takvim'],
    required: ['goals', 'tasks'],
  },
  research: {
    label: 'Araştırma ve Doğrulama',
    signals: ['araştır', 'pazar', 'trend', 'istatistik', 'rakip', 'sektör', 'kaynak'],
    required: ['topic'],
  },
  thought_clarification: {
    label: 'Düşünceyi Yapılandırma',
    signals: ['fikrimi toparla', 'dağınık', 'netleştir', 'yapılandır', 'eksikleri bul'],
    required: ['idea'],
  },
  decision_problem_solving: {
    label: 'Karar ve Problem Çözme',
    signals: ['karar', 'problem', 'kök neden', 'alternatif', 'avantaj', 'dezavantaj', 'çöz'],
    required: ['situation'],
  },
  business_validation: {
    label: 'İş Fikri Doğrulama',
    signals: ['iş fikri', 'startup', 'gelir modeli', 'müşteri', 'mvp', 'piyasa talebi'],
    required: ['idea'],
  },
  communication_learning: {
    label: 'İletişim ve Öğrenme',
    signals: ['metni düzelt', 'iyileştir', 'sadeleştir', 'öğret', 'açıkla', 'özetle'],
    required: ['content'],
  },
});

const HIGH_RISK_ACTIONS = new Set([
  'financial_post', 'send_message', 'send_email', 'create_calendar_event',
  'write_external_record', 'merge', 'delete',
]);

function normalize(value) {
  return String(value || '').toLocaleLowerCase('tr-TR');
}

export function routeIntent(text) {
  const input = normalize(text);
  const ranked = Object.entries(CAPABILITIES).map(([id, capability]) => ({
    id,
    label: capability.label,
    score: capability.signals.reduce((score, signal) => score + (input.includes(signal) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score === 0) {
    return { capability: null, confidence: 0, needs_clarification: true, alternatives: [] };
  }
  const ties = ranked.filter(item => item.score === best.score);
  return {
    capability: best.id,
    label: best.label,
    confidence: Math.min(1, 0.55 + (best.score * 0.12)),
    needs_clarification: ties.length > 1,
    alternatives: ties.slice(1).map(item => item.id),
  };
}

export function missingInputs(capabilityId, payload = {}) {
  const capability = CAPABILITIES[capabilityId];
  if (!capability) return ['capability'];
  return capability.required.filter(key => {
    const value = payload[key];
    return value == null || String(value).trim() === '' || (Array.isArray(value) && value.length === 0);
  });
}

export function actionPolicy(actions = []) {
  const normalized = actions.map(action => typeof action === 'string' ? { type: action } : action);
  const approvalRequired = normalized.some(action => HIGH_RISK_ACTIONS.has(action.type));
  return {
    mode: approvalRequired ? 'plan_and_ask_approval' : 'advisory',
    approval_required: approvalRequired,
    executable_actions: approvalRequired ? [] : normalized,
    proposed_actions: approvalRequired ? normalized : [],
  };
}

export function buildUpperMindPlan({ text, payload = {}, actions = [] }) {
  const route = routeIntent(text);
  const missing = route.capability ? missingInputs(route.capability, payload) : ['intent'];
  const policy = actionPolicy(actions);
  return {
    version: '1.0.0',
    route,
    missing_inputs: missing,
    can_proceed: !route.needs_clarification && missing.length === 0,
    policy,
    evidence: [],
    assumptions: [],
    audit: { status: 'planned', external_write_performed: false },
  };
}

export { CAPABILITIES };
