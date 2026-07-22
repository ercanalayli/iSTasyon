import assert from 'node:assert/strict';
import {
  actionPolicy,
  buildUpperMindPlan,
  missingInputs,
  routeIntent,
} from '../aperion-upper-mind/capability-router.mjs';

assert.equal(routeIntent('Bugünkü görevlerimi ve toplantılarımı planla').capability, 'daily_planning');
assert.equal(routeIntent('Bu sektördeki pazar trendlerini ve rakipleri araştır').capability, 'research');
assert.equal(routeIntent('Dağınık fikrimi toparla ve eksikleri bul').capability, 'thought_clarification');
assert.equal(routeIntent('Bu kararın avantajlarını, risklerini ve alternatiflerini değerlendir').capability, 'decision_problem_solving');
assert.equal(routeIntent('Bu startup iş fikrinin piyasa talebini ve gelir modelini doğrula').capability, 'business_validation');
assert.equal(routeIntent('Bu metni sadeleştir ve iyileştir').capability, 'communication_learning');
assert.equal(routeIntent('selam').needs_clarification, true);

assert.deepEqual(missingInputs('research', {}), ['topic']);
assert.deepEqual(missingInputs('research', { topic: 'Türkiye medikal pazarı' }), []);

assert.equal(actionPolicy(['create_report']).approval_required, false);
assert.equal(actionPolicy(['send_email']).approval_required, true);
assert.equal(actionPolicy(['financial_post']).executable_actions.length, 0);

const safePlan = buildUpperMindPlan({
  text: 'Bu sektördeki pazar trendlerini araştır',
  payload: { topic: 'Türkiye medikal pazarı' },
  actions: ['create_report'],
});
assert.equal(safePlan.can_proceed, true);
assert.equal(safePlan.audit.external_write_performed, false);

const guardedPlan = buildUpperMindPlan({
  text: 'Bugünkü görevlerimi planla',
  payload: { goals: ['Nakit akışı'], tasks: ['Banka onayları'] },
  actions: ['create_calendar_event'],
});
assert.equal(guardedPlan.policy.mode, 'plan_and_ask_approval');
assert.equal(guardedPlan.policy.approval_required, true);
assert.deepEqual(guardedPlan.policy.executable_actions, []);

console.log('OK AperiON Upper Mind capability router');
console.log('OK missing-input gate');
console.log('OK external-action approval gate');
