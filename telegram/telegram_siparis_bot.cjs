#!/usr/bin/env node
/**
 * telegram_siparis_bot.cjs
 *
 * AMAC: Telegram'daki belirli bir grup/sohbete yazilan siparis mesajlarini
 * ("Ilkbahar Eczanesi 8 paket Jender XXL" gibi) okur, Supabase'deki
 * customers ve product_raw tablolariyla eslestirir, siparis_havuzu'na yazar,
 * ve eslestirme sonucunu ozet kart olarak Telegram'a geri gonderir.
 *
 * ORTAM DEGISKENLERI:
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_SIPARIS_CHAT_ID
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * KULLANIM:
 *   node telegram_siparis_bot.cjs           → surekli calisir (polling)
 *   node telegram_siparis_bot.cjs --once    → bekleyen mesajlari bir kez isler, cikar
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');

const ONCE = process.argv.includes('--once');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TARGET_CHAT_ID = process.env.TELEGRAM_SIPARIS_CHAT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TELEGRAM_BOT_TOKEN || !TARGET_CHAT_ID || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    '[HATA] TELEGRAM_BOT_TOKEN / TELEGRAM_SIPARIS_CHAT_ID / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY eksik.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const TG_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

function benzerlikSkoru(mesaj, aday) {
  const m = mesaj.toLocaleLowerCase('tr').split(/\s+/).filter(Boolean);
  const a = aday.toLocaleLowerCase('tr');
  if (!m.length) return 0;
  const eslesen = m.filter((kelime) => kelime.length > 2 && a.includes(kelime));
  return Math.round((eslesen.length / m.length) * 100);
}

async function cariEslestir(mesaj) {
  const { data: adaylar, error } = await supabase
    .from('customers')
    .select('id, cari_unvan')
    .limit(5000);
  if (error) throw error;

  let enIyi = null;
  for (const aday of adaylar) {
    const skor = benzerlikSkoru(mesaj, aday.cari_unvan || '');
    if (!enIyi || skor > enIyi.skor) enIyi = { ...aday, skor };
  }
  return enIyi;
}

async function urunEslestir(mesaj) {
  const { data: adaylar, error } = await supabase
    .from('product_raw')
    .select('urun_kod, urun, satis_fiyat')
    .eq('firma_id', 'alayli')
    .limit(5681);
  if (error) throw error;

  let enIyi = null;
  for (const aday of adaylar) {
    const skor = benzerlikSkoru(mesaj, aday.urun || '');
    if (!enIyi || skor > enIyi.skor) enIyi = { ...aday, skor };
  }
  return enIyi;
}

function miktarCikar(mesaj) {
  const eslesme = mesaj.match(/(\d+)/);
  return eslesme ? parseInt(eslesme[1], 10) : null;
}

async function telegramGonder(chatId, text) {
  await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

async function islePayload(msg) {
  const chatId = String(msg.chat.id);
  if (chatId !== String(TARGET_CHAT_ID)) {
    return;
  }

  const metin = msg.text || '';
  if (!metin.trim()) return;

  console.log(`[GELEN] ${metin}`);

  const [cari, urun] = await Promise.all([cariEslestir(metin), urunEslestir(metin)]);
  const miktar = miktarCikar(metin);

  const { data: kayit, error } = await supabase
    .from('siparis_havuzu')
    .insert({
      kaynak: 'telegram',
      telegram_chat_id: chatId,
      telegram_message_id: String(msg.message_id),
      telegram_gonderen: msg.from?.first_name || msg.from?.username || 'bilinmiyor',
      ham_mesaj: metin,
      cari_id: cari?.skor >= 50 ? cari.id : null,
      cari_unvan_bulunan: cari?.cari_unvan || null,
      cari_eslesme_guven: cari?.skor ?? 0,
      urun_kod: urun?.urun_kod || null,
      urun_bulunan: urun?.urun || null,
      urun_eslesme_guven: urun?.skor ?? 0,
      miktar,
      liste_fiyat: urun?.satis_fiyat || null,
      durum: cari?.skor >= 50 && urun?.skor >= 50 ? 'onay_bekliyor' : 'eslesti',
    })
    .select()
    .single();

  if (error) {
    console.error('[HATA] siparis_havuzu yazilamadi:', error.message);
    await telegramGonder(chatId, `⚠️ Siparişi kaydederken hata oluştu: ${error.message}`);
    return;
  }

  const guvenUyari = (skor) => (skor >= 70 ? '✅' : skor >= 40 ? '⚠️' : '❌');
  const ozet = [
    `📦 <b>Yeni sipariş algılandı</b>`,
    ``,
    `Cari: ${guvenUyari(cari?.skor ?? 0)} ${cari?.cari_unvan || 'bulunamadı'} (%${cari?.skor ?? 0} eşleşme)`,
    `Ürün: ${guvenUyari(urun?.skor ?? 0)} ${urun?.urun || 'bulunamadı'} (%${urun?.skor ?? 0} eşleşme)`,
    miktar ? `Miktar: ${miktar}` : `Miktar: (belirlenemedi, elle kontrol et)`,
    urun?.satis_fiyat ? `Liste fiyatı: ${urun.satis_fiyat} TL` : '',
    ``,
    kayit.durum === 'onay_bekliyor'
      ? `Eşleşme güvenli görünüyor. Onaylamak için dashboard'daki Sipariş Havuzu'na bak.`
      : `⚠️ Eşleşme güven eşiğinin altında (cari veya ürün %50'nin altında) — elle kontrol gerekiyor.`,
  ]
    .filter(Boolean)
    .join('\n');

  await telegramGonder(chatId, ozet);
}

async function main() {
  let offset = 0;
  console.log(`[BASLADI] Mod: ${ONCE ? 'tek seferlik' : 'surekli polling'} | Hedef chat: ${TARGET_CHAT_ID}`);

  do {
    const res = await fetch(`${TG_API}/getUpdates?offset=${offset}&timeout=${ONCE ? 0 : 25}`);
    const data = await res.json();

    if (!data.ok) {
      console.error('[HATA] Telegram getUpdates basarisiz:', data.description);
      break;
    }

    for (const update of data.result) {
      offset = update.update_id + 1;
      if (update.message) {
        await islePayload(update.message).catch((e) =>
          console.error('[HATA] Mesaj islenirken:', e.message)
        );
      }
    }

    if (ONCE) break;
  } while (true);

  console.log('[BITTI]');
}

main().catch((e) => {
  console.error('[BEKLENMEYEN HATA]', e.message);
  process.exit(1);
});
