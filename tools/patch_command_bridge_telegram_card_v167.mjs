import fs from 'node:fs';
import path from 'node:path';

const bridgeRoot = 'C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge';
const target = path.join(bridgeRoot,'src','index.js');
const backup = target + '.pre-telegram-id-v167.bak';
const src = fs.readFileSync(target,'utf8');

if (src.includes('APERION_TELEGRAM_CARD_ID_V167')) {
  console.log(JSON.stringify({ok:true,status:'ALREADY_PATCHED',target},null,2));
  process.exit(0);
}

const marker = 'BİZİMHESAP TRANSFER ONAYI';
if (!src.includes(marker)) {
  console.error(JSON.stringify({ok:false,status:'BLOCKED',reason:'approval_card_marker_not_found',target},null,2));
  process.exit(2);
}

const sendFnPatterns = [
  /async function (sendTelegramMessage|telegramSendMessage|sendMessage)\s*\(([^)]*)\)\s*\{/,
  /const (sendTelegramMessage|telegramSendMessage|sendMessage)\s*=\s*async\s*\(([^)]*)\)\s*=>\s*\{/,
];

let match=null;
for (const re of sendFnPatterns) {
  const m=src.match(re);
  if (m) { match=m; break; }
}
if (!match) {
  console.error(JSON.stringify({ok:false,status:'BLOCKED',reason:'telegram_send_function_not_found',target},null,2));
  process.exit(3);
}

const params = match[2].split(',').map(s=>s.trim()).filter(Boolean);
const textParam = params.find(p=>/^(text|message|body)$/.test(p.replace(/=.*$/,'').trim()))?.replace(/=.*$/,'').trim();
if (!textParam) {
  console.error(JSON.stringify({ok:false,status:'BLOCKED',reason:'telegram_text_param_not_detected',params,target},null,2));
  process.exit(4);
}

const insertAt = match.index + match[0].length;
const inject = [
  '',
  '  // APERION_TELEGRAM_CARD_ID_V167',
  "  if (typeof " + textParam + " === 'string' && " + textParam + ".includes('BİZİMHESAP TRANSFER ONAYI') && !" + textParam + ".includes('İşlem ID:')) {",
  "    const _args = Array.from(arguments);",
  "    const _serialized = JSON.stringify(_args);",
  "    const _uuid = _serialized.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)?.[0] || null;",
  "    const _shortId = _uuid ? _uuid.slice(0,8).toUpperCase() : 'ID-YOK';",
  "    const _now = new Date();",
  "    const _parts = new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(_now);",
  "    const _p = Object.fromEntries(_parts.map(x=>[x.type,x.value]));",
  "    const _stamp = _p.year + '-' + _p.month + '-' + _p.day + ' ' + _p.hour + ':' + _p.minute + ':' + _p.second + ' TRT';",
  "    " + textParam + " = " + textParam + ".replace('BİZİMHESAP TRANSFER ONAYI', 'BİZİMHESAP TRANSFER ONAYI\\nİşlem ID: ' + _shortId + '\\nGönderim: ' + _stamp);",
  "  }",
  ''
].join('\\n');

fs.copyFileSync(target,backup);
const next = src.slice(0,insertAt) + inject + src.slice(insertAt);
fs.writeFileSync(target,next,'utf8');

console.log(JSON.stringify({
  ok:true,
  status:'PATCHED',
  target,
  backup,
  send_function:match[1],
  text_param:textParam,
  marker_added:'APERION_TELEGRAM_CARD_ID_V167'
},null,2));
