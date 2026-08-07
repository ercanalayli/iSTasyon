// AperiON'un BizimHesap'a otomatik islediği banka hareketlerini Telegram'a
// bildirir. bank_transactions.bizimhesap_durumu='kaydedildi' olup henuz
// bildirilmemis (bildirim_durumu bos veya 'gonderildi' degil) kayitlari
// alir, ozet+liste mesaji gonderir, sonra bildirim_durumu='gonderildi'
// olarak isaretler - ayni kayit iki kez bildirilmez.
const { createClient } = require('@supabase/supabase-js');

const args = process.argv.slice(2);
const SEND = args.includes('--send');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const TABLE = process.env.BANK_TABLE || 'bank_transactions';
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_IDS = (process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_ALLOWED_CHAT_ID || '')
  .split(',').map(x => x.trim()).filter(Boolean);

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

function tl(n) {
  return Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function bekleyenleriAl() {
  const { data, error } = await db.from(TABLE)
    .select('id,tarih,tutar,hesap,tur,aciklama')
    .eq('bizimhesap_durumu', 'kaydedildi')
    .or('bildirim_durumu.is.null,bildirim_durumu.neq.gonderildi')
    .order('tarih', { ascending: true });
  if (error) throw new Error(error.message);
  // 2026-08-07: id 1,4,5,6,7 Nisan 2026'dan kalma test/deneme kayitlari
  // ("TEST BANKA GIRIS" vb.) - gercek is verisi degil, silinmesi Ercan'a
  // birakildi ama bildirimi kirletmesin diye burada eleniyor.
  return (data || []).filter(r => r.id > 7 || !/^(TEST |DENEME )/i.test(r.aciklama || ''));
}

function mesajOlustur(rows) {
  const grup = new Map();
  for (const r of rows) {
    const k = r.hesap || '-';
    if (!grup.has(k)) grup.set(k, { adet: 0, toplam: 0 });
    const g = grup.get(k);
    g.adet += 1;
    g.toplam += Number(r.tutar || 0);
  }
  const satirlar = [`AperiON - BizimHesap'a islenen ${rows.length} banka hareketi`, ''];
  for (const [hesap, g] of grup) {
    satirlar.push(`${hesap}: ${g.adet} kayit, net ${tl(g.toplam)} TL`);
  }
  satirlar.push('');
  satirlar.push('Detay:');
  for (const r of rows.slice(0, 40)) {
    satirlar.push(`#${r.id} ${r.tarih} ${r.tur} ${tl(r.tutar)} TL - ${r.hesap} - ${(r.aciklama || '').slice(0, 60)}`);
  }
  if (rows.length > 40) satirlar.push(`... ve ${rows.length - 40} kayit daha`);
  return satirlar.join('\n');
}

async function telegramGonder(text) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_IDS.length) throw new Error('Telegram token/chat yok. TELEGRAM_BOT_TOKEN ve TELEGRAM_CHAT_IDS gerekli.');
  for (const chatId of TELEGRAM_CHAT_IDS) {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!res.ok) throw new Error(`Telegram HTTP ${res.status}`);
  }
}

async function isaretle(ids, durum) {
  const { error } = await db.from(TABLE).update({
    bildirim_durumu: durum,
    bildirim_tarihi: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).in('id', ids);
  if (error) console.log(`Isaretleme hatasi: ${error.message}`);
}

async function main() {
  const rows = await bekleyenleriAl();
  if (!rows.length) {
    console.log('Bildirilecek yeni islem yok.');
    return;
  }
  const text = mesajOlustur(rows);
  console.log(text);
  console.log('---');
  if (!SEND) {
    console.log(`(onizleme - gondermek icin --send ekleyin) ${rows.length} kayit gonderilecek.`);
    return;
  }
  const ids = rows.map(r => r.id);
  try {
    await telegramGonder(text);
    await isaretle(ids, 'gonderildi');
    console.log(`Gonderildi: ${ids.length} kayit bildirildi.`);
  } catch (e) {
    console.log(`Hata: ${e.message}`);
    process.exitCode = 1;
  }
}

main().catch(e => {
  console.error('GENEL HATA:', e.message);
  process.exitCode = 1;
});
