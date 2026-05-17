/* AperiON Telegram Webhook Server v47
   Purpose: receive Telegram updates and route them to aperion_telegram_bot_v47.js.
   Safe rule: read-only command routing. No DB writes, no BizimHesap writes.

   ENV:
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_WEBHOOK_SECRET=optional-secret-path-token
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   PORT=3000

   Routes:
   GET  /health
   POST /telegram/webhook/:secret?
*/

const http = require('http');
const { handleUpdate, requireEnv } = require('./aperion_telegram_bot_v47.js');

const PORT = Number(process.env.PORT || 3000);
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

function sendJson(res, status, data){
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readBody(req){
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if(data.length > 1024 * 1024) {
        req.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function routeMatchesWebhook(url){
  if(!url.startsWith('/telegram/webhook')) return false;
  if(!WEBHOOK_SECRET) return true;
  return url === `/telegram/webhook/${WEBHOOK_SECRET}`;
}

async function handler(req, res){
  try{
    if(req.method === 'GET' && req.url === '/health'){
      return sendJson(res, 200, {
        ok: true,
        service: 'aperion-telegram-webhook-v47',
        mode: 'read-only',
        time: new Date().toISOString()
      });
    }

    if(req.method === 'POST' && routeMatchesWebhook(req.url || '')){
      const raw = await readBody(req);
      let update;
      try{
        update = JSON.parse(raw || '{}');
      }catch(e){
        return sendJson(res, 400, { ok:false, error:'invalid_json' });
      }

      await handleUpdate(update);
      return sendJson(res, 200, { ok:true });
    }

    return sendJson(res, 404, { ok:false, error:'not_found' });
  }catch(e){
    console.error('Webhook error:', e);
    return sendJson(res, 500, { ok:false, error:e.message || 'server_error' });
  }
}

if(require.main === module){
  requireEnv();
  const server = http.createServer(handler);
  server.listen(PORT, () => {
    console.log(`AperiON Telegram Webhook v47 listening on :${PORT}`);
    console.log('Routes: GET /health, POST /telegram/webhook/:secret?');
  });
}

module.exports = { handler, routeMatchesWebhook, readBody };
