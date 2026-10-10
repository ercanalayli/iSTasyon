# Cross-chat AperiON bootstrap — 2026-10-10

**Primary instruction for any new task from a ChatGPT/Codex/agent session:** Do not ask the user to repeat past decisions, prices, or records until the existing sources have been checked. ChatGPT's own memory is a retrieval helper, **not** an exhaustive or authoritative transcript archive. No worker, repository instruction, or connector can force an unrelated new ChatGPT conversation to open this file automatically; never claim otherwise.

**Shared ChatGPT + Gemini entry document (Google Drive, owner-only):** https://docs.google.com/document/d/1FXjgBKSW5WyGVu-RqNthgVJ1KWrmx54o8Kh-9UMecO4/edit — a navigation/instruction document, **not** an independent memory copy. Add it and the canonical sheet as knowledge/project sources in each assistant's own UI; these per-product settings have not been confirmed connected.

**Single canonical cross-session source (not a new database):** Google Sheets [Apeiron Kontrol Merkezi](https://docs.google.com/spreadsheets/d/155hZ1PRVKH-vlztPY99LnaGEuX5wq8ebNgoiCgcHdmc/edit), in this exact order:
1. `CONTEXT_FAST` gid `2041898444`: inspect row **2** (`aperion-global-crosschat-canonical-20261010`), then only rows relevant to the user's current subject. Row 2 is the global checkpoint, not proof that all the original conversations were migrated.
2. `KURALLAR`: active explicit business rules and later user corrections.
3. `OTURUM_HAFIZASI`: scoped project checkpoint and next action.
4. `A1_SNAPSHOT` gid `522523951` **only** for the actual Hasta Bezi/A1 context; latest inspected version `A1-20261008-v3`, `AUDIT_LOCKED`. Never confuse it with the generic finance A1 or invent a newer version.
5. Resolve referenced originals via connected Drive, BizimHesap read-only API, and this GitHub repository. Source-of-truth order: confirmed live source -> later explicit user correction -> dated approved source -> derived summary. When records disagree, record the disagreement and do not silently pick a number.

**As of 2026-10-10:** Live Drive read of `CONTEXT_FAST` row 2 and `OTURUM_HAFIZASI` succeeded, and cross-conversation ChatGPT history retrieval returned the user's 2026-09-26 standing direction to continue projects without re-copying. These checks demonstrate *retrieval*, **not** that every chat turn is auto-synced to D1 or available in every future session. Protected D1 session-bootstrap requires `APERION_BRIDGE_SECRET`; do not expose this credential or make that endpoint public. Prior D1 snapshot 2026-09-14 (725 facts, 28 decisions, 11 sources) is **stale**.

**Milestone capture:** Preserve original source URL, scoped subject, timestamp, user-vs-document authority, decision/action, result (confirmed/blocked/partial), and next step. Update the **existing** checkpoint/writer pipeline rather than creating a competing memory store. In ChatGPT contexts where the bridge cannot authenticate, use connected Google Sheets and update existing `CONTEXT_FAST`/`OTURUM_HAFIZASI` only when an authorized write tool is available; otherwise report that durable remote write was not verified. No copy/paste, Work/Codex credit, or paid service should be needed for day-to-day ChatGPT use.

**Important October outcomes:** Existing `CONTEXT_FAST` records BizimHesap B2B read methods, a user-approved 1 TL test invoice (GUID `14A652F2FD1F4432910BC799E02F0AB7`) whose recorded total was not independently read back, a test customer and product, blocked invoice cancellation, and an **unposted** 500 TL Akaryakıt expense. Hasta Bezi Mayıs and Ağustos Kardağ price lists are on Drive; never assume Mayıs is the Ağustos price. Every real ERP change requires action-scoped approval and independent read-back.

---

# ApeirON daily production contract

Canonical workspace: `C:\AperiON\iSTasyon`. Preserve the working Codex Remote / Computer Use / BizimHesap line; AI-0646 is a real, read-back-verified acceptance result. Development must not alter BizimHesap or other financial records.

September 17, 2026 standing instruction suspended ApeirON/Codex BizimHesap writes. On October 10, 2026 the user explicitly approved **narrow 1 TL real API tests only**: a test invoice, product, customer and cancellation of the test invoice. The test product and API invoice GUID were created; cancellation **did not execute**. This exception is not an indefinite approval, does not authorize posting unrelated pending orders, and does not authorize 500 TL Akaryakıt through an invoice endpoint. All new real financial writes still require an explicit action-specific approval, source validation, duplicate guard, and read-back. Any legacy broader suspension applies to unapproved actions.

When a new real user job arrives, do it first. Then verify it against the primary system, ingest the important result into Memory OS with provenance, record a reusable rule or skill candidate if warranted, and only then resume development. Never treat a success toast or chat history as proof. Financial writes require the user's action-time approval.

For every important Codex/Computer Use job, prepare a structured `codex_result_envelope` JSON under `.aperion-memory-outbox/` using `apply_patch`; the Stop hook auto-detects and retries it. Do not ingest chat/transcript text. Required envelope fields: execution_id, task_type, occurred_at, scope, company, source=`codex_computer_use`, user_intent_summary, action_summary, result_status, verification_status, entities, artifacts, document_refs, external_record_refs, learned_rule_candidates, provenance, idempotency_key. Use `completed_verified` / `read_back_verified` only after actual primary-system read-back. Failed/cancelled jobs may be logged but yield no success fact. Run `node tools/ingest_codex_result.mjs <envelope-file>` when an immediate independent ledger read-back is needed; the Stop hook handles any pending envelope. Do not fabricate proof or store raw UI dumps, cookies, or secrets. Ask what durable thing to learn; `NONE` is valid. Existing legacy verified-event outbox entries remain supported.

For durable facts and rules, retain source authority, confidence, freshness, validity dates, scope, and provenance. Prefer explicit user correction and verified primary records. Conflicting newer facts supersede old rows; never erase history. After a durable write, run an independent new-process Memory OS retrieval test before marking `durable_memory_verified=true`.

Use Google Drive change cursors and content hashes; unchanged runs must not rescan or infer. A separate read-only content grant is available for supported documents. Free-form extracted statements must be candidates awaiting corroboration/review, not automatic durable facts. Never persist passwords, tokens, OTPs, or secret-bearing content as durable facts.

Mark a successful, repeatable operation as a skill candidate rather than silently treating one example as a general rule. Current candidate: `BizimHesap.GiderKaydet`, grounded in AI-0646 and its live read-back.
