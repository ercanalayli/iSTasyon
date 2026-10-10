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

// Monetary amounts sent to BizimHesap must preserve decimal separators.
// Never silently convert 1.23 into 123.00; invalid input fails closed.
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
  let clean;
  if (dots && commas) {
    if (raw.lastIndexOf('.') > raw.lastIndexOf(',')) {
      if (!/^-?\d{1,3}(,\d{3})+\.\d{1,4}$/.test(raw)) throw new Error('ambiguous_invoice_money');
      clean = raw.replace(/,/g, '');
    } else {
      if (!/^-?\d{1,3}(\.\d{3})+,\d{1,4}$/.test(raw)) throw new Error('ambiguous_invoice_money');
      clean = raw.replace(/\./g, '').replace(',', '.');
    }
  } else if (dots || commas) {
    const sep = dots ? '.' : ',';
    const groups = raw.split(sep);
    if (groups.length > 2) {
      if (!/^-?\d{1,3}$/.test(groups[0]) || !groups.slice(1).every(g => /^\d{3}$/.test(g))) {
        throw new Error('ambiguous_invoice_money');
      }
      clean = groups.join('');
    } else if (groups.length === 2 && groups[1].length === 3 && /^-?[1-9]\d{0,2}$/.test(groups[0])) {
      clean = groups.join('');
    } else if (groups.length === 2 && /^\d{1,4}$/.test(groups[1])) {
      clean = groups[0] + '.' + groups[1];
    } else {
      throw new Error('ambiguous_invoice_money');
    }
  } else {
    clean = raw;
  }
  const amount = Number(clean);
  if (!Number.isFinite(amount)) throw new Error('invalid_invoice_money');
  return amount.toFixed(2);
}

function normalizeInvoicePayload(input = {}, firmId = '') {
  const details = Array.isArray(input.details) ? input.details : Array.isArray(input.Details) ? input.Details : [];
  const amounts = input.amounts || {};
  const selectedFirmId = input.firmId || input.FirmId || firmId;
  if (firmId && selectedFirmId !== firmId) throw new Error('invoice_firm_mismatch');
  if (!/^[a-f0-9]{32}$/i.test(String(selectedFirmId))) throw new Error('invoice_firm_id_invalid');
  const invoiceType = Number(input.invoiceType ?? input.InvoiceType);
  if (![3, 5].includes(invoiceType)) throw new Error('invoice_type_must_be_3_or_5');
  return {
    firmId: selectedFirmId,
    invoiceNo: input.invoiceNo || input.InvoiceNo || '',
    invoiceType,
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

// Prevent incorrect firms, 100x prices, mismatched VAT/totals and partial
// invoices from reaching the live API. Runs before any network request.
function validateInvoicePayload(p) {
  if (!p || !/^[a-f0-9]{32}$/i.test(String(p.firmId || ''))) throw new Error('invoice_firm_id_invalid');
  if (![3, 5].includes(p.invoiceType)) throw new Error('invoice_type_invalid');
  if (!p.customer || !(String(p.customer.customerId || p.customer.CustomerId || '').trim() ||
                         String(p.customer.title || p.customer.Title || '').trim())) {
    throw new Error('invoice_customer_missing');
  }
  if (!Array.isArray(p.details) || p.details.length === 0) throw new Error('invoice_lines_missing');
  const money = value => {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error('invoice_amount_nonfinite');
    return number;
  };
  const total = money(p.amounts?.total);
  const gross = money(p.amounts?.gross);
  const discount = money(p.amounts?.discount);
  const net = money(p.amounts?.net);
  const tax = money(p.amounts?.tax);
  if (total <= 0 || gross <= 0 || discount < 0 || net < 0 || tax < 0)
    throw new Error('invoice_amount_invalid');
  if (Math.abs(gross - discount - net) > 0.000001)
    throw new Error('invoice_header_discount_mismatch');
  if (Math.abs(total - net - tax) > 0.000001) throw new Error('invoice_total_vat_mismatch');
  let lineTotal = 0, lineGross = 0, lineDiscount = 0, lineNet = 0, lineTax = 0;
  for (const line of p.details) {
    if (!(String(line.productId || '').trim() || String(line.productName || '').trim())) {
      throw new Error('invoice_product_missing');
    }
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) throw new Error('invoice_quantity_invalid');
    if (money(line.net) < 0 || money(line.tax) < 0) throw new Error('invoice_line_invalid');
    const amount = money(line.total);
    const g = money(line.grossPrice), d = money(line.discount);
    const n = money(line.net), t = money(line.tax);
    const rate = money(line.taxRate);
    if (g < 0 || d < 0 || d > g || rate < 0 || rate > 100) throw new Error('invoice_line_invalid');
    if (Math.abs(g - d - n) > 0.000001) throw new Error('invoice_line_discount_mismatch');
    if (Math.abs(g - Math.round(line.quantity * money(line.unitPrice) * 100) / 100) > 0.000001)
      throw new Error('invoice_line_unit_price_mismatch');
    if (Math.abs(t - Math.round(n * rate) / 100) > 0.000001)
      throw new Error('invoice_line_tax_rate_mismatch');
    if (Math.abs(amount - n - t) > 0.000001) throw new Error('invoice_line_vat_mismatch');
    lineGross += g; lineDiscount += d; lineNet += n; lineTax += t; lineTotal += amount;
  }
  if (Math.abs(gross - lineGross) > 0.000001 || Math.abs(discount - lineDiscount) > 0.000001 ||
      Math.abs(net - lineNet) > 0.000001 || Math.abs(tax - lineTax) > 0.000001 ||
      Math.abs(total - lineTotal) > 0.000001)
    throw new Error('invoice_line_sum_mismatch');
  return true;
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
    const normalized = normalizeInvoicePayload(payload, this.config.firmId);
    validateInvoicePayload(normalized);
    return this.request('POST', 'addinvoice', normalized);
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
  validateInvoicePayload,
};
