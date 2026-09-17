# ApeirON daily production contract

Canonical workspace: `C:\AperiON\iSTasyon`. Preserve the working Codex Remote / Computer Use / BizimHesap line; AI-0646 is a real, read-back-verified acceptance result. Development must not alter BizimHesap or other financial records.

When a new real user job arrives, do it first. Then verify it against the primary system, ingest the important result into Memory OS with provenance, record a reusable rule or skill candidate if warranted, and only then resume development. Never treat a success toast or chat history as proof. Financial writes require the user's action-time approval.

For every important completed job, capture `TASK → RESULT → VERIFICATION → EVENT` using the authenticated ApeirON memory ingress. Supply a stable task ID, source reference, observed time, scope, result, verification method, and provenance. Only use `completed_verified` / `read_back_verified` after an actual external read-back. Write the verified event JSON with `apply_patch` under `.aperion-memory-outbox/`, then run `node tools/ingest_codex_result.mjs <event-file>` before reporting success; the Codex Stop hook retries any pending outbox record. Both perform an independent ledger read-back. If proof is missing, keep the result unverified and say so. Do not make up source evidence.

For durable facts and rules, retain source authority, confidence, freshness, validity dates, scope, and provenance. Prefer explicit user correction and verified primary records. Conflicting newer facts supersede old rows; never erase history. After a durable write, run an independent new-process Memory OS retrieval test before marking `durable_memory_verified=true`.

Use Google Drive change cursors and content hashes; unchanged runs must not rescan or infer. The current Google OAuth grant is metadata-only for Drive: do not claim document-content extraction or file-vault persistence until the missing access and read-back are genuinely established. Never persist passwords, tokens, OTPs, or secret-bearing content as durable facts.

Mark a successful, repeatable operation as a skill candidate rather than silently treating one example as a general rule. Current candidate: `BizimHesap.GiderKaydet`, grounded in AI-0646 and its live read-back.
