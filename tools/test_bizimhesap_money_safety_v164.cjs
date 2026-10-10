const assert=require('node:assert/strict');
const { normalizeMoney,normalizeInvoicePayload,validateInvoicePayload,BizimHesapB2BClient }=require('../bizimhesap_api_client.cjs');
const firmId='A'.repeat(32);
const valid={
  firmId,invoiceType:3,customer:{customerId:'APERIONTESTID',title:'APERION TEST'},
  amounts:{currency:'TL',gross:'0.83',discount:'0.00',net:'0.83',tax:'0.17',total:'1.00'},
  details:[{productId:'TESTPRODUCT',productName:'TEST',quantity:1,unitPrice:'0.83',grossPrice:'0.83',net:'0.83',tax:'0.17',total:'1.00',taxRate:20}]
};
let passed=0;
function pass(title,test){test();passed++;console.log('PASS '+title);}
for(const [raw,expected] of [
  [1,'1.00'],[1.23,'1.23'],['1.00','1.00'],['0.83','0.83'],
  ['0,83','0.83'],['1,00','1.00'],['1234.56','1234.56'],
  ['1,234.56','1234.56'],['1.234,56','1234.56'],['1.234,50','1234.50'],
  ['2.400,00','2400.00'],['2,400.00','2400.00'],['0.8300','0.83'],
  ['0','0.00'],[null,'0.00'],[0,'0.00']
]) pass('money '+String(raw)+' -> '+expected,()=>assert.equal(normalizeMoney(raw),expected));
for(const raw of ['foo','1.2.3',Infinity,NaN,'1e6','12.345.6','-'])pass('reject unsafe amount '+String(raw),()=>assert.throws(()=>normalizeMoney(raw)));
pass('valid TL 1.00 invoice preserves every decimal and passes source validation',()=>{
 const p=normalizeInvoicePayload(valid,firmId);
 assert.equal(p.amounts.total,'1.00');assert.equal(p.amounts.net,'0.83');assert.equal(p.amounts.tax,'0.17');
 assert.equal(p.details[0].unitPrice,'0.83');
 assert.equal(p.details[0].total,'1.00');
 assert.equal(validateInvoicePayload(p),true);
});
pass('reject wrong firm',()=>{
 assert.throws(()=>normalizeInvoicePayload({...valid,firmId:'B'.repeat(32)},firmId),/invoice_firm_mismatch/);
});
pass('reject missing invoice type, do not silently choose purchase invoice',()=>{
 assert.throws(()=>normalizeInvoicePayload({...valid,invoiceType:undefined},firmId),/invoice_type_must_be_3_or_5/);
});
for(const [title,change] of [
  ['wrong grand total',p=>{p.amounts.total='100.00';}],
  ['wrong VAT',p=>{p.amounts.tax='0.18';}],
  ['empty lines',p=>{p.details=[];}],
  ['missing customer',p=>{p.customer={};}],
  ['negative quantity',p=>{p.details[0].quantity=-1;}],
  ['wrong line total',p=>{p.details[0].total='100.00';}]
])pass('fail-closed '+title,()=>{
  const p=normalizeInvoicePayload(valid,firmId);
  change(p);
  assert.throws(()=>validateInvoicePayload(p));
});
pass('invalid amount is rejected before network I/O',()=>{
 const client=new BizimHesapB2BClient({firmId,token:'fake',key:'public-header'});
 client.request=()=>{throw Error('NETWORK_MUST_NOT_BE_CALLED')};
 assert.throws(()=>client.addInvoice({...valid,amounts:{...valid.amounts,total:'100.00'}}),/invoice_total_vat_mismatch/);
});
console.log('BIZIMHESAP_MONEY_SAFETY_PASS='+passed+'; REMOTE_WRITES=0');
