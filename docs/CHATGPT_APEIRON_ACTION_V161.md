# ApeirON ChatGPT Action v161

Production surface: `https://aperion-command-bridge.yenicespor-finans.workers.dev/openapi.json`

This is an authenticated GPT Action façade on the existing Hermes command bridge. It does not introduce a second runtime or queue.

## Actions

- `prepareApeirONCommand`: parses supported natural-language commands and creates an immutable, idempotent `prepare_only` task. Financial commands always enter `approval_required`.
- `getApeirONCommandStatus`: returns status, parsed fields, approval state, result, and proof for a command ID.

Authentication uses a dedicated bearer secret. The value exists only as a Cloudflare Worker secret and a Windows DPAPI-sealed local value. It must not be copied into source, evidence, D1 payloads, logs, or chat messages.

## Approval boundary

The action cannot approve a financial command. Approval remains explicit, single-use, command-ID-bound, and is accepted only while the immutable task is pending. Amount, account, category, target, and operation are covered by the stored approval binding. The Windows worker cannot lease the task while `approval_state=required`.

## One-time ChatGPT setup

In the ApeirON custom GPT editor choose **Configure → Actions → Create new action**. Import the production OpenAPI URL above, select **Authentication → API key → Bearer**, and provide the dedicated DPAPI-sealed action key through the controlled setup procedure. Do not use the Hermes ingest or Windows worker key. Save the GPT and enable the two ApeirON actions.

The existing project conversation itself cannot gain a GPT Action merely because its files were updated. ChatGPT requires this one-time UI connection. After connection, future commands are entered only in the ApeirON ChatGPT conversation.

## Acceptance command

`50 TL çay masrafı Ercan Nakit Kasa`

Expected safe state: `bizimhesap.expense_post`, 50 TRY, ALAYLI, Çay / İkram, Ercan Nakit Kasa resolved to the verified BizimHesap account, `approval_required`, zero financial writes.

Live ChatGPT acceptance passed on 2026-09-15 with command ID `17ba9d04-efd2-4893-b583-63ff02105ffc`. Repeating the command resolved idempotently to the same queued task with `duplicate=true`. Remote D1 verification read one row and wrote zero rows; the task remains `pending` with `approval_state=required`.
