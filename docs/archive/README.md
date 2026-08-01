# Archive index — 2026-07-31 documentation consolidation

56+ markdown files that used to sit in `docs/` and the repo root were
consolidated into 11 active files in `docs/` on 2026-07-31 (see
`docs/START_HERE.md` for the active reading list). Nothing was deleted —
every file below is preserved here verbatim (or, for the three files whose
path was reused by a new target file, reconstructed byte-for-byte from git
history at the time of consolidation). Full git history is also intact via
normal `git log`.

Format: `archived file` → absorbed into `target file` (one-line note).

## Bootstrap / session protocol

- `START_HERE.md` (docs/, reconstructed original) → `docs/START_HERE.md`
- `CHATGPT_CONTINUITY_PROTOCOL.md` → `docs/START_HERE.md` (handoff message) + `docs/ARCHITECTURE.md` (branch strategy) + `docs/AI_SESSION_PROTOCOL.md` (handoff template)
- `CODEX_MASTER_PROMPT_APERION.md` → `docs/AI_SESSION_PROTOCOL.md` (base document)
- `CODEX_HANDOFF_TELEGRAM_FIRST.md` → `docs/AI_SESSION_PROTOCOL.md` §6 + `docs/ARCHITECTURE.md` §3.2
- `CODEX_PROMPT_TELEGRAM_PRIMARY_CHANNEL.md` → `docs/AI_SESSION_PROTOCOL.md` §6
- `SESSION_STATE.md` → superseded by `docs/CURRENT_STATUS.md` (2026-07-08 snapshot, stale)
- `NEXT_ACTION.md` → superseded by `docs/CURRENT_STATUS.md`; Moka/KMH rule content moved to `docs/OPERATIONS_RULES.md` §1.4
- `EXECUTION_QUEUE.md` → superseded by `docs/CURRENT_STATUS.md` / `docs/VISION_AND_ROADMAP.md` (2026-07-08 priority queue, stale)
- `REPO_AUDIT_2026-07-08.md` → the original (never-enforced) consolidation attempt; historical record only, superseded by this 2026-07-31 consolidation

## Vision / roadmap

- `VISION.md` → `docs/VISION_AND_ROADMAP.md` §1
- `ROADMAP.md` → `docs/VISION_AND_ROADMAP.md` §2
- `APERION_ERP_UST_AKIL_KAPSAM.md` → `docs/VISION_AND_ROADMAP.md` §1, §3.4
- `APERION_CFO_MODUL_PLANI.md` → `docs/VISION_AND_ROADMAP.md` §3.1
- `APERION_ANALIZ_RAPOR_GEREKSINIMLERI.md` → `docs/VISION_AND_ROADMAP.md` §3.2
- `APERION_ISTEKLER_VE_GORSELLER.md` → `docs/VISION_AND_ROADMAP.md` §3.3 (screenshot/temp-file references dropped, substantive asks kept)
- `YAPILACAKLAR.md` → `docs/VISION_AND_ROADMAP.md` §3.5

## Architecture / operating model / deployment

- `ARCHITECTURE.md` (docs/, reconstructed original) → `docs/ARCHITECTURE.md` §2
- `OPERATING_MODEL.md` → `docs/ARCHITECTURE.md` §3
- `DEPLOYMENT_MODEL.md` → `docs/ARCHITECTURE.md` §4 (stale "Cloudflare not live" framing corrected)
- `ALWAYS_ON_ASSISTANT_MODEL.md` → `docs/ARCHITECTURE.md` §5

## Data model / standards

- `DATABASE.md` → `docs/DATA_MODEL_AND_STANDARDS.md` §2-3
- `MASTER_DATA_CARD_SCHEMA.md` → `docs/DATA_MODEL_AND_STANDARDS.md` §4
- `FINANCIAL_DATA_STANDARDS.md` → `docs/DATA_MODEL_AND_STANDARDS.md` §5
- `DOCUMENT_ARCHIVE_AND_RETRIEVAL_PROMPT.md` → `docs/DATA_MODEL_AND_STANDARDS.md` §6
- `bizimhesap_b2b_api_notlari.md` → `docs/DATA_MODEL_AND_STANDARDS.md` Ek A (appendix)

## Operations rules (safety-critical)

- `BANK_RULES.md` → `docs/OPERATIONS_RULES.md` §1
- `BIZIMHESAP_RULES.md` → `docs/OPERATIONS_RULES.md` §2
- `GMAIL_RULES.md` → `docs/OPERATIONS_RULES.md` §3
- `TELEGRAM_RULES.md` → `docs/OPERATIONS_RULES.md` §4
- `AUTOMATION_RULES.md` → `docs/OPERATIONS_RULES.md` §5
- `EXPENSE_CLASSIFICATION_RULES.md` → `docs/OPERATIONS_RULES.md` §6
- `PERSONAL_FINANCE_RULES.md` → `docs/OPERATIONS_RULES.md` §7
- `APERION_MAIL_EKSTRE_OTOMASYON_PLANI_v1.md` → `docs/OPERATIONS_RULES.md` §3.8 (Gmail query syntax + pending schema)
- `APERION_MAIL_AUTOMATION_FINAL_ROUTE_v1.md` → superseded by / duplicate of the above; nothing unique beyond what's in §3.8
- `MAIL_EKSTRE_TEST_KAPISI_v1.md` → `docs/OPERATIONS_RULES.md` §3.9 (open test checklist)
- `ALAYLI_AUTOPAY_INVENTORY.md` → `docs/OPERATIONS_RULES.md` §8.1 (known accounts reference)
- `ALAYLI_GARANTI_ACCOUNT.md` → `docs/OPERATIONS_RULES.md` §8.2 (known accounts reference)
- `BIZIMHESAP_UCTAN_UCA_DENETIM_2026-07-13.md` → open finding folded into `docs/OPERATIONS_RULES.md` §9 (masraf_raw RLS issue, unresolved status flagged)

## UI / dashboard

- `UI_STANDARDS.md` → `docs/UI_AND_DASHBOARD.md`
- `DASHBOARD_BLUEPRINT.md` → `docs/UI_AND_DASHBOARD.md` (base document)

## Quick capture / notifications

- `QUICK_CAPTURE_SYSTEM.md` → `docs/QUICK_CAPTURE_AND_NOTIFICATIONS.md` §1
- `QUICK_NOTE_API_CONTRACT.md` → `docs/QUICK_CAPTURE_AND_NOTIFICATIONS.md` §2
- `NOTIFICATION_CONFIRMATION_MODEL.md` → `docs/QUICK_CAPTURE_AND_NOTIFICATIONS.md` §3

## Changelog / decisions / status

- `CHANGELOG.md` (docs/, reconstructed original, single 2026-07-08 entry) → `docs/CHANGELOG.md` (appended as the last/oldest entry)
- `CHANGELOG_APERION.md` (root, 767 lines) → `docs/CHANGELOG.md` (base document)
- `QA_CHECKLIST.md` (root) → checkbox items folded inline under matching dated entries in `docs/CHANGELOG.md`; generic standing checklists moved to `docs/CHANGELOG.md`'s "Kalıcı QA kontrol listeleri" section
- `DECISIONS.md` (root) → relocated to `docs/DECISIONS.md`; the D-008 through D-017 numbering collisions (nine of them, not just the one D-017 collision originally noticed) were fixed by renumbering the second occurrence of each to D-019 through D-027
- `PROJECT_STATUS.md` (root, 2026-07-29) → superseded by `docs/CURRENT_STATUS.md` (2026-07-31, more recent); relevant still-open items folded into `docs/VISION_AND_ROADMAP.md`
- `NEXT_TASK.md` (root, 2026-07-29) → superseded by `docs/CURRENT_STATUS.md`

## Archived but uncertain whether truly dead — user should sanity-check

These describe a "Finans Komuta Merkezi" HTML module family
(`finans-komuta-merkezi.html`, `finance-command-center-live.html`,
`finance-command-center.html`, `aperion-finans-takvimi.html`, etc.) that is
separate from the current canonical live screen (`aperion-ust-akil.html`).
They may be dead legacy modules, or a still-used secondary module — this
was **not** confirmed with the user before archiving, per the original
audit's flag. Nothing was deleted; if still needed, un-archive by moving
back and treating as a proper active doc.

- `FINANCE_SETUP.md`
- `APERION_FINANCE_CHANGELOG.md`
- `NEXT_ACTIONS_FINANCE.md`
- `APERION_FINANS_INTEGRATION_NOTES.md`
- `BIZIMHESAP_KLONU_CANLI_ISLEYIS.md` (describes an old `ErpaltH` desktop-folder BizimHesap clone task setup — may be fully superseded by the current hourly GitHub Actions sync, or may still describe the real local Windows task; unconfirmed)
- `LIVE_RELEASES.md` (rollback map references a stale root target `/aperion-home.html` that contradicts the confirmed-live `aperion-ust-akil.html` chain — likely stale, not confirmed dead)
- `SUPABASE_GUVENLIK_RAPORU_DEGERLENDIRME.md` (one-off report from 2026-07-04, largely superseded by the 2026-07-31 live security re-verification, kept for historical detail)
- `aperion_is_programi.md` (task checklist, superseded by `docs/CURRENT_STATUS.md` and `docs/CHANGELOG.md`, but not explicitly confirmed dead)
