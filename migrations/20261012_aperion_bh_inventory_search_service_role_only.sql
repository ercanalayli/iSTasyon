-- AperiON /stok: authorized server-side read of existing BizimHesap API mirror.
-- REVIEW/DEPLOY SEPARATELY. No mutation of vendor ERP or mirror payloads.
-- Source: aperion_internal.bh_mirror_snapshots inventory:* (12 Oct 2026).
-- Do not expose inventory via anon/authenticated/public REST privileges.
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
  h.last_success_at,
  h.health AS source_health,
  s.checked_at AS mirror_checked_at
FROM aperion_internal.bh_mirror_snapshots AS s
CROSS JOIN LATERAL jsonb_array_elements(s.payload) AS item(value)
LEFT JOIN aperion_internal.bh_sync_health_v1 AS h ON h.source_type=s.source_type
WHERE s.source_type LIKE 'inventory:%' AND jsonb_typeof(s.payload)='array';

REVOKE ALL PRIVILEGES ON public.aperion_bh_inventory_search_v1 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.aperion_bh_inventory_search_v1 TO service_role;
COMMIT;

-- Deployment acceptance (read only):
-- SELECT source_health, count(*) FROM public.aperion_bh_inventory_search_v1 GROUP BY 1;
-- SELECT grantee,privilege_type FROM information_schema.role_table_grants
-- WHERE table_schema='public' AND table_name='aperion_bh_inventory_search_v1';
-- Client validation: anon REST query MUST return 401/403; service_role may query,
-- and /stok MUST reject a stale or unavailable source without stock_raw fallback.
