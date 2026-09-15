# ApeirON Natural Finance Command Stress v162

Date: 2026-09-15

## Outcome

- 104 Turkish natural-language fixtures: 104 PASS, 0 FAIL.
- Parser accuracy: 100% on the versioned fixture corpus.
- Ambiguity detection: PASS.
- False-positive write-risk: 0/10 deliberately non-financial or explicitly uncertain commands.
- False-negative write-risk: 0/74 fixture commands that imply a financial draft/write risk.
- Local parse latency: p50 0.017 ms, p95 0.372 ms.
- Production partial-command round trip: 324.57 ms; continuation/prepare: 156.57 ms.
- Financial writes: 0. BizimHesap writes: 0. Secrets exposed: 0.

The production error `16000 tl kasadan Ercan nakit kasa transfer` now returns `needs_clarification`, preserves 16,000 TRY and target `Ercan Nakit Kasa`, and asks only for the source. Sending `TL Kasa` with the returned context creates a prepare-only command in `approval_required` state. Live acceptance command ID: `757801d3-2f11-4a51-a6d7-ce9b52675884`.

## Safety and resilience

- Missing amount/source/target never becomes an executable task.
- Completed context uses the existing SHA-256 immutable approval binding.
- Duplicate submission returned the same command ID with `duplicate=true`.
- Approval replay is blocked by the existing atomic `required -> approved` transition.
- Concurrent leasing is protected by the existing conditional D1 update.
- Worker crash recovery uses lease expiry; the existing local execution ledger blocks blind replay after an unknown write outcome.
- Production Worker version: `f2649921-11a1-4c18-8398-719c0436fc16`.

## Device synchronization boundary

ChatGPT conversation history synchronization belongs to the ChatGPT account/application and is distinct from Hermes state. The supplied phone and Windows screenshots show the same ApeirON GPT conversation content. Independently, every prepared command is stored server-side in D1 and remains queryable by command ID after changing devices; this was verified live for the acceptance command. This test does not claim control over or modification of ChatGPT's platform-level synchronization.

## Evidence

- `evidence/natural-finance-stress-v162.json`
- `evidence/chatgpt-clarification-live-v162.json`
- `evidence/production-readiness-command-path-v159.json`
