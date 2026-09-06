const DEFAULT_PRICE_LIST = 'Mayıs 2026';

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function fold(value) {
  return clean(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/İ/g, 'I').replace(/ı/g, 'i')
    .toLowerCase();
}

function isoDateInIstanbul(unixSeconds) {
  const date = unixSeconds ? new Date(Number(unixSeconds) * 1000) : new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

function explicitDate(text) {
  const match = clean(text).match(/\b(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})\b/);
  if (!match) return '';
  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  return `${match[3]}-${month}-${day}`;
}

function titleWord(value) {
  const text = clean(value);
  return text ? text[0].toLocaleUpperCase('tr-TR') + text.slice(1).toLocaleLowerCase('tr-TR') : '';
}

function html(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseProductLine(raw, lineNo) {
  const text = clean(raw.replace(/^[-•*]+\s*/, ''));
  const quantityMatch = text.match(/\b(\d+)\s*balya\b/i);
  if (!quantityMatch) return null;
  const normalized = fold(text);
  const brandMap = [
    ['cover dry', /cover\s*dry|coverdry/],
    ['jender', /\bjender\b/],
    ['lorina', /\blorina\b/],
    ['moly', /\bmoly\b/],
    ['freshlife', /fresh\s*life|freshlife/]
  ];
  const brand = brandMap.find(([, pattern]) => pattern.test(normalized))?.[0] || '';
  const productKind = /serme|yatak koruyucu/.test(normalized)
    ? 'serme'
    : /kulot/.test(normalized)
      ? 'külot'
      : /bel\s*bant|baglama/.test(normalized)
        ? 'bel bantlı'
        : '';
  const sizeMatch = normalized.match(/(?:^|\s)(xs|small|medium|large|xl|xxl|m|l)(?=\s|$)/i);
  const rawSize = sizeMatch?.[1]?.toUpperCase() || '';
  const size = ({ M: 'M', MEDIUM: 'M', L: 'L', LARGE: 'L', SMALL: 'S' }[rawSize] || rawSize);
  const explicitPack = normalized.match(/\b(\d+)\s*['’]?lu\b/);
  const unitsPerPackage = explicitPack ? Number(explicitPack[1]) : 30;
  const bales = Number(quantityMatch[1]);
  const packagesPerBale = productKind === 'serme' ? 6 : 4;
  const packages = bales * packagesPerBale;
  return {
    lineNo,
    rawText: text,
    brand: titleWord(brand),
    productKind,
    size,
    baleQuantity: bales,
    packagesPerBale,
    packageQuantity: packages,
    unitsPerPackage,
    totalUnits: packages * unitsPerPackage,
    matchStatus: brand && productKind && (productKind === 'serme' || size) ? 'ready_to_match' : 'review'
  };
}

function extractCustomer(lines, fullText) {
  const candidate = lines.find((line) => !/\b\d+\s*balya\b/i.test(line) && /medikal|eczane|eczanesi|saglik|sağlık/i.test(line));
  if (candidate) return clean(candidate.replace(/^(siparis|sipariş)\s*[:\-]?\s*/i, ''));
  const inline = clean(fullText).match(/(?:^|\n|sipariş\s*[:\-]?)\s*([^\n]{2,80}?(?:medikal|eczane(?:si)?|sağlık))(?=\s|\n|$)/i);
  return clean(inline?.[1] || '');
}

export function looksLikeDiaperOrder(text) {
  const normalized = fold(text);
  return /\b\d+\s*balya\b/.test(normalized)
    && /(cover\s*dry|jender|lorina|moly|fresh\s*life|hasta bezi|serme|bel\s*bant|kulot)/.test(normalized);
}

export function parseDiaperOrder(text, options = {}) {
  const sourceText = String(text || '').trim();
  const lines = sourceText.split(/\r?\n/).map(clean).filter(Boolean);
  const items = lines.map((line, index) => parseProductLine(line, index + 1)).filter(Boolean);
  if (!items.length && looksLikeDiaperOrder(sourceText)) {
    const fragments = sourceText.split(/(?=(?:cover\s*dry|coverdry|jender|lorina|moly|fresh\s*life)\b)/ig);
    fragments.forEach((fragment, index) => {
      const parsed = parseProductLine(fragment, index + 1);
      if (parsed) items.push(parsed);
    });
  }
  const customerName = extractCustomer(lines, sourceText);
  const normalized = fold(sourceText);
  const listMatch = sourceText.match(/\b(ocak|şubat|subat|mart|nisan|mayıs|mayis|haziran|temmuz|ağustos|agustos|eylül|eylul|ekim|kasım|kasim|aralık|aralik)\s+20\d{2}\s+(?:fiyat\s+)?listesi\b/i);
  const discountMatch = sourceText.match(/(?:iskonto|indirim)\s*:?\s*(%?\s*[\d,.]+)/i);
  const specialList = /ozel urun|özel ürün|ozel liste|özel liste/.test(normalized);
  const blockers = [];
  if (!customerName) blockers.push('Müşteri/cari adı bulunamadı');
  if (!items.length) blockers.push('Balya satırı bulunamadı');
  for (const item of items) {
    if (!item.brand) blockers.push(`${item.lineNo}. satırda marka belirsiz`);
    if (!item.productKind) blockers.push(`${item.lineNo}. satırda ürün tipi belirsiz`);
    if (item.productKind !== 'serme' && !item.size) blockers.push(`${item.lineNo}. satırda beden belirsiz`);
  }
  return {
    customerName,
    orderDate: explicitDate(sourceText) || isoDateInIstanbul(options.telegramDate),
    priceListName: listMatch ? clean(listMatch[0].replace(/\s+fiyat\s+/i, ' ')) : DEFAULT_PRICE_LIST,
    discountNote: discountMatch ? `İskonto ${clean(discountMatch[1])}` : 'İskonto yok',
    specialListNote: specialList ? 'Özel ürün/liste kontrolü gerekli' : 'Standart liste',
    sourceText,
    items,
    blockers: [...new Set(blockers)],
    dataQuality: blockers.length ? 'review' : 'complete',
    status: blockers.length ? 'needs_information' : 'draft_ready'
  };
}

export async function ensureDiaperSchema(db) {
  if (!db) return false;
  const statements = [
    `CREATE TABLE IF NOT EXISTS diaper_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_key TEXT NOT NULL UNIQUE, chat_id TEXT NOT NULL,
      telegram_message_id TEXT NOT NULL, customer_name TEXT NOT NULL, order_date TEXT NOT NULL,
      price_list_name TEXT NOT NULL DEFAULT 'Mayıs 2026', discount_note TEXT NOT NULL DEFAULT 'İskonto yok',
      special_list_note TEXT NOT NULL DEFAULT 'Standart liste', source_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft', data_quality TEXT NOT NULL DEFAULT 'review', blocker_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(chat_id,telegram_message_id))`,
    `CREATE TABLE IF NOT EXISTS diaper_order_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, line_no INTEGER NOT NULL, raw_text TEXT NOT NULL,
      brand TEXT, product_kind TEXT, size TEXT, bale_quantity INTEGER NOT NULL, packages_per_bale INTEGER NOT NULL,
      package_quantity INTEGER NOT NULL, units_per_package INTEGER NOT NULL, total_units INTEGER NOT NULL,
      catalog_product_id TEXT, catalog_product_name TEXT, unit_price_ex_vat REAL, vat_rate REAL,
      discount_rate REAL NOT NULL DEFAULT 0, match_status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(order_id,line_no))`,
    `CREATE TABLE IF NOT EXISTS diaper_operation_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, event_key TEXT NOT NULL UNIQUE, order_id INTEGER NOT NULL,
      event_type TEXT NOT NULL, event_at TEXT NOT NULL, source TEXT NOT NULL, payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS diaper_proforma_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, job_key TEXT NOT NULL UNIQUE, order_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'approval_pending', approval_id TEXT, external_queue_id TEXT,
      bizimhesap_document_id TEXT, bizimhesap_document_no TEXT, evidence_ref TEXT, result_summary TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), approved_at TEXT, completed_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE INDEX IF NOT EXISTS idx_diaper_orders_status_date ON diaper_orders(status,order_date,id)`,
    `CREATE INDEX IF NOT EXISTS idx_diaper_lines_order ON diaper_order_lines(order_id,line_no)`,
    `CREATE INDEX IF NOT EXISTS idx_diaper_events_order ON diaper_operation_events(order_id,event_at,id)`,
    `CREATE INDEX IF NOT EXISTS idx_diaper_proforma_jobs_order ON diaper_proforma_jobs(order_id,status,id)`
  ];
  try {
    for (const statement of statements) await db.prepare(statement).run();
    return true;
  } catch (_error) {
    return false;
  }
}

export async function saveDiaperOrder(db, { chatId, messageId, order }) {
  if (!db || !(await ensureDiaperSchema(db))) return { ok: false, error: 'd1_unavailable' };
  const orderKey = `telegram:${chatId}:${messageId}:diaper-order`;
  try {
    const inserted = await db.prepare(`INSERT INTO diaper_orders
      (order_key,chat_id,telegram_message_id,customer_name,order_date,price_list_name,discount_note,special_list_note,source_text,status,data_quality,blocker_json)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(order_key) DO NOTHING RETURNING id`)
      .bind(orderKey, String(chatId), String(messageId), order.customerName || 'BELİRSİZ', order.orderDate,
        order.priceListName, order.discountNote, order.specialListNote, order.sourceText, order.status,
        order.dataQuality, JSON.stringify(order.blockers)).first();
    let orderId = inserted?.id;
    let duplicate = false;
    if (!orderId) {
      const existing = await db.prepare('SELECT id,status FROM diaper_orders WHERE order_key=?').bind(orderKey).first();
      orderId = existing?.id;
      duplicate = true;
    }
    if (!orderId) return { ok: false, error: 'order_not_persisted' };
    if (!duplicate) {
      for (const item of order.items) {
        await db.prepare(`INSERT INTO diaper_order_lines
          (order_id,line_no,raw_text,brand,product_kind,size,bale_quantity,packages_per_bale,package_quantity,units_per_package,total_units,match_status)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
          .bind(orderId, item.lineNo, item.rawText, item.brand || null, item.productKind || null, item.size || null,
            item.baleQuantity, item.packagesPerBale, item.packageQuantity, item.unitsPerPackage, item.totalUnits, item.matchStatus).run();
      }
      await db.prepare(`INSERT INTO diaper_operation_events
        (event_key,order_id,event_type,event_at,source,payload_json) VALUES (?,?, 'order_received', ?, 'telegram', ?)`)
        .bind(`${orderKey}:received`, orderId, `${order.orderDate}T00:00:00+03:00`, JSON.stringify({ order_key: orderKey })).run();
    }
    return { ok: true, orderId, duplicate };
  } catch (error) {
    return { ok: false, error: error?.message || 'diaper_order_store_failed' };
  }
}

export async function readDiaperOrder(db, orderId) {
  if (!db || !(await ensureDiaperSchema(db))) return null;
  const order = await db.prepare('SELECT * FROM diaper_orders WHERE id=? LIMIT 1').bind(Number(orderId)).first();
  if (!order) return null;
  const result = await db.prepare('SELECT * FROM diaper_order_lines WHERE order_id=? ORDER BY line_no').bind(Number(orderId)).all();
  return { ...order, blockers: JSON.parse(order.blocker_json || '[]'), items: result?.results || [] };
}

export function diaperOrderCard(order, orderId, duplicate = false) {
  const totalBales = order.items.reduce((sum, item) => sum + item.baleQuantity, 0);
  const totalPackages = order.items.reduce((sum, item) => sum + item.packageQuantity, 0);
  const lines = order.items.map((item) => `• ${html(item.brand || '?')} ${html(item.productKind || '?')} ${html(item.size || '')}: ${item.baleQuantity} balya → ${item.packageQuantity} paket (${item.unitsPerPackage}'lu)`).join('\n');
  const quality = order.blockers.length ? `⚠️ Eksik: ${html(order.blockers.join('; '))}` : '✅ Ürün satırları tam; canlı ürün/fiyat eşleşmesi proforma adımında yapılacak.';
  return [
    duplicate ? '♻️ <b>SİPARİŞ ZATEN KAYITLI</b>' : '📦 <b>HASTA BEZİ SİPARİŞİ ALINDI</b>',
    `<b>Sipariş:</b> HB-${orderId}`,
    `<b>Cari:</b> ${html(order.customerName || 'BELİRSİZ')}`,
    `<b>Sipariş tarihi:</b> ${html(order.orderDate)}`,
    `<b>Fiyat listesi:</b> ${html(order.priceListName)}`,
    `<b>İskonto:</b> ${html(order.discountNote)}`,
    `<b>Özel ürün/liste:</b> ${html(order.specialListNote)}`,
    '', lines || '• Ürün satırı bulunamadı',
    '', `<b>Toplam:</b> ${totalBales} balya • ${totalPackages} paket`,
    quality,
    '', 'Sevk tarihi, fatura tarihi/no ve tahsilat bu sipariş kartının zaman çizelgesine işlenecek.'
  ].join('\n');
}

export function diaperApprovalButtons(orderId, canPrepare) {
  if (!canPrepare) return { inline_keyboard: [[{ text: '✏️ Eksikleri mesajla tamamla', callback_data: `dp:i:${orderId}` }]] };
  return { inline_keyboard: [[
    { text: '✅ PROFORMA TASLAĞINI HAZIRLA', callback_data: `dp:a:${orderId}` },
    { text: '❌ İptal', callback_data: `dp:r:${orderId}` }
  ]] };
}

export async function listOpenDiaperOrders(db, limit = 10) {
  if (!db || !(await ensureDiaperSchema(db))) return [];
  const result = await db.prepare(`SELECT id,customer_name,order_date,price_list_name,status,created_at
    FROM diaper_orders WHERE status NOT IN ('cancelled','collected') ORDER BY order_date ASC,id ASC LIMIT ?`)
    .bind(Math.max(1, Math.min(25, Number(limit) || 10))).all();
  return result?.results || [];
}
