'use strict';

/**
 * Farmazon official seller API - read-only, fail-closed connector.
 * Source: https://yardim.farmazon.com.tr/tr/articles/3106355-farmazon-api-dokumani
 * No authentication/login request or HTTP write exists in this module.
 * Bearer token must be provided by an authorized *local* vault adapter, never
 * passed via user messages, D1, GitHub, logs or a browser extension.
 */
const ORIGINS = Object.freeze({
  staging: 'https://staging.lab.farmazon.com.tr',
  production: 'https://lab.farmazon.com.tr'
});
const PATHS = Object.freeze({
  listings: '/api/v2/listings/getlistings',
  listing: '/api/v1/listings/getlisting',
  soldOrders: '/api/v1/orders/getsoldorders',
  soldOrder: '/api/v1/orders/getsoldorder',
  purchasedOrders: '/api/v1/orders/getpurchasedorders',
  purchasedOrder: '/api/v1/orders/getpurchasedorder',
  pricingBotRules: '/api/v1/listings/getpricingbotrules'
});
const MIN_INTERVAL_MS = 7000; // strictly below 10 requests/minute
// Farmazon's orderStateId values are NOT the 0..6 GET filter values.
const SOLD_ORDER_STATES = Object.freeze({
  1: 'AWAITING_SELLER_APPROVAL',
  2: 'AWAITING_SHIPMENT',
  4: 'IN_TRANSIT',
  32: 'COMPLETED',
  64: 'CANCELLED',
  512: 'AWAITING_BUYER_APPROVAL',
  1024: 'PREORDER_PAYMENT_NOT_RECEIVED'
});


class FarmazonReadError extends Error {
  constructor(code) { super(code); this.name = 'FarmazonReadError'; }
}
function whole(v, min, max, code) {
  if (!Number.isInteger(v) || v < min || v > max) throw new FarmazonReadError(code);
  return v;
}
function date(v) {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
      Number.isNaN(Date.parse(v + 'T00:00:00Z')) ||
      new Date(v + 'T00:00:00Z').toISOString().slice(0,10) !== v) {
    throw new FarmazonReadError('invalid_date');
  }
  return v;
}
function listRecord(v) {
  if (!v || typeof v !== 'object' || !Number.isSafeInteger(v.id)) throw new FarmazonReadError('invalid_listing');
  const product = v.product;
  if (!product || typeof product !== 'object') throw new FarmazonReadError('invalid_product');
  return {
    listing_id: v.id, product_id: Number.isSafeInteger(product.id) ? product.id : null,
    product_name: String(product.name || '').slice(0,200),
    // V2 listing collection nests SKU under product; V1 getlisting may return it at root.
    sku: (v.sku ?? product.sku) == null ? null : String(v.sku ?? product.sku).slice(0,100),
    barcodes: Array.isArray(product.barcodes)
      ? product.barcodes.filter(x => x && x.isSelected === true)
        .map(x => String(x.barcode || '').slice(0,40)).filter(Boolean).slice(0,10) : [],
    price: typeof v.price === 'number' && Number.isFinite(v.price) ? v.price : null,
    stock: Number.isSafeInteger(v.stock) ? v.stock : null,
    expiry: typeof v.expiration === 'string' ? v.expiration.slice(0,19) : null,
    vat_from_source: Number.isFinite(product.vat) ? product.vat : null,
    status: v.listingState === 1 ? 'ACTIVE' : v.listingState === 2 ? 'PASSIVE' : 'UNSPECIFIED'
  };
}
function sellerUsername(v) {
  const name = v == null ? null : String(v).trim();
  if (name !== null && !/^[A-Za-z0-9._-]{2,100}$/.test(name)) throw new FarmazonReadError('invalid_expected_seller');
  return name;
}
function soldRecord(v, expectedUsername) {
  if (!v || typeof v !== 'object' || !Number.isSafeInteger(v.orderId)) throw new FarmazonReadError('invalid_sold_order');
  if (expectedUsername && String(v.sellerUsername || '').trim().toLocaleLowerCase('tr-TR') !== expectedUsername.toLocaleLowerCase('tr-TR')) {
    throw new FarmazonReadError('seller_username_mismatch');
  }
  return {
    direction: 'ALAYLI_SELL_CANDIDATE',
    order_id: v.orderId,
    order_date: typeof v.orderDate === 'string' ? v.orderDate.slice(0,19) : null,
    order_state_id: Number.isSafeInteger(v.orderStateId) ? v.orderStateId : null,
    order_state: Number.isSafeInteger(v.orderStateId)
      ? SOLD_ORDER_STATES[v.orderStateId] || 'UNKNOWN' : 'UNKNOWN',
    order_reference: typeof v.orderReferenceNo === 'string' ? v.orderReferenceNo.slice(0,100) : null,
    order_price: Number.isFinite(v.orderPrice) ? v.orderPrice : null,
    seller_username_verified: Boolean(expectedUsername),
    lines: Array.isArray(v.orderDetails) ? v.orderDetails.slice(0,500).map(x => ({
      listing_id: Number.isSafeInteger(x.orderDetailListingId) ? x.orderDetailListingId : null,
      product_id: Number.isSafeInteger(x.orderDetailProductId) ? x.orderDetailProductId : null,
      barcode: typeof x.orderDetailProductBarcode === 'string' ? x.orderDetailProductBarcode.slice(0,40) : null,
      product_name: typeof x.orderDetailProductName === 'string' ? x.orderDetailProductName.slice(0,200) : null,
      // Official field is listing count, not independently proven sold quantity.
      source_listing_count: Number.isSafeInteger(x.orderDetailListingCount) ? x.orderDetailListingCount : null,
      line_price: Number.isFinite(x.orderDetailPrice) ? x.orderDetailPrice : null,
      expiry: typeof x.orderDetailListingExpiration === 'string' ? x.orderDetailListingExpiration.slice(0,19) : null
    })) : []
  };
}

function purchasedRecord(v, expectedBuyerUsername) {
  if (!v || typeof v !== 'object' || !Number.isSafeInteger(v.orderId)) {
    throw new FarmazonReadError('invalid_purchased_order');
  }
  if (expectedBuyerUsername &&
      String(v.buyerUsername || '').trim().toLocaleLowerCase('tr-TR') !==
      expectedBuyerUsername.toLocaleLowerCase('tr-TR')) {
    throw new FarmazonReadError('buyer_username_mismatch');
  }
  if (v.orderDetails !== undefined && !Array.isArray(v.orderDetails)) {
    throw new FarmazonReadError('purchased_lines_unverified');
  }
  if (Array.isArray(v.orderDetails) && v.orderDetails.length > 500) {
    throw new FarmazonReadError('purchased_lines_too_many');
  }
  return {
    direction: 'FARMAZON_BUY_ORDER',
    order_id: v.orderId,
    order_date: typeof v.orderDate === 'string' ? v.orderDate.slice(0,19) : null,
    order_state_id: Number.isSafeInteger(v.orderStateId) ? v.orderStateId : null,
    order_state: Number.isSafeInteger(v.orderStateId)
      ? SOLD_ORDER_STATES[v.orderStateId] || 'UNKNOWN' : 'UNKNOWN',
    order_reference: typeof v.orderReferenceNo === 'string' ? v.orderReferenceNo.slice(0,100) : null,
    seller_username: typeof v.sellerUsername === 'string' ? v.sellerUsername.slice(0,100) : null,
    order_price: Number.isFinite(v.orderPrice) ? v.orderPrice : null,
    order_paid_price: Number.isFinite(v.orderPaidPrice) ? v.orderPaidPrice : null,
    order_cargo_paid_price: Number.isFinite(v.orderCargoPaidPrice) ? v.orderCargoPaidPrice : null,
    buyer_username_verified: Boolean(expectedBuyerUsername),
    // Do not expose buyer name, shipping address, invoice details, email, or tax ID.
    lines: (v.orderDetails || []).map(x => ({
      product_id: Number.isSafeInteger(x.orderDetailProductId) ? x.orderDetailProductId : null,
      barcode: typeof x.orderDetailProductBarcode === 'string' ? x.orderDetailProductBarcode.slice(0,40) : null,
      product_name: typeof x.orderDetailProductName === 'string' ? x.orderDetailProductName.slice(0,200) : null,
      vat_from_source: Number.isFinite(x.orderDetailProductVAT) ? x.orderDetailProductVAT : null,
      source_listing_count: Number.isSafeInteger(x.orderDetailListingCount) ? x.orderDetailListingCount : null,
      listing_price: Number.isFinite(x.orderDetailListingPrice) ? x.orderDetailListingPrice : null,
      line_paid_price: Number.isFinite(x.orderDetailPaidPrice) ? x.orderDetailPaidPrice : null,
      expiry: typeof x.orderDetailListingExpiration === 'string'
        ? x.orderDetailListingExpiration.slice(0,19) : null
    }))
  };
}

function pricingRuleRecord(v) {
  if (!v || !Number.isSafeInteger(v.id) || v.id < 1 ||
      !Number.isSafeInteger(v.listingId) || v.listingId < 1 ||
      !Number.isFinite(v.marginAmount) || v.marginAmount < 0 ||
      !Number.isFinite(v.minPrice) || v.minPrice <= 0 ||
      !Number.isFinite(v.maxPrice) || v.maxPrice < v.minPrice ||
      !Number.isSafeInteger(v.stockThreshold) || v.stockThreshold < 0) {
    throw new FarmazonReadError('pricing_rule_unverified');
  }
  return {
    rule_id: v.id, listing_id: v.listingId,
    product_name: String(v.productName || '').slice(0,200),
    barcode: v.barcode == null ? null : String(v.barcode).slice(0,40),
    competitor_price_difference: v.marginAmount,
    min_price: v.minPrice, max_price: v.maxPrice,
    min_competitor_stock: v.stockThreshold,
    min_competitor_expiry: typeof v.expirationThreshold === 'string' ?
      v.expirationThreshold.slice(0,19) : null
  };
}

function createFarmazonReadOnlyApi({
  environment = 'staging', getBearerToken, userAgent,
  fetchImpl = fetch, now = Date.now, minIntervalMs = MIN_INTERVAL_MS
} = {}) {
  if (!Object.hasOwn(ORIGINS, environment)) throw new FarmazonReadError('invalid_environment');
  if (typeof getBearerToken !== 'function') throw new FarmazonReadError('local_token_provider_required');
  if (typeof userAgent !== 'string' || !/^API_[A-Za-z0-9._-]{2,100}$/.test(userAgent)) {
    throw new FarmazonReadError('invalid_api_user_agent');
  }
  if (!Number.isInteger(minIntervalMs) || minIntervalMs < MIN_INTERVAL_MS) {
    throw new FarmazonReadError('rate_guard_required');
  }
  let lastRequestMs = -Infinity;
  async function get(pathKey, params) {
    const at = now();
    if (!Number.isFinite(at) || at - lastRequestMs < minIntervalMs) throw new FarmazonReadError('rate_guard_wait');
    const token = await getBearerToken();
    if (typeof token !== 'string' || token.length < 20 || /[\r\n\s]/.test(token)) {
      throw new FarmazonReadError('api_token_unavailable');
    }
    const url = new URL(PATHS[pathKey], ORIGINS[environment]);
    for (const [key, value] of Object.entries(params)) if (value !== null && value !== undefined) url.searchParams.set(key, String(value));
    lastRequestMs = at; // reserve before awaited fetch; concurrent calls cannot bypass it
    let response;
    try {
      response = await fetchImpl(url.href, {
        method: 'GET', redirect: 'error', signal: AbortSignal.timeout(12000),
        headers: { authorization: 'Bearer ' + token, 'user-agent': userAgent, accept: 'application/json' }
      });
    } catch {
      throw new FarmazonReadError('api_transport_failed');
    }
    if (response.status === 401 || response.status === 403) throw new FarmazonReadError('api_authorization_failed');
    if (response.status === 429) throw new FarmazonReadError('api_rate_limited');
    if (!response.ok) throw new FarmazonReadError('api_http_unavailable');
    let body;
    try { body = await response.json(); } catch { throw new FarmazonReadError('api_response_not_json'); }
    if (body?.statusCode !== 200 || body?.result == null) throw new FarmazonReadError('api_result_unverified');
    return body.result;
  }
  return Object.freeze({
    async getPricingBotRules({page=1,pageSize=20,search=null} = {}) {
      whole(page,1,10000,'invalid_page'); whole(pageSize,1,100,'invalid_page_size');
      if (search !== null && (typeof search !== 'string' ||
          search.length > 100 || /[\r\n]/.test(search))) {
        throw new FarmazonReadError('invalid_search');
      }
      const result = await get('pricingBotRules',{page,pageSize,search});
      if (!result || !Array.isArray(result.rules) ||
          !Number.isSafeInteger(result.totalCount) || result.totalCount < 0 ||
          !Number.isSafeInteger(result.totalPages) || result.totalPages < 0 ||
          !Number.isSafeInteger(result.currentPage) || result.currentPage !== page ||
          !Number.isSafeInteger(result.pageSize) || result.pageSize !== pageSize ||
          result.rules.length > pageSize ||
          result.rules.length > result.totalCount ||
          (result.totalCount > 0 && result.totalPages < 1) ||
          (result.rules.length > 0 && result.totalPages < page)) {
        throw new FarmazonReadError('pricing_pagination_unverified');
      }
      return {source:'Farmazon official API',flow:'SELL_PRICING_RULES',
        environment,identity:'SELLER_LEGAL_ENTITY_NOT_VERIFIED',
        page,total_pages:result.totalPages,total_count:result.totalCount,
        rules:result.rules.map(pricingRuleRecord),read_only:true,observed_at:new Date().toISOString()};
    },
    async getListings({ page = 1, count = 50, listingState = 1 } = {}) {
      whole(page, 1, 10000, 'invalid_page'); whole(count, 1, 50, 'invalid_count');
      whole(listingState, 1, 2, 'invalid_listing_state');
      const result = await get('listings', {page,count,listingState});
      if (!result || !Array.isArray(result.items) ||
          !Number.isInteger(result.totalPageCount) || result.totalPageCount < 0 ||
          result.totalPageCount > 10000 || result.totalPageCount < (result.items.length ? page : 0)) {
        throw new FarmazonReadError('listing_pagination_unverified');
      }
      return { source: 'Farmazon official API', flow: 'SELL_LISTINGS', environment,
        page, total_pages: result.totalPageCount, listing_state: listingState,
        identity: 'SELLER_LEGAL_ENTITY_NOT_VERIFIED',
        items: result.items.map(listRecord), read_only: true, observed_at: new Date().toISOString() };
    },
    async getListing({ listingId } = {}) {
      whole(listingId, 1, Number.MAX_SAFE_INTEGER, 'invalid_listing_id');
      const result = await get('listing', {listingId});
      return { source: 'Farmazon official API', flow:'SELL_LISTING', environment,
        item: listRecord(result), read_only: true, observed_at: new Date().toISOString() };
    },
    async getPurchasedOrders({page=1,count=50,orderState=0,startDate=null,endDate=null,expectedBuyerUsername=null} = {}) {
      whole(page,1,10000,'invalid_page'); whole(count,1,50,'invalid_count');
      whole(orderState,0,6,'invalid_order_state');
      const start=date(startDate), end=date(endDate);
      if(start && end && start>end) throw new FarmazonReadError('date_order_invalid');
      const buyer=sellerUsername(expectedBuyerUsername);
      const result=await get('purchasedOrders',{page,count,orderState,startDate:start,endDate:end});
      if(!Array.isArray(result) || result.length>count) {
        throw new FarmazonReadError('purchased_orders_response_unverified');
      }
      return {source:'Farmazon official API',flow:'BUY_ORDERS',environment,
        identity:buyer?'BUYER_USERNAME_MATCHED_PER_ORDER_LEGAL_ENTITY_UNVERIFIED':'BUYER_UNVERIFIED',
        items:result.map(x=>purchasedRecord(x,buyer)),read_only:true,observed_at:new Date().toISOString()};
    },
    async getPurchasedOrder({orderId,expectedBuyerUsername=null} = {}) {
      whole(orderId,1,Number.MAX_SAFE_INTEGER,'invalid_order_id');
      const buyer=sellerUsername(expectedBuyerUsername);
      const result=await get('purchasedOrder',{orderId});
      if(!Array.isArray(result) || result.length!==1 || result[0]?.orderId!==orderId) {
        throw new FarmazonReadError('purchased_order_id_unverified');
      }
      return {source:'Farmazon official API',flow:'BUY_ORDER',environment,
        identity:buyer?'BUYER_USERNAME_MATCHED_PER_ORDER_LEGAL_ENTITY_UNVERIFIED':'BUYER_UNVERIFIED',
        item:purchasedRecord(result[0],buyer),read_only:true,observed_at:new Date().toISOString()};
    },
    async getSoldOrders({page=1,count=50,orderState=0,startDate=null,endDate=null,expectedSellerUsername=null} = {}) {
      whole(page,1,10000,'invalid_page'); whole(count,1,50,'invalid_count');
      whole(orderState,0,6,'invalid_order_state');
      const start = date(startDate), end = date(endDate);
      if (start && end && start > end) throw new FarmazonReadError('date_order_invalid');
      const username = sellerUsername(expectedSellerUsername);
      const result = await get('soldOrders', {page,count,orderState,startDate:start,endDate:end});
      if (!Array.isArray(result)) throw new FarmazonReadError('sold_orders_response_unverified');
      return { source: 'Farmazon official API', flow: 'SELL_ORDERS', environment,
        identity: username ? 'SELLER_USERNAME_MATCHED_PER_ORDER_LEGAL_ENTITY_UNVERIFIED' : 'SELLER_UNVERIFIED',
        items: result.map(x=>soldRecord(x,username)), read_only: true, observed_at: new Date().toISOString() };
    },
    async getSoldOrder({orderId,expectedSellerUsername=null} = {}) {
      whole(orderId,1,Number.MAX_SAFE_INTEGER,'invalid_order_id');
      const username = sellerUsername(expectedSellerUsername);
      const result = await get('soldOrder',{orderId});
      // Official v1 sample returns an array. Reject ambiguous/mismatched IDs.
      if (!Array.isArray(result) || result.length !== 1 || result[0]?.orderId !== orderId) {
        throw new FarmazonReadError('sold_order_id_unverified');
      }
      return {source:'Farmazon official API',flow:'SELL_ORDER',environment,
        identity:username ? 'SELLER_USERNAME_MATCHED_PER_ORDER_LEGAL_ENTITY_UNVERIFIED' : 'SELLER_UNVERIFIED',
        item:soldRecord(result[0],username),read_only:true,observed_at:new Date().toISOString()};
    }
  });
}
module.exports = { createFarmazonReadOnlyApi, FarmazonReadError, PATHS, ORIGINS, MIN_INTERVAL_MS, SOLD_ORDER_STATES };
