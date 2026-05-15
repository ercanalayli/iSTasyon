async function aperionInsertProductSale(sb, row){
  const r = await sb.from('product_sales_profit').insert(row).select().single();
  if(r.error) throw r.error;
  return r.data;
}

async function aperionInsertMissingCost(sb, row){
  const r = await sb.from('missing_product_cost_queue').insert(row).select().single();
  if(r.error) throw r.error;
  return r.data;
}

async function aperionFetchProductCosts(sb, company){
  const r = await sb.from('product_costs').select('*').eq('company', company).eq('active', true).limit(1000);
  if(r.error) throw r.error;
  return r.data || [];
}
