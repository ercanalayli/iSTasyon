#!/usr/bin/env node
/**
 * build_hasta_bezi_bizimhesap_data_v126.cjs
 *
 * AMAC: Hasta Bezi (ve genel olarak Alayli) tedarikci/musteri alis-satis
 * gecmisini BizimHesap'tan (bizimhesap-b2b edge function uzerinden) cekip
 * Supabase purchase_raw / customers tablolarina yazar.
 *
 * GUVENLIK KURALI: Bu script varsayilan olarak DRY-RUN modunda calisir.
 * Yani Supabase'e YAZMAZ, sadece ne yazacagini konsola ve bot_logs'a basar.
 * Gercekten yazmasi icin --commit bayragi ACIKCA verilmelidir.
 *
 * KULLANIM:
 *   node build_hasta_bezi_bizimhesap_data_v126.cjs                → dry-run, ilk 5 tedarikci (pilot)
 *   node build_hasta_bezi_bizimhesap_data_v126.cjs --limit=10     → dry-run, ilk 10 tedarikci
 *   node build_hasta_bezi_bizimhesap_data_v126.cjs --commit       → GERCEKTEN YAZAR (dikkatli kullan)
 *
 * ORTAM DEGISKENLERI (env):
 *   SUPABASE_URL                  → https://iilfwosoroflzubkaryj.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY     → service_role key (RLS'i atlar, sadece sunucu tarafinda kullan)
 *   BIZIMHESAP_EDGE_FN_URL        → https://iilfwosoroflzubkaryj.supabase.co/functions/v1/bizimhesap-b2b
 *
 * NOT: Bu dosya sifirdan, mevcut bizimhesap-b2b edge function'in (products,
 * customers, abstract, process_queue action'lari) sozlesmesine gore yazildi.
 * Eger projede zaten farkli bir Supabase client/env-var kalibi kullaniliyorsa
 * (ornegin ../lib/supabaseClient.js gibi paylasilan bir modul varsa), o
 * modulu import etmek bu dosyadaki tekrari azaltir - ilk calistirmadan once
 * kontrol et.
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');

// ---------- Argumanlar ----------
const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 5; // pilot: varsayilan 5 tedarikci

// ---------- Ortam kontrolu ----------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EDGE_FN_URL =
  process.env.BIZIMHESAP_EDGE_FN_URL ||
  (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/bizimhesap-b2b` : null);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !EDGE_FN_URL) {
  console.error(
    '[HATA] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / BIZIMHESAP_EDGE_FN_URL ortam degiskenleri eksik.'
  );
  console.error('Bu bilgiler .env dosyasinda veya Task Scheduler ortaminda tanimli olmali.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ---------- Yardimci: edge function cagirma ----------
async function callEdge(action, params = {}) {
  const qs = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`${EDGE_FN_URL}?${qs}`, {
    headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(`Edge function hatasi (${action}): ${data.error || res.status}`);
  }
  return data;
}

// ---------- Log yardimcisi (bot_logs tablosuna yazar - dry-run'da da yazilir, cunku bu sadece log) ----------
async function log(mesaj, seviye = 'info') {
  console.log(`[${seviye.toUpperCase()}] ${mesaj}`);
  try {
    await supabase.from('bot_logs').insert({
      firma_id: 'alayli',
      kaynak: 'build_hasta_bezi_bizimhesap_data_v126',
      seviye,
      mesaj,
      olusturma_tarihi: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[UYARI] bot_logs yazilamadi:', e.message);
  }
}

// ---------- Ana akis ----------
async function main() {
  await log(
    `Baslatildi. Mod: ${COMMIT ? 'COMMIT (gercek yazma)' : 'DRY-RUN (sadece log)'} | Limit: ${LIMIT} tedarikci`
  );

  let customersResp;
  try {
    customersResp = await callEdge('customers');
  } catch (e) {
    await log(`Tedarikci/musteri listesi cekilemedi: ${e.message}`, 'error');
    process.exit(1);
  }

  const allCustomers = Array.isArray(customersResp) ? customersResp : customersResp.data || [];
  const pilotList = allCustomers.slice(0, LIMIT);

  await log(`Toplam ${allCustomers.length} kayit bulundu. Pilot olarak ilk ${pilotList.length} tanesi islenecek.`);

  const results = [];

  for (const musteri of pilotList) {
    const musteriId = musteri.customerId || musteri.id || musteri.CustomerId;
    const unvan = musteri.title || musteri.Title || musteri.unvan || '(isim yok)';

    if (!musteriId) {
      await log(`Atlandi (ID yok): ${unvan}`, 'warn');
      continue;
    }

    try {
      const ekstre = await callEdge('abstract', { musteriId });
      const hareketSayisi = Array.isArray(ekstre) ? ekstre.length : (ekstre.data || []).length;

      await log(`${unvan} (ID: ${musteriId}) → ${hareketSayisi} hareket bulundu.`);

      if (COMMIT) {
        const { error } = await supabase.from('purchase_raw').upsert(
          (Array.isArray(ekstre) ? ekstre : ekstre.data || []).map((hareket) => ({
            firma_id: 'alayli',
            tedarikci_id: musteriId,
            tedarikci_unvan: unvan,
            kaynak: 'bizimhesap_api_abstract',
            ham_veri: hareket,
            senkron_tarihi: new Date().toISOString(),
          })),
          { onConflict: 'tedarikci_id,kaynak' }
        );
        if (error) throw error;
        await log(`${unvan} → purchase_raw'e yazildi (${hareketSayisi} kayit).`);
      } else {
        await log(`[DRY-RUN] ${unvan} → ${hareketSayisi} kayit yazilacakti, yazilmadi.`);
      }

      results.push({ musteriId, unvan, hareketSayisi, ok: true });
    } catch (e) {
      await log(`${unvan} (ID: ${musteriId}) islenirken hata: ${e.message}`, 'error');
      results.push({ musteriId, unvan, ok: false, error: e.message });
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  const basarili = results.filter((r) => r.ok).length;
  const basarisiz = results.filter((r) => !r.ok).length;

  await log(
    `Tamamlandi. Basarili: ${basarili} | Basarisiz: ${basarisiz} | Mod: ${COMMIT ? 'COMMIT' : 'DRY-RUN'}`
  );

  if (!COMMIT) {
    await log(
      'Bu calisma DRY-RUN modundaydi, hicbir veri yazilmadi. Sonuclari inceledikten sonra --commit ile tekrar calistir.'
    );
  }
}

main().catch(async (e) => {
  await log(`Beklenmeyen hata: ${e.message}`, 'error');
  process.exit(1);
});
