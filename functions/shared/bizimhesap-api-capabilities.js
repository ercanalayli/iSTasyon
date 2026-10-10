/**
 * AperiON canonical BizimHesap B2B capability registry.
 * Statuses separate official vendor documentation, working vendor responses,
 * historic implementation, and UNTESTED financial writes.
 * Does NOT execute any remote request or mutate BizimHesap.
 *
 * Vendor documentation: https://apidocs.bizimhesap.com/llms.txt
 * Last live read probes: 2026-10-10
 */
export const BIZIMHESAP_API_CAPABILITIES = Object.freeze([
  {id:'products',method:'GET',path:'/products',module:'urun',documented:true,live:'verified',details:'3035 products',risk:'read'},
  {id:'warehouses',method:'GET',path:'/warehouses',module:'depo',documented:true,live:'verified',details:'2 warehouses',risk:'read'},
  {id:'inventory',method:'GET',path:'/inventory/{depoId}',module:'stok',documented:true,live:'verified_partial',details:'First depot read',risk:'read'},
  {id:'customers',method:'GET',path:'/customers',module:'cari',documented:false,live:'verified',details:'5782 customers',risk:'read'},
  {id:'suppliers',method:'GET',path:'/suppliers',module:'tedarikci',documented:false,live:'verified',details:'HTTP 200 resultCode=1',risk:'read'},
  {id:'abstract',method:'GET',path:'/abstract/{customerId}',module:'cari_ekstre',documented:false,live:'verified',details:'2026-10-11 B2B customer abstract HTTP200/resultCode=1 on 8 customer cards; 6 sales header numbers+amounts live confirmed; rate limiting can recur',risk:'read'},
  {id:'supplierabstract',method:'GET',path:'/supplierabstract/{supplierId}',module:'tedarikci_ekstre',documented:false,live:'untested',details:'Edge Function implementation exists',risk:'read'},
  {id:'addinvoice',method:'POST',path:'/addinvoice',module:'alis_satis_fatura_siparis',documented:true,live:'verified_write_guid',details:'2026-10-10 posted 1 TL total request and got invoice guid 14A652F2FD1F4432910BC799E02F0AB7 and printout URL; stored total not independently read back; auto-created customer verified in /customers; cancellation not executed',risk:'financial_write'},
  {id:'cancelinvoice',method:'POST',path:'/cancelinvoice',module:'fatura_iptal',documented:false,live:'execution_blocked',details:'2026-10-10 approved test cancellation was blocked by tool execution policy; do not claim cancelled',risk:'destructive_write'},
  {id:'addcustomer',method:'POST',path:'/addcustomer',module:'cari_ekle',documented:false,live:'http_500',details:'2026-10-10 valid marked test customer POST HTTP 500; the same marked customer auto-created via /addinvoice and verified in /customers, not by /addcustomer',risk:'financial_write'},
  {id:'addproduct',method:'POST',path:'/addproduct',module:'urun_ekle',documented:false,live:'verified_write_readback',details:'2026-10-10 created and read back product ID D96E3752EEBE4DAB90C64159ED45E24D; 3035 to 3036; WARNING API ignored submitted sale price 1 TL, stored price 0.0000; code also blank',risk:'financial_write'}
].map(c=>Object.freeze(c)));

export const BIZIMHESAP_NO_CONFIRMED_B2B_API = Object.freeze([
  'expense_create','expense_list','cash_transaction_create','bank_transaction_create',
  'payment_create','collection_create','cash_transfer','sales_invoice_list','native_proforma_draft_save'
]);

const index=new Map(BIZIMHESAP_API_CAPABILITIES.map(x=>[x.id,x]));
export function getBizimHesapApiCapability(id) {
  return index.get(String(id||''))||null;
}
export function planBizimHesapApiOperation(id,parameters={}) {
  const cap=getBizimHesapApiCapability(id);
  if(!cap) return {channel:'unavailable',operation:id,reason:'not_confirmed_in_b2b_api',canExecute:false,financialWrite:0};
  const required={inventory:'depoId',abstract:'customerId',supplierabstract:'supplierId'}[id];
  let path=cap.path;
  if(required){
    const val=String(parameters[required]??'').trim();
    if(!/^[A-Za-z0-9_-]{1,80}$/.test(val)) return {channel:'api',operation:id,reason:'missing_or_invalid_source_id',canExecute:false,financialWrite:0};
    path=path.replace('{'+required+'}',encodeURIComponent(val));
  }
  if(cap.method!=='GET') return {
    channel:'api_after_explicit_approval',operation:id,apiPath:path,
    reason:'financial_write_not_yet_proven',canExecute:false,
    approvalRequired:true,idempotencyRequired:true,readBackRequired:true,financialWrite:0
  };
  if(cap.live==='rate_limited') return {
    channel:'api',operation:id,apiPath:path,reason:'429_cooldown_no_retry',canExecute:false,financialWrite:0
  };
  return {channel:'api_first',operation:id,method:'GET',apiPath:path,
    canExecute:true,live:cap.live,readOnly:true,financialWrite:0};
}
export function preferredBizimHesapChannel(commandCode) {
  const operations={
    'bizimhesap.products_read':'products',
    'bizimhesap.warehouses_read':'warehouses',
    'bizimhesap.inventory_read':'inventory',
    'bizimhesap.customers_read':'customers',
    'bizimhesap.suppliers_read':'suppliers',
    'bizimhesap.customer_abstract_read':'abstract',
    'bizimhesap.supplier_abstract_read':'supplierabstract',
    'bizimhesap.invoice_draft':'native_proforma_draft_save',
    'bizimhesap.invoice_post':'addinvoice',
    'bizimhesap.expense_post':'expense_create',
    'bizimhesap.cash_transfer_post':'cash_transfer',
    'bizimhesap.payment_draft':'payment_create',
    'bizimhesap.collection_draft':'collection_create'
  };
  const id=operations[String(commandCode||'')];
  if(!id) return {channel:'not_mapped',canExecute:false};
  return planBizimHesapApiOperation(id);
}
