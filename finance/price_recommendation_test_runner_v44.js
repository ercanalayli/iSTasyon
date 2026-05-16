const fs = require('fs');
const path = require('path');
const {
  calculatePriceRecommendations,
  summarizePriceRecommendations
} = require('./AperiON_Price_Recommendation_Engine_v44.js');

function money(n){
  return Number(n || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
}

function pct(n){
  return '%' + (Number(n || 0) * 100).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
}

const file = path.join(__dirname, 'AperiON_Price_Recommendation_Test_Data_v44.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const rows = calculatePriceRecommendations(data.products, data.policy);
const summary = summarizePriceRecommendations(rows);

console.log('AperiON Price Recommendation Test v44');
console.log('--------------------------------');
console.log('Policy: target=' + pct(data.policy.target_margin_rate) + ', min=' + pct(data.policy.min_margin_rate));
console.log('--------------------------------');

rows.forEach((r, i) => {
  console.log(`${i + 1}. ${r.product_name}`);
  console.log(`   base_cost=${money(r.base_cost)} burdened=${money(r.burdened_cost)}`);
  console.log(`   minimum=${money(r.minimum_sale_price)} recommended=${money(r.recommended_sale_price)} aggressive=${money(r.aggressive_sale_price)}`);
  console.log(`   current=${money(r.current_sale_price)} market_ref=${money(r.market_reference_price)}`);
  console.log(`   status=${r.price_status} warnings=${(r.warnings || []).join(',') || '-'}`);
});

console.log('--------------------------------');
console.log('Summary');
console.log(JSON.stringify(summary, null, 2));

if(summary.critical > 0){
  console.log('RESULT: OK WITH CRITICAL PRICE CONTROL - some products need attention');
  process.exitCode = 0;
} else if(summary.warning > 0){
  console.log('RESULT: OK WITH PRICE WARNING');
  process.exitCode = 0;
} else {
  console.log('RESULT: OK');
}
