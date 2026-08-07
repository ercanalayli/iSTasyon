// bot_commands'e 'bizimhesap_cari_bakiye_sync' komutu ekler. Yerel dinleyici
// (tools/aperion_command_listener.cjs) calisiyorsa 15 saniye icinde alip
// BizimHesap musteri listesindeki (5700+ cari) acik bakiyeleri tarar,
// public.customers tablosuna yazar.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data, error } = await db.from('bot_commands').insert({ command: 'bizimhesap_cari_bakiye_sync' }).select('id').single();
  if (error) throw new Error(error.message);
  console.log('Kuyruga eklendi, bot_commands id:', data.id);
}

main().catch(e => { console.error('HATA:', e.message); process.exitCode = 1; });
