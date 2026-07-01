const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { classifyBankMovement } = require('./bank_posting_plan.cjs');

const args = process.argv.slice(2);
const limit = Number(valueArg('--limit', process.env.PREVIEW_LIMIT || 25));
const company = valueArg('--firma', process.env.COMPANY_ID || 'alayli');
const out = valueArg('--out', 'data/banka_onay_bizimhesap_kayit_plani.json');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW';

const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

function valueArg(name, fallback = '') {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

function fixMojibake(value) {
  const text = String(value || '');
  if (!/[ÃÄÅÂ]/.test(text)) return text;
  try {
    const repaired = Buffer.from(text, 'latin1').toString('utf8');
    return repaired && repaired.length >= Math.min(3, text.length / 2) ? repaired : text;
  } catch {
    return text;
  }
}

function normalize(value) {
  return fixMojibake(value)
    .toLocaleUpperCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function amountIn(row) {
  return Number(row.amount_in || 0);
}

function amountOut(row) {
  return Number(row.amount_out || 0);
}

function bankName(row) {
  return fixMojibake(row.bank_name || row.banka || 'Banka');
}

function counterpartyGuess(row) {
  const explicit = fixMojibake(row.suggested_counterparty || '').trim();
  if (explicit && !/^(AKBANK|GARANTI|YAPI|VAKIF|IS BANK|BANKA|MAIL EKSTRE)$/i.test(explicit)) return explicit;
  const desc = fixMojibake(row.description || '');
  const text = normalize(desc);
  const patterns = [
    /(?:GELEN EFT|GIDEN EFT|GIDEN FAST|GELEN FAST|FAST|HAVALE|EFT)\s+([A-Z0-9 .&'-]{5,90})/,
    /(?:ALICI|GONDEREN|MUSTERI)\s+([A-Z0-9 .&'-]{5,90})/,
    /(ALAYLI MEDIKAL[^*\/,;]*)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].replace(/\s+/g, ' ').trim().slice(0, 90);
  }
  if (/POS|NET SATIS|KREDI KART|BATCH YATAN/.test(text)) return 'POS / Kart musterileri';
  if (/KOMISYON|BSMV|UCRET|MASRAF/.test(text)) return bankName(row);
  if (/VIRMAN/.test(text)) return 'Banka ici virman';
  return 'Cari eslestirme onayda';
}

function classify(row) {
  return classifyBankMovement(row);
}

async function main() {
  const { data, error } = await db.from('pending_bank_movements')
    .select('*')
    .eq('company_id', company)
    .in('status', ['pending', 'needs_review'])
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  const plans = (data || []).map(classify);
  const summary = {
    pending_count_sample: plans.length,
    high_confidence: plans.filter(x => x.plan.confidence >= 84 && !x.plan.requires_user_review).length,
    needs_review: plans.filter(x => x.plan.requires_user_review).length,
    by_type: plans.reduce((m, x) => {
      m[x.plan.type] = (m[x.plan.type] || 0) + 1;
      return m;
    }, {}),
  };
  const report = { created_at: new Date().toISOString(), source: 'pending_bank_movements', company_id: company, dry_run: true, summary, plans };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf8');

  console.log('AperiON pending bank -> BizimHesap plan preview');
  console.log(`Rows: ${plans.length}`);
  console.log(`High confidence: ${summary.high_confidence}`);
  console.log(`Needs review: ${summary.needs_review}`);
  console.log(`Output: ${out}`);
  for (const item of plans.slice(0, 8)) {
    const amount = item.amount_in > 0 ? item.amount_in : -item.amount_out;
    console.log(`- ${item.transaction_date} ${item.bank_name} ${amount} TL -> ${item.plan.type} / ${item.plan.counterparty} / guven ${item.plan.confidence}%`);
  }
}

main().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});
