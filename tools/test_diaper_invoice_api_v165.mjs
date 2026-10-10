import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {prepareDiaperInvoice} from '../functions/shared/diaper-invoice-api.js';
const require=createRequire(import.meta.url);
const {normalizeInvoicePayload,validateInvoicePayload}=require('../bizimhesap_api_client.cjs');
const cid='A'.repeat(32),pid='B'.repeat(32),firm='C'.repeat(32);
const valid={
 sourceId:'WA-TEST-20261010-001',imageParsedAndReviewed:true,
 uniqueSourceConfirmed:true,customerMatchVerified:true,
 bizimhesapCustomerId:cid,customerTitle:'EXAMPLE MEDIKAL',
 deliveryAndInvoicePolicyConfirmed:true,
 invoiceDate:'2026-10-10T22:10:00+03:00',
 dueDate:'2026-11-09T22:10:00+03:00',
 shippingDecision:'not_included',
 items:[{
   sku:'MAM.00004',bizimhesapProductId:pid,productMatchVerified:true,
   productTitle:'JENDER XXL',packagesPerBale:6,unitsPerPackage:20,
   packageRatioVerified:true,openPackages:4,bales:0,
   bizimhesapUnit:'paket',approvedPriceExVatPerInvoiceUnit:10,
   approvedVatRate:10,priceAndVatApproved:true
 }]
};
let n=0;const pass=(k,f)=>{f();console.log('PASS '+k);n++};
pass('WhatsApp four packages of Jender XXL equals eighty units, not four bales',()=>{
 const p=prepareDiaperInvoice(valid);assert.equal(p.status,'READY_FOR_EXPLICIT_APPROVAL');
 assert.equal(p.items[0].packages,4);assert.equal(p.items[0].units,80);
 assert.equal(p.total,'44.00');assert.equal(p.net,'40.00');assert.equal(p.tax,'4.00');
 const invoice=normalizeInvoicePayload(p.apiPayload,firm);
 assert.equal(validateInvoicePayload(invoice),true);
 assert.equal(p.financialWrites,0);assert.equal(p.approvalRequired,true);
});
pass('Two XXL bales convert to 12 packages, 240 units',()=>{
 const x=structuredClone(valid);x.items[0].bales=2;x.items[0].openPackages=0;
 const p=prepareDiaperInvoice(x);
 assert.equal(p.items[0].packages,12);assert.equal(p.items[0].units,240);assert.equal(p.total,'132.00');
});
pass('No ratio, no invoice',()=>{
 const x=structuredClone(valid);x.items[0].packagesPerBale=undefined;x.items[0].packageRatioVerified=false;
 assert.equal(prepareDiaperInvoice(x).status,'BLOCKED_REVIEW');
});
pass('No price authorization, no invoice',()=>{
 const x=structuredClone(valid);x.items[0].priceAndVatApproved=false;
 assert.equal(prepareDiaperInvoice(x).status,'BLOCKED_REVIEW');
});
pass('Unmatched client and product blocked',()=>{
 const x=structuredClone(valid);x.customerMatchVerified=false;x.items[0].productMatchVerified=false;
 assert.equal(prepareDiaperInvoice(x).status,'BLOCKED_REVIEW');
});
pass('No approval to issue invoice is implied by approved proposal',()=>{
 const p=prepareDiaperInvoice(valid);
 assert.equal(p.status,'READY_FOR_EXPLICIT_APPROVAL');
 assert.equal(p.approvalRequired,true);
 assert.deepEqual(p.prePostingChecks,[
  'firm_id_verified','source_immutable','duplicate_search','stock_check',
  'approval_command_id','invoice_readback'
 ]);
});
pass('Duplicate screenshot source blocks invoice',()=>{
 const x=structuredClone(valid);x.uniqueSourceConfirmed=false;
 const p=prepareDiaperInvoice(x);
 assert.equal(p.status,'BLOCKED_REVIEW');
 assert.equal(p.blockers.includes('duplicate_check_required'),true);
});
pass('Unresolved freight never silently appears on invoice',()=>{
 const x=structuredClone(valid);delete x.shippingDecision;
 assert.equal(prepareDiaperInvoice(x).status,'BLOCKED_REVIEW');
 const y=structuredClone(valid);y.shippingDecision='approved_separate_line';
 assert.equal(prepareDiaperInvoice(y).status,'BLOCKED_REVIEW');
});
pass('Unexpected tax rate blocks',()=>{
 const x=structuredClone(valid);x.items[0].approvedVatRate=19;
 assert.equal(prepareDiaperInvoice(x).status,'BLOCKED_REVIEW');
});
pass('No default 4 or 6 for different SKU',()=>{
 const x=structuredClone(valid);x.items[0].sku='DIFFERENT';x.items[0].packageRatioVerified=false;
 assert.equal(prepareDiaperInvoice(x).status,'BLOCKED_REVIEW');
});
pass('Open packages are not silently rounded up to bale',()=>{
 const x=structuredClone(valid);x.items[0].openPackages=5;
 assert.equal(prepareDiaperInvoice(x).items[0].packages,5);
});
pass('No synthetic buyer or invoice created with missing image context',()=>{
 const x=structuredClone(valid);x.imageParsedAndReviewed=false;
 const p=prepareDiaperInvoice(x);assert.equal(p.financialWrites,0);assert.equal(p.status,'BLOCKED_REVIEW');
});
pass('Invoice unit pieces converts quantities appropriately',()=>{
 const x=structuredClone(valid);x.items[0].bizimhesapUnit='adet';x.items[0].approvedPriceExVatPerInvoiceUnit=0.5;
 const p=prepareDiaperInvoice(x);assert.equal(p.items[0].quantity,80);
 assert.equal(p.total,'44.00');assert.equal(validateInvoicePayload(normalizeInvoicePayload(p.apiPayload,firm)),true);
});
console.log('APERION_DIAPER_WHATSAPP_API_PREFLIGHT='+n+'; FINANCIAL_WRITES=0');
