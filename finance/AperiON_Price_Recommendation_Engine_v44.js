/* AperiON Price Recommendation Engine v44
   Purpose: calculate minimum, recommended and aggressive sale prices.
   Inputs can come from product_price_intelligence_view or normalized test data.
   Safe rule: calculates only. Does not write to Supabase/BizimHesap.
*/

function num(value){
  if(value === null || value === undefined) return 0;
  return Number(String(value).replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'')) || 0;
}

function roundByRule(value, rule = 'nearest_10'){
  const n = num(value);
  if(rule === 'none') return Math.round(n * 100) / 100;
  if(rule === 'nearest_1') return Math.round(n);
  if(rule === 'nearest_5') return Math.round(n / 5) * 5;
  if(rule === 'nearest_10') return Math.round(n / 10) * 10;
  if(rule === 'up_10') return Math.ceil(n / 10) * 10;
  if(rule === 'up_50') return Math.ceil(n / 50) * 50;
  return Math.round(n / 10) * 10;
}

function chooseBaseCost(row){
  const candidates = [
    num(row.last_purchase_price),
    num(row.last_supplier_price),
    num(row.avg_purchase_12m),
    num(row.base_cost)
  ].filter(v => v > 0);
  return candidates.length ? Math.max(...candidates) : 0;
}

function calculatePriceRecommendation(row, policy = {}){
  const baseCost = chooseBaseCost(row);
  const targetMarginRate = num(policy.target_margin_rate ?? row.target_margin_rate ?? 0.25);
  const minMarginRate = num(policy.min_margin_rate ?? row.min_margin_rate ?? 0.15);
  const mokaPosRate = num(policy.moka_pos_rate ?? row.moka_pos_rate ?? 0.035);
  const overheadRate = num(policy.overhead_rate ?? row.overhead_rate ?? 0.08);
  const logisticsUnitShare = num(policy.logistics_unit_share ?? row.logistics_unit_share ?? 0);
  const roundingRule = policy.rounding_rule || row.rounding_rule || 'nearest_10';

  const burdenedCost = baseCost * (1 + mokaPosRate + overheadRate) + logisticsUnitShare;
  const minimumRaw = minMarginRate >= 1 ? burdenedCost : burdenedCost / (1 - minMarginRate);
  const recommendedRaw = targetMarginRate >= 1 ? burdenedCost : burdenedCost / (1 - targetMarginRate);

  const marketAvg = num(row.market_avg_price);
  const marketMedian = num(row.market_median_price);
  const marketRef = marketMedian || marketAvg;

  let aggressiveRaw = recommendedRaw;
  if(marketRef > 0){
    aggressiveRaw = Math.max(minimumRaw, Math.min(recommendedRaw, marketRef * 0.98));
  }

  const minimumSalePrice = roundByRule(minimumRaw, roundingRule);
  const recommendedSalePrice = roundByRule(recommendedRaw, roundingRule);
  const aggressiveSalePrice = roundByRule(aggressiveRaw, roundingRule);

  const currentSalePrice = num(row.current_sale_price || row.last_sale_price || row.sale_price);
  const supplierChangePercent = num(row.supplier_price_change_percent);

  const warnings = [];
  if(baseCost <= 0) warnings.push('missing_cost');
  if(currentSalePrice > 0 && currentSalePrice < minimumSalePrice) warnings.push('current_price_below_minimum');
  if(supplierChangePercent > 10) warnings.push('supplier_price_increased_over_10_percent');
  if(marketRef > 0 && recommendedSalePrice > marketRef * 1.15) warnings.push('recommended_price_above_market');
  if(marketRef > 0 && recommendedSalePrice < marketRef * 0.75) warnings.push('recommended_price_below_market');

  let status = 'ok';
  if(warnings.includes('missing_cost') || warnings.includes('current_price_below_minimum')) status = 'critical';
  else if(warnings.length) status = 'warning';

  return {
    company: row.company || 'ALAYLI',
    product_code: row.product_code || null,
    product_name: row.product_name || row.matched_product_name || row.supplier_product_name || null,
    base_cost: Math.round(baseCost * 100) / 100,
    burdened_cost: Math.round(burdenedCost * 100) / 100,
    minimum_sale_price: minimumSalePrice,
    recommended_sale_price: recommendedSalePrice,
    aggressive_sale_price: aggressiveSalePrice,
    current_sale_price: currentSalePrice,
    market_reference_price: marketRef,
    target_margin_rate: targetMarginRate,
    min_margin_rate: minMarginRate,
    moka_pos_rate: mokaPosRate,
    overhead_rate: overheadRate,
    logistics_unit_share: logisticsUnitShare,
    rounding_rule: roundingRule,
    price_status: status,
    warnings
  };
}

function calculatePriceRecommendations(rows, policy = {}){
  return (rows || []).map(row => calculatePriceRecommendation(row, policy));
}

function summarizePriceRecommendations(rows){
  const list = rows || [];
  return {
    total: list.length,
    critical: list.filter(r => r.price_status === 'critical').length,
    warning: list.filter(r => r.price_status === 'warning').length,
    ok: list.filter(r => r.price_status === 'ok').length,
    below_minimum: list.filter(r => (r.warnings || []).includes('current_price_below_minimum')).length,
    missing_cost: list.filter(r => (r.warnings || []).includes('missing_cost')).length
  };
}

if(typeof module !== 'undefined'){
  module.exports = {
    num,
    roundByRule,
    chooseBaseCost,
    calculatePriceRecommendation,
    calculatePriceRecommendations,
    summarizePriceRecommendations
  };
}
