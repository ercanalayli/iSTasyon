-- AperiON A2 · POSTGRES DESIGN PROPOSAL ONLY (DO NOT AUTO-APPLY)
-- Not deployed; does not authorize or execute any BizimHesap POST.
-- D1 uses SQLite: do NOT apply this Postgres SQL to D1.
-- Requires independent owner-authenticated application review.
BEGIN;

CREATE TABLE IF NOT EXISTS public.aperion_a2_sale_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_key text NOT NULL CHECK (length(company_key) BETWEEN 2 AND 100),
  source_id text NOT NULL CHECK (length(source_id) BETWEEN 2 AND 120),
  proposal_sha256 text NOT NULL CHECK (proposal_sha256 ~ '^[a-f0-9]{64}$'),
  expected_amount_kurus bigint NOT NULL CHECK (expected_amount_kurus > 0),
  status text NOT NULL DEFAULT 'PREPARED' CHECK (
    status IN ('PREPARED','APPROVED','POSTING','POSTED_UNVERIFIED',
               'OUTCOME_UNKNOWN','VERIFIED','BLOCKED','REJECTED')
  ),
  owner_user_id uuid,
  approved_at timestamptz,
  approval_expires_at timestamptz,
  approved_proposal_sha256 text CHECK (
    approved_proposal_sha256 IS NULL OR approved_proposal_sha256 ~ '^[a-f0-9]{64}$'
  ),
  claimed_at timestamptz,
  erp_document_guid text CHECK (
    erp_document_guid IS NULL OR erp_document_guid ~* '^[a-f0-9]{32}$'
  ),
  verified_at timestamptz,
  audit_evidence_ref text,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT a2_unique_company_source UNIQUE(company_key,source_id),
  CONSTRAINT a2_approved_payload_binding CHECK (
    status NOT IN ('APPROVED','POSTING','POSTED_UNVERIFIED','VERIFIED')
    OR (
      owner_user_id IS NOT NULL
      AND approved_at IS NOT NULL
      AND approval_expires_at IS NOT NULL
      AND approved_proposal_sha256=proposal_sha256
    )
  )
);

-- Makes duplicate provider references visible, not a substitute for checking
-- the ERP for previously created records outside this table.
CREATE UNIQUE INDEX IF NOT EXISTS a2_unique_company_erp_guid
ON public.aperion_a2_sale_intents(company_key,erp_document_guid)
WHERE erp_document_guid IS NOT NULL;

-- No direct client read/write. Only a separately authorized application backend
-- may read or write after verifying owner session + scope + company membership.
ALTER TABLE public.aperion_a2_sale_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.aperion_a2_sale_intents FROM anon,authenticated;
-- NO permissive RLS policies; NO RPC; NO scheduler; NO POST adapter.

-- SQL skeleton, to execute ONLY inside a separately reviewed backend:
-- UPDATE public.aperion_a2_sale_intents
--    SET status='POSTING',claimed_at=now(),updated_at=now()
--  WHERE company_key=:trusted_company_key
--    AND source_id=:source_id
--    AND proposal_sha256=:trusted_proposal_sha256
--    AND status='APPROVED'
--    AND approved_proposal_sha256=proposal_sha256
--    AND approval_expires_at>now()
-- RETURNING id;
-- An empty RETURNING result MUST terminate, never issue a vendor POST.
-- Check current ERP duplicates BEFORE considering a first POST.
-- If a vendor HTTP call has an unknown outcome, mark OUTCOME_UNKNOWN,
-- reconcile from the ERP, and NEVER automatically retry.
-- Do not claim success until independent line-level readback.

COMMIT;
