const DEFAULT_BASE_URL = 'https://bizimhesap.com/api/b2b';
const DEFAULT_B2B_KEY = 'BZMHB2B724018943908D0B82491F203F';

function env(name, fallback = '') {
  return String(process.env[name] || fallback || '').trim();
}

function getBizimHesapApiConfig() {
  const token = env('BIZIMHESAP_B2B_TOKEN') || env('BIZIMHESAP_API_TOKEN') || env('BIZIMHESAP_ZIRVE_API_KEY');
  const firmId = env('BIZIMHESAP_FIRM_ID') || env('BIZIMHESAP_B2B_FIRM_ID');
  const baseUrl = env('BIZIMHESAP_B2B_BASE_URL', DEFAULT_BASE_URL).replace(/\/+$/, '');
  const authMode = env('BIZIMHESAP_B2B_AUTH_MODE', 'token-header').toLowerCase();
  const key = env('BIZIMHESAP_B2B_KEY', DEFAULT_B2B_KEY);
  return { token, firmId, baseUrl, authMode, key };
}

function maskSecret(value) {
  const text = String(value || '');
  if (!text) return '';
  if (text.length <= 8) return `${text.slice(0, 2)}***`;
  return `${text.slice(0, 4)}***${text.slice(-4)}`;
}

// API financial amounts: do not remove decimal dots (1.23 must never become 123.00).
// Turkish/English grouped values are supported; ambiguous or invalid values fail closed.
function normalizeMoney(value) {
  if (value === null || value === undefined || value === '') return '0.00';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('invalid_invoice_money');
    return value.toFixed(2);
  }
  const raw = String(value).trim().replace(/\s+/g, '');
  if (!/^-?\d[\d.,]*$/.test(raw)) throw new Error('invalid_invoice_money');
  const dots = (raw.match(/\./g) || []).length;
  const commas = (raw.match(/,/g) || []).length;
  let normalized;
  if (dots && commas) {
    const decimal = raw.lastIndexOf('.') > raw.lastIndexOf(',') ? '.' : ',';
    const thousands = decimal === '.' ? ',' : '.';
    const halves = raw.split(decimal);
    if (halves.length !== 2 ||
        !new RegExp('^-?\\d{1,3}(?:\\' + thousands + '\\d{3})+

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
    if (this.config.key) h.Key = this.config.key;
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
  DEFAULT_B2B_KEY,
  BizimHesapB2BClient,
  getBizimHesapApiConfig,
  maskSecret,
  normalizeInvoicePayload,
  normalizeMoney,
};
).test(halves[0]) ||
        !/^\d{1,4}$/.test(halves[1])) throw new Error('ambiguous_invoice_money');
    normalized = halves[0].split(thousands).join('') + '.' + halves[1];
  } else if (dots || commas) {
    const separator = dots ? '.' : ',';
    const groups = raw.split(separator);
    if (groups.length > 2) {
      if (!/^\d{1,3}$/.test(groups[0].replace(/^-/, '')) ||
          !groups.slice(1).every(x => /^\d{3}$/.test(x))) throw new Error('ambiguous_invoice_money');
      normalized = groups.join('');
    } else if (groups.length === 2 && groups[1].length === 3 &&
               /^-?[1-9]\d{0,2}$/.test(groups[0])) {
      // 2.400 and 2,400 mean 2400 in a two-decimal currency field.
      normalized = groups.join('');
    } else if (groups.length === 2 && /^\d{1,4}$/.test(groups[1])) {
      normalized = groups[0] + '.' + groups[1];
    } else throw new Error('ambiguous_invoice_money');
  } else normalized = raw;
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) throw new Error('invalid_invoice_money');
  return amount.toFixed(2);
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
    if (this.config.key) h.Key = this.config.key;
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
  DEFAULT_B2B_KEY,
  BizimHesapB2BClient,
  getBizimHesapApiConfig,
  maskSecret,
  normalizeInvoicePayload,
};
