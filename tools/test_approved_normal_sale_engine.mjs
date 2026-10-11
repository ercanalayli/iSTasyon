import assert from "node:assert/strict";
import {makeApprovedNormalSale} from "../functions/shared/approved-normal-sale-engine.js";
const order={
 sourceId:"WA-20261010-GAMZE",
 customerGuid:"219C65ACD6C24DB6AA977C9F49561B19",
 customerTitle:"GAMZE ECZANESİ ECZ. HÜLYA NİZAM",
 approvalConfirmed:true,uniqueSourceConfirmed:true,
 salesDate:"2026-10-11T12:00:00+03:00",paymentTerms:"peşin",
 eFatura:false,paymentBooked:false,expectedPackageCount:66,expectedTotalKurus:953192,
 items:[
 {sku:"MAM.01157",productId:"7DE6C284FBD64BA1BDC7BC097EC3151E",productName:"Jender LARGE 7li",quantity:36,unitPriceKurus:13464,discountPercent:3,vatRate:10,invoiceUnit:"paket",productMatchVerified:true},
 {sku:"MAM.01156",productId:"5F2A75998EFD4F6EAFF4E939DC061CDE",productName:"Jender MEDIUM 8li",quantity:12,unitPriceKurus:12988,discountPercent:3,vatRate:10,invoiceUnit:"paket",productMatchVerified:true},
 {sku:"MAM.01158",productId:"662756EF22EB4F0EBC1A7248B0DD4B7B",productName:"Jender XLARGE 7li",quantity:12,unitPriceKurus:14008,discountPercent:3,vatRate:10,invoiceUnit:"paket",productMatchVerified:true},
 {sku:"MAM.01169",productId:"4E82B2A9F2A24C349B3F02707B5ACC45",productName:"Moly 60x90 30lu",quantity:6,unitPriceKurus:14114,discountPercent:3,vatRate:10,invoiceUnit:"paket",productMatchVerified:true}
 ]
};
const check=makeApprovedNormalSale(order);
assert.equal(check.status,"READY_FOR_NATIVE_WRITE_TOOL",check.blockers.join(","));
assert.equal(check.apiPayload.amounts.gross,"8933.40");
assert.equal(check.apiPayload.amounts.discount,"268.01");
assert.equal(check.apiPayload.amounts.net,"8665.39");
assert.equal(check.apiPayload.amounts.tax,"866.53");
assert.equal(check.apiPayload.amounts.total,"9531.92");
assert.equal(check.packageCount,66);
assert.equal(check.apiPayload.details.length,4);
assert.equal(check.apiPayload.invoiceNo,"");
assert.equal(check.financialWrites,0);
assert.equal(check.createsEInvoice,false);
assert.equal(check.booksPayment,false);
for(const mutate of [
 (o)=>{o.approvalConfirmed=false;},
 (o)=>{o.uniqueSourceConfirmed=false;},
 (o)=>{o.items[0].quantity=72;},
 (o)=>{o.items[0].productMatchVerified=false;},
 (o)=>{o.items.push(o.items[0]);},
 (o)=>{o.expectedTotalKurus=953190;},
 (o)=>{o.eFatura=true;},
 (o)=>{o.paymentBooked=true;}
]){
 const copy=JSON.parse(JSON.stringify(order));mutate(copy);
 const out=makeApprovedNormalSale(copy);
 assert.equal(out.status,"BLOCKED_REVIEW");
 assert.equal(out.apiPayload,null);
}
console.log("REUSABLE_NORMAL_SALES_ENGINE_PASS · NO_WRITE");
