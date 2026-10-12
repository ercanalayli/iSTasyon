'use strict';

const { createClient } = require('@supabase/supabase-js');
const { BizimHesapB2BClient, maskSecret } = require('../bizimhesap_api_client.cjs');

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
  if (!/^[0-9a-f-]{36}$/i.test(approvalId)) throw new Error('approval_id_invalid');
  const idempotencyKey = String(params.idempotency_key || '').trim();
  if (!idempotencyKey) throw new Error('idempotency_key_missing');
  const invoice = params.invoice;
  if (!invoice || typeof invoice !== 'object') throw new Error('invoice_payload_missing');

  const url = required('SUPABASE_URL', env.SUPABASE_URL);
  const serviceKey = required('SUPABASE_SERVICE_ROLE_KEY', env.SUPABASE_SERVICE_ROLE_KEY);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: previous, error: previousError } = await db
    .from('bot_commands')
    .select('id,status,result,params')
    .eq('command', 'bizimhesap_b2b_invoice')
    .eq('status', 'completed')
    .contains('params', { idempotency_key: idempotencyKey })
    .limit(1);

  if (previousError) throw new Error('idempotency_lookup_failed:' + previousError.message);
  if (previous?.length) {
    return { ok: true, duplicate_blocked: true, prior_command_id: previous[0].id, prior_result: previous[0].result || '' };
  }

  const { client } = await createBizimHesapClientFromCanonicalIntegration(env);
  const response = await client.addInvoice(invoice);
  const guid = String(response?.guid || response?.Guid || '').trim();
  const errorText = String(response?.error || response?.Error || '').trim();
  if (errorText) throw new Error('bizimhesap_addinvoice_error:' + errorText);
  if (!guid) throw new Error('bizimhesap_addinvoice_guid_missing');

  return {
    ok: true,
    duplicate_blocked: false,
    approval_id: approvalId,
    idempotency_key: idempotencyKey,
    guid,
    url: String(response?.url || response?.Url || ''),
    e_invoice_no: String(response?.eInvoiceNo || response?.EInvoiceNo || ''),
  };
}

module.exports = {
  loadBizimHesapIntegrationFromSupabase,
  createBizimHesapClientFromCanonicalIntegration,
  readOnlyHealth,
  postApprovedInvoice,
};
