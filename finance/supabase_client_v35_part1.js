async function aperionFetchSales(sb, company){
  const r = await sb.from('product_sales_profit_view').select('*').eq('company', company).limit(500);
  if(r.error) throw r.error;
  return r.data || [];
}

async function aperionFetchMissingCosts(sb, company){
  const r = await sb.from('missing_product_cost_queue_view').select('*').eq('company', company).limit(500);
  if(r.error) throw r.error;
  return r.data || [];
}
