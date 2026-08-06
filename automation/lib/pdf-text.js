import AdmZip from 'adm-zip';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
const XLSX = require('xlsx');

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
  if(name.endsWith('.xlsx') || name.endsWith('.xls')){
    // 2026-08-06: banka ekstreleri (ornek: Vakifbank) artik .xlsx olarak
    // geliyor - bu daha once hic desteklenmiyordu, binary buffer dogrudan
    // utf8'e cevrilip anlamsiz veri uretiyordu, ekstre sessizce kayboluyordu.
    // CSV'ye cevirmek yerine (virgul hem binlik ayiraci hem CSV ayiraci
    // oldugundan tutarlari bozuyordu - 44.890,00 gibi bir deger CSV'de
    // "44,890.00" olarak cikip parser'i yanlis yonlendirdi) ham 2 boyutlu
    // diziyi JSON olarak koruyoruz; sayilar JS number olarak kalir, hicbir
    // belirsizlik olmaz. Ozel bir tablo parser'i (parseXlsxTableRows) bu
    // JSON'u tanir ve basliktan sutun eslestirir.
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheets = wb.SheetNames.map(sn => XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '', raw: true }));
    return 'APERION_XLSX_JSON_V1:' + JSON.stringify(sheets);
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
  return name.endsWith('.pdf') || name.endsWith('.txt') || name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls');
}

export function hasEnoughText(text){
  return String(text || '').replace(/\s+/g, ' ').trim().length > 50;
}
