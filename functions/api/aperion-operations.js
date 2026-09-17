import { authorized } from './session-checkpoint.js';
import { buildToday } from '../shared/attention-engine.js';

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});
const closed = new Set(['completed', 'cancelled', 'verified', 'done', 'closed']);
const clean = (value, max = 180) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const safeRows = async (db, sql) => {
  try { return { available: true, rows: (await db.prepare(sql).all()).results || [] }; }
  catch { return { available: false, rows: [] }; }
};

export async function onRequestGet({ request, env }) {
  if (new URL(request.url).searchParams.get('health') === '1')
    return json({ ok: true, service: 'aperion-operations', version: 'v1', data_access: 'protected' });
  if (!env.APERION_DB) return json({ ok: false, error: 'missing_d1_binding' }, 503);
  if (!await authorized(request, env)) return json({ ok: false, error: 'unauthorized' }, 401);

  try {
    const [today, procurement, diaperOrders, marketing] = await Promise.all([
      buildToday(env.APERION_DB),
      safeRows(env.APERION_DB, `SELECT commitment_key,commitment_type,title,counterparty,amount,currency,due_at,expected_at,status,truth_state,source_ref,evidence_ref,next_action,time_bucket
        FROM commitment_timeline
        WHERE commitment_type IN ('purchase_order','supplier_order','placed_order','verilen_siparis')
          AND status NOT IN ('completed','cancelled','verified','done','closed')
        ORDER BY CASE time_bucket WHEN 'overdue' THEN 0 WHEN 'approaching' THEN 1 ELSE 2 END,COALESCE(due_at,expected_at) LIMIT 50`),
      safeRows(env.APERION_DB, `SELECT order_key,customer_name,order_date,status,data_quality
        FROM diaper_orders WHERE status NOT IN ('completed','cancelled','verified','done','closed')
        ORDER BY order_date DESC LIMIT 30`),
      safeRows(env.APERION_DB, `SELECT work_key,action_type,title,due_at,status,approval_required,verification_rule
        FROM work_items WHERE action_type IN ('marketing','campaign','customer_followup','lead_followup','prospecting')
          AND status NOT IN ('completed','cancelled','verified','done','closed')
        ORDER BY due_at LIMIT 50`)
    ]);
    const alerts = today.items
      .filter(item => item.confidence >= 0.7 && item.provenance?.length &&
        item.reason_codes?.some(code => ['OVERDUE','WAITING_APPROVAL','FAILED_AUTOMATION','DATA_CONFLICT','STALE_CRITICAL_FACT'].includes(code)))
      .slice(0, 30)
      .map(item => ({
        key: `operations:${today.date}:${item.id}`,
        title: clean(item.title),
        severity: item.reason_codes.includes('OVERDUE') || item.reason_codes.includes('FAILED_AUTOMATION') ? 'high' : 'review',
        reason_codes: item.reason_codes,
        action_class: 'manual_review',
        provenance: item.provenance,
        delivery_status: 'not_sent'
      }));
    const marketingRows = marketing.rows.filter(row => !closed.has(clean(row.status).toLowerCase()));
    return json({
      ok: true,
      generated_at: new Date().toISOString(),
      date: today.date,
      operating_mode: 'bizimhesap_read_only_user_manual_entry',
      financial_writes: false,
      reporting: {
        status: today.source_availability?.health && today.source_health.length ? 'source_backed' : 'degraded',
        source_health: today.source_health,
        source_availability: today.source_availability,
        top_priorities: today.priorities,
        open_item_count: today.items.length,
        provenance: 'Memory OS / Today Engine'
      },
      notifications: {
        status: 'candidates_only',
        delivery_enabled: false,
        candidates: alerts,
        duplicate_key_rule: 'date + canonical item id'
      },
      procurement: {
        status: procurement.available ? 'source_backed_partial' : 'source_unavailable',
        open_commitments: procurement.available ? procurement.rows.map(row => ({
          ...row,
          provenance: [row.evidence_ref || row.source_ref].filter(Boolean),
          verified_current: row.truth_state === 'confirmed'
        })) : null,
        pending_diaper_orders: diaperOrders.available ? diaperOrders.rows.map(row => ({
          ...row, provenance: `diaper_orders:${row.order_key}`
        })) : null,
        diaper_order_source_available: diaperOrders.available
      },
      marketing: {
        status: marketing.available ? (marketingRows.length ? 'work_items_only_unverified_crm' : 'no_verified_crm_source') : 'source_unavailable',
        open_actions: marketing.available ? marketingRows.map(row => ({
          ...row, provenance: `work_items:${row.work_key}`
        })) : null,
        campaigns_sent: null,
        note: 'No campaign or outreach is sent by this report.'
      },
      read_only: true
    });
  } catch {
    return json({ ok: false, error: 'operations_report_unavailable' }, 503);
  }
}
