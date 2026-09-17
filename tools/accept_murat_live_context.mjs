import { memoryRequest } from './lib/memory_transport.mjs';

// Live, new-process retrieval: only protected Memory OS responses, never chat state.
const questions = [
  'Murat Ticaret ne durumda?',
  'Son açık işi ne?',
  'Son doğrulanmış iletişim ne?',
  'Güncel fiyat bilgisinin kaynağı ne?',
  'Akaryakıt eskalasyon kuralı ne ve kaynağı ne?',
];
const response = await memoryRequest(`/v1/context?view=entity360&q=${encodeURIComponent(questions[0])}&token_budget=2200`);
const x = response.entity360;
const answers = [
  { question: questions[0], answer: x.current_state, provenance: x.source_refs },
  { question: questions[1], answer: x.open_loops?.[0]?.next_action, provenance: [x.open_loops?.[0]?.source_ref] },
  { question: questions[2], answer: x.latest_verified_communication?.summary, provenance: [x.latest_verified_communication?.source_ref] },
  { question: questions[3], answer: x.current_freight_pricing_rule ? x.current_freight_pricing_rule.value : 'Güncel navlun tarifesi doğrulanmadı; 9 Eylül e-postasında bildirilen yakıt bazı ayrı bir bilgidir.',
    provenance: x.current_freight_pricing_rule ? [x.current_freight_pricing_rule.source_ref] : [x.fuel_escalation_rule?.source_ref] },
  { question: questions[4], answer: x.fuel_escalation_rule?.value, provenance: [x.fuel_escalation_rule?.source_ref] },
];
const checks = answers.map(row => Boolean(row.answer && row.provenance?.length && row.provenance.every(Boolean)));
checks[2] = checks[2] && x.latest_verified_communication?.type === 'gmail_message_verified'
  && x.latest_verified_communication?.source_ref === 'gmail:1a08515985214614';
const staleAsCurrent = Boolean(x.current_freight_pricing_rule && /11\.000/.test(x.current_freight_pricing_rule.value));
const historicalToday = (await memoryRequest('/v1/today')).items.filter(item => /Murat Ticaret/.test(item.title));
const todayOpenOnly = historicalToday.length === 1 && historicalToday[0].kind === 'followup' && /eskalasyon/.test(historicalToday[0].title);
console.log(JSON.stringify({ tested_at:new Date().toISOString(),process:'fresh_node_process',answers,
  retrieval_pass_count:checks.filter(Boolean).length,total:questions.length,stale_as_current:staleAsCurrent,
  today_open_only:todayOpenOnly,today_items:historicalToday.map(item => item.id) },null,2));
if (!checks.every(Boolean) || staleAsCurrent || !todayOpenOnly) process.exitCode=1;
