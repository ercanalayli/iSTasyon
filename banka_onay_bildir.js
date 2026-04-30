const { createClient } = require('@supabase/supabase-js');

const args = process.argv.slice(2);
const LIMIT = Number(args[args.indexOf('--limit') + 1] || process.env.BANK_NOTIFY_LIMIT || 10);
const ONLY_ID = args.includes('--id') ? Number(args[args.indexOf('--id') + 1]) : null;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW';
const TABLE = process.env.BANK_TABLE || 'bank_transactions';
const APPROVAL_BASE = process.env.APERION_APPROVAL_BASE || 'https://ercanalayli.github.io/iSTasyon/banka_onay.html';
const PHONE = process.env.APERION_WP_PHONE || process.env.CALLMEBOT_PHONE || '';
const APIKEY = process.env.APERION_WP_KEY || process.env.CALLMEBOT_APIKEY || '';

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

function tl(n) {
  return Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function linkFor(row) {
  const u = new URL(APPROVAL_BASE);
  u.searchParams.set('id', row.id);
  u.searchParams.set('token', row.onay_token || '');
  return u.toString();
}

function mesaj(row) {
  return [
    Number(row.sinif_guven || 0) === 100 ? 'AperiON banka onayi' : 'AperiON bilmiyor - ogretmen gerekiyor',
    `ID: ${row.id}`,
    `Firma: ${row.firma_id || '-'}`,
    `Tarih: ${row.tarih || '-'}`,
    `Tip: ${row.tur || 'bekleyen'}`,
    `Guven: ${Number(row.sinif_guven || 0)}/100`,
    `Hesap: ${row.hesap || row.banka || '-'}`,
    `Cari/Karsi: ${row.cari_unvan || row.karsi_taraf || '-'}`,
    `Tutar: ${tl(row.tutar)} TL`,
    `Aciklama: ${(row.aciklama || '').slice(0, 220)}`,
    '',
    `Onay/Reddet: ${linkFor(row)}`,
  ].join('\n');
}

async function wpGonder(text) {
  if (!PHONE || !APIKEY) throw new Error('Telefon/API key yok. APERION_WP_PHONE ve APERION_WP_KEY gerekli.');
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(PHONE)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(APIKEY)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CallMeBot HTTP ${res.status}`);
}

async function bildirimleriAl() {
  let q = db.from(TABLE)
    .select('*')
    .eq('onay_durumu', 'bekliyor')
    .or('bildirim_durumu.is.null,bildirim_durumu.neq.gonderildi')
    .order('tarih', { ascending: true })
    .limit(LIMIT);
  if (ONLY_ID) q = q.eq('id', ONLY_ID);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

async function isaretle(row, durum, text) {
  const { error } = await db.from(TABLE).update({
    bildirim_durumu: durum,
    bildirim_mesaj: text.slice(0, 1000),
    bildirim_tarihi: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', row.id);
  if (error) console.log(`Isaretleme hatasi ${row.id}: ${error.message}`);
}

async function main() {
  const rows = await bildirimleriAl();
  if (!rows.length) {
    console.log('Bekleyen bildirim yok.');
    return;
  }
  for (const row of rows) {
    const text = mesaj(row);
    try {
      await wpGonder(text);
      await isaretle(row, 'gonderildi', text);
      console.log(`Gonderildi: ${row.id}`);
    } catch (e) {
      await isaretle(row, 'hata', e.message);
      console.log(`Hata ${row.id}: ${e.message}`);
    }
  }
}

main().catch(e => {
  console.error('GENEL HATA:', e.message);
  process.exitCode = 1;
});
