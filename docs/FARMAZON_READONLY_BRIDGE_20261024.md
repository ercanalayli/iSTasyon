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
