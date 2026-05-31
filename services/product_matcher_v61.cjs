// AperiON v61 Product Matcher
// Read-only product search helper for Telegram and preview flows.
// Active company guard: only ALAYLI_MEDIKAL is allowed.

const ACTIVE_COMPANY = 'ALAYLI_MEDIKAL';

function normalizeText(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildProductQuery(keyword) {
  const clean = normalizeText(keyword);
  if (!clean || clean.length < 3) {
    return { error: 'Arama için en az 3 karakter gerekir.' };
  }

  return {
    companyCode: ACTIVE_COMPANY,
    keyword: clean,
    tokens: clean.split(' ').filter(Boolean)
  };
}

function scoreProduct(product, tokens) {
  const haystack = normalizeText([
    product.product_name,
    product.product_code,
    product.barcode,
    product.category,
    product.brand
  ].filter(Boolean).join(' '));

  let score = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) score += 20;
  }
  if (tokens.length && haystack.includes(tokens.join(' '))) score += 40;
  return score;
}

function mapProductRow(row) {
  const missing = [];
  if (row.last_purchase_price == null) missing.push('alış fiyatı');
  if (row.avg_sale_price == null) missing.push('satış fiyatı');
  if (row.current_stock == null) missing.push('stok');
  if (!row.category) missing.push('kategori');

  return {
    product_name: row.product_name,
    product_code: row.product_code || null,
    barcode: row.barcode || null,
    category: row.category || null,
    brand: row.brand || null,
    current_stock: row.current_stock ?? null,
    last_purchase_price: row.last_purchase_price ?? null,
    avg_sale_price: row.avg_sale_price ?? null,
    missing_fields: missing,
    approval_required: missing.length > 0,
    company_code: ACTIVE_COMPANY
  };
}

async function searchProductForTelegram(dbClient, keyword) {
  const parsed = buildProductQuery(keyword);
  if (parsed.error) return { success: false, error: parsed.error, data: [] };

  if (!dbClient || typeof dbClient.query !== 'function') {
    return { success: false, error: 'Veritabanı bağlantısı yok.', data: [] };
  }

  const sql = `
    SELECT product_name, product_code, barcode, category, brand,
           current_stock, last_purchase_price, avg_sale_price
    FROM products
    WHERE company_code = $1
      AND (
        product_name ILIKE $2 OR
        product_code ILIKE $2 OR
        barcode ILIKE $2 OR
        category ILIKE $2 OR
        brand ILIKE $2
      )
    LIMIT 25
  `;

  const values = [ACTIVE_COMPANY, `%${parsed.keyword}%`];
  const result = await dbClient.query(sql, values);
  const rows = Array.isArray(result.rows) ? result.rows : [];

  const ranked = rows
    .map(row => ({ row, score: scoreProduct(row, parsed.tokens) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => mapProductRow(item.row));

  return { success: true, data: ranked };
}

function formatTelegramProductReply(result) {
  if (!result || !result.success) {
    return `Ürün kontrol edilemedi: ${result && result.error ? result.error : 'bilinmeyen hata'}`;
  }
  if (!result.data.length) return 'ALAYLI Medikal içinde ürün bulunamadı.';

  return result.data.map((p, index) => {
    const missingText = p.missing_fields.length ? p.missing_fields.join(', ') : 'yok';
    const status = p.approval_required ? 'Onay Merkezi kontrolü gerekli' : 'Bilgi tam görünüyor';
    return [
      `${index + 1}. ${p.product_name}`,
      `Kategori: ${p.category || 'eksik'}`,
      `Stok: ${p.current_stock ?? 'eksik'}`,
      `Son alış: ${p.last_purchase_price ?? 'eksik'}`,
      `Ortalama satış: ${p.avg_sale_price ?? 'eksik'}`,
      `Eksik bilgi: ${missingText}`,
      `Durum: ${status}`
    ].join('\n');
  }).join('\n\n');
}

module.exports = {
  ACTIVE_COMPANY,
  normalizeText,
  buildProductQuery,
  searchProductForTelegram,
  formatTelegramProductReply
};
