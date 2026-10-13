/**
 * BizimHesap /abstract envelope reader. Returns only candidate document arrays
 * and schema KEY NAMES, never body values or credentials as diagnostics.
 * No provider writes, no dynamic evaluation, no assumptions about debit/credit.
 */
const DATE = new Set(['documentdate','docdate','invoicedate','transactiondate','trxdate','date','tarih','createdat','issuedate','islemtarihi','belgetarihi','recorddate']);
const REF = new Set(['documentno','invoiceno','documentnumber','invoicenumber','belgeno','belgenumarasi','voucherno','refno','reference','number','guid','invoiceguid','documentguid','serialno','faturano']);
const AMOUNT = new Set(['amount','totalamount','amounttotal','total','tutar','gross','netamount','paymentamount','debit','credit','borc','alacak']);
const IDENT = /^[A-Za-z_][A-Za-z0-9_]{0,39}$/;
const FORBIDDEN = /token|password|secret|auth|cookie|session|bearer|apikey|credential|email|phone|address|taxno/i;
const shapeName = key => IDENT.test(key) && !FORBIDDEN.test(key) ? key : null;
const norm = key => String(key).toLocaleLowerCase('en').replace(/[^a-z0-9]/g,'');
const ownKeys = object => Object.keys(object).slice(0,60);

export function abstractSchemaHints(payload) {
  if(!payload || typeof payload!=='object') return ['root: not_object'];
  const hints=[], seen=new WeakSet();
  function walk(node,path,depth) {
    if(hints.length>=12 || depth>3 || !node || typeof node!=='object' || seen.has(node))return;
    seen.add(node);
    if(Array.isArray(node)) {
      hints.push(path+':array');
      if(node.length && node[0] && typeof node[0]==='object' && !Array.isArray(node[0])) {
        const keys=ownKeys(node[0]).map(shapeName).filter(Boolean).slice(0,10);
        hints.push(path+'[]:{'+keys.join(',')+'}');
      }
      return;
    }
    const keys=ownKeys(node).map(shapeName).filter(Boolean).slice(0,16);
    hints.push(path+':{'+keys.join(',')+'}');
    for(const key of keys){
      const child=node[key];
      if(child && typeof child==='object' && hints.length<12)walk(child,path+'.'+key,depth+1);
    }
  }
  walk(payload,'root',0);
  return hints.slice(0,12);
}

function rowSignature(row) {
  if(!row||typeof row!=='object'||Array.isArray(row))return 0;
  const keys=ownKeys(row).map(norm);
  // Source may split invoice dates or sums into nested objects.
  for(const name of ['dates','amounts']) {
    const nested=row[name];
    if(nested && typeof nested==='object' && !Array.isArray(nested))
      keys.push(...ownKeys(nested).map(norm));
  }
  const hasDate=keys.some(k=>DATE.has(k));
  const hasRef=keys.some(k=>REF.has(k));
  const hasAmount=keys.some(k=>AMOUNT.has(k));
  // Amount by itself is NOT evidence of a customer movement.
  if(!hasDate && !hasRef)return 0;
  return (hasDate?3:0)+(hasRef?3:0)+(hasAmount?1:0);
}

export function inspectAbstractEnvelope(vendor) {
  const hints=abstractSchemaHints(vendor);
  if(!vendor || typeof vendor!=='object')return {status:'UNSUPPORTED',hints,sections:[]};
  const sections=[], seen=new WeakSet();
  let visited=0,overflow=false,emptyCandidate=false;
  function walk(node,path,depth) {
    if(overflow || depth>6 || !node || typeof node!=='object' || seen.has(node))return;
    if(++visited>160){overflow=true;return;}
    seen.add(node);
    if(Array.isArray(node)){
      if(node.length>300){overflow=true;return;}
      if(node.length===0){
        if(/data|rows|records|movements|history|sales|invoices|abstract|transactions|documents/i.test(path))
          emptyCandidate=true;
        return;
      }
      const first=node.slice(0,Math.min(node.length,4));
      const score=Math.max(...first.map(rowSignature));
      if(score>=4) {
        sections.push({path,rows:node});
        if(sections.length>5)overflow=true;
        return;
      }
      // Unknown wrapper arrays may contain named subarrays.
      for(const [i,item] of first.entries())walk(item,path+'['+i+']',depth+1);
      return;
    }
    for(const key of ownKeys(node)){
      // Do not descend into vendor secrets or unrelated nested credentials.
      const label=shapeName(key);
      if(!label)continue;
      const next=node[key];
      if(next && typeof next==='object')walk(next,path+'.'+label,depth+1);
      if(overflow)return;
    }
  }
  walk(vendor,'root',0);
  if(overflow)return {status:'OVERFLOW',hints,sections:[]};
  if(sections.length)return {status:'ROWS',hints,sections};
  return {status:emptyCandidate?'EMPTY':'UNSUPPORTED',hints,sections:[]};
}
