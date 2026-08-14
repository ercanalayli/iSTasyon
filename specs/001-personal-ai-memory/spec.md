# APERION-001 — Personal AI Memory and Context Engine

**Status:** Approved for foundation implementation  
**Date:** 2026-08-14

## Outcome

When the user says “devam et”, “aynı müşteri”, or “önceki fiyat”, AperiON resolves
the relevant project, entity, decision, open work, and evidence instead of treating
the message as an isolated prompt.

## User scenarios

1. After a new session, “devam et” resumes the latest open, relevant work with its
   last verified state and next action.
2. “Geçen ay konuştuğumuz nakliye fiyatı” returns the temporally correct record,
   its source, and whether it is still valid.
3. A durable business rule is recalled across sessions; casual chat is not promoted.
4. A newer fact supersedes an older fact without deleting history.
5. A tool action routes to the correct connector and pauses for required approval.
6. The system can explain which memories and evidence were used for a response.

## Memory model

- Working memory: active objective, entities, pending decision, next action.
- Recent conversation: bounded recent turns, not the entire archive.
- Long-term memory: preferences, business rules, and stable entity facts.
- Episodic memory: dated events, decisions, actions, and outcomes.
- Knowledge store: documents, messages, records, and their evidence references.
- Current state: the presently valid fact with observed time and expiry.

## Functional requirements

- FR-001: Maintain conversation threads and ordered turns with source identifiers.
- FR-002: Store working-state snapshots separately from message text.
- FR-003: Classify memory as transient, preference, business_rule, entity_fact,
  episode, outcome, or superseding_fact before promotion.
- FR-004: Durable memory must include provenance, confidence, privacy class,
  validity dates, and active/superseded/revoked status.
- FR-005: Store relationships among entities, objectives, commitments, memories,
  documents, and events without requiring a graph database.
- FR-006: Recall supports semantic score, metadata, time, entity, objective, validity,
  and source-health filters.
- FR-007: Record candidates considered, selected context, reason, and latency.
- FR-008: Current-state facts must never be inferred from stale source data without
  an explicit stale truth state.
- FR-009: Tool routing uses connector capabilities and approval policies.
- FR-010: Context assembly is token-bounded and includes only necessary evidence.
- FR-011: Secrets and authentication material are rejected from durable memory.
- FR-012: Consequential action completion requires action-log read-back evidence.
- FR-013: Duplicate messages, memories, and actions are blocked by stable keys.
- FR-014: Ambiguous entity roles, especially customer versus supplier cari, require
  clarification or an explicit verified rule.

## Acceptance criteria

- A session can be resumed from a checkpoint without replaying full chat history.
- Every durable memory is queryable by type, entity/objective, validity, and source.
- Superseded facts remain auditable but are excluded from current-context defaults.
- Every assembled context has a reproducible manifest of selected items.
- A “devam et” test resolves the most recent relevant open work item and next action.
- No test fixture containing password/OTP/CVV is accepted as durable memory.
- Write flows remain approval-gated, idempotent, logged, and read-back verified.

## Non-goals for this slice

- Training a foundation model, RLHF, MoE, FlashAttention, RoPE, or KV-cache work.
- Deploying a standalone graph database before relationship queries demonstrate need.
- Autonomous agent-to-agent delegation before three independent agents have stable
  contracts, observability, and measured coordination demand.
- Storing every conversation forever.

## Success measures

- Reference-resolution accuracy >= 90% on a curated Turkish test set.
- Correct-memory precision >= 95% for business rules and current facts.
- Zero secret-promotion and zero unapproved consequential writes.
- 100% of completed consequential actions have verification evidence.
- P95 context assembly under 2 seconds excluding external connector latency.

