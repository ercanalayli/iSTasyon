/**
 * A2 mobile approved proposal: OWNER-PAIRED, GET-ONLY, no ERP/financial write.
 * This is a local proposal, NOT proof a sale exists or that posting is allowed.
 */
import {authenticateDashboard} from '../shared/istasyon-dashboard-auth.js';
import {buildGamzeNormalSaleProposal,validateGamzeNormalSaleProposal} from '../shared/gamze-normal-sale-proposal.js';

const json=(data,status=200)=>new Response(JSON.stringify({
  ...data,postingAllowed:false,financialWrites:0
}),{status,headers:{
  'content-type':'application/json; charset=utf-8',
  'cache-control':'private, no-store, max-age=0',
  'x-content-type-options':'nosniff',
  'vary':'Authorization'
}});

export async function onRequest({request,env}){
  if(request.method!=='GET')return json({ok:false,error:'READ_ONLY'},405);
  let owner;
  try{owner=await authenticateDashboard(request,env);}
  catch{return json({ok:false,error:'OWNER_AUTH_UNAVAILABLE'},503);}
  if(!owner)return json({ok:false,error:'OWNER_SESSION_REQUIRED'},401);
  const proposal=buildGamzeNormalSaleProposal();
  const valid=validateGamzeNormalSaleProposal(proposal);
  if(!valid.valid)return json({ok:false,error:'APPROVED_PROPOSAL_INVALID'},503);
  return json({
    ok:true,source:'APPROVED_LOCAL_PROPOSAL_NOT_ERP',
    approval:proposal.approval,sourceId:proposal.sourceId,
    customer:proposal.customerTitle,
    invoiceType:3,paymentTerm:'peşin',
    receiptToCash:false,eInvoice:false,erpPosted:false,
    invoiceTotalKurus:proposal.amountsKurus.total,
    vatKurus:proposal.amountsKurus.tax,
    discountKurus:proposal.amountsKurus.discount,
    packageCount:valid.packageCount,
    lines:proposal.lines.map(x=>({
      sku:x.sku,name:x.productName,packages:x.quantity,
      totalKurus:x.total,vatRate:x.taxRate
    })),
    mode:'PREPARED_NOT_POSTED',
    next:'OWNER_ERP_DUPLICATE_CHECK_AND_INDEPENDENT_DOCUMENT_READBACK_REQUIRED',
    checkedAt:new Date().toISOString()
  });
}
