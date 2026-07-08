const fs = require('fs');
const path = require('path');

const input = process.argv.includes('--input')
  ? process.argv[process.argv.indexOf('--input') + 1]
  : 'data/banka_onay_bizimhesap_kayit_plani.json';
const output = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : 'data/banka_onay_guvenli_adaylar.json';
const pilotBank = process.env.BANK_APPROVAL_PILOT_BANK || 'IS BANKASI';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function normalizeText(value) {
  return String(value || '')
    .toLocaleUpperCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function isPilotBank(item) {
  const bank = normalizeText(item.bank_name || item.plan?.bank_name || '');
  const pilot = normalizeText(pilotBank);
  if (!pilot) return false;
  if (bank.includes(pilot)) return true;
  if (pilot.includes('IS BANKASI') && /\b(TURKIYE )?IS BANKASI\b/.test(bank)) return true;
  return false;
}

function absAmount(item) {
  return Math.abs(Number(item.amount_in || 0) || Number(item.amount_out || 0) || Number(item.plan?.amount || 0));
}

function signedAmount(item) {
  return Number(item.amount_in || 0) > 0 ? Number(item.amount_in || 0) : -Math.abs(Number(item.amount_out || item.plan?.amount || 0));
}

function riskClass(item) {
  const plan = item.plan || {};
  const amount = absAmount(item);
  if (plan.requires_user_review) return 'review';
  if (plan.confidence < 84) return 'review';
  if (['Cari tahsilat', 'Cari odeme'].includes(plan.type) && /eslestirme|eşleştirme|onayda/i.test(plan.counterparty || '')) return 'review';
  if (amount > 100000 && /virman|transfer/i.test(plan.type || '')) return 'medium';
  if (amount > 10000 && !/masraf|komisyon/i.test(`${plan.type} ${plan.category}`)) return 'medium';
  return 'low';
}

function score(item) {
  const plan = item.plan || {};
  const amount = absAmount(item);
  let value = Number(plan.confidence || 0);
  if (riskClass(item) === 'low') value += 30;
  if (isPilotBank(item)) value += 35;
  if (/masraf|komisyon/i.test(`${plan.type} ${plan.category}`)) value += 20;
  if (/POS banka transferi|POS banka aktarimi/i.test(`${plan.type} ${plan.category}`)) value += 12;
  if (/POS tahsilati/i.test(plan.type || '')) value -= 25;
  if (/virman/i.test(plan.type || '')) value -= 8;
  value -= Math.min(40, amount / 5000);
  return value;
}

function simplify(item) {
  const plan = item.plan || {};
  return {
    pending_bank_movement_id: item.pending_bank_movement_id,
    bank_name: item.bank_name,
    transaction_date: item.transaction_date,
    transaction_time: item.transaction_time || '',
    amount: signedAmount(item),
    balance_after: item.balance_after,
    type: plan.type,
    target: plan.target,
    account: plan.account,
    source_account: plan.source_account,
    target_account: plan.target_account,
    counterparty: plan.counterparty,
    category: plan.category,
    confidence: plan.confidence,
    risk_class: riskClass(item),
    is_pilot_bank: isPilotBank(item),
    requires_user_review: !!plan.requires_user_review,
    reasons: plan.reasons || [],
    description: item.description,
    next_step_after_user_approval: plan.next_step_after_user_approval,
  };
}

function main() {
  const report = readJson(input);
  const plans = Array.isArray(report.plans) ? report.plans : [];
  const sortedCandidates = plans
    .filter(item => riskClass(item) !== 'review')
    .map(item => ({ item, score: score(item) }))
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => simplify(item));
  const pilotCandidates = sortedCandidates.filter(item => item.is_pilot_bank);
  const candidates = pilotCandidates.length ? pilotCandidates : sortedCandidates;
  const lowRisk = candidates.filter(item => item.risk_class === 'low');
  const result = {
    created_at: new Date().toISOString(),
    source: input,
    company_id: report.company_id || 'alayli',
    safe_mode: true,
    pilot_bank: pilotBank,
    pilot_scope_applied: pilotCandidates.length > 0,
    summary: {
      preview_count: plans.length,
      candidate_count: candidates.length,
      total_candidate_count_before_pilot_scope: sortedCandidates.length,
      pilot_candidate_count: pilotCandidates.length,
      low_risk_count: lowRisk.length,
      review_count: plans.filter(item => riskClass(item) === 'review').length,
    },
    recommended_first_approval: lowRisk[0] || candidates[0] || null,
    candidates: candidates.slice(0, 20),
  };

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2), 'utf8');

  console.log('AperiON banka onay guvenli aday secimi');
  console.log(`Pilot banka: ${pilotBank}`);
  console.log(`Pilot filtresi uygulandi: ${result.pilot_scope_applied ? 'evet' : 'hayir'}`);
  console.log(`Preview: ${result.summary.preview_count}`);
  console.log(`Aday: ${result.summary.candidate_count}`);
  console.log(`Dusuk risk: ${result.summary.low_risk_count}`);
  console.log(`Inceleme isteyen: ${result.summary.review_count}`);
  if (result.recommended_first_approval) {
    const r = result.recommended_first_approval;
    console.log(`Onerilen ilk aday: ${r.transaction_date} ${r.bank_name} ${r.amount} TL -> ${r.type} / ${r.counterparty} / guven ${r.confidence}%`);
    console.log(`ID: ${r.pending_bank_movement_id}`);
  } else {
    console.log('Onerilen aday yok.');
  }
  console.log(`Output: ${output}`);
}

main();