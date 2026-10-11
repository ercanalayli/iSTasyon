/**
 * Reusable ApeirON A2 approval-to-normal-sale preparer.
 * Pure calculations; absolutely no HTTP, token, queue or BizimHesap write.
 * First live sale requires a separately connected, policy-authorised native
 * posting tool with deduplication and independent ERP readback.
 */
const GUID=/^[A-F0-9]{32}$/i;
const cents=v=>(v/100).toFixed(2);
const integer=v=>Number.isSafeInteger(v) && v>=0;
export function makeApprovedNormalSale(order={}) {
 const problems=[];
 const fail=x=>{if(!problems.includes(x))problems.push(x);};
 const sourceId=String(order.sourceId||"").trim();
 const customerGuid=String(order.customerGuid||"").trim();
 const customerTitle=String(order.customerTitle||"").trim();
 if(!sourceId || sourceId.length>120)fail("source_required");
 if(!GUID.test(customerGuid)||!customerTitle)fail("customer_required");
 if(order.approvalConfirmed!==true)fail("explicit_approval_missing");
 if(order.uniqueSourceConfirmed!==true)fail("duplicate_control_missing");
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+03:00$/.test(String(order.salesDate||"")))fail("date_required");
 if(!["peşin","vadeli"].includes(String(order.paymentTerms||"").toLowerCase()))fail("payment_term_required");
 if(order.eFatura===true || order.paymentBooked===true)fail("not_normal_unpaid_sale");
 if(!Array.isArray(order.items)||!order.items.length)fail("items_missing");
 const seen=new Set(),details=[];
 let packs=0;
 const aggregate={gross:0,discount:0,net:0,tax:0,total:0};
 for(const item of order.items||[]) {
   const sku=String(item.sku||"").trim(),productId=String(item.productId||"").trim();
   if(!sku || seen.has(sku))fail("duplicate_sku");
   seen.add(sku);
   if(!GUID.test(productId)||item.productMatchVerified!==true)fail("product_match_unverified");
   if(item.invoiceUnit!=="paket"||!Number.isSafeInteger(item.quantity)||item.quantity<1)fail("package_quantity_invalid");
   if(!integer(item.unitPriceKurus)||item.unitPriceKurus<=0)fail("approved_price_required");
   if(!Number.isSafeInteger(item.discountPercent)||item.discountPercent<0||item.discountPercent>100)fail("discount_unapproved");
   if(![0,1,10,20].includes(item.vatRate))fail("vat_unapproved");
   const gross=item.quantity*item.unitPriceKurus;
   const discount=Math.round(gross*item.discountPercent/100);
   const net=gross-discount;
   const tax=Math.round(net*item.vatRate/100);
   const total=net+tax;
   if(![gross,discount,net,tax,total].every(integer)||total<=0)fail("bad_line_arithmetic");
   packs+=item.quantity;
   for(const k of Object.keys(aggregate))aggregate[k]+={gross,discount,net,tax,total}[k];
   details.push({
     sourceSku:sku,productId,productName:String(item.productName||""),
     quantity:item.quantity,unitPrice:cents(item.unitPriceKurus),
     grossPrice:cents(gross),discount:cents(discount),net:cents(net),
     taxRate:Number(item.vatRate||0).toFixed(2),tax:cents(tax),total:cents(total)
   });
 }
 if(order.expectedPackageCount!=null&&packs!==order.expectedPackageCount)fail("package_count_mismatch");
 if(order.expectedTotalKurus!=null&&aggregate.total!==order.expectedTotalKurus)fail("approved_total_mismatch");
 const apiPayload={
   invoiceType:3,invoiceNo:"",
   note:"APERION NORMAL SATIS | "+sourceId+" | E-FATURA GONDERME",
   dates:{invoiceDate:order.salesDate,deliveryDate:order.salesDate,dueDate:order.dueDate||order.salesDate},
   customer:{customerId:customerGuid,title:customerTitle},
   amounts:{currency:"TL",gross:cents(aggregate.gross),discount:cents(aggregate.discount),
      net:cents(aggregate.net),tax:cents(aggregate.tax),total:cents(aggregate.total)},
   details:details.map(({sourceSku,...line})=>line)
 };
 return {
   status:problems.length?"BLOCKED_REVIEW":"READY_FOR_NATIVE_WRITE_TOOL",
   sourceId,blockers:problems,packageCount:packs,
   totalsKurus:aggregate,
   apiPayload:problems.length?null:apiPayload,
   requiresWritePermission:true,
   requiresExternalDuplicateCheck:true,
   requiresIndependentReadback:true,
   createsEInvoice:false,booksPayment:false,financialWrites:0
 };
}
