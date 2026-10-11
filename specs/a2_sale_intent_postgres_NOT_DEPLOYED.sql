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

-- Defense in depth for the eventual separately authorized application:
-- database prevents changing transaction identity or replaying an approval.
CREATE OR REPLACE FUNCTION public.aperion_a2_intent_guard_v1()
RETURNS trigger LANGUAGE plpgsql AS $a2guard$
DECLARE allowed boolean := false;
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.status <> 'PREPARED' THEN
      RAISE EXCEPTION 'sale_intent_must_start_prepared';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.company_key IS DISTINCT FROM OLD.company_key
     OR NEW.source_id IS DISTINCT FROM OLD.source_id
     OR NEW.proposal_sha256 IS DISTINCT FROM OLD.proposal_sha256
     OR NEW.expected_amount_kurus IS DISTINCT FROM OLD.expected_amount_kurus THEN
    RAISE EXCEPTION 'sale_intent_identity_immutable';
  END IF;
  IF OLD.status <> 'PREPARED'
     AND (NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.approval_expires_at IS DISTINCT FROM OLD.approval_expires_at
       OR NEW.approved_proposal_sha256 IS DISTINCT FROM OLD.approved_proposal_sha256) THEN
    RAISE EXCEPTION 'sale_approval_immutable';
  END IF;
  IF OLD.erp_document_guid IS NOT NULL
     AND NEW.erp_document_guid IS DISTINCT FROM OLD.erp_document_guid THEN
    RAISE EXCEPTION 'erp_guid_immutable';
  END IF;

  IF OLD.status <> NEW.status THEN
    allowed := CASE OLD.status
      WHEN 'PREPARED' THEN NEW.status IN ('APPROVED','BLOCKED','REJECTED')
      WHEN 'APPROVED' THEN NEW.status IN ('POSTING','BLOCKED','REJECTED')
      WHEN 'POSTING' THEN NEW.status IN ('POSTED_UNVERIFIED','OUTCOME_UNKNOWN','BLOCKED')
      WHEN 'OUTCOME_UNKNOWN' THEN NEW.status IN ('POSTED_UNVERIFIED','BLOCKED')
      WHEN 'POSTED_UNVERIFIED' THEN NEW.status IN ('VERIFIED','BLOCKED')
      ELSE false END;
    IF NOT allowed THEN RAISE EXCEPTION 'sale_illegal_status_transition'; END IF;
  END IF;
  IF NEW.status='POSTING' AND OLD.status='APPROVED'
     AND (OLD.approval_expires_at<=now() OR OLD.approved_proposal_sha256<>OLD.proposal_sha256) THEN
    RAISE EXCEPTION 'sale_approval_invalid_or_expired';
  END IF;
  IF NEW.status='VERIFIED' AND (NEW.erp_document_guid IS NULL
       OR NEW.verified_at IS NULL OR NEW.audit_evidence_ref IS NULL) THEN
    RAISE EXCEPTION 'sale_readback_evidence_required';
  END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END;
$a2guard$;

DROP TRIGGER IF EXISTS aperion_a2_intent_guard_on_write ON public.aperion_a2_sale_intents;
CREATE TRIGGER aperion_a2_intent_guard_on_write
BEFORE INSERT OR UPDATE ON public.aperion_a2_sale_intents
FOR EACH ROW EXECUTE FUNCTION public.aperion_a2_intent_guard_v1();

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
