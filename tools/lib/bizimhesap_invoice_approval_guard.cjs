'use strict';

// Business-event lock based on the owner's 13 Oct 2026 actual B2B response.
// This is historical EVIDENCE, NOT authenticated ERP document readback.
// NEVER retry it as a "draft"; addinvoice creates a live sale.
const { createHash } = require('node:crypto');
const KNOWN_POSTED_SALES = Object.freeze({
  'WA-20261010-GAMZE': Object.freeze({
    guid: 'A782C5B8C1D64F649F4A8010F937F923',
    responseTotal: '9531.92',
    source: 'OWNER_PROVIDED_ADDINVOICE_RESPONSE',
    providerLineReadbackVerified: false,
    eInvoiceIssuedVerified: false,
  })
});
const ORDER_REF = /^WA-[0-9]{8}-[A-Z0-9-]{2,55}$/;
const SHA = /^[0-9a-f]{64}$/;
const MONEY = /^(?:0|[1-9][0-9]*)\.[0-9]{2}$/;

function cleanReference(value) {
  const ref = String(value || '').trim().toUpperCase();
  if (!ORDER_REF.test(ref)) throw new Error('invoice_order_reference_invalid');
  return ref;
}

function existingSaleGuard(sourceReference) {
  const ref = cleanReference(sourceReference);
  const existing = KNOWN_POSTED_SALES[ref];
  if (existing) return {
    blocked: true, status: 'EXISTING_PROVIDER_GUID_RECONCILIATION_REQUIRED',
    sourceReference: ref, existingGuid: existing.guid,
    responseTotal: existing.responseTotal, eInvoiceIssuedVerified: false,
    providerLineReadbackVerified: false, financialWrites: 0
  };
  return { blocked: false, sourceReference: ref, financialWrites: 0 };
}

function payloadFingerprint(invoice) {
  const fields = ['firmId','invoiceNo','invoiceType','note','dates','customer','amounts','details'];
  const allowed = Object.fromEntries(fields.map(k=>[k,invoice?.[k] ?? null]));
  return createHash('sha256').update(JSON.stringify(allowed)).digest('hex');
}

async function verifyRecordedInvoiceApproval(db,{approvalId,sourceReference,idempotencyKey,payloadHash,total}) {
  const ref=cleanReference(sourceReference);
  if (!/^[0-9a-f-]{36}$/i.test(String(approvalId||''))) throw new Error('invoice_approval_id_invalid');
  if (typeof idempotencyKey!=='string' || idempotencyKey !== ref+':NORMAL_SALE:v1')
    throw new Error('invoice_event_key_mismatch');
  if (!SHA.test(String(payloadHash||''))) throw new Error('invoice_approval_fingerprint_invalid');
  if (!MONEY.test(String(total||''))) throw new Error('invoice_approval_total_invalid');
  const {data,error}=await db.from('aperion_approval_center')
    .select('id,status,source_type,approval_description,suggested_amount,approved_by,approved_at')
    .eq('id',approvalId).maybeSingle();
  if (error) throw new Error('invoice_approval_source_unavailable');
  if (!data || data.status!=='approved' || data.source_type!=='bizimhesap_invoice' ||
      !String(data.approved_by||'').trim() || !data.approved_at)
    throw new Error('invoice_approval_not_recorded');
  // The approval description is a server-created snapshot, not caller input.
  // Treat absent/malformed descriptions as BLOCKED, never infer approval.
  let evidence;
  try{evidence=JSON.parse(data.approval_description||'');}catch{throw new Error('invoice_approval_snapshot_invalid');}
  if (!evidence || evidence.confirmationText!=='ONAYLIYORUM' ||
      evidence.sourceReference!==ref ||
      evidence.idempotencyKey!==idempotencyKey ||
      evidence.payloadSha256!==payloadHash ||
      evidence.approvedTotal!==total ||
      Math.round(Number(data.suggested_amount)*100)!==Math.round(Number(total)*100))
    throw new Error('invoice_approval_does_not_match_preview');
  return {ok:true,approvalId,sourceReference:ref,payloadSha256:payloadHash};
}

function checkInvoicePreflight({invoice,sourceReference,idempotencyKey}) {
  const known=existingSaleGuard(sourceReference);
  if(known.blocked)return known;
  if(idempotencyKey!==known.sourceReference+':NORMAL_SALE:v1')
    throw new Error('invoice_idempotency_reference_mismatch');
  if(!invoice || invoice.invoiceType!==3 || !String(invoice.note||'').includes(known.sourceReference))
    throw new Error('invoice_source_or_type_mismatch');
  if (!MONEY.test(String(invoice.amounts?.total||'')))throw new Error('invoice_total_invalid');
  if (!Array.isArray(invoice.details)||!invoice.details.length ||
      invoice.details.some(x=>Number(x.grossPrice)<=0 || !MONEY.test(String(x.grossPrice||''))))
    throw new Error('invoice_line_gross_price_missing');
  return {blocked:false,sourceReference:known.sourceReference,
    fingerprint:payloadFingerprint(invoice),total:invoice.amounts.total,financialWrites:0};
}

module.exports={KNOWN_POSTED_SALES,cleanReference,existingSaleGuard,
  payloadFingerprint,verifyRecordedInvoiceApproval,checkInvoicePreflight};
