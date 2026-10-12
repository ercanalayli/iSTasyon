-- AperiON: server-only, name-based BizimHesap customer resolver for
-- owner-verified, private Telegram READ requests. NO source data changes.
BEGIN;
CREATE OR REPLACE VIEW public.aperion_bh_customer_owner_lookup_v1
WITH (security_barrier = true) AS
SELECT
  r.source_id AS customer_id,
  nullif(btrim(r.payload->>'title'),'') AS title,
  f.last_success_at,
  CASE WHEN f.source_kind='API_MIRROR'
      AND f.connection_status='OK'
      AND f.freshness='FRESH'
      AND f.last_success_at IS NOT NULL
      AND f.last_success_at >= now()-interval '180 minutes'
    THEN 'FRESH'::text ELSE 'STALE'::text END AS source_health
FROM aperion_internal.bh_mirror_records AS r
JOIN public.aperion_bh_freshness_v3 AS f ON f.source=r.source_type
WHERE r.source_type='customers'
  AND r.source_id ~ '^[A-Fa-f0-9]{32}$'
  AND nullif(btrim(r.payload->>'title'),'') IS NOT NULL;
REVOKE ALL PRIVILEGES ON public.aperion_bh_customer_owner_lookup_v1
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.aperion_bh_customer_owner_lookup_v1 TO service_role;
COMMIT;
-- Acceptance: 5784 source IDs, no anon/authenticated access; stop on
-- stale source, zero or multiple matches. This view is NOT an account ledger.
