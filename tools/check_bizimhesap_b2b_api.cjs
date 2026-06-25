const {
  BizimHesapB2BClient,
  getBizimHesapApiConfig,
  maskSecret,
} = require('../bizimhesap_api_client.cjs');

const args = process.argv.slice(2);
const liveGet = args.includes('--live-get');

function ok(label, detail = '') {
  console.log(`OK ${label}${detail ? `: ${detail}` : ''}`);
}

function fail(label, detail = '') {
  console.log(`MISS ${label}${detail ? `: ${detail}` : ''}`);
}

function countOf(value) {
  if (Array.isArray(value)) return value.length;
  if (Array.isArray(value?.data)) return value.data.length;
  if (Array.isArray(value?.items)) return value.items.length;
  if (value && typeof value === 'object') return Object.keys(value).length;
  return value ? 1 : 0;
}

async function main() {
  const config = getBizimHesapApiConfig();
  console.log('BizimHesap B2B API preflight');
  console.log(`base_url=${config.baseUrl}`);

  if (config.token) ok('token', maskSecret(config.token));
  else fail('token', 'GitHub secret BIZIMHESAP_B2B_TOKEN gerekli');

  if (config.firmId) ok('firm_id', maskSecret(config.firmId));
  else fail('firm_id', 'GitHub secret BIZIMHESAP_FIRM_ID gerekli');

  if (!liveGet) {
    console.log('LIVE_GET=0 - ağ testi yapılmadı. Canlı okuma için: npm run verify:bizimhesap:b2b-api:live');
    if (!config.token || !config.firmId) process.exitCode = 1;
    return;
  }

  if (process.env.BIZIMHESAP_B2B_API_LIVE !== '1') {
    throw new Error('Canlı API okuma kilitli: BIZIMHESAP_B2B_API_LIVE=1 gerekli.');
  }
  if (!config.token) throw new Error('BIZIMHESAP_B2B_TOKEN yok.');

  const api = new BizimHesapB2BClient(config);
  const checks = [
    ['products', () => api.products()],
    ['customers', () => api.customers()],
    ['warehouses', () => api.warehouses()],
  ];

  for (const [name, fn] of checks) {
    try {
      const result = await fn();
      ok(`GET ${name}`, `${countOf(result)} kayıt/alan`);
    } catch (e) {
      fail(`GET ${name}`, e.message);
      process.exitCode = 1;
    }
  }

  console.log('Canlı yazma yapılmadı. AddInvoice/AddCustomer/AddProduct ayrı kilit olmadan çağrılmaz.');
}

main().catch((e) => {
  console.error(`BIZIMHESAP_B2B_PREFLIGHT_FAILED: ${e.message}`);
  process.exit(1);
});
