# AperiON session bootstrap

At the start of a new AperiON session, read:

`https://aperion-istasyon.pages.dev/api/session-bootstrap`

The endpoint contains private operational state and requires `Authorization: Bearer <APERION_BRIDGE_SECRET>`. If that credential is unavailable to the current client, use the connected Google Drive sources `AperiON Kontrol Merkezi` and `AperiON Master Vizyon ve İşletim Anayasası` as the trusted fallback; never make the bootstrap public merely for convenience.

Then:

1. Verify source health before interpreting business or personal data.
2. Separate confirmed, stale, missing, estimated, and blocked facts.
3. Continue from `last_checkpoint.next_action` when it remains valid.
4. Reconcile the checkpoint against current objectives, commitments, approvals, and work items.
5. Present a concise startup brief and begin the highest-value safe action.
6. Never rely on chat history as the only memory.

At every material milestone and before deliberately starting a new chat, write one structured checkpoint to:

`POST https://aperion-istasyon.pages.dev/api/session-checkpoint`

For durable user-confirmed changes, also use:

`POST https://aperion-istasyon.pages.dev/api/conversation-memory-writer`

The Conversation Memory Writer accepts only structured important changes (facts, decisions, durable memory, compact working state). It records source/conversation/session/turn provenance, hashes, supersede history and a memory event. User corrections supersede older facts without deleting history. Secret-like material is rejected. This endpoint performs no financial write.

New sessions use `/api/session-bootstrap` v3. It returns the latest checkpoint/working state plus durable memories, active project facts, active decisions, recent memory events and recent conversation sources. Raw chat remains excluded by default (`raw_chat_loaded=false`).

Store only summary, completed work, pending work, blockers, next action, evidence references and structured durable changes. Never store raw passwords, OTP/CVV values, tokens, or the entire chat transcript. The bootstrap endpoint loads at most the relevant structured state; the context assembler keeps only the latest eight turns.

Platform note: if a ChatGPT surface cannot call the protected writer/bootstrap endpoints automatically, report `BLOCKED_PLATFORM_ACCESS` and use the connected Google Drive fallback. Do not make the memory endpoints public to work around the limitation.

The Google Apps Script bridge runs `aperionDailyMaintenance` at 08:30 Europe/Istanbul and writes one idempotent portable JSON backup per day under `03_SISTEM_YEDEKLERI` in the configured AperiON Drive root.

