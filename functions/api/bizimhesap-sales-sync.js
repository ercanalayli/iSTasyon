function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

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
    kaynak_satir: Math.max(0, Math.trunc(finiteNumber(row.kaynak_satir, 0))),
    source_url: cleanText(row.source_url || 'https://bizimhesap.com/web/ngn/doc/ngnretailsales', 500)
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sale.tarih)) throw new Error('invalid_sale_date');
  return sale;
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
    const connector = await env.APERION_DB.prepare(
      `SELECT id FROM connector_registry WHERE connector_key='bizimhesap' LIMIT 1`
    ).first();
    if (!connector?.id) return json({ ok: false, error: 'bizimhesap_connector_missing' }, 503);

    const statements = [];
    for (const sale of records) {
      const identity = [sale.firma_id, sale.tarih, sale.fatura_no, sale.urun_kod, sale.barkod, sale.unvan, sale.urun, sale.adet, sale.ciro, sale.kaynak_satir].join('|');
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
    }
    statements.push(env.APERION_DB.prepare(
      `INSERT INTO source_health(source_key,status,error_code,message,last_success_at,checked_at,evidence_ref)
       VALUES('bizimhesap','confirmed',NULL,?,datetime('now'),datetime('now'),?)
       ON CONFLICT(source_key) DO UPDATE SET status='confirmed',error_code=NULL,message=excluded.message,
         last_success_at=excluded.last_success_at,checked_at=excluded.checked_at,evidence_ref=excluded.evidence_ref`
    ).bind(`${records.length} satış kaydı D1'e kabul edildi`, cleanText(body.evidence_ref || records[0].source_url, 500)));
    await env.APERION_DB.batch(statements);
    return json({ ok: true, accepted: records.length, generated_at: new Date().toISOString() });
  } catch (error) {
    return json({ ok: false, error: 'sales_sync_failed', message: error.message }, 400);
  }
}
