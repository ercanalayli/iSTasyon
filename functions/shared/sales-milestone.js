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
