/**
 * A2 / Owner-authenticated read-only normal-sale review.
 *
 * This endpoint is intentionally NOT a posting endpoint. The independently
 * approved operator UI, ERP duplicate check, and authenticated full invoice
 * readback do not exist yet. No finance POST is allowed here.
 */
import {authenticateDashboard} from '../shared/istasyon-dashboard-auth.js';
import {
  buildGamzeNormalSaleProposal,
  validateGamzeNormalSaleProposal
} from '../shared/gamze-normal-sale-proposal.js';

const response=(body,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'private, no-store, max-age=0',
    'x-content-type-options':'nosniff',
    'x-frame-options':'DENY'
  }
});

export async function onRequest({request,env}){
  if(request.method!=='GET')return response({ok:false,error:'READ_ONLY_POST_DISABLED'},405);
  let authenticated=false;
  try{authenticated=Boolean(await authenticateDashboard(request,env));}
  catch{return response({ok:false,error:'SESSION_CHECK_FAILED'},503);}
  if(!authenticated)return response({ok:false,error:'OWNER_SESSION_REQUIRED'},401);

  const proposal=buildGamzeNormalSaleProposal();
  const review=validateGamzeNormalSaleProposal(proposal);
  if(!review.valid)return response({ok:false,error:'PREPARED_SALE_VALIDATION_FAILED'},409);
  return response({
    ok:true,
    module:'A2',
    sourceId:proposal.sourceId,
    customer:proposal.customerTitle,
    salesDate:proposal.invoiceDate,
    items:proposal.lines.map(x=>({
      sku:x.sku,name:x.productName,quantity:x.quantity,
      unitPriceKurus:x.unitPriceKurus,discountKurus:x.discount,
      taxRate:x.taxRate,subtotalKurus:x.total
    })),
    quantity:review.packageCount,
    amountsKurus:{...proposal.amountsKurus},
    paymentTerms:proposal.payment.terms,
    paymentBooked:false,
    eFatura:false,
    state:'PREPARED_REVIEW_ONLY',
    ownerReviewAvailable:true,
    postingAvailable:false,
    postingBlockers:[
      'SEPARATE_OWNER_OPERATION_APPROVAL_NOT_DEPLOYED',
      'ATOMIC_SOURCE_ID_DEDUP_NOT_DEPLOYED',
      'INDEPENDENT_ERP_ITEM_READBACK_NOT_DEPLOYED',
      'NO_POLICY_AUTHORIZED_FINANCIAL_WRITER'
    ],
    note:'Owner signed off the source sale in chat; this web screen is not itself a posting approval. No financial action was sent.'
  });
}
