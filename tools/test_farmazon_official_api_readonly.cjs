'use strict';
const assert = require('node:assert/strict');
const {createFarmazonReadOnlyApi, FarmazonReadError, MIN_INTERVAL_MS} =
  require('./lib/farmazon_official_api_readonly.cjs');

const calls = [];
let now = 100000;
const token = 'LOCAL_TEST_TOKEN_ONLY_012345678901234';
let mode = 'list';
const getBearerToken = async () => token;
const fetchImpl = async (url,opts) => {
  calls.push({url, method:opts.method, redirect:opts.redirect,
    authorization:opts.headers.authorization,userAgent:opts.headers['user-agent']});
  assert.equal(opts.method,'GET');
  assert.equal(opts.redirect,'error');
  assert.equal(opts.headers['user-agent'],'API_test_store');
  assert.equal(opts.headers.authorization,'Bearer '+token);
  let body;
  switch(mode) {
    case 'list':
      body = {statusCode:200,result:{page:1,totalPageCount:2,items:[{
        id:123,price:45.5,stock:4,expiration:'2027-01-01T00:00:00',
        product:{id:1,name:'Test product',sku:'P01',vat:10,barcodes:[
          {barcode:'1234567890123',isSelected:true},{barcode:'IGNORE',isSelected:false}]}
      }]}};
      break;
    case 'sale':
      body = {statusCode:200,result:[{orderId:321,sellerUsername:'ALAYLI_TEST',
        buyerFullName:'PRIVATE BUYER',buyerInvoiceTaxOrTcNo:'SECRET TAX',
        orderStateId:2,orderPrice:95.50,orderDetails:[{
        orderDetailListingId:123,orderDetailProductId:1,
        orderDetailProductBarcode:'1234567890123',orderDetailProductName:'Test product',
        orderDetailListingCount:4,orderDetailPrice:95.50}]}]};
      break;
    case 'detail': body = {statusCode:200,result:{
      id:123,sku:'V1_ROOT_SKU',price:45.50,stock:2,listingState:1,
      product:{id:1,name:'Detailed listing',barcodes:[{barcode:'1234567890123',isSelected:true}]}
    }};break;
    case 'single': body = {statusCode:200,result:[{
      orderId:321,sellerUsername:'ALAYLI_TEST',orderStateId:32,
      buyerFullName:'SECRET CUSTOMER',buyerInvoiceAddress:'SECRET ADDRESS',
      orderPrice:95.50,orderDetails:[]}]};break;
    case 'singleWrongId': body = {statusCode:200,result:[{
      orderId:999,sellerUsername:'ALAYLI_TEST',orderStateId:64}]};break;
    case 'singleAmbiguous': body = {statusCode:200,result:[{
      orderId:321,sellerUsername:'ALAYLI_TEST',orderStateId:32},
      {orderId:321,sellerUsername:'ALAYLI_TEST',orderStateId:32}]};break;
    case 'bad': body = {statusCode:200,result:{items:[]}};break;
    case 'wrong':body={statusCode:200,result:[{orderId:321,sellerUsername:'DIFFERENT'}]};break;
    default:body={statusCode:401,result:null};
  }
  return {ok:true,status:200,json:async()=>body};
};
const client = createFarmazonReadOnlyApi({getBearerToken,userAgent:'API_test_store',fetchImpl,now:()=>now});
const tick=()=>{now+=MIN_INTERVAL_MS;};
(async()=>{
  const listings=await client.getListings({page:1,count:50,listingState:1});
  assert.equal(listings.items[0].listing_id,123);
  assert.deepEqual(listings.items[0].barcodes,['1234567890123']);
  assert.equal(listings.items[0].stock,4);
  assert.equal(listings.identity,'SELLER_LEGAL_ENTITY_NOT_VERIFIED');
  assert.equal(listings.flow,'SELL_LISTINGS');
  assert.equal(new URL(calls[0].url).host,'staging.lab.farmazon.com.tr');
  assert.equal(new URL(calls[0].url).pathname,'/api/v2/listings/getlistings');
  assert.equal(new URL(calls[0].url).searchParams.get('listingState'),'1');
  await assert.rejects(client.getListings(),e=>e instanceof FarmazonReadError && e.message==='rate_guard_wait');
  assert.equal(calls.length,1,'no new request during rate guard');
  tick(); mode='sale';
  const orders=await client.getSoldOrders({expectedSellerUsername:'ALAYLI_TEST'});
  assert.equal(orders.items.length,1);
  assert.equal(orders.items[0].direction,'ALAYLI_SELL_CANDIDATE');
  assert.equal(orders.items[0].seller_username_verified,true);
  assert.equal(orders.items[0].order_state,'AWAITING_SHIPMENT');
  assert.equal(orders.items[0].order_state_id,2);
  assert.ok(!JSON.stringify(orders).includes('PRIVATE BUYER'));
  assert.ok(!JSON.stringify(orders).includes('SECRET TAX'));
  assert.equal(new URL(calls[1].url).pathname,'/api/v1/orders/getsoldorders');
  tick(); mode='wrong';
  await assert.rejects(client.getSoldOrders({expectedSellerUsername:'ALAYLI_TEST'}),
    e=>e.message==='seller_username_mismatch');
  tick(); mode='bad';
  await assert.rejects(client.getListings(),e=>e.message==='listing_pagination_unverified');
  const invalidBefore=calls.length;
  for (const opt of [{listingState:3},{page:0},{count:100}]) {
    await assert.rejects(client.getListings(opt),e=>e instanceof FarmazonReadError);
  }
  await assert.rejects(client.getSoldOrders({startDate:'2026-02-30'}),
    e=>e.message==='invalid_date');
  await assert.rejects(client.getSoldOrders({orderState:32}),
    e=>e.message==='invalid_order_state');
  await assert.rejects(client.getListing({listingId:'1; DROP TABLE'}),
    e=>e.message==='invalid_listing_id');
  assert.equal(calls.length,invalidBefore,'invalid input made no requests');
  tick(); mode='detail';
  const detail=await client.getListing({listingId:123});
  assert.equal(detail.item.sku,'V1_ROOT_SKU', 'V1 listing root SKU is preserved');
  assert.equal(detail.item.status,'ACTIVE');
  assert.equal(new URL(calls.at(-1).url).pathname,'/api/v1/listings/getlisting');
  tick();mode='single';
  const single=await client.getSoldOrder({orderId:321,expectedSellerUsername:'ALAYLI_TEST'});
  assert.equal(single.item.order_id,321);
  assert.equal(single.item.order_state,'COMPLETED');
  assert.equal(single.item.order_state_id,32);
  assert.equal(single.item.seller_username_verified,true);
  assert.ok(!JSON.stringify(single).includes('SECRET CUSTOMER'));
  assert.ok(!JSON.stringify(single).includes('SECRET ADDRESS'));
  assert.equal(new URL(calls.at(-1).url).pathname,'/api/v1/orders/getsoldorder');
  assert.equal(new URL(calls.at(-1).url).searchParams.get('orderId'),'321');
  tick();mode='singleWrongId';
  await assert.rejects(client.getSoldOrder({orderId:321,expectedSellerUsername:'ALAYLI_TEST'}),
    e=>e.message==='sold_order_id_unverified');
  tick();mode='singleAmbiguous';
  await assert.rejects(client.getSoldOrder({orderId:321,expectedSellerUsername:'ALAYLI_TEST'}),
    e=>e.message==='sold_order_id_unverified');
  const callsBeforeBadInput=calls.length;
  await assert.rejects(client.getSoldOrder({orderId:0}),e=>e.message==='invalid_order_id');
  assert.equal(calls.length,callsBeforeBadInput);
  assert.throws(()=>createFarmazonReadOnlyApi({environment:'http://evil',
    userAgent:'API_test',getBearerToken}),e=>e.message==='invalid_environment');
  assert.throws(()=>createFarmazonReadOnlyApi({userAgent:'API_test',getBearerToken,
    minIntervalMs:1000}),e=>e.message==='rate_guard_required');
  assert.throws(()=>createFarmazonReadOnlyApi({userAgent:'Bad',getBearerToken}),
    e=>e.message==='invalid_api_user_agent');
  assert.ok(calls.every(x=>x.method==='GET'));
  const summary={status:'PASS',test_scope:'offline mocked API no actual credentials',
    methods:['getListings','getListing','getSoldOrders','getSoldOrder'],writes:0,
    api_calls:calls.length,credential_leaks:0,live_api_verified:false};
  console.log(JSON.stringify(summary));
})().catch(e=>{console.error(e);process.exitCode=1;});
