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

## v3 one-click local acceptance (25 Oct 2026, not executed on Windows)

Conversation ZIP: `AperiON_Farmazon_Windows_Kurulum_v3.zip`. It retains **identical bytes** for the v2 installer and local readiness diagnostics. The launcher adds `04_AperiON_KomutKoprusu_Test.ps1`.

- New probe checks the Git blob SHA of existing `tools/verify_desktop_bridge_live_v1.mjs` before invoking it. A changed or missing script is BLOCKED/SKIPPED.
- Only `desktop.health` is submitted through the existing **authenticated** command relay; no old `bot_commands` insert, new worker, browser launch, listing/purchase operation or financial action.
- Reports redacted `AperiON_KomutKoprusu_Sonuc.json` with the queue and Windows-result attestation boolean. No bearer token, raw response, credentials, browser content or personal data is exported.
- This read-only task may create a metadata task in the existing Worker task queue as part of the user's one-click test.
- `PASS_DESKTOP_READ_ONLY` does **not** mean Farmazon seller-page authorization, seller listing ingestion or any-ChatGPT-chat tool availability was verified. Those are separate end-to-end acceptance gates.
- No Windows execution or local result files have been observed in this chat. PR stays draft and no automatic deployment is authorized.

Local ZIP integrity / installer byte-preservation verified on the build host; a PowerShell run on the user's Windows PC has **not** been performed.

## Official Farmazon API-first path — verified 25 October 2026

**Priority changed to official API**, not browser clicking. Farmazon's provider documentation:
https://yardim.farmazon.com.tr/tr/articles/3106355-farmazon-api-dokumani (published 30 June 2026).

Farmazon documents these scoped seller GET routes:

- `GET /api/v2/listings/getlistings` (active/passive listings, SKU/barcode, offer, stock, expiration, pagination)
- `GET /api/v1/listings/getlisting` (specific listing)
- `GET /api/v1/orders/getsoldorders` (ALAYLI as seller, **not** existing purchase workflow)
- `GET /api/v1/orders/getsoldorder` (individual seller order; now implemented with exact order ID and optional seller-username verification, privacy-redacted result)

Dedicated repo implementation: `tools/lib/farmazon_official_api_readonly.cjs` plus `tools/test_farmazon_official_api_readonly.cjs`.
It is strictly GET-only, fixed HTTPS origins, no login/credential extraction, controlled request spacing >=7 sec (<10 requests/min), no price/stock/order mutations, no raw customer/financial identity export. `orderDetailListingCount` is **not** treated as verified sold quantity.

The authorized Windows-local executor must retrieve bearer credentials from an already approved local encrypted credential store. The module intentionally does not manage signin or tokens; until official Farmazon credentials are issued, no live API calls occur. Provider says to reuse tokens until their ~one-week expiry, not repeatedly authenticate. Staging is available weekdays 08:00–20:00; production host is lab.farmazon.com.tr. Do not test staged API outside its supported hours and call it offline.

**Vendor authorization:** Provider requires verified company official to email request specifying account username(s), use case and outbound IP list. Gmail and Drive search 25 October found no authenticated API credentials or previous approval. A Gmail **draft**, not a sent request, was created to official general Farmazon support; confirm seller account legal entity, username, permitted IP / dynamic-IP handling and API key delivery. Never place API keys or password in a public repo, ChatGPT, Slack, ordinary email reply or control dashboard.

### What is and is not ready

- READ-ONLY API adapter mocked offline tests: PASS in PR #87 GitHub Actions.
- LIVE Farmazon API authorization and seller legal identity: NOT VERIFIED.
- LIVE Windows-local agent deployment: NOT VERIFIED.
- Remote ChatGPT -> authorized relay -> Windows agent -> seller API -> evidence response: NOT VERIFIED.
- Seller offer publication, price/stock edits, order approval, invoice, payment: NOT ENABLED and require explicit single-use action approval.

**Do not tell owner the integration is complete** until an authenticated real-world seller-order/listing read has been independently verified and associated with the correct legal merchant.


## 26 October 2026 — vendor-identity compliance and correct seller statuses

- Farmazon official membership FAQ says the platform is for licensed pharmacists with GLN registration. The currently open Chrome homepage shows an **Erhan Alaylı** display name but that is **not** legal proof that ALAYLI MEDİKAL is the seller/merchant. Before any business sale, stock write, settlement, or invoice integration: request Farmazon confirmation of merchant legal name/GLN, registered seller username, account permissions, and whether ALAYLI is solely an ERP operator. Do not conflate login-display name with tax issuer.
- The provider's **GET filter** orderState uses values 0..6, while the **response** orderStateId uses 1,2,4,32,64,512,1024. Do NOT interpret response code 4 as 'completed': 4 is IN_TRANSIT; 32 is COMPLETED; 64 CANCELLED. New `SOLD_ORDER_STATES` maps the real response values, with UNKNOWN for undocumented values.
- Added strictly GET-only `getSoldOrder(orderId)` calling `/api/v1/orders/getsoldorder` and rejecting missing/multiple/mismatched ID results. Optional expected seller username must match; buyer personal data is not copied into the returned operational summary. Client credentials still required from a future approved secure local vault, not ChatGPT.
- Draft Gmail request **updated 26 Oct** to explicitly seek GLN, seller legal entity, API user/IP permissions and eligibility confirmation. It is **DRAFT / NOT SENT**; user must review and authorize sending. No Farmazon vendor authorization has yet been received.
- GitHub run `40298539566` Farmazon read-only safety PASS; general CI run `40298539472` PASS (offline/CI only). No Windows live acceptance, no seller listing retrieved, no real Farmazon API request, no orders/finance/listing mutations.
- Source: https://yardim.farmazon.com.tr/tr/articles/3106355-farmazon-api-dokumani and https://yardim.farmazon.com.tr/tr/articles/2706011-farmazon-nedir-nasil-uye-olabilirim


## 27 October 2026 — distinct sell versus buy product universes (owner correction)

**Farmazon SELL assortment:** ALAYLI Marmara regional distribution portfolio from KAR-DAG (Jender, CoverDry, Lorina, Moly) is the initial listing/pricing priority. Do not assume an offered product is already published.

**Farmazon BUY opportunity universe:** ALAYLI's other, non-KAR-DAG medical products that ALAYLI has actually procured from suppliers. Search the full BizimHesap purchase/invoice history and product master, **not just the KAR-DAG portfolio**, and include stocked as well as historically purchased products. Prefer complete, verified product identifiers and historical purchase records; separate supplier quotes from transactional purchase cost. Do not convert FARMAZON SELL product candidates into procurement candidates simply because they were evaluated for listing. Exclude KAR-DAG from the default Farmazon procurement comparison unless the owner separately authorizes an exception.

For every *non-KAR-DAG* purchasing candidate, compare the **same verified GTIN/EAN, manufacturer, model/variant, pack size, expiry/SKT and delivery destination** against the latest BizimHesap supplier net unit cost and a separately verified Farmazon BUY marketplace offer. Compare unit-normalized price, discount, recoverable versus nonrecoverable VAT, shipping/desi, supplier minimum quantity, delivery timing, payment terms, returns, authenticity and invoice issuer. Use landed cost and cash-flow impact, not an unadjusted headline price. An older historical purchase invoice is a price reference, never proof of today's supplier quote; when current offers cannot be independently read, label savings **UNVERIFIED** and do not recommend a definitive supplier switch.

Workflow: ALAYLI purchasing candidates -> validated cross-source matches -> cost/savings & risk comparison -> user approval package -> explicit user approval for each purchase -> authorized source execution + independent readback. No purchase, seller listing, price update, stock write or settlement change is authorized by a generic "continue" or by a product ranking. Treat buyer prices/listings as a separate read source from seller account listings/pricing-bot settings. The official seller-only API does not establish read access to all marketplace BUY offers.
