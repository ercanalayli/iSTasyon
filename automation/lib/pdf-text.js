import pdf from 'pdf-parse';
import xlsx from 'xlsx';

export async function extractTextFromAttachment(filename, buffer){
  const name = String(filename || '').toLowerCase();
  if(name.endsWith('.pdf')){
    const parsed = await pdf(buffer);
    return parsed.text || '';
  }
  if(name.endsWith('.xls') || name.endsWith('.xlsx')){
    const wb = xlsx.read(buffer, { type: 'buffer', cellDates: false, raw: false });
    return wb.SheetNames.map(sheetName => {
      const sheet = wb.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      return rows.map(row => row.map(cell => String(cell || '').trim()).filter(Boolean).join(' ')).filter(Boolean).join('\n');
    }).join('\n');
  }
  return buffer.toString('utf8');
}

export function hasEnoughText(text){
  return String(text || '').replace(/\s+/g, ' ').trim().length > 50;
}
