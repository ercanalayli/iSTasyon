# AperiON Development Constitution

**Version:** 1.0.0  
**Ratified:** 2026-08-14

## I. Evidence before confidence

No critical fact is presented as current unless it has a source, observation time,
truth state, and source-health result. Missing or stale data is shown explicitly;
it is never silently replaced by an estimate.

## II. One canonical identity, many roles

People, companies, accounts, documents, and commitments have one canonical
identity with aliases and source references. Customer and supplier roles remain
distinct attributes of the same entity. Role or cari selection must never be
guessed when it changes the accounting result.

## III. Selective, temporal memory

AperiON stores only useful memory. Every durable memory is classified as a
preference, business rule, entity fact, episode, outcome, or superseding fact;
it carries provenance, confidence, validity, privacy class, and status. Transient
chat is not promoted automatically. Passwords, OTPs, CVVs, recovery codes, and
authentication secrets are never memory.

## IV. State is not chat

Conversation text, workflow state, and current truth are separate. Actions use
an explicit lifecycle: observed, needs_review, approved, executing, verified,
completed, failed, or cancelled. “Done” requires read-back evidence.

## V. Human authority for consequential actions

External messages, financial postings, payments, deletions, and other
consequential writes require the configured approval at action time. Approval is
scoped to the exact target and payload; it is not a reusable blanket permission.

## VI. Idempotent, auditable execution

Every write has an idempotency key, evidence reference, actor, timestamp, result,
and verification rule. Retries must not create duplicates. Failures stop safely
and remain visible.

## VII. Spec before material implementation

Every material feature starts with a specification containing user scenarios,
functional requirements, acceptance criteria, edge cases, source-of-truth rules,
privacy, approval boundaries, and failure behavior. A technical plan and ordered
tasks follow. Code changes cite their spec and pass its checklist.

## VIII. Preserve working behavior

Existing working flows are inventoried before change. Each change has regression
checks and a rollback path. Production is not a testing environment, and generated
code is not deployed solely because an AI produced it.

## IX. Small context, strong recall

The model receives the smallest sufficient context: current turn, working state,
relevant recent turns, selected durable memories, live tool evidence, and task
rules. Recall is logged and evaluated; full conversation archives are not injected
by default.

## X. Challenge consequential decisions

Material architecture decisions record the thesis, strongest counterargument,
alternatives, failure conditions, confidence, and the smallest reversible test.
Fashion is not evidence: GraphRAG, multi-agent protocols, and new model machinery
are adopted only when simpler measured designs fail.

## Governance

This constitution outranks feature specifications. Amendments require a written
reason, migration impact, and version change. Pull requests must name the governing
spec, verification evidence, approval impact, and rollback method.

