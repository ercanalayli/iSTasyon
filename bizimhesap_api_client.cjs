const DEFAULT_BASE_URL = 'https://bizimhesap.com/api/b2b';

function env(name, fallback = '') {
  return String(process.env[name] || fallback || '').trim();
}

function getBizimHesapApiConfig() {
  const token = env('BIZIMHESAP_B2B_TOKEN') || env('BIZIMHESAP_API_TOKEN') || env('BIZIMHESAP_ZIRVE_API_KEY');
  const firmId = env('BIZIMHESAP_FIRM_ID') || env('BIZIMHESAP_B2B_FIRM_ID');
  const baseUrl = env('BIZIMHESAP_B2B_BASE_URL', DEFAULT_BASE_URL).replace(/\/+$/, '');
  const authMode = env('BIZIMHESAP_B2B_AUTH_MODE', 'token-header').toLowerCase();
  return { token, firmId, baseUrl, authMode };
}

function maskSecret(value) {
  const text = String(value || '');
  if (!text) return '';
  if (text.length <= 8) return `${text.slice(0, 2)}***`;
  return `${text.slice(0, 4)}***${text.slice(-4)}`;
}

function normalizeMoney(value) {
  if (value === null || value === undefined || value === '') return '0.00';
  const n = Number(String(value).replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return String(value);
  return n.toFixed(2);
}

function normalizeInvoicePayload(input = {}, firmId = '') {
  const details = Array.isArray(input.details) ? input.details : [];
  const amounts = input.amounts || {};
  return {
    firmId: input.firmId || input.FirmId || firmId,
    invoiceNo: input.invoiceNo || input.InvoiceNo || '',
    invoiceType: Number(input.invoiceType || input.InvoiceType || 5),
    note: input.note || input.Note || '',
    dates: input.dates || input.Dates || {},
    customer: input.customer || input.Customer || {},
    amounts: {
      currency: amounts.currency || amounts.Currency || 'TL',
      gross: normalizeMoney(amounts.gross || amounts.Gross),
      discount: normalizeMoney(amounts.discount || amounts.Discount),
      net: normalizeMoney(amounts.net || amounts.Net),
      tax: normalizeMoney(amounts.tax || amounts.Tax),
      total: normalizeMoney(amounts.total || amounts.Total),
    },
    details: details.map((d) => ({
      productId: d.productId || d.ProductId || d.id || '',
      productName: d.productName || d.ProductName || d.title || '',
      note: d.note || d.Note || '',
      barcode: d.barcode || d.Barcode || '',
      taxRate: normalizeMoney(d.taxRate || d.TaxRate || 0),
      quantity: Number(d.quantity || d.Quantity || 1),
      unitPrice: normalizeMoney(d.unitPrice || d.UnitPrice || 0),
      grossPrice: normalizeMoney(d.grossPrice || d.GrossPrice || 0),
      discount: normalizeMoney(d.discount || d.Discount || 0),
      net: normalizeMoney(d.net || d.Net || 0),
      tax: normalizeMoney(d.tax || d.Tax || 0),
      total: normalizeMoney(d.total || d.Total || 0),
    })),
  };
}

class BizimHesapB2BClient {
  constructor(config = {}) {
    const defaults = getBizimHesapApiConfig();
    this.config = { ...defaults, ...config };
  }

  headers(extra = {}) {
    const h = { Accept: 'application/json', ...extra };
    if (this.config.token && this.config.authMode !== 'bearer' && this.config.authMode !== 'query-token') h.token = this.config.token;
    if (this.config.token && this.config.authMode === 'bearer') h.Authorization = `Bearer ${this.config.token}`;
    return h;
  }

  async request(method, endpoint, body) {
    let url = `${this.config.baseUrl}/${String(endpoint).replace(/^\/+/, '')}`;
    if (this.config.token && this.config.authMode === 'query-token') {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}token=${encodeURIComponent(this.config.token)}`;
    }
    const options = { method, headers: this.headers() };
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    const res = await fetch(url, options);
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok) {
      throw new Error(`BizimHesap API ${method} ${endpoint} HTTP ${res.status}: ${text.slice(0, 300)}`);
    }
    return json || text;
  }

  products() { return this.request('GET', 'products'); }
  warehouses() { return this.request('GET', 'warehouses'); }
  inventory(warehouseId) { return this.request('GET', `inventory/${encodeURIComponent(warehouseId)}`); }
  customers() { return this.request('GET', 'customers'); }
  abstract(customerId) { return this.request('GET', `abstract/${encodeURIComponent(customerId)}`); }

  addCustomer(payload) {
    return this.request('POST', 'addcustomer', payload);
  }

  addProduct(payload) {
    return this.request('POST', 'addproduct', payload);
  }

  addInvoice(payload) {
    return this.request('POST', 'addinvoice', normalizeInvoicePayload(payload, this.config.firmId));
  }

  cancelInvoice(guid) {
    return this.request('POST', 'cancelinvoice', { FirmId: this.config.firmId, Guid: guid });
  }
}

module.exports = {
  DEFAULT_BASE_URL,
  BizimHesapB2BClient,
  getBizimHesapApiConfig,
  maskSecret,
  normalizeInvoicePayload,
};
