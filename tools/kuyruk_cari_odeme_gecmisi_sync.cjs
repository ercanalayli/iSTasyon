// bot_commands'e 'bizimhesap_cari_odeme_gecmisi_sync' komutu ekler. Yerel
// dinleyici, acik bakiyesi olan en yuksek N cariyi (varsayilan 30) tek tek
// acip "ONCEKI ODEMELERI" tablosundan son tahsilatlari
// public.customer_payments tablosuna yazar.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
const LIMIT = Number(process.argv[2] || 30);

async function main() {
  const { data, error } = await db.from('bot_commands').insert({ command: 'bizimhesap_cari_odeme_gecmisi_sync', params: { limit: LIMIT } }).select('id').single();
  if (error) throw new Error(error.message);
  console.log('Kuyruga eklendi, bot_commands id:', data.id, '| limit:', LIMIT);
}

main().catch(e => { console.error('HATA:', e.message); process.exitCode = 1; });
