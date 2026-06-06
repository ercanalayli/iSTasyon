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
  return parseGenericBank(text, { ...meta, bank_name: bank });
}

function clean(v){return String(v||'').replace(/\r/g,'\n').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim()}
function trUpper(v){return clean(v).toLocaleUpperCase('tr-TR')}
function money(v){const raw=clean(v).replace(/TL|TRY|₺/gi,'').replace(/\./g,'').replace(',','.');const n=Number(raw);return Number.isFinite(n)?n:0}
function isoDate(v){const m=String(v||'').match(/(\d{2})[\.\/](\d{2})[\.\/](\d{4})/);return m?`${m[3]}-${m[2]}-${m[1]}`:''}
function key(v){return trUpper(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,180)}
function typeOf(desc,amount){const u=trUpper(desc);if(u.includes('POS')||u.includes('ÜYE İŞYERİ')||u.includes('UYE ISYERI')||u.includes('PEŞİNSATIŞ')||u.includes('PESINSATIS'))return amount>=0?'pos_tahsilat':'pos_masraf';if(u.includes('FAST')||u.includes('EFT')||u.includes('HAVALE'))return amount>=0?'tahsilat':'odeme';if(u.includes('SGK'))return 'sgk';if(u.includes('VERGİ')||u.includes('VERGI'))return 'vergi';if(u.includes('BSMV')||u.includes('ÜCRET')||u.includes('UCRET')||u.includes('MASRAF'))return 'banka_masrafi';if(u.includes('HGS'))return 'hgs';return amount>=0?'tahsilat':'odeme'}
function bankLabel(meta,bank){
  const s=`${meta.bank_hint||''} ${meta.bank_name||''} ${meta.mail_subject||''} ${meta.attachment_name||''}`.toUpperCase();
  if(bank==='yapikredi'||s.includes('YAPI'))return 'Yapı Kredi';
  if(bank==='vakifbank'||s.includes('VAKIF'))return 'Vakıfbank';
  if(bank==='halkbank'||s.includes('HALK'))return 'Halkbank';
  if(bank==='garanti'||s.includes('GARANTI'))return 'Garanti BBVA';
  return bank||'Banka';
}
function statementId(meta){const s=`${meta.mail_subject||''} ${meta.attachment_name||''}`;const m=s.match(/(20\d{6})[_-]?(\d{6,})/);return m?`${m[1]}_${m[2]}`:key(s).slice(0,80)}
function duplicate(bank,tx){return [key(bank),tx.statement_id,tx.transaction_date,tx.value_date||'',(tx.amount_in||0).toFixed(2),(tx.amount_out||0).toFixed(2),(tx.balance_after||0).toFixed(2),key(tx.description)].join('|')}
export function parseGenericBank(text,meta={}){
  const src=clean(text);const lines=src.split('\n').map(clean).filter(Boolean);const bank=detectBank(text,meta);const bankName=bankLabel(meta,bank);const sid=statementId(meta);const rows=[];
  const dateRe=/^(\d{2}[\.\/]\d{2}[\.\/]\d{4})(?:\s+(\d{2}[\.\/]\d{2}[\.\/]\d{4}))?(?:\s+(.+))?$/;
  const moneyPair=/(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:TL)?\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:TL)?/;
  let cur=null;
  function flush(){
    if(!cur)return;
    const joined=clean(cur.parts.join(' '));const mm=joined.match(moneyPair);if(!mm)return;
    const amount=money(mm[1]), balance=money(mm[2]);
    let desc=clean(joined.replace(moneyPair,'').replace(cur.date,'').replace(cur.valueDate||'',''));
    desc=desc.replace(/Tarih Valör Tarihi Açıklama İşlem Tutarı Güncel Bakiye/gi,'').trim();
    if(!desc||/^AÇILIŞ/i.test(desc))return;
    const tx={company_id:meta.company_id||'alayli',source:meta.source||'gmail_bank_statement',mailbox:meta.mailbox||'alaylimedikal@gmail.com',bank_name:bankName,mail_id:meta.mail_id||'',mail_subject:meta.mail_subject||'',mail_from:meta.mail_from||'',mail_date:meta.mail_date||'',attachment_name:meta.attachment_name||'',statement_id:sid,transaction_date:isoDate(cur.date),transaction_time:'',value_date:isoDate(cur.valueDate),description:desc,amount_in:amount>0?amount:0,amount_out:amount<0?Math.abs(amount):0,balance_after:balance,detected_type:typeOf(desc,amount),suggested_counterparty:'',confidence_score:65,status:'pending',duplicate_key:'',created_at:new Date().toISOString()};
    tx.duplicate_key=duplicate(bankName,tx);rows.push(tx);
  }
  for(const line of lines){
    const m=line.match(dateRe);
    if(m&&m[1]){flush();cur={date:m[1],valueDate:m[2]||'',parts:[m[3]||'']};}
    else if(cur){cur.parts.push(line);}
  }
  flush();
  return rows;
}
