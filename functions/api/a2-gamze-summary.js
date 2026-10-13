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
    receiptToCash:false,eInvoice:false,erpPosted:null,
    providerResponseEvidence:{
      source:'OWNER_SHARED_B2B_ADDINVOICE_RESPONSE',
      guid:'FCB82CD3053A491986C6B2D1C9F5D329',
      invoiceNo:'',eInvoiceNo:'',reportedTotalKurus:953192,
      reportedNetKurus:866538,reportedTaxKurus:86654,
      ownerReportedCustomerTitle:'GAMZE ECZANESİ ECZ. HÜLYA NİZAM',
      customerCardMatchVerified:false,
      previousGuid:'A782C5B8C1D64F649F4A8010F937F923',
      previousCancelApiError:'',previousCancelApiStatus:'0',
      previousCancellationIndependentlyVerified:false,
      actualDocumentItemsReadBack:false,eInvoiceIssuedVerified:false
    },
    duplicateGuard:'EXISTING_GUID_DO_NOT_POST',
    contentComparison:'APPROVED_LOCAL_PROPOSAL_DIFFERS_FROM_OWNER_REPORTED_PROVIDER_POST',

    invoiceTotalKurus:proposal.amountsKurus.total,
    vatKurus:proposal.amountsKurus.tax,
    discountKurus:proposal.amountsKurus.discount,
    packageCount:valid.packageCount,
    lines:proposal.lines.map(x=>({
      sku:x.sku,name:x.productName,packages:x.quantity,
      totalKurus:x.total,vatRate:x.taxRate
    })),
    mode:'PROVIDER_GUID_REPORTED_LINE_READBACK_PENDING',
    next:'EXISTING_GUID_DOCUMENT_READBACK_REQUIRED_NO_NEW_POST',
    checkedAt:new Date().toISOString()
  });
}
