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
pass('Gamze Eczanesi May 2026 3 percent discount: four real SKU amounts match 9531.92',()=>{
 const real = {
  firmId, invoiceType:3,
  customer:{customerId:'219C65ACD6C24DB6AA977C9F49561B19',title:'GAMZE ECZANESİ ECZ. HÜLYA NİZAM'},
  amounts:{currency:'TL',gross:'8933.40',discount:'268.01',net:'8665.39',tax:'866.53',total:'9531.92'},
  details:[
   {productId:'7DE6C284FBD64BA1BDC7BC097EC3151E',productName:'JENDER BEL BANTLI LARGE 7LI',quantity:36,unitPrice:'134.64',grossPrice:'4847.04',discount:'145.41',net:'4701.63',tax:'470.16',taxRate:10,total:'5171.79'},
   {productId:'5F2A75998EFD4F6EAFF4E939DC061CDE',productName:'JENDER BEL BANTLI MEDIUM 8LI',quantity:12,unitPrice:'129.88',grossPrice:'1558.56',discount:'46.76',net:'1511.80',tax:'151.18',taxRate:10,total:'1662.98'},
   {productId:'662756EF22EB4F0EBC1A7248B0DD4B7B',productName:'JENDER BEL BANTLI XL 7LI',quantity:12,unitPrice:'140.08',grossPrice:'1680.96',discount:'50.43',net:'1630.53',tax:'163.05',taxRate:10,total:'1793.58'},
   {productId:'4E82B2A9F2A24C349B3F02707B5ACC45',productName:'MOLY SERME 60X90',quantity:6,unitPrice:'141.14',grossPrice:'846.84',discount:'25.41',net:'821.43',tax:'82.14',taxRate:10,total:'903.57'}
  ]
 };
 const payload=normalizeInvoicePayload(real,firmId);
 assert.equal(validateInvoicePayload(payload),true);
 assert.equal(payload.amounts.total,'9531.92');
 const wrong={...payload,details:payload.details.map(x=>({...x}))};
 wrong.details[0].discount='145.40';
 assert.throws(()=>validateInvoicePayload(wrong),/invoice_line_discount_mismatch/);
 const wrongHeader={...payload,amounts:{...payload.amounts,discount:'268.00'}};
 assert.throws(()=>validateInvoicePayload(wrongHeader),/invoice_header_discount_mismatch/);
 const wrongTax={...payload,details:payload.details.map(x=>({...x}))};
 wrongTax.details[0].tax='470.17';wrongTax.details[0].total='5171.80';
 assert.throws(()=>validateInvoicePayload(wrongTax),/invoice_line_tax_rate_mismatch/);
});
console.log('BIZIMHESAP_MONEY_SAFETY_PASS='+passed+'; REMOTE_WRITES=0');
