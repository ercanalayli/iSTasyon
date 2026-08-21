# AperiON Telegram Reporting v144

- Daily schedule: 09:00 Europe/Istanbul (`0 6 * * *` UTC).
- Daily end-to-end verification: 09:05 Europe/Istanbul (`5 6 * * *` UTC).
- E2E confirmation checks the 09:00 brief receipt, D1 control plane, Telegram target, and Supabase sales, customer, and expense sources; it records an audit result and sends a Telegram confirmation or explicit failure list.
- Morning brief: source health, top three priorities, orders, collections, payments, tasks, approvals, automation status.
- Daily finance: management income statement and explicitly partial balance-sheet view.
- On-demand commands: `/urunraporu`, `/cariraporu`, `/gelirtablosu`, `/bilanco`, `/raporalanlari`.
- Product periods: today, yesterday, this week, this month, last month, this year, last year.
- FIFO profit, remaining FIFO purchase-cost layers, and category share are shown only when their source data can be verified.
- No financial record is created by reporting commands.
