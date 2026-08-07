// Yerel dinleyici (tools/aperion_command_listener.cjs) 'gunluk_mutabakat'
// komutunu tamamladiktan sonra sonucu bot_commands.result'a yazar. Bu
// script (GitHub Actions'ta, Telegram sirlariyla) en son tamamlanmis ve
// henuz Telegram'a gonderilmemis mutabakat sonucunu bulup gonderir.
const { createClient } = require('@supabase/supabase-js');

const args = process.argv.slice(2);
const SEND = args.includes('--send');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_IDS = (process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_ALLOWED_CHAT_ID || '')
  .split(',').map(x => x.trim()).filter(Boolean);

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

async function telegramGonder(text) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_IDS.length) throw new Error('Telegram token/chat yok.');
  for (const chatId of TELEGRAM_CHAT_IDS) {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!res.ok) throw new Error(`Telegram HTTP ${res.status}`);
  }
}

async function main() {
  const { data, error } = await db.from('bot_commands')
    .select('id,result,completed_at')
    .eq('command', 'gunluk_mutabakat')
    .eq('status', 'completed')
    .is('bildirim_gonderildi', null)
    .order('completed_at', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  if (!data || !data.length) { console.log('Bildirilecek yeni mutabakat sonucu yok.'); return; }
  const row = data[0];
  console.log(row.result);
  if (!SEND) { console.log('(onizleme - gondermek icin --send ekleyin)'); return; }
  await telegramGonder(row.result);
  await db.from('bot_commands').update({ bildirim_gonderildi: true }).eq('id', row.id);
  console.log('Gonderildi.');
}

main().catch(e => { console.error('HATA:', e.message); process.exitCode = 1; });
