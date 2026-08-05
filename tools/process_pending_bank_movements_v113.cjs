// 2026-08-05: Ercan'in istegi - Telegram onayini iptal et, carisi bilinen
// hareketleri direkt BizimHesap'a isle, bilinmeyenleri Emanet'e at, sonunda
// rapor ver. pending_bank_movements -> classifyBankMovement() -> (dry-run'da
// sadece rapor, --commit'te) bank_transactions'a onay_durumu='onaylandi'
// olarak yazar (Telegram adimi atlanir), pending_bank_movements.status
// 'promoted' olarak isaretlenir. requires_user_review=true olanlara HIC
// dokunulmaz (ornek: "Halka Arz Ediliyor" bulten mailleri gibi gercek banka
// hareketi olmayanlar) - onlar 'pending' kalir, elle bakilir.
const { createClient } = require('@supabase/supabase-js');
const { classifyBankMovement } = require('./bank_posting_plan.cjs');

const COMMIT = process.argv.includes('--commit');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW';
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

function tl(n) { return Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function turFromKind(kind) {
  if (kind === 'customer_collection') return 'cari_tahsilat';
  if (kind === 'bank_transfer') return 'transfer';
  if (kind === 'bank_unmatched_incoming') return 'tahsilat'; // hesapFormuAc 'giris' (genel para girisi) tetikler
  return 'banka_gider'; // bank_fee_expense, tax_or_sgk_payment, utility_bill_payment, credit_card_payment, supplier_or_expense_payment
}

async function main() {
  const FROM_DATE = process.env.FROM_DATE || '2026-07-01';
  const TO_DATE = process.env.TO_DATE || '2026-08-31';
  const { data: rows, error } = await db.from('pending_bank_movements').select('*').eq('status', 'pending').gte('transaction_date', FROM_DATE).lte('transaction_date', TO_DATE).order('transaction_date', { ascending: true }).limit(1000);
  if (error) throw new Error(error.message);

  const autoPost = [], emanet = [], needsReview = [];
  for (const row of rows || []) {
    const { plan } = classifyBankMovement(row);
    if (plan.requires_user_review) { needsReview.push({ row, plan }); continue; }
    if (plan.emanet_routed) { emanet.push({ row, plan }); continue; }
    autoPost.push({ row, plan });
  }

  console.log(`=== ${COMMIT ? 'CANLI YAZIM' : 'DRY RUN - hicbir sey yazilmadi'} ===`);
  console.log(`Toplam bekleyen: ${rows.length}`);
  console.log(`\n--- OTOMATIK ISLENECEK (bilinen cari/kalip, ${autoPost.length} kayit) ---`);
  autoPost.forEach(({ row, plan }) => console.log(`  ${plan.date} | ${tl(plan.amount)} TL | ${plan.type} | ${plan.counterparty} | guven:${plan.confidence}`));
  console.log(`\n--- EMANET'E YONLENDIRILECEK (karsi taraf bilinmiyor, ${emanet.length} kayit) ---`);
  emanet.forEach(({ row, plan }) => console.log(`  ${plan.date} | ${tl(plan.amount)} TL | ${plan.description.slice(0, 80)}`));
  console.log(`\n--- ELLE INCELEME GEREKIYOR (${needsReview.length} kayit, dokunulmadi) ---`);
  needsReview.slice(0, 15).forEach(({ row, plan }) => console.log(`  ${plan.date} | ${tl(plan.amount)} TL | guven:${plan.confidence} | ${plan.description.slice(0, 70)}`));
  if (needsReview.length > 15) console.log(`  ... ve ${needsReview.length - 15} tane daha`);

  if (!COMMIT) { console.log('\nCanli yazmak icin: node tools/process_pending_bank_movements_v113.cjs --commit'); return; }

  let ok = 0, fail = 0;
  for (const { row, plan } of [...autoPost, ...emanet]) {
    const tutar = plan.amount * (row.amount_out > 0 ? -1 : 1);
    const { error: insErr } = await db.from('bank_transactions').insert({
      firma_id: 'alayli',
      banka: plan.bank_name,
      hesap: plan.account,
      tarih: plan.date,
      aciklama: plan.description,
      karsi_taraf: plan.counterparty,
      cari_unvan: plan.kind === 'customer_collection' ? plan.counterparty : null,
      tutar,
      tur: turFromKind(plan.kind),
      onay_durumu: 'onaylandi',
      sinif_guven: plan.confidence,
      sinif_kaynak: 'bank_posting_plan_v113',
      emanet_routed: plan.emanet_routed,
      kaynak: 'pending_bank_movements_v113',
    });
    if (insErr) { console.log(`HATA #${row.id}: ${insErr.message}`); fail++; continue; }
    await db.from('pending_bank_movements').update({ status: 'promoted', approval_note: 'AperiON otomatik (Telegram atlandi, v113)' }).eq('id', row.id);
    ok++;
  }
  console.log(`\nBank_transactions'a yazildi: ${ok}, hata: ${fail}. Simdi bizimhesap_banka_bot.cjs bunlari gercek BizimHesap'a isleyebilir.`);
}

main().catch(e => { console.error('GENEL HATA:', e.message); process.exitCode = 1; });
