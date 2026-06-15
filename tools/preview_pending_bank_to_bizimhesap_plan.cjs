const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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
  const incoming = amountIn(row) > 0;
  const text = normalize([
    row.description,
    row.detected_type,
    row.suggested_counterparty,
    row.mail_subject,
    row.attachment_name,
  ].filter(Boolean).join(' '));
  let type = incoming ? 'Cari tahsilat' : 'Cari odeme';
  let target = 'BizimHesap banka/kasa';
  let category = incoming ? 'Tahsilat' : 'Odeme';
  let cari = counterpartyGuess(row);
  let confidence = Number(row.confidence_score || 0) || (incoming ? 72 : 70);
  const reasons = [];

  if (incoming) reasons.push('banka alacak/giris');
  if (amountOut(row) > 0) reasons.push('banka borc/cikis');
  if (incoming && /POS|NET SATIS|KREDI KART|BATCH YATAN/.test(text)) {
    type = 'POS tahsilati'; category = 'Satis tahsilati'; cari = 'POS / Kart musterileri'; confidence = Math.max(confidence, 88); reasons.push('POS aciklamasi');
  }
  if (/KOMISYON|BSMV|UCRET|MASRAF|KATKI PAYI/.test(text) || (amountOut(row) > 0 && /POS|KREDI KART|UYE ISYERI/.test(text))) {
    type = 'Banka/POS masrafi'; target = 'BizimHesap gider/masraf kaydi'; category = 'Banka masrafi'; cari = bankName(row); confidence = Math.max(confidence, 90); reasons.push('komisyon/masraf');
  }
  if (/VIRMAN|HESAPLAR ARASI/.test(text)) {
    type = 'Banka virmani'; target = 'BizimHesap banka virmani'; category = 'Bankalar arasi transfer'; cari = 'Banka ici virman'; confidence = Math.max(confidence, 84); reasons.push('virman');
  }
  if (/KREDI KART BORC|KART BORC/.test(text)) {
    type = 'Kredi karti odemesi'; target = 'BizimHesap banka/kredi karti virmani'; category = 'Kredi karti borc odemesi'; cari = 'Kredi karti'; confidence = Math.max(confidence, 86); reasons.push('kart borcu');
  }
  if (/SGK|VERGI|KDV|STOPAJ/.test(text)) {
    type = 'Vergi/SGK odemesi'; target = 'BizimHesap gider/odeme kaydi'; category = 'Vergi/SGK'; cari = 'Vergi/SGK'; confidence = Math.max(confidence, 84); reasons.push('vergi/sgk');
  }
  if (/ELEKTRIK|ULUDAG|SU |DOGALGAZ|TELEKOM|TURKCELL|VODAFONE|TURKNET/.test(text)) {
    type = 'Fatura odemesi'; target = 'BizimHesap gider/odeme kaydi'; category = 'Sabit gider faturasi'; confidence = Math.max(confidence, 82); reasons.push('fatura anahtar kelimesi');
  }

  return {
    pending_bank_movement_id: row.id,
    bank_name: bankName(row),
    transaction_date: row.transaction_date,
    transaction_time: row.transaction_time || '',
    amount_in: amountIn(row),
    amount_out: amountOut(row),
    balance_after: Number(row.balance_after || 0),
    description: fixMojibake(row.description || ''),
    duplicate_key: row.duplicate_key || '',
    plan: {
      target,
      type,
      account: `${bankName(row)} banka hesabi`,
      counterparty: cari,
      category,
      confidence: Math.min(99, Math.round(confidence)),
      reasons: [...new Set(reasons)].slice(0, 5),
      requires_user_review: confidence < 84 || cari === 'Cari eslestirme onayda',
      next_step_after_user_approval: 'approve_pending_bank_movement RPC -> bizimhesap_queue.status=ready_for_bizimhesap',
    },
  };
}

async function main() {
  const { data, error } = await db.from('pending_bank_movements')
    .select('*')
    .eq('company_id', company)
    .in('status', ['pending', 'needs_review'])
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
