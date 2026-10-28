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
    case 'updatedSale': body = {statusCode:200,result:[{
      orderId:777,sellerUsername:'ALAYLI_TEST',
      buyerFullName:'PRIVATE UPDATED BUYER',orderStateId:4,
      orderDetails:[{orderDetailListingId:123,orderDetailProductId:1,
        orderDetailProductName:'Test product'}]}]};break;
    case 'saleNoLines': body={statusCode:200,result:[{
      orderId:778,sellerUsername:'ALAYLI_TEST',orderStateId:2}]};break;
    case 'saleTooManyLines': body={statusCode:200,result:[{
      orderId:779,sellerUsername:'ALAYLI_TEST',orderStateId:2,
      orderDetails:Array(501).fill({orderDetailListingId:123})}]};break;
    case 'saleBadLine': body={statusCode:200,result:[{
      orderId:780,sellerUsername:'ALAYLI_TEST',orderStateId:2,orderDetails:[null]}]};break;
    case 'saleOverPage': body={statusCode:200,result:[{
      orderId:781,sellerUsername:'ALAYLI_TEST',orderStateId:2,orderDetails:[]},{
      orderId:782,sellerUsername:'ALAYLI_TEST',orderStateId:2,orderDetails:[]}]};break;
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
    case 'pricingRules': body={statusCode:200,result:{
      rules:[{id:78,listingId:123456,productName:'Jender Large',
        barcode:'8699956094113',marginAmount:2,minPrice:550,maxPrice:610,
        stockThreshold:5,expirationThreshold:'2027-05-01T00:00:00',
        buyerFullName:'DO_NOT_EXPOSE'}],
      totalCount:1,currentPage:1,pageSize:20,totalPages:1}};break;
    case 'pricingRulesEmpty': body={statusCode:200,result:{
      rules:[],totalCount:0,currentPage:1,pageSize:20,totalPages:0}};break;
    case 'pricingRulesUnsafe': body={statusCode:200,result:{
      rules:[{id:79,listingId:123456,marginAmount:2,minPrice:10,maxPrice:5,
        stockThreshold:5}],totalCount:1,currentPage:1,pageSize:20,totalPages:1}};break;
    case 'buyOrders': body={statusCode:200,result:[{
      orderId:444,buyerUsername:'BUYER_TEST',sellerUsername:'SELLER_TEST',
      buyerFullName:'PRIVATE NAME',buyerInvoiceTaxOrTcNo:'SECRET TAX',
      buyerDeliveryAddress:'SECRET ADDRESS',orderStateId:4,
      orderPaidPrice:125,orderCargoPaidPrice:9,
      orderDetails:[{orderDetailProductBarcode:'8680196901453',
        orderDetailProductName:'Octacare 10cm 4m',orderDetailPaidPrice:125,
        orderDetailProductVAT:10,orderDetailListingCount:5,
        buyerEmail:'SENSITIVE EMAIL'}]}]};break;
    case 'buyWrongBuyer': body={statusCode:200,result:[{
      orderId:444,buyerUsername:'OTHER_BUYER',sellerUsername:'SELLER_TEST',
      orderStateId:32,orderDetails:[]}]};break;
    case 'buySingle': body={statusCode:200,result:[{
      orderId:444,buyerUsername:'BUYER_TEST',sellerUsername:'SELLER_TEST',
      buyerDeliveryAddress:'NEVER_EXPOSE',orderStateId:32,orderDetails:[]}]};break;
    case 'buySingleWrong': body={statusCode:200,result:[{
      orderId:445,buyerUsername:'BUYER_TEST',orderStateId:32,orderDetails:[]}]};break;
    case 'buySingleAmbiguous': body={statusCode:200,result:[{
      orderId:444,buyerUsername:'BUYER_TEST',orderStateId:32,orderDetails:[]},{
      orderId:444,buyerUsername:'BUYER_TEST',orderStateId:32,orderDetails:[]}]};break;
    case 'buyMalformed': body={statusCode:200,result:[{
      orderId:444,buyerUsername:'BUYER_TEST',orderDetails:'NOT_ARRAY'}]};break;
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
  tick();mode='updatedSale';
  const updated=await client.getUpdatedSoldOrders({
    page:1,count:1,fromDate:'2026-10-20',expectedSellerUsername:'ALAYLI_TEST'});
  assert.equal(updated.flow,'SELL_UPDATED_ORDERS');
  assert.equal(updated.from_date,'2026-10-20');
  assert.equal(updated.page,1);
  assert.equal(updated.completeness,'PAGE_ONLY');
  assert.equal(updated.has_more_hint,true);
  assert.equal(updated.items[0].order_state,'IN_TRANSIT');
  assert.ok(!JSON.stringify(updated).includes('PRIVATE UPDATED BUYER'));
  const u=new URL(calls.at(-1).url);
  assert.equal(u.pathname,'/api/v1/orders/getUpdatedSoldOrders');
  assert.equal(u.searchParams.get('fromDate'),'2026-10-20');
  assert.equal(u.searchParams.get('count'),'1');
  const beforeUpdatedBadInput=calls.length;
  for(const opt of [{},{fromDate:'2026-02-30'},{fromDate:'2026-10-20',count:60},
                    {fromDate:'2026-10-20',page:0}]) {
    await assert.rejects(client.getUpdatedSoldOrders(opt),e=>e instanceof FarmazonReadError);
  }
  assert.equal(calls.length,beforeUpdatedBadInput);
  tick();mode='saleNoLines';
  await assert.rejects(client.getUpdatedSoldOrders({
    fromDate:'2026-10-20',expectedSellerUsername:'ALAYLI_TEST'}),
    e=>e.message==='sold_lines_unverified');
  tick();mode='saleTooManyLines';
  await assert.rejects(client.getUpdatedSoldOrders({
    fromDate:'2026-10-20',expectedSellerUsername:'ALAYLI_TEST'}),
    e=>e.message==='sold_lines_too_many');
  tick();mode='saleBadLine';
  await assert.rejects(client.getUpdatedSoldOrders({
    fromDate:'2026-10-20',expectedSellerUsername:'ALAYLI_TEST'}),
    e=>e.message==='invalid_sold_line');
  tick();mode='saleOverPage';
  await assert.rejects(client.getUpdatedSoldOrders({
    fromDate:'2026-10-20',count:1,expectedSellerUsername:'ALAYLI_TEST'}),
    e=>e.message==='updated_sold_orders_response_unverified');
  tick();mode='wrong';
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
  tick();mode='pricingRules';
  const rules=await client.getPricingBotRules({page:1,pageSize:20});
  assert.equal(rules.flow,'SELL_PRICING_RULES');
  assert.equal(rules.rules.length,1);
  assert.equal(rules.rules[0].listing_id,123456);
  assert.equal(rules.rules[0].min_price,550);
  assert.equal(rules.rules[0].max_price,610);
  assert.equal(rules.rules[0].min_competitor_stock,5);
  assert.equal(rules.identity,'SELLER_LEGAL_ENTITY_NOT_VERIFIED');
  assert.ok(!JSON.stringify(rules).includes('DO_NOT_EXPOSE'));
  assert.equal(new URL(calls.at(-1).url).pathname,'/api/v1/listings/getpricingbotrules');
  assert.equal(new URL(calls.at(-1).url).searchParams.get('pageSize'),'20');
  await assert.rejects(client.getPricingBotRules(),e=>e.message==='rate_guard_wait');
  tick();mode='pricingRulesEmpty';
  const empty=await client.getPricingBotRules();
  assert.deepEqual(empty.rules,[]);
  tick();mode='pricingRulesUnsafe';
  await assert.rejects(client.getPricingBotRules(),e=>e.message==='pricing_rule_unverified');
  const callsBeforePricingBadInput=calls.length;
  for(const opt of [{page:0},{pageSize:101},{search:String.fromCharCode(10)},{search:'x'.repeat(101)}]) {
    await assert.rejects(client.getPricingBotRules(opt),e=>e instanceof FarmazonReadError);
  }
  assert.equal(calls.length,callsBeforePricingBadInput,'invalid pricing input made no requests');
  tick();mode='buyOrders';
  const purchased=await client.getPurchasedOrders({
    expectedBuyerUsername:'BUYER_TEST',page:1,count:50});
  assert.equal(purchased.flow,'BUY_ORDERS');
  assert.equal(purchased.items.length,1);
  assert.equal(purchased.items[0].direction,'FARMAZON_BUY_ORDER');
  assert.equal(purchased.items[0].order_id,444);
  assert.equal(purchased.items[0].order_state,'IN_TRANSIT');
  assert.equal(purchased.items[0].seller_username,'SELLER_TEST');
  assert.equal(purchased.items[0].lines[0].barcode,'8680196901453');
  assert.equal(purchased.items[0].lines[0].line_paid_price,125);
  assert.equal(purchased.items[0].buyer_username_verified,true);
  assert.ok(!JSON.stringify(purchased).includes('PRIVATE NAME'));
  assert.ok(!JSON.stringify(purchased).includes('SECRET TAX'));
  assert.ok(!JSON.stringify(purchased).includes('SECRET ADDRESS'));
  assert.ok(!JSON.stringify(purchased).includes('SENSITIVE EMAIL'));
  assert.equal(new URL(calls.at(-1).url).pathname,'/api/v1/orders/getpurchasedorders');
  tick();mode='buyWrongBuyer';
  await assert.rejects(client.getPurchasedOrders({expectedBuyerUsername:'BUYER_TEST'}),
    e=>e.message==='buyer_username_mismatch');
  tick();mode='buyMalformed';
  await assert.rejects(client.getPurchasedOrders({expectedBuyerUsername:'BUYER_TEST'}),
    e=>e.message==='purchased_lines_unverified');
  tick();mode='buySingle';
  const buyOrder=await client.getPurchasedOrder({orderId:444,expectedBuyerUsername:'BUYER_TEST'});
  assert.equal(buyOrder.flow,'BUY_ORDER');
  assert.equal(buyOrder.item.order_state,'COMPLETED');
  assert.equal(buyOrder.item.order_id,444);
  assert.ok(!JSON.stringify(buyOrder).includes('NEVER_EXPOSE'));
  assert.equal(new URL(calls.at(-1).url).pathname,'/api/v1/orders/getpurchasedorder');
  assert.equal(new URL(calls.at(-1).url).searchParams.get('orderId'),'444');
  tick();mode='buySingleWrong';
  await assert.rejects(client.getPurchasedOrder({orderId:444}),e=>e.message==='purchased_order_id_unverified');
  tick();mode='buySingleAmbiguous';
  await assert.rejects(client.getPurchasedOrder({orderId:444}),e=>e.message==='purchased_order_id_unverified');
  const beforeBadBuy=calls.length;
  for(const opts of [{page:0},{count:99},{orderState:32},{startDate:'2026-02-30'}]){
    await assert.rejects(client.getPurchasedOrders(opts),e=>e instanceof FarmazonReadError);
  }
  await assert.rejects(client.getPurchasedOrder({orderId:0}),e=>e.message==='invalid_order_id');
  assert.equal(calls.length,beforeBadBuy);
  // Regression: two concurrent requests must NOT both pass while local
  // secure-vault token retrieval is still pending. The slot is reserved first.
  let releaseVault;
  let vaultCalls=0, raceFetchCalls=0;
  const waitingToken=new Promise(resolve=>{releaseVault=resolve;});
  const raceClient=createFarmazonReadOnlyApi({
    getBearerToken:async()=>{vaultCalls++;return waitingToken;},
    userAgent:'API_test_store',now:()=>777000,
    fetchImpl:async(url,opts)=>{
      raceFetchCalls++;
      assert.equal(opts.method,'GET');
      return {ok:true,status:200,json:async()=>({
        statusCode:200,result:{items:[],totalPageCount:0}})};
    }
  });
  const inFlight=raceClient.getListings();
  await assert.rejects(raceClient.getListings(),
    e=>e.message==='rate_guard_wait');
  assert.equal(vaultCalls,1,'only first call reached vault');
  assert.equal(raceFetchCalls,0,'token lookup pending, no network requests yet');
  releaseVault(token);
  const afterWait=await inFlight;
  assert.deepEqual(afterWait.items,[]);
  assert.equal(raceFetchCalls,1,'exactly one GET after vault released');
  let deniedCalls=0;
  const deniedClient=createFarmazonReadOnlyApi({
    getBearerToken:async()=>{deniedCalls++;throw new Error('VAULT_PRIVATE_MESSAGE');},
    userAgent:'API_test_store',now:()=>888000,
    fetchImpl:async()=>{throw new Error('should never be called');}
  });
  await assert.rejects(deniedClient.getListings(),
    e=>e.message==='api_token_unavailable' &&
       !String(e).includes('VAULT_PRIVATE_MESSAGE'));
  await assert.rejects(deniedClient.getListings(),e=>e.message==='rate_guard_wait');
  assert.equal(deniedCalls,1,'failed vault also consumes a guard slot');
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
    methods:['getListings','getListing','getSoldOrders','getSoldOrder','getUpdatedSoldOrders','getPricingBotRules','getPurchasedOrders','getPurchasedOrder'],writes:0,
    api_calls:calls.length,credential_leaks:0,live_api_verified:false};
  console.log(JSON.stringify(summary));
})().catch(e=>{console.error(e);process.exitCode=1;});
