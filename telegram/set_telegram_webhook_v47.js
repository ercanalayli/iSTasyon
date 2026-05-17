/* AperiON Telegram setWebhook v47
   Purpose: register Telegram webhook URL for AperiON finance assistant.

   ENV:
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_WEBHOOK_URL=https://your-domain.com/telegram/webhook/SECRET

   Optional:
   TELEGRAM_DROP_PENDING=true
*/

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;
const DROP_PENDING = String(process.env.TELEGRAM_DROP_PENDING || 'true').toLowerCase() !== 'false';

function requireEnv(){
  const missing = [];
  if(!TELEGRAM_BOT_TOKEN) missing.push('TELEGRAM_BOT_TOKEN');
  if(!TELEGRAM_WEBHOOK_URL) missing.push('TELEGRAM_WEBHOOK_URL');
  if(missing.length) throw new Error('Missing env: ' + missing.join(', '));
}

async function main(){
  requireEnv();
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`;
  const body = {
    url: TELEGRAM_WEBHOOK_URL,
    drop_pending_updates: DROP_PENDING,
    allowed_updates: ['message', 'callback_query']
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
  if(!res.ok || !json.ok){
    process.exitCode = 1;
  }
}

if(require.main === module){
  main().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = { main };
