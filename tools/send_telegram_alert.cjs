const fs = require('fs');

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const message = process.env.TELEGRAM_MESSAGE || process.argv.slice(2).join(' ') || 'AperiON alarm';

async function main() {
  if (!token || !chatId) {
    console.log('Telegram secret yok, alarm atlandi.');
    process.exit(0);
  }
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message })
  });
  const text = await res.text();
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/telegram-alert-result.txt', text);
  if (!res.ok) throw new Error(text);
  console.log('Telegram alarm gonderildi.');
}

main().catch(err => {
  console.error(err.message || err);
  process.exitCode = 1;
});
