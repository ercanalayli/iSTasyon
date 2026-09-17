const DEFAULT_STEP = 10_000;

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function crossedMilestones(previousRevenue, currentRevenue, step = DEFAULT_STEP) {
  const safeStep = Math.max(1, number(step, DEFAULT_STEP));
  const previous = Math.max(0, number(previousRevenue));
  const current = Math.max(0, number(currentRevenue));
  const first = Math.floor(previous / safeStep) + 1;
  const last = Math.floor(current / safeStep);
  const milestones = [];
  for (let multiple = first; multiple <= last; multiple += 1) milestones.push(multiple * safeStep);
  return milestones;
}

export function buildProfitSnapshot(input = {}) {
  const revenue = number(input.revenue);
  const fifoCost = number(input.fifoCost);
  const operatingExpense = number(input.operatingExpense);
  const estimatedTax = number(input.estimatedTax);
  const recordCount = Math.max(0, Math.trunc(number(input.recordCount)));
  const fifoCoveredCount = Math.max(0, Math.trunc(number(input.fifoCoveredCount)));
  const fifoComplete = recordCount > 0 && fifoCoveredCount === recordCount;

  if (!fifoComplete) {
    return {
      revenue,
      fifoComplete: false,
      fifoCost: null,
      grossProfit: null,
      operatingExpense: null,
      profitBeforeTax: null,
      estimatedTax: null,
      netProfit: null,
      netMargin: null
    };
  }

  const grossProfit = revenue - fifoCost;
  const profitBeforeTax = grossProfit - operatingExpense;
  const netProfit = profitBeforeTax - estimatedTax;
  return {
    revenue,
    fifoComplete: true,
    fifoCost,
    grossProfit,
    operatingExpense,
    profitBeforeTax,
    estimatedTax,
    netProfit,
    netMargin: revenue ? (netProfit / revenue) * 100 : null
  };
}

export function detectSalesAnomalies(input = {}, snapshot = buildProfitSnapshot(input)) {
  const anomalies = [];
  if (!snapshot.fifoComplete) anomalies.push('FIFO maliyeti eksik; net kâr hesaplanamadı.');
  if (number(input.negativeStockCount) > 0) anomalies.push(`${Math.trunc(number(input.negativeStockCount))} kalemde negatif stok var.`);
  if (number(input.returnAmount) < 0 || number(input.returnCount) > 0) anomalies.push('Günlük toplamda iade/eksi satış hareketi var.');
  if (number(input.highDiscountCount) > 0) anomalies.push(`${Math.trunc(number(input.highDiscountCount))} kalemde olağandışı yüksek iskonto var.`);
  if (snapshot.netMargin !== null && snapshot.netMargin < number(input.lowMarginThreshold, 5)) {
    anomalies.push(`Net marj düşük: %${snapshot.netMargin.toFixed(1)}.`);
  }
  if (input.sourceFresh === false) anomalies.push('BizimHesap satış kaynağı güncel değil.');
  return anomalies;
}

function money(value) {
  if (value === null || value === undefined) return 'hesaplanamadı';
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(value);
}

export function formatMilestoneMessage({ milestone, daily, snapshot, anomalies = [] }) {
  const margin = snapshot.netMargin === null ? null : Math.max(0, Math.min(100, snapshot.netMargin));
  const filled = margin === null ? 0 : Math.round(margin / 10);
  const profitBar = margin === null ? '▫️▫️▫️▫️▫️▫️▫️▫️▫️▫️' : `${'🟩'.repeat(filled)}${'⬜'.repeat(10 - filled)}`;
  const lines = [
    `🏆 <b>TEBRİKLER — SATIŞ HEDEFİ</b>`,
    `<i>Bugün ${money(milestone)} satış eşiğini geçtiniz.</i>`,
    '',
    `🟦 <b>Günlük satış</b>  ${money(daily.revenue)}`,
    `🟧 <b>FIFO maliyet</b>  ${money(snapshot.fifoCost)}`,
    `🟨 <b>Brüt kâr</b>  ${money(snapshot.grossProfit)}`,
    `🟪 <b>Dağıtılmış gider</b>  ${money(snapshot.operatingExpense)}`,
    `⬜ <b>Tahmini vergi</b>  ${money(snapshot.estimatedTax)}`,
    `🟩 <b>Net kâr</b>  ${money(snapshot.netProfit)}`,
    '',
    `<b>Net marj</b> ${snapshot.netMargin === null ? 'hesaplanamadı' : `%${snapshot.netMargin.toFixed(1)}`}`,
    `<code>${profitBar}</code>`
  ];
  if (anomalies.length) lines.push('', '🟥 <b>ANOMALİ / KONTROL GEREKLİ</b>', ...anomalies.map(item => `• <i>${item}</i>`));
  else lines.push('', '✅ <b>Kontrol:</b> Belirlenen kurallarda anomali yok.');
  lines.push('', '<i>AperiON • Gelir tablosu izleme</i>');
  return lines.join('\n');
}

// v2 is an evidence contract only. The live milestone formula and sender remain unchanged.
export function reconcileSaleFifo(input = {}) {
  const layers = Array.isArray(input.fifo_layers) ? input.fifo_layers : [];
  const saleQty = Number(input.sale_qty);
  const smm = Number(input.SMM);
  const identityComplete = Boolean(input.sale_id && input.product_id && /^\d{4}-\d{2}-\d{2}$/.test(String(input.sale_date || '')));
  const validLayer = layer => Boolean(layer.purchase_document_id && /^\d{4}-\d{2}-\d{2}$/.test(String(layer.purchase_date || '')) && layer.supplier &&
    Number.isFinite(Number(layer.original_qty)) && Number(layer.original_qty)>0 && Number.isFinite(Number(layer.unit_cost)) && Number(layer.unit_cost)>=0 &&
    Number.isFinite(Number(layer.qty_consumed_before)) && Number(layer.qty_consumed_before)>=0 &&
    Number.isFinite(Number(layer.qty_consumed_this_sale)) && Number(layer.qty_consumed_this_sale)>0 &&
    Number.isFinite(Number(layer.qty_remaining)) && Number(layer.qty_remaining)>=0 &&
    Math.abs(Number(layer.original_qty)-Number(layer.qty_consumed_before)-Number(layer.qty_consumed_this_sale)-Number(layer.qty_remaining))<0.000001);
  const qty = layers.reduce((sum,layer)=>sum+Number(layer.qty_consumed_this_sale||0),0);
  const calculatedCogs = layers.reduce((sum,layer)=>sum+Number(layer.qty_consumed_this_sale||0)*Number(layer.unit_cost||0),0);
  const pass=identityComplete && saleQty>0 && Number.isFinite(smm) && smm>=0 && layers.length>0 && layers.every(validLayer) &&
    Math.abs(qty-saleQty)<0.000001 && Math.round(calculatedCogs*100)===Math.round(smm*100);
  return {sale_id:input.sale_id||null,product_id:input.product_id||null,sale_date:input.sale_date||null,sale_qty:Number.isFinite(saleQty)?saleQty:null,
    fifo_layers:layers,calculated_cogs:Number.isFinite(calculatedCogs)?Math.round(calculatedCogs*100)/100:null,
    reconciliation_status:pass?'PASS':'FAIL',profit_locked:!pass};
}

export function buildSalesNotificationV2(input = {}) {
  const audit=reconcileSaleFifo(input);
  const fields=Object.fromEntries(['SAT','SMM','BRK','SAB','DEĞ','GİD','VÖK','VER','NEK'].map(key=>[key,input[key]??null]));
  // Allocation of SAB/DEĞ is intentionally unresolved. A reconciled cost alone cannot unlock final profit.
  return {contract_version:'sales_notification_v2',...fields,fifo_audit:audit,profit_locked:audit.profit_locked||fields.SAB==null||fields['DEĞ']==null,
    fifo_proof:audit.reconciliation_status==='PASS'?'FIFO ✓':null,formula_status:'UNRESOLVED_SAB_DEG'};
}

export function formatV2FifoProof(contract) {
  const audit=contract?.fifo_audit;
  if (!audit || audit.reconciliation_status!=='PASS') return `SMM::: ${money(contract?.SMM)} · FIFO kanıtı eksik; kâr kilitli`;
  const layers=audit.fifo_layers;
  if (layers.length===1) return `SMM::: ${money(contract.SMM)} · ${layers[0].purchase_date} · ${layers[0].supplier} · FIFO ✓`;
  return [`SMM::: ${money(contract.SMM)} · FIFO ✓`,...layers.map(layer=>`↳ ${layer.qty_consumed_this_sale} ad · ${layer.purchase_date} · ${layer.supplier} · ${money(layer.unit_cost)}`)].join('\n');
}

export const SALES_MEMORY_EVENT_KINDS=Object.freeze(['fifo_layer_exhausted','cost_changed','margin_anomaly','stock_risk','sales_velocity_anomaly','price_anomaly','verified_user_rule']);
export function salesMemoryEventCandidate(event = {}) {
  if (!SALES_MEMORY_EVENT_KINDS.includes(event.kind) || !event.source_ref || !event.product_id) return null;
  return {kind:event.kind,product_id:event.product_id,occurred_at:event.occurred_at||null,source_ref:event.source_ref,
    summary:String(event.summary||'').replace(/\s+/g,' ').trim().slice(0,180)};
}
