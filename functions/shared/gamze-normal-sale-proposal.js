/**
 * AperiON A2 — Gamze Eczanesi approved NORMAL SALES RECORD proposal.
 * Source: WA-20261010-GAMZE, explicitly approved 2026-10-11 ("Onaylıyorum peşin").
 *
 * WARNING: BizimHesap POST /addinvoice may CREATE A REAL SALE, not a safe
 * unposted draft. No GIB/e-Fatura submission, invoice number, or cash receipt
 * is requested. This module NEVER calls any remote write endpoint.
 *
 * This is a reviewed, replay-safe immutable proposal for an authorised
 * transaction tool. NEVER bypass a blocked financial write by queueing the
 * same POST through an alternate proxy/Edge Function/SQL.
 */

export const GAMZE_ORDER_KEY = "WA-20261010-GAMZE";
export const GAMZE_CUSTOMER_GUID = "219C65ACD6C24DB6AA977C9F49561B19";
const GUID = /^[0-9A-F]{32}$/i;
const money = c => (c / 100).toFixed(2);
const date = "2026-10-11T12:00:00+03:00";

// Monetary values in integer kurus, validated per line, no floating-point drift.
// gross = qty * approved undiscounted net-of-VAT price; discount is special 3%
// with line-level monetary rounding; tax rate 10%.
const LINES = Object.freeze([
  Object.freeze({sku:"MAM.01157",productId:"7DE6C284FBD64BA1BDC7BC097EC3151E",productName:"Jender belbantlı LARGE 7'li",quantity:36,unitPriceKurus:13464,gross:484704,discount:14541,net:470163,tax:47016,total:517179}),
  Object.freeze({sku:"MAM.01156",productId:"5F2A75998EFD4F6EAFF4E939DC061CDE",productName:"Jender belbantlı MEDIUM 8'li",quantity:12,unitPriceKurus:12988,gross:155856,discount:4676,net:151180,tax:15118,total:166298}),
  Object.freeze({sku:"MAM.01158",productId:"662756EF22EB4F0EBC1A7248B0DD4B7B",productName:"Jender belbantlı XLARGE 7'li",quantity:12,unitPriceKurus:14008,gross:168096,discount:5043,net:163053,tax:16305,total:179358}),
  Object.freeze({sku:"MAM.01169",productId:"4E82B2A9F2A24C349B3F02707B5ACC45",productName:"Moly koruyucu örtü 60x90 30'lu",quantity:6,unitPriceKurus:14114,gross:84684,discount:2541,net:82143,tax:8214,total:90357})
]);

export function buildGamzeNormalSaleProposal() {
  return {
    sourceId: GAMZE_ORDER_KEY,
    approval: "APPROVED_2026-10-11_PEŞİN",
    intent: "BIZIMHESAP_NORMAL_SALES_RECORD",
    customerGuid: GAMZE_CUSTOMER_GUID,
    customerTitle: "GAMZE ECZANESİ ECZ. HÜLYA NİZAM",
    documents: { eFatura: false, gibSend: false, invoiceNumberRequired: false, trueDraftAvailable: false },
    payment: {terms:"peşin",settled:false,receiptToCash:false},
    delivery: {duplicateLargeShipment:false,firstLargeShipmentSameAsOct10:true,sourceDateNote:"04+10 Ekim 36 Large paket tek sevkiyattır"},
    amountsKurus: {gross:893340,discount:26801,net:866539,tax:86653,total:953192},
    lines: LINES.map(x=>({...x,taxRate:10,invoiceUnit:"paket"})),
    invoiceDate:date, dueDate:date,
    financeWritePermittedByThisModule:false
  };
}

export function validateGamzeNormalSaleProposal(p) {
  const errors=[];
  const fail = err=>{if(!errors.includes(err))errors.push(err);};
  if(p?.sourceId!==GAMZE_ORDER_KEY || p.approval!=="APPROVED_2026-10-11_PEŞİN") fail("missing_or_wrong_approval");
  if(p.customerGuid!==GAMZE_CUSTOMER_GUID || !GUID.test(p.customerGuid)) fail("customer_mismatch");
  if(p.intent!=="BIZIMHESAP_NORMAL_SALES_RECORD" || p.documents?.eFatura!==false ||
     p.documents?.gibSend!==false || p.documents?.invoiceNumberRequired!==false) fail("document_mode_mismatch");
  if(p.payment?.settled!==false || p.payment?.receiptToCash!==false) fail("payment_must_not_be_booked");
  if(p.delivery?.firstLargeShipmentSameAsOct10!==true || p.delivery?.duplicateLargeShipment!==false) fail("large_shipment_duplicate");
  if(p.invoiceDate!==date||p.dueDate!==date) fail("dates_changed");
  if(p.financeWritePermittedByThisModule!==false) fail("unauthorized_write_flag");
  const expectedIds=LINES.map(x=>x.productId);
  if(!Array.isArray(p.lines)||p.lines.length!==4) fail("must_have_four_lines");
  const sums={gross:0,discount:0,net:0,tax:0,total:0};
  let quantity=0;
  if(Array.isArray(p.lines)) for(let i=0;i<p.lines.length;i++){
    const x=p.lines[i],approved=LINES[i];
    if(!approved || x.sku!==approved.sku || x.productId!==expectedIds[i] ||
       !GUID.test(x.productId) || x.quantity!==approved.quantity || x.invoiceUnit!=="paket") fail("product_or_quantity_mismatch");
    if(x.unitPriceKurus!==approved?.unitPriceKurus||x.taxRate!==10) fail("unit_price_or_vat_mismatch");
    if(x.gross!==x.unitPriceKurus*x.quantity || x.gross-x.discount!==x.net ||
       x.net+x.tax!==x.total || Math.round(x.net*0.1)!==x.tax) fail("line_math_mismatch");
    if(x.discount!==approved?.discount || x.gross!==approved?.gross || x.net!==approved?.net ||
       x.tax!==approved?.tax || x.total!==approved?.total) fail("approved_line_values_changed");
    for(const k of Object.keys(sums)) sums[k]+=x[k];
    quantity+=x.quantity;
  }
  if(quantity!==66)fail("quantity_not_66");
  if(sums.gross!==893340||sums.discount!==26801||sums.net!==866539||
     sums.tax!==86653||sums.total!==953192) fail("approved_total_mismatch");
  if(Object.keys(sums).some(k=>p.amountsKurus?.[k]!==sums[k]))fail("header_totals_mismatch");
  return {valid:errors.length===0, errors, packageCount:quantity, totals:sums, financialWrites:0};
}

export function prepareGamzeBizimHesapApiPayload() {
  const p=buildGamzeNormalSaleProposal();
  const check=validateGamzeNormalSaleProposal(p);
  if(!check.valid)throw new Error("approved_sale_preflight_failed:"+check.errors.join(","));
  // Only a validated and legitimately authorised native BizimHesap writer may
  // supply its already-approved FirmId. This module deliberately has no token,
  // FirmId, HTTP POST, or queue-processor invocation.
  const payload={
    invoiceType:3, invoiceNo:"",
    note:"APERION A2 NORMAL SATIS | "+GAMZE_ORDER_KEY+" | 04+10 EKIM BUYUK PAKET TEK SEVKIYAT | E-FATURA GONDERME",
    dates:{invoiceDate:p.invoiceDate,deliveryDate:p.invoiceDate,dueDate:p.dueDate},
    customer:{customerId:p.customerGuid,title:p.customerTitle},
    amounts:{currency:"TL",gross:money(p.amountsKurus.gross),discount:money(p.amountsKurus.discount),
      net:money(p.amountsKurus.net),tax:money(p.amountsKurus.tax),total:money(p.amountsKurus.total)},
    details:p.lines.map(x=>({
      productId:x.productId,productName:x.productName,quantity:x.quantity,
      unitPrice:money(x.unitPriceKurus),grossPrice:money(x.gross),
      discount:money(x.discount),net:money(x.net),taxRate:"10.00",
      tax:money(x.tax),total:money(x.total)
    }))
  };
  return {sourceId:p.sourceId,status:"READY_FOR_SUPPORTED_WRITE_TOOL",approved:true,
    noEInvoice:true,noPayment:true,noRetry:true,apiPayload:payload,financialWrites:0};
}

export function verifyGamzeSaleReadback(evidence={}) {
  // A GUID or HTTP 200 alone does not prove 4 correct lines and their totals.
  const valid=Boolean(
    evidence.erpRecordReadBack===true &&
    evidence.erpSaleGuid && GUID.test(String(evidence.erpSaleGuid)) &&
    evidence.customerGuid===GAMZE_CUSTOMER_GUID &&
    evidence.sourceId===GAMZE_ORDER_KEY &&
    evidence.lineCount===4 && evidence.packageCount===66 &&
    evidence.totalKurus===953192 &&
    evidence.eFaturaIssued===false &&
    evidence.paymentRecorded===false
  );
  return {verified:valid,status:valid?"BIZIMHESAP_SALE_VERIFIED":"ERP_WRITE_NOT_VERIFIED",financialWrites:0};
}
