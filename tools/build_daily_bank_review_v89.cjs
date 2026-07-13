const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { classifyBankMovement, fixMojibake } = require('./bank_posting_plan.cjs');

const args = process.argv.slice(2);
const company = arg('--firma', process.env.COMPANY_ID || 'alayli');
const requestedDate = arg('--date', '');
const out = arg('--out', 'data/aperion_daily_bank_review.json');
const url = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

function arg(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function amount(plan) {
  return Number(plan.amount_in || 0) > 0 ? Number(plan.amount_in) : -Math.abs(Number(plan.amount_out || 0));
}

function shortText(value, length = 150) {
  const text = fixMojibake(value || '').replace(/\s+/g, ' ').trim();
  return text.length > length ? `${text.slice(0, length - 3)}...` : text;
}

function reviewKind(item) {
  if (item.plan.requires_counterparty_confirmation) return 'cari_dogrulama';
  if (item.plan.requires_user_review) return 'inceleme';
  return 'hazir';
}

function publicItem(item) {
  return {
    id: item.pending_bank_movement_id,
    bank: item.bank_name,
    date: item.transaction_date,
    time: item.transaction_time,
    amount: amount(item),
    description: shortText(item.description),
    review_kind: reviewKind(item),
    proposed_type: item.plan.type,
    proposed_counterparty: item.plan.counterparty,
    proposed_account: item.plan.account,
    proposed_category: item.plan.category,
    confidence: item.plan.confidence,
    question: item.plan.confirmation_question,
    duplicate_key: item.duplicate_key,
  };
}

function buildDailyReview(rows, date = '') {
  const plans = (rows || []).map(classifyBankMovement);
  const dates = plans.map(x => x.transaction_date).filter(Boolean).sort().reverse();
  const reviewDate = date || dates[0] || '';
  const items = plans.filter(x => x.transaction_date === reviewDate).map(publicItem);
  const buckets = {
    hazir: items.filter(x => x.review_kind === 'hazir'),
    cari_dogrulama: items.filter(x => x.review_kind === 'cari_dogrulama'),
    inceleme: items.filter(x => x.review_kind === 'inceleme'),
  };
  const money = list => list.reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);
  return {
    created_at: new Date().toISOString(),
    source: 'pending_bank_movements',
    company_id: company,
    review_date: reviewDate,
    rule: 'En yeni islem gunu once listelenir. Merrerler kaynak duplicate_key ile suzulur. Cari belirsizse kesin kayit yapilmaz.',
    summary: {
      total: items.length,
      hazir: buckets.hazir.length,
      cari_dogrulama: buckets.cari_dogrulama.length,
      inceleme: buckets.inceleme.length,
      total_absolute_amount: money(items),
    },
    buckets,
  };
}

async function main() {
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY gerekli. Salt-okunur gunluk rapor uretilemedi.');
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.from('pending_bank_movements')
    .select('*')
    .eq('company_id', company)
    .in('status', ['pending', 'needs_review'])
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw new Error(`pending_bank_movements okunamadi: ${error.message}`);
  const report = buildDailyReview(data || [], requestedDate);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`DAILY_REVIEW_DATE=${report.review_date || '-'}`);
  console.log(`DAILY_REVIEW_TOTAL=${report.summary.total}`);
  console.log(`DAILY_REVIEW_READY=${report.summary.hazir}`);
  console.log(`DAILY_REVIEW_COUNTERPARTY=${report.summary.cari_dogrulama}`);
  console.log(`DAILY_REVIEW_REVIEW=${report.summary.inceleme}`);
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}

module.exports = { buildDailyReview, publicItem, reviewKind, shortText };
