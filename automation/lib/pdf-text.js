import AdmZip from 'adm-zip';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

export async function extractTextFromAttachment(filename, buffer){
  const name = String(filename || '').toLowerCase();
  if(name.endsWith('.pdf')){
    const parser = new PDFParse({ data: buffer });
    try{
      const parsed = await parser.getText();
      return parsed.text || '';
    }finally{
      await parser.destroy();
    }
  }
  return buffer.toString('utf8');
}

export async function extractTextItemsFromAttachment(filename, buffer){
  const name = String(filename || '');
  const lower = name.toLowerCase();
  if(!lower.endsWith('.zip')){
    return [{ filename: name, text: await extractTextFromAttachment(name, buffer), container_name: '' }];
  }

  const zip = new AdmZip(buffer);
  const items = [];
  for(const entry of zip.getEntries()){
    if(entry.isDirectory) continue;
    const entryName = entry.entryName || entry.name || '';
    if(!isSupportedInnerFile(entryName)) continue;
    try{
      const text = await extractTextFromAttachment(entryName, entry.getData());
      items.push({ filename: entryName, text, container_name: name });
    }catch(err){
      items.push({ filename: entryName, text: '', container_name: name, error: err.message || String(err) });
    }
  }
  return items;
}

function isSupportedInnerFile(filename){
  const name = String(filename || '').toLowerCase();
  return name.endsWith('.pdf') || name.endsWith('.txt') || name.endsWith('.csv');
}

export function hasEnoughText(text){
  return String(text || '').replace(/\s+/g, ' ').trim().length > 50;
}
