# AperiON Payment Ownership & Sync Invariants

Date: 2026-09-25

## Decision

Payment ownership is resolved **before** date-period aggregation. A payment row may belong to exactly one of:

- `ALAYLI`
- `ERCAN`
- `ALKAM`
- `BELIRSIZ` (UI label: Ayrım bekleyen)

Names alone are never sufficient to decide ownership.

## Evidence precedence

1. Explicit source owner/type field when present and unambiguous:
   - `ŞİRKET` -> `ALAYLI`
   - `ERCAN` / `ŞAHSİ` -> `ERCAN`
   - `ALKAM` -> `ALKAM`
2. Exact canonical account/card registry match (bank + masked last4/account id), with effective dates.
3. Exact recurring obligation/cari registry match.
4. Otherwise -> `BELIRSIZ`.

If two evidence sources disagree, the row is `BELIRSIZ`; no heuristic may force it into a named bucket.

## Current known exact mappings used as regression fixtures

- TEB + Ercan personal account/card -> `ERCAN`.
- Yapı Kredi Adios ****9954 / Erhan, documented as ALAYLI company obligation -> `ALAYLI`.
- Yapı Kredi Ercan ****7452 -> `ERCAN` unless an explicit newer source owner overrides it.
- MEDİKAL (BORA) rent -> `ALAYLI`.
- MEDİKAL2 rent -> `ALAYLI`.
- KULAK (AYŞE TUNA) rent -> `ALAYLI`.
- `ERHAN` by itself does **not** mean `ERCAN` and does **not** determine ownership.

## Sync invariants

A sync is successful only when all checks pass:

1. Source file is the authorized Yedek payment Sheet.
2. Only the current monthly `A` tab is used (for September 2026: `926A`).
3. Source modified time is not newer than the published snapshot readback.
4. Every open payment is assigned to exactly one owner bucket.
5. Bucket sets are disjoint.
6. `pending_count = ALAYLI + ERCAN + ALKAM + BELIRSIZ` by count.
7. Pending amount equals the sum of the same four buckets by amount.
8. `Bugün` is calculated from rows with local due date = today and `KALAN > 0`; completed rows never enter it.
9. Owner assignment happens before Bugün/Yarın/Hafta/Ay aggregation.
10. POST readback must reproduce item identities, owner, due date, remaining amount, and totals exactly.
11. Any invariant failure is fail-closed: preserve the last good snapshot, mark sync health as error/stale, and never present zero as current truth.

## Required diagnostic receipt

Each successful sync records: source file id, source modified time, source tab, source row count, snapshot hash/revision, synced_at, counts and amounts per owner bucket, period totals, invariant results, and exact readback verification.

This protocol exists specifically to prevent overlapping owner counts, stale-zero cards, and person-name heuristics from becoming financial truth.
