// 2026-08-10: Ercan'in onayiyla - gercek VakifBank ekstresinde (00158007352192509)
// var olup BizimHesap "VAKIF SIRKET" hesabinda GORULMEYEN kayitlari (once sadece
// KANITLANMIS 5 tur: Batch Yatan, Batch Komisyonu, Gelen FAST Anlik Odeme,
// Uye Isyeri Fast Komisyon, Gelen EFT Otomatik Yatan) en yakin tarihten baslayarak
// bank_transactions'a ekler ve bizimhesap_process kuyruguna alir. Once her satir
// icin bank_transactions'ta ayni tarih+tutar+hesap ile mevcut kayit var mi kontrol
// eder (cift islem koruma).
//
// Kaynak kalip (id:168,170,174,175,177,179 - zaten basariyla islenmis gercek
// kayitlardan cikarildi):
//   banka_gider turu -> karsi_taraf: "VakifBank" (VAKIF SIRKET'e dogrudan, calisiyor)
//
// 2026-08-10 (Ercan onayi): "transfer" turu (Batch Yatan/Gelen FAST/Gelen EFT,
// yani POS -> VAKIF SIRKET) icin "Hesaplar Arasi Transfer" formu 24 Haziran -
// 4 Temmuz araligindaki 20 kayitta TUTARLI sekilde basarisiz oldu (kok neden
// tam netlesmedi - Kaydet sonrasi gercek bir kaydetme istegi bile
// yakalanamadi). Ercan'in talimatiyla artik TUM "transfer" turu kayitlar
// dogrudan EMANET hesabina, DAHA GUVENILIR "Hesaba Para Girisi" formuyla
// (bizimhesapPostIncome, tur='tahsilat') giriliyor - "SINIFLANDIRMA BEKLEYEN"
// zaten bu hesabin amaci, Ercan sonradan VAKIF SIRKET'e tasir.
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'local-secrets/bizimhesap.local.env' });
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const args = process.argv.slice(2);
const LIMIT = Number((args.find(a => a.startsWith('--limit=')) || '--limit=10').split('=')[1]);
const KOMUT_KUYRUGA_AL = args.includes('--queue');

const TRANSFER_TURLERI = new Set(['Batch Yatan', 'Gelen FAST Anlık Ödeme', 'Gelen EFT Otomatik Yatan']);
const GIDER_TURLERI = new Set(['Batch Komisyonu', 'Üye İşyeri Fast Komisyon']);

async function main() {
  const eksikler = JSON.parse(fs.readFileSync('local-secrets/vakif_eksik_kayitlar.json', 'utf8'));
  const onayli = eksikler.filter(r => TRANSFER_TURLERI.has(r.tip) || GIDER_TURLERI.has(r.tip));
  onayli.sort((a, b) => b.tarih.localeCompare(a.tarih)); // en yakin tarih once
  console.log(`Onayli 5 turden toplam eksik: ${onayli.length} (limit: ${LIMIT})`);

  let eklenen = 0, atlanmis = 0, kuyruklanan = 0;
  for (const r of onayli) {
    if (eklenen >= LIMIT) break;
    const isTransfer = TRANSFER_TURLERI.has(r.tip);
    const hesap = isTransfer ? 'EMANET' : '*VAKIF SIRKET';
    const tur = isTransfer ? 'tahsilat' : 'banka_gider';
    const karsiTaraf = isTransfer ? 'VakifBank (SINIFLANDIRMA BEKLIYOR - gercek hedef: VAKIF SIRKET)' : 'VakifBank';

    // cift-islem korumasi: ayni tarih + yuvarlak tutar + (VAKIF SIRKET veya EMANET) zaten var mi?
    const { data: mevcut, error: sorguHata } = await db.from('bank_transactions')
      .select('id').in('hesap', ['*VAKIF SIRKET', 'EMANET']).eq('tarih', r.tarih)
      .gte('tutar', r.tutar - 1).lte('tutar', r.tutar + 1).limit(1);
    if (sorguHata) { console.error('Sorgu hatasi:', sorguHata.message); continue; }
    if (mevcut && mevcut.length) { atlanmis++; continue; }

    const aciklamaEk = isTransfer ? ' | EMANET yonlendirmesi: gercek hedef VAKIF SIRKET, sonradan siniflandirilmali' : '';
    const aciklama = `${r.tip} - VakifBank ekstresi (ref:${r.ref}) - AperiON gecmis tamamlama 2026-08-10${aciklamaEk}`;
    const { data: yeni, error: insertHata } = await db.from('bank_transactions').insert({
      firma_id: 'alayli',
      banka: 'VakifBank',
      hesap,
      tarih: r.tarih,
      aciklama,
      karsi_taraf: karsiTaraf,
      tutar: r.tutar,
      tur,
      onay_durumu: 'onaylandi',
      kaynak: 'vakif_ekstre_eksik_tamamlama_2026-08-10',
      sinif_kaynak: 'vakif_ekstre_eksik_tamamlama_v100',
      sinif_guven: 90,
    }).select('id').single();
    if (insertHata) { console.error('Insert hatasi:', insertHata.message, JSON.stringify(r)); continue; }
    eklenen++;
    console.log(`EKLENDI id=${yeni.id} ${r.tarih} ${r.tip} ${r.tutar}`);

    if (KOMUT_KUYRUGA_AL) {
      const { error: kuyrukHata } = await db.from('bot_commands').insert({ command: 'bizimhesap_process', params: { id: yeni.id } });
      if (kuyrukHata) console.error('Kuyruk hatasi:', kuyrukHata.message);
      else kuyruklanan++;
    }
  }
  console.log(`\nSonuc: eklenen=${eklenen} atlanmis(zaten_var)=${atlanmis} kuyruklanan=${kuyruklanan}`);
}

main().catch(e => { console.error('HATA:', e.message); process.exitCode = 1; });
