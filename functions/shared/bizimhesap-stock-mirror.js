// Read-only Telegram stock query against the existing, time-stamped BizimHesap
// API mirror. A healthy sync does not prove every SKU or warehouse is covered.
const STOCK_VIEW = 'aperion_bh_inventory_search_v1';

export function stockQueryPaths(raw) {
  const query = String(raw || '').replace(/[,*()%\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 64);
  if (query.length < 2) return null;
  const text = encodeURIComponent('*' + query + '*');
  return {
    query,
    freshness: '/rest/v1/aperion_bh_freshness_v3?select=source,source_kind,record_count,last_success_at,freshness,connection_status&limit=50',
    stock: '/rest/v1/' + STOCK_VIEW +
      '?select=title,qty,warehouse_id,last_success_at,source_health' +
      '&title=ilike.' + text + '&order=title.asc&limit=8'
  };
}

export function formatStockMirrorReport(paths, freshness, rows, { mirrorOk = true } = {}) {
  if (!paths) return 'Kullanım: /stok ürün adı (en az 2 karakter).';
  if (!Array.isArray(freshness)) return '⚠️ Stok kaynak durumu doğrulanamadı. Tarihsel stok rakamı canlı gösterilmedi.';
  const depots = freshness.filter(x => String(x?.source || '').startsWith('inventory:'));
  const warehouses = freshness.find(x => x?.source === 'warehouses');
  const expectedDepots = Number(warehouses?.record_count);
  // Do not treat one updated warehouse as complete when the vendor lists two.
  const warehouseCatalogFresh = warehouses?.source_kind === 'API_MIRROR' &&
    warehouses?.freshness === 'FRESH' && warehouses?.connection_status === 'OK' &&
    Boolean(warehouses?.last_success_at) && Number.isSafeInteger(expectedDepots) &&
    expectedDepots > 0 && depots.length === expectedDepots;
  const allFresh = warehouseCatalogFresh && depots.every(x =>
    x.source_kind === 'API_MIRROR' && x.freshness === 'FRESH' &&
    x.connection_status === 'OK' && Boolean(x.last_success_at)
  );
  if (!allFresh) return '🔴 BizimHesap depo aynalarının güncelliği doğrulanamadı. Eski stock_raw rakamı kullanılmadı.';
  if (!mirrorOk || !Array.isArray(rows))
    return '⚠️ Güncel stok aynası okunamadı. Önce yetkili görünüm kurulmalı; eski stok rakamı kullanılmadı.';
  if (!rows.length) return '“' + paths.query + '” için güncel depo aynasında sonuç bulunamadı. Kapsamın eksiksizliği doğrulanmadı.';
  if (rows.some(x => x?.source_health !== 'FRESH'))
    return '🔴 Eşleşen stok satırlarının kaynak sağlığı doğrulanamadı. Miktar gösterilmedi.';
  const latest = depots.map(x => Date.parse(x.last_success_at)).filter(Number.isFinite);
  const stamp = latest.length ? new Date(Math.min(...latest)).toLocaleString('tr-TR', {timeZone:'Europe/Istanbul'}) : 'bilinmiyor';
  const lines = rows.map(x => {
    const qty = x.qty === null || x.qty === undefined || x.qty === '' || !Number.isFinite(Number(x.qty))
      ? 'miktar doğrulanamadı' : Number(x.qty).toLocaleString('tr-TR');
    const depot = String(x.warehouse_id || '').slice(0, 8) || '?';
    return '• ' + String(x.title || 'Adsız ürün').slice(0, 100) +
      ' — Depo ' + depot + ': ' + qty;
  });
  return '📦 BizimHesap API depo aynası — ' + paths.query +
    '\nSon başarılı aktarım (en eski depo): ' + stamp +
    '\n' + lines.join('\n') +
    '\nNot: Depo kaydıdır; rezerv/lot ve tüm SKU kapsamı ayrıca doğrulanmalı.';
}
