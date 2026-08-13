# AperiON Finance and Accounting Module

This is one specialist module inside the broader AperiON Life and Company Operating System. It does not define or limit AperiON's full scope.

## North star

AperiON is the operating interface. BizimHesap remains the official accounting system. Cloudflare D1 coordinates evidence, proposals, approvals, execution jobs, and verification. Google Drive holds original evidence and provider-independent exports.

## End-to-end flow

1. Collect original evidence from Gmail, WhatsApp, Drive, bank statements, and BizimHesap.
2. Store the immutable source reference, timestamp, and content hash.
3. Classify and extract fields, while marking confidence and missing fields.
4. Resolve the canonical party and customer/supplier role from transaction direction.
5. Check duplicates against evidence, proposed events, BizimHesap records, and cheque portfolios.
6. Create a proposed entry beginning with `[GPT-CODEX KAYDI]`.
7. Present the original evidence and every critical field in the approval inbox.
8. After action-time user approval, queue one idempotent BizimHesap execution job.
9. The local signed-in BizimHesap adapter enters the data, re-reads the form, saves, and verifies the resulting record.
10. Append the outcome to the audit log and archive a provider-independent daily export in Drive.

## Source adapters

- Gmail: bank statements, invoices, receipts, payment notices, and attachments. Scheduled through minimum-scope Google Apps Script.
- WhatsApp: original attachments selected or forwarded into the AperiON inbox. AI summaries are hints, not evidence.
- BizimHesap: read collectors for cari cards, recent movements, cheque portfolio, invoices, stock, and balances. Writes remain approval-gated.
- Banks: statement files and emails are reconciled against BizimHesap, never silently posted.

## Control states

`received -> classified -> extracted -> needs_review -> reconciled -> awaiting_approval -> approved -> queued -> executing -> recorded -> verified`

Failure states are explicit: `blocked`, `conflict`, `duplicate`, `failed`, and `dead_letter`.

## Non-negotiable controls

- Missing or stale data is never represented as zero.
- One economic event creates one record.
- No AI-only financial posting.
- Every material field is verified against original evidence.
- Any correction to amount, direction, cari, date, due date, bank, or serial number invalidates the previous approval.
- Every external write has an idempotency key and a verification result.
