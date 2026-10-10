import assert from 'node:assert/strict';
import {BIZIMHESAP_API_CAPABILITIES,BIZIMHESAP_NO_CONFIRMED_B2B_API,getBizimHesapApiCapability,planBizimHesapApiOperation,preferredBizimHesapChannel} from '../functions/shared/bizimhesap-api-capabilities.js';
import {parseUniversalCommand} from '../functions/telegram/universal-command-router.js';
const writeIds=['addinvoice','cancelinvoice','addcustomer','addproduct'];
let checks=0;
const check=(name,callback)=>{callback();checks++;process.stdout.write('PASS '+name+'\n');};
check('Registry has eleven API routes with unique IDs',()=>{
 assert.equal(BIZIMHESAP_API_CAPABILITIES.length,11);
 assert.equal(new Set(BIZIMHESAP_API_CAPABILITIES.map(x=>x.id)).size,11);
});
for(const id of writeIds){
 check('Live POST method found: '+id,()=>{
  const cap=getBizimHesapApiCapability(id);
  assert.ok(cap);assert.equal(cap.method,'POST');
  assert.equal(cap.risk.includes('write'),true);
 });
 check('No unconfirmed write executed by AperiON: '+id,()=>{
  const r=planBizimHesapApiOperation(id);
  assert.equal(r.channel,'api_after_explicit_approval');
  assert.equal(r.canExecute,false);
  assert.equal(r.financialWrite,0);
  assert.equal(r.approvalRequired,true);
  assert.equal(r.idempotencyRequired,true);
  assert.equal(r.readBackRequired,true);
 });
}
check('Official invoice write documented; other 3 lack public documentation',()=>{
 assert.equal(getBizimHesapApiCapability('addinvoice').documented,true);
 assert.equal(getBizimHesapApiCapability('cancelinvoice').documented,false);
 assert.equal(getBizimHesapApiCapability('addcustomer').documented,false);
 assert.equal(getBizimHesapApiCapability('addproduct').documented,false);
});
check('Safe products read routes to API',()=>{
 const r=planBizimHesapApiOperation('products');assert.equal(r.canExecute,true);
 assert.equal(r.apiPath,'/products');assert.equal(r.method,'GET');assert.equal(r.financialWrite,0);
});
check('Missing depot ID blocks query injection',()=>{
 assert.equal(planBizimHesapApiOperation('inventory').canExecute,false);
 assert.equal(planBizimHesapApiOperation('inventory',{depoId:'..%2Fadmin'}).canExecute,false);
 assert.equal(planBizimHesapApiOperation('inventory',{depoId:'VALID123'}).apiPath,'/inventory/VALID123');
});
check('Rate-limit 429 preserved and never blindly retried',()=>{
 assert.equal(planBizimHesapApiOperation('abstract',{customerId:'VALID123'}).canExecute,false);
 assert.equal(planBizimHesapApiOperation('abstract',{customerId:'VALID123'}).reason,'429_cooldown_no_retry');
});
check('Expense and kasa are not misrepresented as official API',()=>{
 for(const id of ['expense_create','cash_transfer','cash_transaction_create','payment_create','collection_create'])
  assert.equal(BIZIMHESAP_NO_CONFIRMED_B2B_API.includes(id),true);
 assert.equal(preferredBizimHesapChannel('bizimhesap.expense_post').canExecute,false);
 assert.equal(preferredBizimHesapChannel('bizimhesap.cash_transfer_post').canExecute,false);
});
check('Existing Turkish tea expense approval is unchanged',()=>{
 const r=parseUniversalCommand('50 TL çay masrafı Ercan Nakit Kasa');
 assert.equal(r.code,'bizimhesap.expense_post');assert.equal(r.amount,50);
 assert.equal(r.expenseCategory,'Çay / İkram');assert.equal(r.approvalPolicy,'explicit_single_use');
 assert.equal(r.apiPreference.canExecute,false);
});
check('Akaryakıt no longer silently mapped to Genel Gider',()=>{
 const r=parseUniversalCommand('500 TL akaryakıt gideri Ercan Nakit Kasa');
 assert.equal(r.code,'bizimhesap.expense_post');assert.equal(r.amount,500);
 assert.equal(r.expenseCategory,'Akaryakıt');assert.equal(r.sourceAccount,'Ercan Nakit Kasa');
 assert.equal(r.apiPreference.canExecute,false);
 assert.equal(r.apiPreference.reason,'not_confirmed_in_b2b_api');
});
check('Draft invoice is recognized but write is blocked',()=>{
 const r=parseUniversalCommand('Murat Ticaret fatura taslağı hazırla 1000 TL');
 assert.equal(r.code,'bizimhesap.invoice_draft');
 assert.equal(r.apiPreference.channel,'api_after_explicit_approval');
 assert.equal(r.apiPreference.financialWrite,0);
 assert.equal(r.apiPreference.canExecute,false);
});
process.stdout.write('APERION_BIZIMHESAP_API_FIRST_TESTS='+checks+'; FINANCIAL_WRITES=0\n');
