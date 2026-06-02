import { parseIsbank } from './isbank-parser.js';

export function detectBank(text, meta = {}) {
  const source = `${meta.bank_hint || ''} ${meta.mail_subject || ''} ${meta.attachment_name || ''} ${text || ''}`.toUpperCase();
  if (source.includes('IS BANKASI') || source.includes('TURKIYE IS BANKASI') || source.includes('TURKIYE IS')) return 'isbank';
  if (source.includes('YAPI KREDI') || source.includes('HESAP_HAREKETLERI') || source.includes('HESAP_OZETI')) return 'yapikredi';
  if (source.includes('VAKIFBANK')) return 'vakifbank';
  if (source.includes('HALKBANK') || source.includes('HALK BANKASI')) return 'halkbank';
  if (source.includes('GARANTI')) return 'garanti';
  return String(meta.bank_hint || 'unknown').toLowerCase();
}

export function parseBankStatement(text, meta = {}) {
  const bank = detectBank(text, meta);
  if (bank === 'isbank' || bank.includes('is')) return parseIsbank(text, meta);
  return [];
}
