// 2026-08-03: Ercan'in acik onayiyla - "100/100 guvendiklerini ilgili carilere
// yada kasaya islersin". bank_transactions'ta onay_durumu='bekliyor' VE
// sinif_guven=100 olan kayitlari, Telegram'da elle tiklamayi beklemeden
// otomatik onaylanmis (onay_durumu='onaylandi') isaretler. Bundan sonra zaten
// var olan bizimhesap_banka_bot.js bu kayitlari alip GERCEK cari/kasaya isler
// (o script kendi --commit/--save kilidiyle korunuyor, burada DEGISTIRILMEDI).
//
// Varsayilan: DRY RUN (hicbir sey yazmaz, sadece ne yapacagini listeler).
// --commit verilirse: onay_durumu='onaylandi' olarak GUNCELLER (banka
// hareketinin kendisini degil, sadece onay durumunu degistirir - gercek
// BizimHesap yazma islemi hala ayri, ayri korumali bir adimdir).
const { createClient } = require('@supabase/supabase-js');

const COMMIT = process.argv.includes('--commit');
const LIMIT = Number(process.argv[process.argv.indexOf('--limit') + 1]) || 500;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW';
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

function tl(n) {
  return Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function main() {
  const { data, error } = await db.from('bank_transactions')
    .select('id, tarih, tutar, tur, hesap, cari_unvan, karsi_taraf, aciklama, sinif_guven, onay_durumu')
    .eq('onay_durumu', 'bekliyor')
    .eq('sinif_guven', 100)
    .order('tarih', { ascending: true })
    .limit(LIMIT);
  if (error) throw new Error(error.message);
  const rows = data || [];
  if (!rows.length) {
    console.log('Onay bekleyen %100 guvenli kayit yok.');
    return;
  }
  const toplam = rows.reduce((s, r) => s + Number(r.tutar || 0), 0);
  console.log(`${COMMIT ? '[CANLI YAZIM]' : '[DRY RUN - hicbir sey yazilmadi]'} ${rows.length} kayit, toplam ${tl(toplam)} TL`);
  console.log('---');
  rows.forEach(r => {
    console.log(`#${r.id} | ${r.tarih} | ${tl(r.tutar)} TL | ${r.tur} | hesap: ${r.hesap || '-'} | cari/karsi: ${r.cari_unvan || r.karsi_taraf || '-'}`);
    console.log(`   aciklama: ${(r.aciklama || '').slice(0, 140)}`);
  });
  console.log('---');
  if (!COMMIT) {
    console.log(`Bu bir DRY RUN. Gercekten onaylamak icin: node tools/auto_approve_high_confidence_bank_v111.cjs --commit`);
    return;
  }
  let ok = 0, fail = 0;
  for (const r of rows) {
    const { error: uErr } = await db.from('bank_transactions')
      .update({ onay_durumu: 'onaylandi', updated_at: new Date().toISOString() })
      .eq('id', r.id)
      .eq('onay_durumu', 'bekliyor'); // yaris durumu koruma: baskasi/baska surec bu arada onaylamissa uzerine yazma
    if (uErr) { console.log(`HATA #${r.id}: ${uErr.message}`); fail++; }
    else { ok++; }
  }
  console.log(`Onaylandi: ${ok}, hata: ${fail}. Simdi bizimhesap_banka_bot.js bu kayitlari gercek kasaya/cariye isleyebilir (kendi onay kilidiyle).`);
}

main().catch(e => { console.error('GENEL HATA:', e.message); process.exitCode = 1; });
