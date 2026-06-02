function clean(v){return String(v||'').replace(/\r/g,'\n').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim()}
function trUpper(v){return clean(v).toLocaleUpperCase('tr-TR')}
function money(v){const n=Number(clean(v).replace(/TL/g,'').replace(/\./g,'').replace(',','.'));return Number.isFinite(n)?n:0}
function isoDate(v){const m=String(v||'').match(/(\d{2})[\.\/](\d{2})[\.\/](\d{4})/);return m?`${m[3]}-${m[2]}-${m[1]}`:''}
function key(v){return trUpper(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,160)}
function typeOf(desc,amount){const u=trUpper(desc);if(u.includes('POS')||u.includes('ÜYE İŞYERİ')||u.includes('UYE ISYERI'))return 'pos';if(u.includes('FAST')||u.includes('EFT')||u.includes('HAVALE'))return amount>=0?'tahsilat':'odeme';if(u.includes('SGK'))return 'sgk';if(u.includes('VERGİ')||u.includes('VERGI'))return 'vergi';if(u.includes('KART'))return 'kredi_karti';if(u.includes('MASRAF')||u.includes('ÜCRET')||u.includes('UCRET'))return 'banka_masrafi';return amount>=0?'tahsilat':'odeme'}
function statementId(meta){const s=`${meta.mail_subject||''} ${meta.attachment_name||''}`;const m=s.match(/(20\d{6})[_-]?(\d{6,})/);return m?`${m[1]}_${m[2]}`:key(s).slice(0,80)}
function duplicate(tx){return ['ISBANK',tx.statement_id,tx.transaction_date,tx.transaction_time||'',(tx.amount_in||0).toFixed(2),(tx.amount_out||0).toFixed(2),(tx.balance_after||0).toFixed(2),key(tx.description)].join('|')}
export function parseIsbank(text,meta={}){
  const src=clean(text);const lines=src.split('\n').map(clean).filter(Boolean);const sid=statementId(meta);const rows=[];
  const re=/^(\d{2}[\.\/]\d{2}[\.\/]\d{4})(?:\s+(\d{2}:\d{2}:\d{2}))?\s+(.+)$/;
  const moneyRe=/(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:TL)?\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:TL)?/;
  let cur=null;
  function flush(){
    if(!cur)return;const joined=clean(cur.parts.join(' '));const mm=joined.match(moneyRe);if(!mm)return;
    const amount=money(mm[1]), balance=money(mm[2]);let desc=clean(joined.replace(moneyRe,'').replace(cur.date,'').replace(cur.time||'',''));
    if(!desc)return;const t=typeOf(desc,amount);const tx={company_id:meta.company_id||'alayli',source:'gmail_bank_statement',mailbox:meta.mailbox||'alaylimedikal@gmail.com',bank_name:'İş Bankası',mail_id:meta.mail_id||'',mail_subject:meta.mail_subject||'',mail_from:meta.mail_from||'',mail_date:meta.mail_date||'',attachment_name:meta.attachment_name||'',statement_id:sid,transaction_date:isoDate(cur.date),transaction_time:cur.time||'',description:desc,amount_in:amount>0?amount:0,amount_out:amount<0?Math.abs(amount):0,balance_after:balance,detected_type:t,suggested_counterparty:'',confidence_score:80,status:'pending',duplicate_key:'',created_at:new Date().toISOString()};
    tx.duplicate_key=duplicate(tx);rows.push(tx)
  }
  for(const line of lines){const m=line.match(re);if(m){flush();cur={date:m[1],time:m[2]||'',parts:[line]}}else if(cur){cur.parts.push(line)}}
  flush();return rows
}
