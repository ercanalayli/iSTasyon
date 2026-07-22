const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function normalizeProductKey(product = {}) {
  const barcode = String(product.barcode || '').replace(/\D/g, '');
  if (barcode) return `barcode:${barcode}`;
  const code = String(product.code || product.urun_kod || '').trim().toLocaleLowerCase('tr-TR');
  if (code) return `code:${code}`;
  const name = String(product.name || product.urun || '')
    .toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
  return name ? `name:${name}` : null;
}

export function analyzePrice(input) {
  const cost = Number(input.cost);
  const vatRate = Number(input.vatRate ?? 10) / 100;
  const targetMargin = Number(input.targetMargin ?? 25) / 100;
  const minMargin = Number(input.minMargin ?? 15) / 100;
  const commissionRate = Number(input.commissionRate ?? 0) / 100;
  const shipping = Number(input.shipping ?? 0);
  if (!(cost > 0)) return { status: 'blocked', reasons: ['Maliyet eksik veya sıfır'] };
  if (targetMargin <= commissionRate || targetMargin >= 1) {
    return { status: 'blocked', reasons: ['Hedef marj/komisyon ayarı geçersiz'] };
  }

  const floorNet = (cost + shipping) / (1 - minMargin - commissionRate);
  const targetNet = (cost + shipping) / (1 - targetMargin - commissionRate);
  const offers = (input.competitorOffers || [])
    .filter(x => Number(x.price) > 0 && x.inStock !== false)
    .map(x => ({ ...x, price: Number(x.price) }))
    .sort((a, b) => a.price - b.price);
  const marketMinGross = offers[0]?.price ?? null;
  const targetGross = targetNet * (1 + vatRate);
  const floorGross = floorNet * (1 + vatRate);
  const competitiveGross = marketMinGross ? marketMinGross - Number(input.undercutBy ?? 1) : targetGross;
  const recommendedGross = money(Math.max(floorGross, Math.min(targetGross, competitiveGross)));
  const recommendedNet = recommendedGross / (1 + vatRate);
  const profit = recommendedNet * (1 - commissionRate) - shipping - cost;
  const margin = recommendedNet ? profit / recommendedNet : 0;
  const reasons = [];
  if (!offers.length) reasons.push('Doğrulanmış rakip fiyatı yok');
  if (marketMinGross && floorGross > marketMinGross) reasons.push('Minimum kârlı fiyat pazar tabanının üzerinde');
  if (margin + 1e-9 < minMargin) reasons.push('Minimum marj korunamıyor');

  return {
    status: reasons.some(x => x.includes('korunamıyor')) ? 'blocked' : 'review',
    currency: 'TRY',
    cost: money(cost),
    marketMinGross: marketMinGross && money(marketMinGross),
    floorGross: money(floorGross),
    targetGross: money(targetGross),
    recommendedGross,
    expectedProfit: money(profit),
    expectedMarginPct: money(margin * 100),
    evidenceCount: offers.length,
    reasons,
    requiresApproval: true,
  };
}

export function buildSyncDecision({ local, remote }) {
  const key = normalizeProductKey(local || remote);
  if (!key) return { action: 'block', reason: 'Ürün kimliği yok', requiresApproval: true };
  if (!remote) return { action: 'queue_create_in_bizimhesap', key, requiresApproval: true };
  const changes = {};
  for (const field of ['name', 'barcode', 'stock', 'salePrice']) {
    if (local?.[field] !== undefined && String(local[field]) !== String(remote[field])) {
      changes[field] = { from: remote[field], to: local[field] };
    }
  }
  return Object.keys(changes).length
    ? { action: 'queue_update_bizimhesap', key, changes, requiresApproval: true }
    : { action: 'noop', key, changes: {}, requiresApproval: false };
}
