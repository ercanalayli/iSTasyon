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

Store only summary, completed work, pending work, blockers, next action, and evidence references. Never store raw passwords, OTP/CVV values, tokens, or the entire chat transcript. The bootstrap endpoint loads at most the relevant structured state; the context assembler keeps only the latest eight turns.

The Google Apps Script bridge runs `aperionDailyMaintenance` at 08:30 Europe/Istanbul and writes one idempotent portable JSON backup per day under `03_SISTEM_YEDEKLERI` in the configured AperiON Drive root.

