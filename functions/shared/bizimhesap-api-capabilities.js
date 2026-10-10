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
  {id:'abstract',method:'GET',path:'/abstract/{customerId}',module:'cari_ekstre',documented:false,live:'rate_limited',details:'HTTP 429',risk:'read'},
  {id:'supplierabstract',method:'GET',path:'/supplierabstract/{supplierId}',module:'tedarikci_ekstre',documented:false,live:'untested',details:'Edge Function implementation exists',risk:'read'},
  {id:'addinvoice',method:'POST',path:'/addinvoice',module:'alis_satis_fatura_siparis',documented:true,live:'untested_write',details:'May auto-create missing customer or product',risk:'financial_write'},
  {id:'cancelinvoice',method:'POST',path:'/cancelinvoice',module:'fatura_iptal',documented:false,live:'untested_write',details:'Existing Edge Function implementation only',risk:'destructive_write'},
  {id:'addcustomer',method:'POST',path:'/addcustomer',module:'cari_ekle',documented:false,live:'authorization_failed',details:'Earlier HTTP 401 on write',risk:'financial_write'},
  {id:'addproduct',method:'POST',path:'/addproduct',module:'urun_ekle',documented:false,live:'untested_write',details:'Existing Edge Function implementation only',risk:'financial_write'}
].map(c=>Object.freeze(c)));

export const BIZIMHESAP_NO_CONFIRMED_B2B_API = Object.freeze([
  'expense_create','expense_list','cash_transaction_create','bank_transaction_create',
  'payment_create','collection_create','cash_transfer','sales_invoice_list'
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
    'bizimhesap.invoice_draft':'addinvoice',
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
