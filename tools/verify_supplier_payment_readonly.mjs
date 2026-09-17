import assert from 'node:assert/strict';
import { validateSupplierPayment, supplierPaymentReadOnlyDraft } from './lib/supplier_payment_readonly.mjs';

assert.equal(validateSupplierPayment({supplier:'Karadeniz Medikal',account:'KK İŞ ŞİRKET',amount:1,date:'17.09.2026'}).amountText,'1,00');
for (const [amount,date] of [[0,'17.09.2026'],[1,'31.02.2026'],[1.005,'17.09.2026']]) {
  assert.throws(() => validateSupplierPayment({supplier:'Karadeniz Medikal',account:'KK İŞ ŞİRKET',amount,date}));
}
const seen = [];
const pageValue = async (url,expression) => {
  seen.push({url,expression});
  if (url.endsWith('/ngnsuppliers')) return { firmName:'ALAYLI MEDİKAL',candidates:[{name:'KARADENİZ MEDİKAL SAĞLIK HİZMETLERİ',href:'/web/ngn/org/ngnsupplier?rc=1&guid=D1C7B701EAED48568753DB14F2F46C67'}]};
  if (url.includes('/ngnpaymentcash')) return { module:'/web/ngn/acc/ngnpaymentcash',accounts:[{id:'2881545',label:'KK İŞ ŞİRKET (31.481,68 TL)'}]};
  return { name:'KARADENİZ MEDİKAL SAĞLIK HİZMETLERİ',recordsTotal:1,rows:['17.09.2026 1,00 TL Kredi Kartı'] };
};
const duplicate = await supplierPaymentReadOnlyDraft({supplier:'Karadeniz Medikal',account:'KK İŞ ŞİRKET',amount:1,date:'17.09.2026'},pageValue);
assert.equal(duplicate.status,'possible_duplicate');
assert.equal(duplicate.writePerformed,false);
assert.equal(duplicate.approvalReady,false);
assert.equal(seen.length,3);
assert(seen.every(x => !/\.click\(\)|method:\s*['"]POST['"]|btnSave\)\.click/.test(x.expression)));
const noMatchPage = async (url,expression) => url.includes('ngnpaymentcash') ? {module:'/web/ngn/acc/ngnpaymentcash',accounts:[]} : pageValue(url,expression);
const unmapped = await supplierPaymentReadOnlyDraft({supplier:'Karadeniz Medikal',account:'İş Bankası Troy Sanal Kredi Kartı',amount:1,date:'17.09.2026'},noMatchPage);
assert.equal(unmapped.status,'needs_account_mapping');
const clearPage = async (url,expression) => url.includes('ngnsupplier?') ? {name:'KARADENİZ MEDİKAL',recordsTotal:0,rows:[]} : pageValue(url,expression);
const clear = await supplierPaymentReadOnlyDraft({supplier:'Karadeniz Medikal',account:'KK İŞ ŞİRKET',amount:1,date:'17.09.2026'},clearPage,
  async () => ({name:'KK İŞ ŞİRKET',href:'https://uygulama.bizimhesap.com/web/ngn/acc/ngnaccount?guid=TEST',currency:'TL'}),
  async () => ({scanCompleteThroughDate:true,scannedRows:1,sameDateAmountCount:0}));
assert.equal(clear.status,'primary_system_duplicate_check_clear');
assert.equal(clear.approvalReady,false);
console.log(JSON.stringify({status:'PASS',duplicateGate:true,accountMappingGate:true,accountReadbackGate:true,invalidInputsBlocked:true,financialWrites:0,bizimhesapWrites:0}));
