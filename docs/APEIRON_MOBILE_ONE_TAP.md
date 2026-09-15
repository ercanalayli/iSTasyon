# ApeirON Mobile One-Tap Entry

## Canonical daily entry

- Name shown on the phone Home Screen: `ApeirON`
- Direct conversation URL: `https://chatgpt.com/c/6aa915e2-058c-83eb-a46c-31f68f080f51`
- ChatGPT conversation id: `6aa915e2-058c-83eb-a46c-31f68f080f51`
- Custom GPT: private `ApeirON`
- Hermes command state remains server-side and is not derived from the device or ChatGPT conversation history.

The direct URL is intentionally the authenticated live conversation URL, not a shared-chat snapshot URL. The user must be signed into the same ChatGPT account on the phone.

## iPhone — one-time setup

1. Open the direct conversation URL above in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Set the name to **ApeirON**, enable **Open as Web App** if offered, and tap **Add**.

Daily text path: unlock phone → tap **ApeirON** → type the command.

Daily voice path: unlock phone → tap **ApeirON** → tap the microphone/dictation button → speak.

## Android — one-time setup

1. Open the direct conversation URL above in Chrome.
2. Tap **More (⋮)**.
3. Tap **Install and create shortcut** → **Create shortcut** (the wording can be **Add to Home screen** on older Chrome versions).
4. Set the name to **ApeirON** and tap **Add**.

Daily text path: unlock phone → tap **ApeirON** → type the command.

Daily voice path: unlock phone → tap **ApeirON** → tap the microphone/dictation button → speak.

## Security and continuity

- The shortcut contains no API key, password, token, approval token, or financial payload.
- It does not bypass the authenticated GPT Action, Hermes bridge, approval gate, duplicate protection, or payload-hash binding.
- Telegram remains a fallback only for critical notifications, CAPTCHA/MFA, and runtime failures.
- If the ChatGPT session expires, ChatGPT sign-in is required before the shortcut can open the private conversation.
- ChatGPT conversation history is account-synced convenience. The authoritative command state is the Hermes/D1 `command_id` record, so changing device does not create or lose command state.

## Acceptance command

`50 TL çay masrafı Ercan Nakit Kasa`

Expected prepare-only result:

- `command_id=17ba9d04-efd2-4893-b583-63ff02105ffc`
- `status=approval_required`
- `approval_policy=explicit_single_use`
- `financial_write=0`
- `bizimhesap_write=0`

