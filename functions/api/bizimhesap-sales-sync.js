function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

import {
  buildProfitSnapshot,
  crossedMilestones,
  detectSalesAnomalies,
  formatMilestoneMessage
} from '../shared/sales-milestone.js';

function authorized(request, env) {
  const configured = String(env.APERION_BRIDGE_SECRET || '');
  const supplied = String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return configured.length >= 32 && supplied === configured;
}

function cleanText(value, max = 500) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function finiteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizedSale(row) {
  const sale = {
    firma_id: cleanText(row.firma_id || 'alayli', 80),
    firma_adi: cleanText(row.firma_adi || 'ALAYLI MEDIKAL', 200),
    tarih: cleanText(row.tarih, 10),
    unvan: cleanText(row.unvan, 200),
    urun: cleanText(row.urun, 500),
    urun_kod: cleanText(row.urun_kod, 100),
    barkod: cleanText(row.barkod, 100),
    fatura_no: cleanText(row.fatura_no, 120),
    kategori: cleanText(row.kategori, 160),
    adet: finiteNumber(row.adet, 0),
    ciro: finiteNumber(row.ciro, 0),
    satis_kdv_haric: finiteNumber(row.satis_kdv_haric, finiteNumber(row.ciro, 0)),
    satis_kdv_dahil: finiteNumber(row.satis_kdv_dahil, finiteNumber(row.ciro, 0)),
    fifo_cost: row.fifo_cost == null ? null : finiteNumber(row.fifo_cost, 0),
    operating_expense_allocated: row.operating_expense_allocated == null ? null : finiteNumber(row.operating_expense_allocated, 0),
    estimated_tax: row.estimated_tax == null ? null : finiteNumber(row.estimated_tax, 0),
    negative_stock: row.negative_stock === true,
    discount_pct: row.discount_pct == null ? null : finiteNumber(row.discount_pct, 0),
    kaynak_satir: Math.max(0, Math.trunc(finiteNumber(row.kaynak_satir, 0))),
    source_url: cleanText(row.source_url || 'https://bizimhesap.com/web/ngn/doc/ngnretailsales', 500)
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sale.tarih)) throw new Error('invalid_sale_date');
  return sale;
}

export function saleFingerprint(sale) {
  return [
    sale.firma_id,
    sale.tarih,
    sale.fatura_no,
    sale.urun_kod,
    sale.barkod,
    sale.unvan,
    sale.urun,
    sale.adet,
    sale.ciro
  ].join('|');
}

function money(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency', currency: 'TRY', maximumFractionDigits: 2
  }).format(finiteNumber(value, 0));
}

export function formatNewSalesMessage(records) {
  const total = records.reduce((sum, sale) => sum + finiteNumber(sale.ciro, 0), 0);
  const lines = [
    '🛒 <b>YENİ BİZİMHESAP SATIŞI</b>',
    `<b>${records.length}</b> yeni satış satırı • <b>${money(total)}</b>`
  ];
  for (const sale of records.slice(0, 12)) {
    const customer = sale.unvan || 'Müşteri bilgisi yok';
    const product = sale.urun || 'Ürün bilgisi yok';
    const document = sale.fatura_no ? ` • ${sale.fatura_no}` : '';
    lines.push('', `• <b>${customer}</b>${document}`, `${product} — ${sale.adet} adet — ${money(sale.ciro)}`);
  }
  if (records.length > 12) lines.push('', `+ ${records.length - 12} satır daha`);
  lines.push('', '<i>AperiON • BizimHesap canlı satış izlemesi</i>');
  return lines.join('\n');
}

async function telegram(env, text) {
  const token = String(env.HERMES_TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = String(
    env.TELEGRAM_CHAT_ID ||
    env.TELEGRAM_ALLOWED_CHAT_ID ||
    env.TELEGRAM_ALLOWED_CHAT_IDS ||
    ''
  ).split(/[;,\s]+/).find(Boolean) || '';
  if (!token || !chatId) return { sent: false, reason: 'telegram_not_configured' };
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });
  if (!response.ok) throw new Error(`telegram_send_failed:${response.status}`);
  return { sent: true };
}

async function sendSalesMilestoneIfNeeded(env, saleDate, previousRevenue) {
  const aggregate = await env.APERION_DB.prepare(
    `SELECT COUNT(*) AS record_count,
            ROUND(SUM(CAST(json_extract(payload_json,'$.ciro') AS REAL)),2) AS revenue,
            SUM(CASE WHEN json_type(payload_json,'$.fifo_cost') IN ('integer','real') THEN 1 ELSE 0 END) AS fifo_covered_count,
            ROUND(SUM(CASE WHEN json_type(payload_json,'$.fifo_cost') IN ('integer','real') THEN CAST(json_extract(payload_json,'$.fifo_cost') AS REAL) ELSE 0 END),2) AS fifo_cost,
            ROUND(SUM(CASE WHEN json_type(payload_json,'$.operating_expense_allocated') IN ('integer','real') THEN CAST(json_extract(payload_json,'$.operating_expense_allocated') AS REAL) ELSE 0 END),2) AS operating_expense,
            ROUND(SUM(CASE WHEN json_type(payload_json,'$.estimated_tax') IN ('integer','real') THEN CAST(json_extract(payload_json,'$.estimated_tax') AS REAL) ELSE 0 END),2) AS estimated_tax,
            SUM(CASE WHEN json_extract(payload_json,'$.negative_stock')=1 THEN 1 ELSE 0 END) AS negative_stock_count,
            SUM(CASE WHEN CAST(json_extract(payload_json,'$.ciro') AS REAL)<0 THEN 1 ELSE 0 END) AS return_count,
            SUM(CASE WHEN CAST(json_extract(payload_json,'$.discount_pct') AS REAL)>=50 THEN 1 ELSE 0 END) AS high_discount_count
       FROM canonical_events
      WHERE event_type='sale.invoice' AND truth_state='confirmed' AND substr(occurred_at,1,10)=?`
  ).bind(saleDate).first();
  const currentRevenue = finiteNumber(aggregate?.revenue, 0);
  const milestones = crossedMilestones(previousRevenue, currentRevenue, finiteNumber(env.SALES_MILESTONE_STEP, 10000));
  if (!milestones.length) return { sent: false, milestones: [], revenue: currentRevenue };

  const newMilestones = [];
  for (const milestone of milestones) {
    const key = `aperion:sales-milestone:${saleDate}:${milestone}`;
    const result = await env.APERION_DB.prepare(
      `INSERT OR IGNORE INTO canonical_events
        (event_key,connector_id,external_ref,event_type,occurred_at,truth_state,subject_type,subject_ref,payload_json,evidence_ref,content_hash,received_at)
       SELECT ?,id,?,'notification.sales_milestone',?,'confirmed','company','alayli',?,?,?,datetime('now')
         FROM connector_registry WHERE connector_key='bizimhesap' LIMIT 1`
    ).bind(key, String(milestone), `${saleDate}T23:59:59+03:00`, JSON.stringify({ sale_date: saleDate, milestone }), 'cloudflare_d1.canonical_events', key).run();
    if (Number(result.meta?.changes || 0) > 0) newMilestones.push(milestone);
  }
  if (!newMilestones.length) return { sent: false, milestones: [], revenue: currentRevenue, deduplicated: true };

  const daily = { ...aggregate, revenue: currentRevenue };
  const snapshot = buildProfitSnapshot({
    ...daily,
    fifoCost: daily.fifo_cost,
    operatingExpense: daily.operating_expense,
    estimatedTax: daily.estimated_tax,
    recordCount: daily.record_count,
    fifoCoveredCount: daily.fifo_covered_count
  });
  const anomalies = detectSalesAnomalies({
    ...daily,
    recordCount: daily.record_count,
    fifoCoveredCount: daily.fifo_covered_count,
    negativeStockCount: daily.negative_stock_count,
    returnCount: daily.return_count,
    highDiscountCount: daily.high_discount_count,
    lowMarginThreshold: finiteNumber(env.SALES_LOW_MARGIN_THRESHOLD, 5),
    sourceFresh: true
  }, snapshot);
  const message = formatMilestoneMessage({ milestone: newMilestones.at(-1), daily, snapshot, anomalies });
  const notification = await telegram(env, message);
  return { ...notification, milestones: newMilestones, revenue: currentRevenue, anomalies };
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  if (!authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);

  try {
    const body = await request.json();
    const incoming = Array.isArray(body.records) ? body.records : [];
    if (!incoming.length || incoming.length > 500) return json({ ok: false, error: 'records_must_be_1_to_500' }, 400);
    const records = incoming.map(normalizedSale);
    const affectedDates = [...new Set(records.map(row => row.tarih))];
    const existingFingerprints = new Set();
    for (const date of affectedDates) {
      const existing = await env.APERION_DB.prepare(
        `SELECT payload_json FROM canonical_events
          WHERE event_type='sale.invoice' AND truth_state='confirmed' AND substr(occurred_at,1,10)=?`
      ).bind(date).all();
      for (const row of existing.results || []) {
        try { existingFingerprints.add(saleFingerprint(normalizedSale(JSON.parse(row.payload_json)))); } catch {}
      }
    }
    const newSales = [...new Map(
      records
        .filter(sale => !existingFingerprints.has(saleFingerprint(sale)))
        .map(sale => [saleFingerprint(sale), sale])
    ).values()];
    const todayIstanbul = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
    const previousRevenueByDate = {};
    for (const date of affectedDates) {
      const before = await env.APERION_DB.prepare(
        `SELECT ROUND(SUM(CAST(json_extract(payload_json,'$.ciro') AS REAL)),2) AS revenue
           FROM canonical_events WHERE event_type='sale.invoice' AND truth_state='confirmed' AND substr(occurred_at,1,10)=?`
      ).bind(date).first();
      previousRevenueByDate[date] = finiteNumber(before?.revenue, 0);
    }
    const connector = await env.APERION_DB.prepare(
      `SELECT id FROM connector_registry WHERE connector_key='bizimhesap' LIMIT 1`
    ).first();
    if (!connector?.id) return json({ ok: false, error: 'bizimhesap_connector_missing' }, 503);

    const statements = [];
    for (const sale of records) {
      const identity = saleFingerprint(sale);
      const hash = await sha256(identity);
      const eventKey = `bizimhesap:sale:${hash}`;
      statements.push(env.APERION_DB.prepare(
        `INSERT INTO canonical_events
          (event_key,connector_id,external_ref,event_type,occurred_at,truth_state,subject_type,subject_ref,payload_json,evidence_ref,content_hash,received_at)
         VALUES (?,?,?,?,?,'confirmed','customer',?,?,?,?,datetime('now'))
         ON CONFLICT(event_key) DO UPDATE SET
           payload_json=excluded.payload_json,evidence_ref=excluded.evidence_ref,content_hash=excluded.content_hash,received_at=datetime('now')`
      ).bind(
        eventKey, connector.id, sale.fatura_no || null, 'sale.invoice', `${sale.tarih}T12:00:00+03:00`,
        sale.unvan || null, JSON.stringify(sale), sale.source_url, hash
      ));
      if (!existingFingerprints.has(identity) && sale.tarih === todayIstanbul) {
        statements.push(env.APERION_DB.prepare(
          `INSERT OR IGNORE INTO canonical_events
            (event_key,connector_id,external_ref,event_type,occurred_at,truth_state,subject_type,subject_ref,payload_json,evidence_ref,content_hash,received_at)
           VALUES (?,?,?,?,?,'pending','customer',?,?,?,?,datetime('now'))`
        ).bind(
          `aperion:sales-delivery:${hash}`, connector.id, sale.fatura_no || null,
          'notification.sales_delivery', `${sale.tarih}T12:00:00+03:00`, sale.unvan || null,
          JSON.stringify(sale), sale.source_url, hash
        ));
      }
    }
    statements.push(env.APERION_DB.prepare(
      `INSERT INTO source_health(source_key,status,error_code,message,last_success_at,checked_at,evidence_ref)
       VALUES('bizimhesap','confirmed','',?,datetime('now'),datetime('now'),?)
       ON CONFLICT(source_key) DO UPDATE SET status='confirmed',error_code='',message=excluded.message,
         last_success_at=excluded.last_success_at,checked_at=excluded.checked_at,evidence_ref=excluded.evidence_ref`
    ).bind(`${records.length} satış kaydı D1'e kabul edildi`, cleanText(body.evidence_ref || records[0].source_url, 500)));
    await env.APERION_DB.batch(statements);
    let sales_notification = { sent: false, new_records: newSales.length };
    const pending = await env.APERION_DB.prepare(
      `SELECT event_key,payload_json FROM canonical_events
        WHERE event_type='notification.sales_delivery' AND truth_state='pending'
        ORDER BY received_at ASC LIMIT 50`
    ).all();
    const pendingSales = (pending.results || []).map(row => {
      try { return { event_key: row.event_key, sale: normalizedSale(JSON.parse(row.payload_json)) }; } catch { return null; }
    }).filter(Boolean);
    if (pendingSales.length) {
      sales_notification = {
        ...(await telegram(env, formatNewSalesMessage(pendingSales.map(item => item.sale)))),
        new_records: pendingSales.length
      };
      if (sales_notification.sent) {
        await env.APERION_DB.batch(pendingSales.map(item => env.APERION_DB.prepare(
          `UPDATE canonical_events SET truth_state='confirmed',received_at=datetime('now') WHERE event_key=?`
        ).bind(item.event_key)));
      }
    }
    const milestone_notifications = [];
    for (const date of affectedDates) {
      milestone_notifications.push({ date, ...(await sendSalesMilestoneIfNeeded(env, date, previousRevenueByDate[date])) });
    }
    return json({ ok: true, accepted: records.length, sales_notification, milestone_notifications, generated_at: new Date().toISOString() });
  } catch (error) {
    return json({ ok: false, error: 'sales_sync_failed', message: error.message }, 400);
  }
}
