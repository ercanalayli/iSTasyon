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

module.exports = {
  loadBizimHesapIntegrationFromSupabase,
  createBizimHesapClientFromCanonicalIntegration,
  readOnlyHealth,
};
