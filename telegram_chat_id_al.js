const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

async function main() {
  if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN yok.');
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates`);
  if (!res.ok) throw new Error(`Telegram HTTP ${res.status}`);
  const json = await res.json();
  const chats = [];
  for (const u of json.result || []) {
    const c = u.message?.chat || u.channel_post?.chat || u.my_chat_member?.chat;
    if (c?.id && !chats.some(x => String(x.id) === String(c.id))) {
      chats.push({ id: c.id, type: c.type, title: c.title || [c.first_name, c.last_name].filter(Boolean).join(' ') || c.username || '' });
    }
  }
  if (!chats.length) {
    console.log('Chat bulunamadi. Telegramda botuna once /start yaz.');
    return;
  }
  console.log(JSON.stringify(chats, null, 2));
}

main().catch(e => {
  console.error('HATA:', e.message);
  process.exitCode = 1;
});

