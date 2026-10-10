import fs from 'node:fs';
import path from 'node:path';

const bridgeRoot = 'C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge';
const files = [
  path.join(bridgeRoot,'src','index.js'),
  path.join(bridgeRoot,'src','chatgpt-action.mjs'),
  path.join(bridgeRoot,'src','windows-worker.js')
];
const needles = [
  'telegramCard','telegram','ONAYLA','İPTAL','approval','approve','cash_transfer',
  'cash transfer','transfer','reply_markup','inline_keyboard','sendMessage','sendTelegram',
  'command_id','payload_hash'
];

const out=[];
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const text=fs.readFileSync(file,'utf8');
  const lines=text.split(/\r?\n/);
  for (let i=0;i<lines.length;i++) {
    const low=lines[i].toLocaleLowerCase('tr-TR');
    if (!needles.some(n=>low.includes(n.toLocaleLowerCase('tr-TR')))) continue;
    out.push({
      file,
      line:i+1,
      text:lines[i].slice(0,500),
      before:lines.slice(Math.max(0,i-2),i).map((x,j)=>({line:Math.max(1,i-1)+j,text:x.slice(0,500)})),
      after:lines.slice(i+1,i+3).map((x,j)=>({line:i+2+j,text:x.slice(0,500)}))
    });
  }
}
const filtered=out.filter(x=>
  /telegram|onay|iptal|approval|approve|reply_markup|inline_keyboard|sendmessage|sendtelegram|command_id|payload_hash|transfer/i.test(x.text)
);
console.log(JSON.stringify({ok:true,matches:filtered.slice(0,120)},null,2));
