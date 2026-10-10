import fs from 'node:fs';
import path from 'node:path';

const bridgeRoot='C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge';
const target=path.join(bridgeRoot,'src','index.js');
const src=fs.readFileSync(target,'utf8');
const lines=src.split(/\r?\n/);

const ranges=[];
const needles=[
  /telegramApi\s*\(/i,
  /sendMessage/i,
  /inline_keyboard/i,
  /callback_data/i,
  /ONAYLA/i,
  /İPTAL/i,
  /approval_state/i,
  /command_id/i,
  /payload_hash/i
];

for(let i=0;i<lines.length;i++){
  if(!needles.some(re=>re.test(lines[i]))) continue;
  const from=Math.max(0,i-8);
  const to=Math.min(lines.length-1,i+14);
  ranges.push([from,to]);
}

ranges.sort((a,b)=>a[0]-b[0]);
const merged=[];
for(const r of ranges){
  const last=merged[merged.length-1];
  if(last && r[0]<=last[1]+2) last[1]=Math.max(last[1],r[1]);
  else merged.push(r.slice());
}

const output=[];
for(const [from,to] of merged){
  output.push({from:from+1,to:to+1,lines:lines.slice(from,to+1).map((text,idx)=>({line:from+idx+1,text}))});
}

console.log(JSON.stringify({ok:true,target,sections:output},null,2));
