-- Metadata-only, server-written Telegram cari reader diagnostics.
-- Contains NO customer identifier, amounts, source raw JSON or credentials.
BEGIN;
CREATE TABLE IF NOT EXISTS public.aperion_owner_cari_schema_evidence_v1 (
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  observed_at timestamptz NOT NULL DEFAULT now(),
  classification text NOT NULL
    CHECK (classification IN ('ROWS','EMPTY','UNSUPPORTED','OVERFLOW')),
  key_shape_hints text[] NOT NULL
    CHECK (cardinality(key_shape_hints) <= 12),
  source text NOT NULL DEFAULT 'telegram_owner_private'
    CHECK (source='telegram_owner_private')
);
ALTER TABLE public.aperion_owner_cari_schema_evidence_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.aperion_owner_cari_schema_evidence_v1
  FROM PUBLIC, anon, authenticated, service_role;
GRANT INSERT ON public.aperion_owner_cari_schema_evidence_v1 TO service_role;
REVOKE ALL ON SEQUENCE public.aperion_owner_cari_schema_evidence_v1_event_id_seq
  FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SEQUENCE public.aperion_owner_cari_schema_evidence_v1_event_id_seq TO service_role;
COMMIT;
