# Farmazon existing-Chrome read-only gateway — 24 October 2026

## Scope of this draft
- Reuses the existing AperiON Windows worker and current Chrome debugging broker (127.0.0.1:9222 / 9223).
- Adds site-scoped `site.session.health` handling for `site_id=farmazon` and a hostname allowlist.
- No new browser, credential capture, login, page navigation, clicks, orders, payments, account details, cookies, DOM text or tab listings returned to ChatGPT.
- Only `read` is enabled in the registry. `prepare`, `write`, `order.submit`, `payment` and every mutation are **not** enabled.
- Uses `APERION_FARMAZON_EXPECTED_ACCOUNT` as a local identity binding. Without it, health fails closed.
- The health probe checks the expected account's button plus same-origin Orders and Cart links; this is a UI-level indication, **not** a signed API attestation.
- This draft does not touch running Windows processes or deploy anything.

## Verified observations and gaps
- 24 Oct 2026: ChatGPT's connected Chrome extension could read the user's open Farmazon `https://www.farmazon.com.tr/homepage` tab, with an account button and orders/cart links; it cannot control the browser from Chat mode.
- Existing GitHub `desktop_agent_v1.cjs` restricts general remote desktop input; that remains untouched.
- The 8 Oct 2026 archived Drive `AperiON_Farmazon_Tampermonkey.user.js` v4.0 sends to `http://127.0.0.1:3333/api/sync` as `{mode,items}`, while archived `farmazon-mcp.mjs` v4.0 accepts `/api/farmazon-sync` as `{stream,data}`. These are incompatible **if those exact two copies are used together**.
- The archived v4.0 service permits wildcard CORS and does not show authentication for its sync POST; do not expose or use that endpoint until locally checked and secured.
- The visible Tampermonkey editor indicates a newer v4.5 version; the installed script/source and local service's runtime version are **not verified**. Do not replace them blindly.

## Acceptance gates before deployment or wider use
1. Run `node tools/test_farmazon_readonly_health.cjs` locally; it is a **mock test**, not a live session test.
2. Check the *currently installed* Farmazon script and local service match in path/payload and require loopback-only, authenticated writes for sync; no browser extension inspection workaround.
3. Verify the existing logged-in Chrome session is exposed through the **same** authorized local CDP broker, without starting another browser or login.
4. Configure the expected Farmazon account label locally; do not publish the account name or credentials.
5. Execute local `site.session.health` to confirm success and its source evidence, then enable an authenticated gateway allowlist entry for `farmazon` with scoped output only.
6. Confirm end-to-end ChatGPT -> authorized gateway -> Windows worker -> response using a non-mutating health task.
7. Implement specific `product.search` / `order.prepare` adapters with clear quantity/price validation and readback; leave checkout / supplier order / money actions strictly behind single-use explicit approval.
8. Don't merge or deploy this PR merely because tests pass; the exact live Chrome/Windows acceptance is required.

## Known limitation
The ChatGPT Browser connector is currently read-only in Chat mode. This draft does **not** grant generic mouse or keyboard control, does not turn on Farmazon purchasing and does not establish an active connection to the user's local Windows machine. Work/Cloud Browser is not used.

## Corrected business scope: 24 October 2026

Primary business objective: **ALAYLI MEDIKAL as FARMAZON SELLER**, not Farmazon purchases.

### Two isolated flows

- **Farmazon BUY:** ALAYLI is the customer purchasing from other sellers. Its purchase orders belong to the existing aperion_alis_siparis and supplier/payable workflow. The FZ-75DD66C6 and FZ-D898DBF4 purchase references are not seller orders or sales revenue. Parent status VERILDI can represent that a purchase order was placed while an event says KARGODA: do not call it an inconsistency without confirming the field's exact semantics.
- **Farmazon SELL:** ALAYLI lists its own goods, sets asking prices, tracks offered stock, receives customer orders, dispatches, invoices and reconciles payout. Seller listings and incoming sales orders use a separate namespace and financial flow. Never infer sales turnover from Farmazon buying email.

### Seller operating contract (not yet deployed)

1. Verify the authenticated Sales Panel: active seller privileges and legal invoice issuer independently of the displayed username. A menu link alone does not establish merchant activation.
2. Read ALAYLI's own listing identifiers, SKU/EAN, barcode, name, unit and pack, price, available quantity, listing state, expiry/lot where relevant, and observation timestamp. Link verified SKUs to BizimHesap product/warehouse inventory; ambiguous or missing matches remain BLOCKED.
3. Before pricing, independently validate COGS, tax, marketplace commission, shipping and return fees. If unknown, profit calculation stays BLOCKED; never invent cost or a final selling price.
4. Keep seller incoming orders separate from purchase orders; ingest seller order IDs with idempotency, timestamp, customer order status, SKU, quantity and reserve/availability evidence.
5. Track picking, lot/SKT, shipping, buyer invoice and settlement. Prevent duplicate stock decrements, duplicate invoicing and unreconciled payouts. Recheck Farmazon plus independent finance evidence.
6. Read/search/report and nonbinding drafts can run automatically. Publishing or modifying listings, price, stock, shipment commitments, invoices, refunds, payments or irreversible actions require explicit per-action user approval and source readback with audit IDs.

### Current capability boundary

- Read-only Chrome homepage evidence showed an accessible Sales Panel link; ALAYLI's current listings and incoming seller orders have NOT been verified.
- The existing Farmazon Gmail ingestion function records purchases by ALAYLI; it is not proof that seller operations are connected.
- Current PR only adds site session health. It does not give Windows click/type permissions or live seller read/write capabilities, and must remain a draft until live Windows tests pass.
- Existing purchase records and workflows remain unchanged.

## Deployment boundary — user decision, 24 October 2026

**Computer-on-only, Windows-local execution.** ALAYLI's Windows PC is normally kept powered on. AperiON automation is required only while that machine is on, network-connected, and its authorized local worker is running. No VPS-hosted browser, Work/Cloud Browser, or second always-on remote PC is needed for Farmazon or BizimHesap operations. The existing authenticated cloud command *relay* may still be used as a transport, but the actual browser executor must run on the user's Windows PC.

Operational contract:

1. Reuse a single existing Windows AperiON worker, starting with Windows sign-in (or via the already configured scheduled task); prevent duplicate workers. Do not silently replace the working Chrome profile or re-enter credentials.
2. Keep the current logged-in Farmazon and BizimHesap sessions. Recheck Farmazon health every five minutes via the existing local watchdog; browser data reads must be separately authorized and site-scoped. No automatic CAPTCHA/MFA bypass.
3. A command typed in an authorized ChatGPT conversation must reach the existing authenticated relay, be bound to the user and a unique task ID, then be leased and executed only by the Windows worker. The extension's read-only session is not a command or write channel.
4. **Machine off / locked out / offline / worker down:** report OFFLINE or ACTION_REQUIRED with last verified observation timestamp; never claim a live listing read, edit, or purchase. Queue only non-mutating reads with a bounded age. Expire stale tasks; **never automatically replay money, listing-publication, price/stock mutation, shipping, or customer-commitment tasks when the PC comes back online**.
5. Separate Farmazon SELL (ALAYLI listings, incoming customer orders, fulfillment, sales invoices, payouts) from Farmazon BUY (supplier orders, incoming goods, purchase invoices). Never cross-post.
6. Every definitive action needs explicit single-use user approval, payload/hash binding, idempotency, source readback and an audit record. No background financial changes.
7. Acceptance test before claiming ready: from normal ChatGPT, request a read-only seller-panel health check; confirm a unique task ID, Windows worker execution evidence, seller-identity proof, and a result returned to the same conversation. Then check a real ALAYLI-owned seller listing ID and observation timestamp. The mere existence of CI tests or Chrome tabs is insufficient.

**Current status:** This section is a requirement and code design only. PR #87 is draft; no Windows install, end-to-end command test, or sales-listing retrieval has been verified.

## Windows one-click diagnostics package v2 (24 Oct 2026)

- Produced a new Windows installation ZIP in the ChatGPT conversation. It preserves the original 02_AperiON_Farmazon_Guvenli_Kur.ps1 installation bytes; the upgrade only adds a read-only 03_AperiON_Canli_Durum.ps1 probe and runs it from 01_BASLAT.cmd following the installer.
- Probe reports scheduled-task state, node process counts, last watchdog observation and only the *number* of already-open Farmazon/BizimHesap CDP tabs on 127.0.0.1:9222/9223. It does not expose browser URLs, accounts, cookies or tokens, and never opens Chrome.
- Output file: AperiON_Yerel_Durum.json (local next-to-installer). This can be uploaded to ChatGPT to distinguish OFFLINE vs missing account binding vs no CDP from actual confirmed session health. Missing identity binding never implies a logged-in seller account.
- Bundle integrity was checked offline; the core installer was byte-for-byte identical to v1. Static inspection confirmed the new diagnostics contain no POST, process restart or scheduled task mutation.
- **No Windows execution has occurred via this conversation. No output report is available yet. Neither Farmazon sales panel access nor remote ChatGPT task execution is certified.**
- The existing database bot_commands queue blocked insertion under the 14 Oct 2026 single-writer policy. Preserve that rule; do not enable old queue or use direct SQL INSERT as a workaround.
