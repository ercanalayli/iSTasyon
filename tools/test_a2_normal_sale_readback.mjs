import assert from 'node:assert/strict';
import {compareNormalSaleReadback} from '../functions/shared/a2-normal-sale-readback.js';
import {buildGamzeNormalSaleProposal} from '../functions/shared/gamze-normal-sale-proposal.js';
const expected=buildGamzeNormalSaleProposal();
const good={
  source:'BIZIMHESAP_DOCUMENT_DETAIL',
  capturedAt:'2026-10-11T15:20:00+03:00',
  eInvoiceState:'NOT_ISSUED',paymentState:'NOT_BOOKED',
  document:{
    erpGuid:'A'.repeat(32),customerGuid:expected.customerGuid,
    invoiceType:3,invoiceDate:expected.invoiceDate,
    note:'APERION NORMAL SATIS | '+expected.sourceId+' | E-FATURA GONDERME',
    amountsKurus:{...expected.amountsKurus},
    lines:expected.lines.map(x=>({
      productId:x.productId,quantity:x.quantity,taxRate:x.taxRate,
      grossKurus:x.gross,discountKurus:x.discount,netKurus:x.net,
      taxKurus:x.tax,totalKurus:x.total
    }))
  }
};
const ok=compareNormalSaleReadback(expected,good);
assert.equal(ok.matchesExpected,true);
assert.equal(ok.verified,false,'a caller-supplied candidate never proves the source');
assert.equal(ok.financialWrites,0);
assert.equal(ok.status,'CONTENT_MATCH_PROVIDER_ATTESTATION_PENDING');
const wrong=[
 x=>{x.document.customerGuid='8E1DAE5A38454C13AF15E7B1CEA4871C'},
 x=>{x.document.erpGuid='NOT_GUID'},
 x=>{x.document.note='not this order'},
 x=>{x.document.invoiceType=5},
 x=>{x.document.invoiceDate='2026-10-10'},
 x=>{x.document.amountsKurus.total=953191},
 x=>{x.document.lines[0].quantity=35},
 x=>{x.document.lines[1].productId=x.document.lines[0].productId},
 x=>{x.document.lines[2].discountKurus=1},
 x=>{x.document.lines[2].taxRate=20},
 x=>{x.document.lines.pop()},
 x=>{x.eInvoiceState='UNKNOWN'},
 x=>{x.paymentState='UNKNOWN'},
 x=>{x.capturedAt=''},
 x=>{x.source='GMAIL'},
];
for(const change of wrong) {
  const item=structuredClone(good);change(item);
  assert.equal(compareNormalSaleReadback(expected,item).matchesExpected,false,String(change));
}
const legacy={erpRecordReadBack:true,erpSaleGuid:'A'.repeat(32),
  lineCount:4,packageCount:66,totalKurus:953192,
  eFaturaIssued:false,paymentRecorded:false};
const rejected=compareNormalSaleReadback(expected,legacy);
assert.equal(rejected.verified,false);
assert.equal(rejected.blockers.includes('legacy_boolean_is_not_proof'),true);
console.log('A2_READBACK_FIELD_GUARD_PASS · 17 checks · NO_PROVIDER_CALL · NO_FINANCIAL_POST');
