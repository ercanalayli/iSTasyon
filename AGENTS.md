# ApeirON daily production contract

Canonical workspace: `C:\AperiON\iSTasyon`. Preserve the working Codex Remote / Computer Use / BizimHesap line; AI-0646 is a real, read-back-verified acceptance result. Development must not alter BizimHesap or other financial records.

When a new real user job arrives, do it first. Then verify it against the primary system, ingest the important result into Memory OS with provenance, record a reusable rule or skill candidate if warranted, and only then resume development. Never treat a success toast or chat history as proof. Financial writes require the user's action-time approval.

For every important Codex/Computer Use job, prepare a structured `codex_result_envelope` JSON under `.aperion-memory-outbox/` using `apply_patch`; the Stop hook auto-detects and retries it. Do not ingest chat/transcript text. Required envelope fields: execution_id, task_type, occurred_at, scope, company, source=`codex_computer_use`, user_intent_summary, action_summary, result_status, verification_status, entities, artifacts, document_refs, external_record_refs, learned_rule_candidates, provenance, idempotency_key. Use `completed_verified` / `read_back_verified` only after actual primary-system read-back. Failed/cancelled jobs may be logged but yield no success fact. Run `node tools/ingest_codex_result.mjs <envelope-file>` when an immediate independent ledger read-back is needed; the Stop hook handles any pending envelope. Do not fabricate proof or store raw UI dumps, cookies, or secrets. Ask what durable thing to learn; `NONE` is valid. Existing legacy verified-event outbox entries remain supported.

For durable facts and rules, retain source authority, confidence, freshness, validity dates, scope, and provenance. Prefer explicit user correction and verified primary records. Conflicting newer facts supersede old rows; never erase history. After a durable write, run an independent new-process Memory OS retrieval test before marking `durable_memory_verified=true`.

Use Google Drive change cursors and content hashes; unchanged runs must not rescan or infer. A separate read-only content grant is available for supported documents. Free-form extracted statements must be candidates awaiting corroboration/review, not automatic durable facts. Never persist passwords, tokens, OTPs, or secret-bearing content as durable facts.

Mark a successful, repeatable operation as a skill candidate rather than silently treating one example as a general rule. Current candidate: `BizimHesap.GiderKaydet`, grounded in AI-0646 and its live read-back.
