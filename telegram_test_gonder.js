const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_IDS = (process.env.TELEGRAM_CHAT_IDS || '').split(',').map(x => x.trim()).filter(Boolean);

async function main() {
  if (!TOKEN || !CHAT_IDS.length) throw new Error('TELEGRAM_BOT_TOKEN ve TELEGRAM_CHAT_IDS gerekli.');
  for (const chatId of CHAT_IDS) {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `AperiON test bildirimi\n${new Date().toLocaleString('tr-TR')}`,
      }),
    });
    if (!res.ok) throw new Error(`Telegram HTTP ${res.status}`);
    console.log(`Gonderildi: ${chatId}`);
  }
}

main().catch(e => {
  console.error('HATA:', e.message);
  process.exitCode = 1;
});

