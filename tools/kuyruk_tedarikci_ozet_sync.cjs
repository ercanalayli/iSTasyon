// bot_commands'e 'bizimhesap_tedarikci_ozet_sync' komutu ekler. Yerel
// dinleyici BizimHesap Alislar listesini tarayip tedarikci bazli satin
// alma hacmi ozetini (fatura sayisi, toplam tutar, ilk/son tarih)
// public.supplier_purchase_summary tablosuna yazar.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data, error } = await db.from('bot_commands').insert({ command: 'bizimhesap_tedarikci_ozet_sync' }).select('id').single();
  if (error) throw new Error(error.message);
  console.log('Kuyruga eklendi, bot_commands id:', data.id);
}

main().catch(e => { console.error('HATA:', e.message); process.exitCode = 1; });
