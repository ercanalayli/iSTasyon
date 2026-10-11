/**
 * AperiON A2: analyze a BizimHesap customer-abstract GET response.
 * STRICTLY READ ONLY. A missing match is NEVER proof that the invoice is
 * absent; an unknown schema or partial/rate-limited extract MUST block POST.
 * Caller must independently authenticate the source and customer context.
 */
import {buildGamzeNormalSaleProposal} from './gamze-normal-sale-proposal.js';

const FIELDS = Object.freeze({
  containers:['data','Data','records','Records','rows','Rows','items','Items','results','Results','movements','Movements','transactions','Transactions','history','History','list','List','result','Result'],
  amounts:['amount','Amount','amountTotal','AmountTotal','total','Total','totalAmount','TotalAmount','tutar','Tutar','borc','Borc','borç','Borç','debit','Debit'],
  dates:['invoiceDate','InvoiceDate','documentDate','DocumentDate','date','Date','tarih','Tarih','transactionDate','TransactionDate','createdAt','CreatedAt'],
  descriptions:['note','Note','description','Description','aciklama','Aciklama','açıklama','Açıklama','reference','Reference','externalReference','ExternalReference','documentNo','DocumentNo','invoiceNo','InvoiceNo','belgeNo','BelgeNo'],
  refs:['guid','Guid','invoiceGuid','InvoiceGuid','documentGuid','DocumentGuid','id','Id','invoiceNo','InvoiceNo','documentNo','DocumentNo','belgeNo','BelgeNo']
});
const has = (x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const scalar=v=>typeof v==='string'||typeof v==='number';
function parseKurus(v){
  if(!scalar(v))return null;
  let s=String(v).trim().replace(/\s|₺|TL|TRY/gi,'');
  if(!/^[-+]?[0-9][0-9.,]*$/.test(s))return null;
  if(s.includes(',')&&s.includes('.')){
    s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
  }else if(s.includes(',')){
    if(s.split(',').length!==2)return null;
    s=s.replace(',','.');
  }
  if((s.match(/\./g)||[]).length!==1 && s.includes('.'))return null;
  if(!/^[+]?\d+(?:\.\d{1,2})?$/.test(s))return null;
  const [whole,dec='']=s.replace(/^\+/,'').split('.');
  const cents=Number(whole)*100+Number(dec.padEnd(2,'0'));
  return Number.isSafeInteger(cents)?cents:null;
}
function parseDate(v){
  if(!scalar(v))return null;
  const s=String(v).trim();
  const iso=s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|\s|$)/);
  if(iso)return iso[1]+'-'+iso[2]+'-'+iso[3];
  const dmy=s.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s|$)/);
  return dmy?dmy[3]+'-'+dmy[2]+'-'+dmy[1]:null;
}
function firstValue(obj,keys){
  for(const k of keys)if(has(obj,k)&&scalar(obj[k])&&String(obj[k]).trim())return String(obj[k]);
  return null;
}
const result=(status,reason,params={})=>({
  status,reason,sourceId:buildGamzeNormalSaleProposal().sourceId,
  possibleDuplicate:status==='POSSIBLE_EXISTING_SALE',
  absenceConfirmed:false,postingAllowed:false,
  needsFullErpDocumentReadback:true, financialWrites:0,
  ...params
});
export function evaluateGamzeAbstractReadOnly(abstract, options={}){
  const expected=buildGamzeNormalSaleProposal();
  if(abstract===null||typeof abstract!=='object')return result('SOURCE_INSUFFICIENT','not_a_structured_response');
  if(has(abstract,'resultCode')&&String(abstract.resultCode)!=='1')return result('SOURCE_INSUFFICIENT','provider_result_not_success');
  if(has(abstract,'error')&&abstract.error)return result('SOURCE_INSUFFICIENT','provider_returned_error');
  const scanned=[],visited=new WeakSet();
  const queue=[{node:abstract,depth:0}];
  let overflow=false;
  while(queue.length){
    if(scanned.length>=300||queue.length>1000){overflow=true;break;}
    const {node,depth}=queue.shift();
    if(!node||typeof node!=='object'||visited.has(node))continue;
    visited.add(node);
    if(Array.isArray(node)){
      for(const child of node.slice(0,301))queue.push({node:child,depth:depth+1});
      if(node.length>300)overflow=true;
      continue;
    }
    if(depth>8){overflow=true;continue;}
    if([...FIELDS.descriptions,...FIELDS.amounts,...FIELDS.dates,...FIELDS.refs].some(k=>has(node,k)))scanned.push(node);
    for(const key of FIELDS.containers)if(has(node,key))queue.push({node:node[key],depth:depth+1});
  }
  if(overflow)return result('SOURCE_INSUFFICIENT','provider_payload_too_large_or_deep',{recordsScanned:scanned.length});
  const hits=[];
  for(const row of scanned){
    const refText=FIELDS.descriptions.filter(k=>has(row,k)&&scalar(row[k])).map(k=>String(row[k])).join(' ');
    const exactSource=refText.toUpperCase().includes(expected.sourceId.toUpperCase());
    const rawDate=firstValue(row,FIELDS.dates);
    const date=parseDate(rawDate);
    const amountText=firstValue(row,FIELDS.amounts);
    const amountKurus=amountText===null?null:parseKurus(amountText);
    const headerSame=amountKurus===expected.amountsKurus.total&&date==='2026-10-11';
    if(!exactSource&&!headerSame)continue;
    hits.push({
      basis:exactSource?'SOURCE_REFERENCE':'DATE_AND_AMOUNT_POSSIBLE_MATCH',
      date:date||null,
      amountKurus:amountKurus,
      documentReference:firstValue(row,FIELDS.refs)
    });
    if(hits.length===15)break;
  }
  if(hits.length)return result('POSSIBLE_EXISTING_SALE','reconcile_matching_erp_record_before_post',{
    recordsScanned:scanned.length,matches:hits
  });
  return result('NO_MATCH_NOT_PROOF','provider_cari_abstract_cannot_prove_sale_absence',{
    recordsScanned:scanned.length,matches:[]
  });
}
