import fs from 'node:fs';
import path from 'node:path';

const srcRoot='C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge\\src';
const exts=new Set(['.js','.mjs','.cjs']);
const files=[];

for(const ent of fs.readdirSync(srcRoot,{withFileTypes:true})){
  if(ent.isFile() && exts.has(path.extname(ent.name).toLowerCase())) files.push(path.join(srcRoot,ent.name));
}
const hits=[];
for(const file of files){
  const text=fs.readFileSync(file,'utf8');
  const lines=text.split(/\r?\n/);
  for(let i=0;i<lines.length;i++){
    if(!lines[i].includes('updateTelegramApprovalCard')) continue;
    hits.push({
      file,
      line:i+1,
      context:lines.slice(Math.max(0,i-12),Math.min(lines.length,i+40)).map((t,j)=>({line:Math.max(0,i-12)+j+1,text:t}))
    });
  }
}
console.log(JSON.stringify({ok:true,scanned:files.length,count:hits.length,hits},null,2));