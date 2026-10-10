import fs from 'node:fs';
import path from 'node:path';
const p='C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge\\src\\index.js';
const s=fs.readFileSync(p,'utf8').split(/\r?\n/);
for (const name of ['telegramApprovalStatusText','telegramApprovalRef','telegramApproval','sendMessage']) {
  for(let i=0;i<s.length;i++){
    if(s[i].includes(name)){
      console.log('\n### '+name+' @ '+(i+1));
      console.log(s.slice(Math.max(0,i-12),Math.min(s.length,i+35)).map((x,j)=>String(Math.max(0,i-12)+j+1).padStart(4,' ')+': '+x).join('\n'));
    }
  }
}