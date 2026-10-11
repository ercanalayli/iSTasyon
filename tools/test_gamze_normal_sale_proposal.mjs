import assert from "node:assert/strict";
import {
  GAMZE_ORDER_KEY,GAMZE_CUSTOMER_GUID,buildGamzeNormalSaleProposal,
  validateGamzeNormalSaleProposal,prepareGamzeBizimHesapApiPayload,verifyGamzeSaleReadback
} from "../functions/shared/gamze-normal-sale-proposal.js";
const p=buildGamzeNormalSaleProposal();
assert.equal(p.sourceId,"WA-20261010-GAMZE");
assert.equal(p.customerGuid,GAMZE_CUSTOMER_GUID);
assert.equal(p.approval,"APPROVED_2026-10-11_PEŞİN");
assert.deepEqual(p.lines.map(x=>x.quantity),[36,12,12,6]);
assert.equal(p.delivery.firstLargeShipmentSameAsOct10,true);
assert.equal(p.payment.settled,false);
assert.equal(p.documents.eFatura,false);
assert.equal(p.financeWritePermittedByThisModule,false);
const r=validateGamzeNormalSaleProposal(p);
assert.equal(r.valid,true,JSON.stringify(r.errors));
assert.equal(r.packageCount,66);
assert.deepEqual(r.totals,{gross:893340,discount:26801,net:866539,tax:86653,total:953192});

const prep=prepareGamzeBizimHesapApiPayload();
assert.equal(prep.financialWrites,0);
assert.equal(prep.status,"READY_FOR_SUPPORTED_WRITE_TOOL");
assert.equal(prep.apiPayload.invoiceType,3);
assert.equal(prep.apiPayload.invoiceNo,"");
assert.equal(prep.apiPayload.customer.customerId,GAMZE_CUSTOMER_GUID);
assert.equal(prep.apiPayload.details.length,4);
assert.equal(prep.apiPayload.amounts.total,"9531.92");
assert.equal(prep.apiPayload.amounts.discount,"268.01");
assert.equal(prep.apiPayload.amounts.tax,"866.53");
assert.equal(prep.noEInvoice,true);
assert.equal(prep.noPayment,true);

const cases=[
  obj=>{obj.lines[0].quantity=72;},
  obj=>{obj.lines.push({...obj.lines[0]});},
  obj=>{obj.customerGuid="8E1DAE5A38454C13AF15E7B1CEA4871C";},
  obj=>{obj.amountsKurus.total=953191;},
  obj=>{obj.payment.settled=true;},
  obj=>{obj.documents.eFatura=true;},
  obj=>{obj.approval="";},
  obj=>{obj.lines[3].tax=999;},
  obj=>{obj.lines[0].discount=0;},
  obj=>{obj.delivery.duplicateLargeShipment=true;},
  obj=>{obj.financeWritePermittedByThisModule=true;}
];
for(const mutate of cases){const changed=buildGamzeNormalSaleProposal();mutate(changed);assert.equal(validateGamzeNormalSaleProposal(changed).valid,false,"unexpected acceptance "+String(mutate));}
assert.equal(verifyGamzeSaleReadback({erpSaleGuid:"A".repeat(32)}).verified,false);
// Historical boolean-only "read back" reports are NOT independent ERP proof.
const legacy={
  erpRecordReadBack:true,erpSaleGuid:"A".repeat(32),customerGuid:GAMZE_CUSTOMER_GUID,
  sourceId:GAMZE_ORDER_KEY,lineCount:4,packageCount:66,totalKurus:953192,
  eFaturaIssued:false,paymentRecorded:false
};
assert.equal(verifyGamzeSaleReadback(legacy).verified,false);
assert.equal(verifyGamzeSaleReadback(legacy).matchesExpected,false);
const candidate={
  source:"BIZIMHESAP_DOCUMENT_DETAIL",capturedAt:"2026-10-11T15:00:00+03:00",
  eInvoiceState:"NOT_ISSUED",paymentState:"NOT_BOOKED",
  document:{
    erpGuid:"A".repeat(32),customerGuid:p.customerGuid,invoiceType:3,
    note:"APERION NORMAL SATIS | "+p.sourceId+" | E-FATURA GONDERME",
    invoiceDate:p.invoiceDate,amountsKurus:{...p.amountsKurus},
    lines:p.lines.map(x=>({
      productId:x.productId,quantity:x.quantity,taxRate:x.taxRate,
      grossKurus:x.gross,discountKurus:x.discount,
      netKurus:x.net,taxKurus:x.tax,totalKurus:x.total
    }))
  }
};
const matches=verifyGamzeSaleReadback(candidate);
assert.equal(matches.matchesExpected,true);
assert.equal(matches.verified,false,"offline fields do not authenticate provider origin");
assert.equal(matches.status,"ERP_FIELDS_MATCH_BUT_PROVIDER_ATTESTATION_PENDING");
const bad=structuredClone(candidate);bad.document.lines[0].quantity=35;
assert.equal(verifyGamzeSaleReadback(bad).matchesExpected,false);
console.log("APERION_GAMZE_NORMAL_SALE_PREP_PASS · 4 SKU · 66 packs · 9531.92 TRY · NO ERP POST");
