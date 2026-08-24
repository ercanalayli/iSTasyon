export const INCOME_PERIODS = ['bugun', 'dun', 'hafta', 'ay', 'gecen_ay', 'yil', 'gecen_yil'];

const PERIOD_LABELS = {
  bugun: 'Bugün',
  dun: 'Dün',
  hafta: 'Bu Hafta',
  ay: 'Bu Ay',
  gecen_ay: 'Geçen Ay',
  yil: 'Bu Yıl',
  gecen_yil: 'Geçen Yıl'
};

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function datePart(value) {
  const match = String(value || '').match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function maxDate(rows, fields) {
  let latest = null;
  for (const row of rows || []) {
    for (const field of fields) {
      const candidate = datePart(row && row[field]);
      if (candidate && (!latest || candidate > latest)) latest = candidate;
    }
  }
  return latest;
}

export function calculateSourceHealth({ income = [], refreshedAt, now = new Date() }) {
  const today = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  const latestSalesDate = maxDate(income, ['son_tarih', 'tarih', 'occurred_at']);
  const refreshedMs = Date.parse(refreshedAt || '');
  const ageMinutes = Number.isFinite(refreshedMs)
    ? Math.max(0, Math.round((now.getTime() - refreshedMs) / 60000))
    : null;
  const sameDaySales = latestSalesDate === today;
  const recentlyRefreshed = ageMinutes !== null && ageMinutes <= 45;
  const freshness = sameDaySales && recentlyRefreshed ? 'CONFIRMED' : 'STALE';
  const reasons = [];
  if (!latestSalesDate) reasons.push('latest_sales_date_missing');
  else if (!sameDaySales) reasons.push('latest_sales_date_not_today');
  if (ageMinutes === null) reasons.push('snapshot_refresh_time_missing');
  else if (!recentlyRefreshed) reasons.push('snapshot_older_than_45_minutes');

  return {
    freshness,
    today,
    latest_sales_date: latestSalesDate,
    refreshed_at: refreshedAt || null,
    age_minutes: ageMinutes,
    reasons
  };
}

export function buildIncomeStatementSummary({
  income = [],
  cogs = [],
  gider = [],
  stok = [],
  refreshedAt,
  now = new Date()
}) {
  const sourceHealth = calculateSourceHealth({ income, refreshedAt, now });
  const periods = {};

  for (const period of INCOME_PERIODS) {
    const sales = income.reduce((sum, row) => sum + number(row[`satis_${period}`]), 0);
    const quantity = income.reduce((sum, row) => sum + number(row[`adet_${period}`]), 0);
    const matchedRevenue = cogs.reduce((sum, row) => sum + number(row[`esl_ciro_${period}`]), 0);
    const matchedCogs = cogs.reduce((sum, row) => sum + number(row[`maliyet_${period}`]), 0);
    const expenses = gider.reduce((sum, row) => sum + number(row[`gider_${period}`]), 0);
    const partialGrossProfit = matchedRevenue > 0 ? matchedRevenue - matchedCogs : null;
    const fifoCoveragePct = sales > 0 ? matchedRevenue / sales * 100 : null;
    const partialGrossMarginPct = partialGrossProfit !== null && matchedRevenue > 0
      ? partialGrossProfit / matchedRevenue * 100
      : null;
    const isDailyPeriod = period === 'bugun' || period === 'dun';
    const periodStatus = sourceHealth.freshness === 'CONFIRMED'
      ? 'CONFIRMED'
      : (isDailyPeriod ? 'UNAVAILABLE_STALE_SOURCE' : 'STALE_PARTIAL');

    periods[period] = {
      label: PERIOD_LABELS[period],
      status: periodStatus,
      quantity: isDailyPeriod && sourceHealth.freshness !== 'CONFIRMED' ? null : quantity,
      sales: isDailyPeriod && sourceHealth.freshness !== 'CONFIRMED' ? null : sales,
      fifo_matched_revenue: matchedRevenue || null,
      fifo_coverage_pct: fifoCoveragePct,
      matched_cogs: matchedRevenue > 0 ? matchedCogs : null,
      partial_gross_profit: partialGrossProfit,
      partial_gross_margin_pct: partialGrossMarginPct,
      expenses,
      operating_profit: fifoCoveragePct !== null && fifoCoveragePct >= 99.999
        ? sales - matchedCogs - expenses
        : null,
      tax: null,
      net_profit: null,
      net_profit_reason: fifoCoveragePct !== null && fifoCoveragePct >= 99.999
        ? 'tax_source_missing'
        : 'fifo_coverage_incomplete'
    };
  }

  return {
    source_health: sourceHealth,
    stock_recorded_purchase_value: stok.reduce((sum, row) => sum + number(row.stok), 0),
    periods,
    accounting_note: 'Kısmi FIFO brüt kârı, tüm işletme giderleriyle birleştirilerek net kâr üretilmez.'
  };
}

