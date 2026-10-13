import assert from 'node:assert/strict';
import fs from 'node:fs';
import {abstractSchemaHints,inspectAbstractEnvelope}
  from '../functions/shared/bizimhesap-abstract-shape.js';
import {summarizeVerifiedAbstract}
  from '../functions/shared/bizimhesap-telegram-cari-read.js';

const params={title:'Örnek Cari',sourceLastSuccess:'2026-10-12T20:45:00Z',nowIso:'2026-10-12T21:00:00Z'};
const document={invoiceDate:'2026-10-11',invoiceNo:'F123',totalAmount:'500.25'};
const nested={resultCode:1,data:{result:{invoiceList:[document]}}};
const nestedResult=inspectAbstractEnvelope(nested);
assert.equal(nestedResult.status,'ROWS');
assert.equal(nestedResult.sections.length,1);
assert.equal(nestedResult.sections[0].path,'root.data.result.invoiceList');
assert.match(summarizeVerifiedAbstract(nested,params),/F123/);
assert.match(summarizeVerifiedAbstract(nested,params),/500.25/);

const caps={resultCode:1,Response:{Statement:{Documents:[{InvoiceDate:'2026-10-02',InvoiceNumber:'Z-010',Total:123}]}}};
assert.equal(inspectAbstractEnvelope(caps).status,'ROWS');
assert.match(summarizeVerifiedAbstract(caps,params),/Z-010/);

const nestedFields={resultCode:'1',data:{history:[{dates:{invoiceDate:'2026-10-11'},amounts:{total:'36.00'},documentNo:'T-2'}]}};
assert.equal(inspectAbstractEnvelope(nestedFields).status,'ROWS');
assert.match(summarizeVerifiedAbstract(nestedFields,params),/T-2/);
assert.match(summarizeVerifiedAbstract(nestedFields,params),/36.00/);

const double={resultCode:1,data:{sales:[{documentDate:'2026-10-08',invoiceNo:'S-10'}],collections:[{date:'2026-10-10',documentNo:'C-2',amount:'20'}]}};
const parts=inspectAbstractEnvelope(double);
assert.equal(parts.status,'ROWS');
assert.equal(parts.sections.length,2);
const overview=summarizeVerifiedAbstract(double,params);
assert.match(overview,/S-10/);
assert.match(overview,/C-2/);
assert.match(overview,/ekstre kapsamı ayrıca doğrulanmalı/);

// Real owner-provided BizimHesap /abstract schema (field names only).
// Synthetic example values; NEVER treat this fixture as a real invoice.
const actualStructure={resultCode:1,errorText:'',data:{
  title:'Sample',balance:115,debitSum:220,creditSum:105,link:'',
  abstract:[
    {id:'movement-1',trxdate:'2026-10-12',duedate:'2026-11-12',
      type:'B2B',note:'Synthetic row',payment:0,debit:220,credit:0,balance:115},
    {id:'movement-2',trxdate:'2026-10-13',duedate:'2026-11-13',
      type:'Payment',note:'Synthetic second row',payment:1,debit:0,credit:105,balance:10}
  ]}};
assert.equal(inspectAbstractEnvelope(actualStructure).status,'ROWS');
assert.equal(inspectAbstractEnvelope(actualStructure).sections[0].path,'root.data.abstract');
const actualMessage=summarizeVerifiedAbstract(actualStructure,params);
assert.match(actualMessage,/İşlem: 2026-10-12/);
assert.match(actualMessage,/Vade: 2026-11-12/);
assert.match(actualMessage,/Hareket ID: movement-1/);
assert.match(actualMessage,/Borç \(API\): 220/);
assert.match(actualMessage,/Alacak \(API\): 0/);
assert.match(actualMessage,/Bakiye \(API\): 115/);
assert.match(actualMessage,/Payment \(API\): 0/);
assert.match(actualMessage,/Synthetic row/);
assert.match(actualMessage,/ekstre kapsamı ayrıca doğrulanmalı/);
assert.ok(!actualMessage.includes('VERIFIED') || actualMessage.includes('doğrulanmalı'));
assert.ok(!actualMessage.includes('debitSum'));
assert.ok(!actualMessage.includes('creditSum'));

const hidden={resultCode:1,data:{internal:{authorization:'Bearer TOP-SECRET-777',secret:'CARD-ABC-345',userEmail:'person@example.com',mystery:'ACCOUNT-444'}}};
const response=summarizeVerifiedAbstract(hidden,params);
assert.match(response,/Güvenli biçim özeti/);
assert.match(response,/VERIFIED değil/);
for(const v of ['TOP-SECRET-777','CARD-ABC-345','person@example.com','ACCOUNT-444']) assert.ok(!response.includes(v));
for(const v of ['TOP-SECRET-777','person@example.com']) assert.ok(!abstractSchemaHints(hidden).join(' ').includes(v));
assert.equal(inspectAbstractEnvelope({resultCode:1,data:{invoices:[]}}).status,'EMPTY');
assert.match(summarizeVerifiedAbstract({resultCode:1,data:{invoices:[]}},params),/kesin kanıt değil/);
const broken={resultCode:0,data:{invoiceList:[document]}};
assert.doesNotMatch(summarizeVerifiedAbstract(broken,params),/F123/);
assert.equal(inspectAbstractEnvelope({resultCode:1,data:{invoices:[...Array(301).fill(document)]}}).status,'OVERFLOW');
const overflow=summarizeVerifiedAbstract({resultCode:1,data:{invoices:[...Array(301).fill(document)]}},params);
assert.doesNotMatch(overflow,/F123/);

const source=fs.readFileSync(new URL('../functions/shared/bizimhesap-telegram-cari-read.js',import.meta.url),'utf8');
const webhook=fs.readFileSync(new URL('../functions/telegram/webhook.js',import.meta.url),'utf8');
assert.match(source,/inspectAbstractEnvelope\(vendor\)/);
assert.match(source,/Güvenli biçim özeti \(yalnız alan adları\)/);
assert.match(webhook,/readOwnerCariAbstract/);
assert.doesNotMatch(source,/\bmethod\s*:\s*['"]POST['"]|addinvoice|process_queue/i);
console.log('PASS: nested BizimHesap envelopes, ambiguous sections, shape-only diagnostics, no leakage');
