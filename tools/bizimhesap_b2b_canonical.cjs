'use strict';

const { createClient } = require('@supabase/supabase-js');
const { BizimHesapB2BClient, maskSecret } = require('../bizimhesap_api_client.cjs');
const { guardSingleInvoiceAttempt } = require('./lib/bot_command_safety.cjs');
const { checkInvoicePreflight,verifyRecordedInvoiceApproval } =
  require('./lib/bizimhesap_invoice_approval_guard.cjs');
const { normalizeInvoicePayload,validateInvoicePayload } = require('../bizimhesap_api_client.cjs');

function required(name, value) {
  const v = String(value || '').trim();
  if (!v) throw new Error(name + '_missing');
  return v;
}

async function loadBizimHesapIntegrationFromSupabase(env = process.env) {
  const url = required('SUPABASE_URL', env.SUPABASE_URL);
  const serviceKey = required('SUPABASE_SERVICE_ROLE_KEY', env.SUPABASE_SERVICE_ROLE_KEY);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await db
    .from('integrations')
    .select('api_key,api_token,is_active')
    .eq('provider', 'bizimhesap')
    .eq('is_active', true)
    .single();

  if (error) throw new Error('bizimhesap_integration_lookup_failed:' + error.message);
  if (!data?.api_key) throw new Error('bizimhesap_firm_id_missing');
  if (!data?.api_token) throw new Error('bizimhesap_token_missing');

  return {
    firmId: String(data.api_key).trim(),
    token: String(data.api_token).trim(),
  };
}

async function createBizimHesapClientFromCanonicalIntegration(env = process.env) {
  const creds = await loadBizimHesapIntegrationFromSupabase(env);
  const client = new BizimHesapB2BClient({
    firmId: creds.firmId,
    token: creds.token,
    authMode: 'token-header',
    // The verified 10 Oct B2B route accepted the token header only. Do not
    // inject the generic shared Key header into this canonical integration.
    key: '',
  });
  return { client, creds };
}

async function readOnlyHealth(env = process.env) {
  const { client, creds } = await createBizimHesapClientFromCanonicalIntegration(env);
  const customers = await client.customers();
  const products = await client.products();
  const customerCount = Array.isArray(customers) ? customers.length : Array.isArray(customers?.data) ? customers.data.length : null;
  const productCount = Array.isArray(products) ? products.length : Array.isArray(products?.data) ? products.data.length : null;
  return {
    ok: true,
    source: 'supabase.integrations/bizimhesap',
    firm_id: maskSecret(creds.firmId),
    token: maskSecret(creds.token),
    customer_count: customerCount,
    product_count: productCount,
  };
}

async function postApprovedInvoice(params = {}, env = process.env) {
  if (params.approved !== true) throw new Error('explicit_approval_required');
  const approvalId = String(params.approval_id || '').trim();
  const idempotencyKey = String(params.idempotency_key || '').trim();
  const invoice = params.invoice;
  if (!invoice || typeof invoice !== 'object') throw new Error('invoice_payload_missing');

  // Known supplier-acknowledged sale MUST never be sent again. Block it
  // BEFORE any credential load, external GET or finance queue transition.
  const preflight = checkInvoicePreflight({
    invoice,sourceReference:params.source_reference,idempotencyKey
  });
  if (preflight.blocked) return { ok: false, duplicate_blocked: true, ...preflight };

  // The token pasted in chat has to be rotated BEFORE permitting any POST.
  // An existing configured credential does not prove it was rotated.
  if (String(env.BIZIMHESAP_TOKEN_ROTATION_CONFIRMED || '') !== 'true')
    throw new Error('compromised_token_rotation_required');

  const url = required('SUPABASE_URL', env.SUPABASE_URL);
  const serviceKey = required('SUPABASE_SERVICE_ROLE_KEY', env.SUPABASE_SERVICE_ROLE_KEY);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { client, creds } = await createBizimHesapClientFromCanonicalIntegration(env);
  const normalized = normalizeInvoicePayload(invoice, creds.firmId);
  validateInvoicePayload(normalized);

  // Do not accept approved:true/approval_id supplied by a caller as approval.
  // The protected approval-center row MUST match the exact normalized invoice
  // body, total, order reference, and confirmation string.
  await verifyRecordedInvoiceApproval(db, {
    approvalId,sourceReference:preflight.sourceReference,
    idempotencyKey,payloadHash:require('./lib/bizimhesap_invoice_approval_guard.cjs')
      .payloadFingerprint(normalized),total:normalized.amounts.total
  });

  // Neither a blank customer statement nor no visible invoice is proof that
  // no provider sale exists. Until a provider-wide, independently authenticated
  // reconciliation path has been accepted, we must not issue a live invoice.
  if (String(env.APERION_INVOICE_FULL_PROVIDER_DUPLICATE_READBACK_READY || '') !== 'true')
    throw new Error('full_provider_duplicate_reconciliation_required');

  const guard = await guardSingleInvoiceAttempt(db, idempotencyKey, params.command_id);
  if (guard.duplicate_blocked) return { ok: false, ...guard };

  // Exactly ONE HTTP POST from this function, no automatic HTTP retry.
  // Timeout/500/429 means uncertain ERP state: reconciliation before reuse.
  const response = await client.addInvoice(normalized);
  const guid = String(response?.guid || response?.Guid || '').trim();
  const errorText = String(response?.error || response?.Error || '').trim();
  if (errorText) throw new Error('bizimhesap_addinvoice_rejected');
  if (!/^[0-9a-f]{32}$/i.test(guid))
    throw new Error('bizimhesap_invoice_result_uncertain_reconcile_before_retry');

  return {
    ok: true,
    duplicate_blocked: false,
    approval_id: approvalId,
    idempotency_key: idempotencyKey,
    guid,
    url: String(response?.url || response?.Url || ''),
    e_invoice_no: String(response?.eInvoiceNo || response?.EInvoiceNo || ''),
    providerDocumentDetailsVerified: false,
    eInvoiceSentVerified: false,
    status: 'ERP_GUID_RECEIVED_DOCUMENT_READBACK_REQUIRED',
  };
}

module.exports = {
  loadBizimHesapIntegrationFromSupabase,
  createBizimHesapClientFromCanonicalIntegration,
  readOnlyHealth,
  postApprovedInvoice,
};
