import pdf from 'pdf-parse';

export async function extractTextFromAttachment(filename, buffer){
  const name = String(filename || '').toLowerCase();
  if(name.endsWith('.pdf')){
    const parsed = await pdf(buffer);
    return parsed.text || '';
  }
  return buffer.toString('utf8');
}

export function hasEnoughText(text){
  return String(text || '').replace(/\s+/g, ' ').trim().length > 50;
}
