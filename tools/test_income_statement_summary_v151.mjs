import assert from 'node:assert/strict';
import { buildIncomeStatementSummary } from '../functions/shared/income-statement.js';

const result = buildIncomeStatementSummary({
  income: [
    { kategori_grup: 'A', son_tarih: '2026-08-12', satis_bugun: 0, satis_hafta: 1000, adet_hafta: 10 },
    { kategori_grup: 'YENI_KATEGORI', son_tarih: '2026-08-11', satis_hafta: 500, adet_hafta: 5 },
    { kategori_grup: 'ARAÇ/VARLIK SATIŞI (TİCARİ DEĞİL)', son_tarih: '2026-08-10', satis_hafta: 999, adet_hafta: 1 }
  ],
  cogs: [
    { kategori_grup: 'A', esl_ciro_hafta: 750, maliyet_hafta: 500 }
  ],
  gider: [{ sinif: 'SABIT', gider_hafta: 100 }],
  stok: [{ kategori_grup: 'A', stok: 2000 }],
  refreshedAt: '2026-08-15T10:00:00.000Z',
  now: new Date('2026-08-24T12:00:00.000Z')
});

assert.equal(result.source_health.freshness, 'STALE');
assert.equal(result.source_health.latest_sales_date, '2026-08-12');
assert.equal(result.periods.bugun.sales, null, 'Stale günlük veri sıfır gibi gösterilmemeli');
assert.equal(result.periods.hafta.sales, 1500, 'Sabit kategori listesi dışında kalan satışlar da toplanmalı');
assert.equal(result.periods.hafta.fifo_coverage_pct, 50);
assert.equal(result.periods.hafta.matched_cogs, 500);
assert.equal(result.periods.hafta.partial_gross_profit, 250);
assert.equal(result.periods.hafta.operating_profit, null);
assert.equal(result.periods.hafta.net_profit, null);
assert.equal(result.stock_recorded_purchase_value, 2000);

console.log('income statement summary tests passed');

