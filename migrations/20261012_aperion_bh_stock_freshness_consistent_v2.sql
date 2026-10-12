-- AperiON read-only stock source health alignment.
-- Existing inventory APIs refresh approximately every 120 minutes; the
-- current public source freshness view allows 180 minutes. Use the SAME
-- public source freshness contract for Telegram /stok instead of the
-- unrelated 45-minute private operational view.
-- No supplier ERP writes, no snapshot edits, no new permissions.
BEGIN;
CREATE OR REPLACE VIEW public.aperion_bh_inventory_search_v1
WITH (security_barrier = true) AS
SELECT
  split_part(s.source_type, ':', 2) AS warehouse_id,
  nullif(btrim(item.value->>'id'), '') AS product_id,
  nullif(btrim(item.value->>'title'), '') AS title,
  nullif(btrim(item.value->>'barcode'), '') AS barcode,
  CASE WHEN coalesce(item.value->>'qty','') ~ '^-?[0-9]+([.][0-9]+)?$'
    THEN (item.value->>'qty')::numeric ELSE NULL::numeric END AS qty,
  f.last_success_at,
  CASE WHEN f.source_kind='API_MIRROR'
      AND f.connection_status='OK'
      AND f.freshness='FRESH'
      AND f.last_success_at IS NOT NULL
      AND f.last_success_at >= now() - interval '180 minutes'
      AND s.checked_at IS NOT NULL
      AND s.checked_at >= now() - interval '180 minutes'
    THEN 'FRESH'::text ELSE 'STALE'::text END AS source_health,
  s.checked_at AS mirror_checked_at
FROM aperion_internal.bh_mirror_snapshots AS s
CROSS JOIN LATERAL jsonb_array_elements(s.payload) AS item(value)
LEFT JOIN public.aperion_bh_freshness_v3 AS f ON f.source=s.source_type
WHERE s.source_type LIKE 'inventory:%' AND jsonb_typeof(s.payload)='array';

-- Restore explicit least-privilege grant even if Supabase adds default grants
-- to newly materialized views; this is a SELECT-only read API for server use.
REVOKE ALL PRIVILEGES ON public.aperion_bh_inventory_search_v1 FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.aperion_bh_inventory_search_v1 TO service_role;
COMMIT;

-- Acceptance by independent query:
-- a) inventory: source_health matches aperion_bh_freshness_v3 only while
--    both the source and the snapshot are < 180 minutes old.
-- b) no anon/authenticated SELECT, service_role SELECT only.
-- c) qty=NULL remains unknown; never coalesce to zero.
