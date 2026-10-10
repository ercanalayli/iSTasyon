import fs from 'node:fs';
import path from 'node:path';

const root='C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge';
const exts=new Set(['.js','.mjs','.cjs']);
const hits=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ent.name==='node_modules'||ent.name==='.git'||ent.name==='.wrangler') continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p);
    else if(exts.has(path.extname(ent.name).toLowerCase())){
      const text=fs.readFileSync(p,'utf8');
      const lines=text.split(/\r?\n/);
      for(let i=0;i<lines.length;i++){
        if(!lines[i].includes('updateTelegramApprovalCard')) continue;
        hits.push({
          file:p,
          line:i+1,
          context:lines.slice(Math.max(0,i-8),Math.min(lines.length,i+30)).map((t,j)=>({line:Math.max(0,i-8)+j+1,text:t}))
        });
      }
    }
  }
}
walk(root);
console.log(JSON.stringify({ok:true,count:hits.length,hits},null,2));
