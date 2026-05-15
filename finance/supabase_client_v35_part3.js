async function aperionApproveMissingCost(sb, queueId, approvedUnitCost, note){
  const r = await sb.rpc('approve_and_recalculate_missing_product_cost', {
    p_queue_id: queueId,
    p_approved_unit_cost: approvedUnitCost,
    p_note: note || null
  });
  if(r.error) throw r.error;
  return r.data;
}

async function aperionRecalculateProduct(sb, company, productCode, productName){
  const r = await sb.rpc('recalculate_product_profit_for_product', {
    p_company: company,
    p_product_code: productCode || null,
    p_product_name: productName || null
  });
  if(r.error) throw r.error;
  return r.data;
}
