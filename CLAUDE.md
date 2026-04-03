# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AperiON — ErpaltH iSTasyon** is a sales data intelligence platform for three companies: ALAYLI MEDİKAL, ELİT ET ÜRÜNLERİ, and ODYOFORM İŞİTME CİHAZLARI. It scrapes daily sales data from [bizimhesap.com](https://bizimhesap.com) and presents it in a browser-based dashboard backed by Supabase.

## Running the Bot

```bash
# Install dependencies (first time)
npm install

# Normal mode — pulls last 7 days of missing data, sends WhatsApp summary
node bizimhesap_bot.js

# Historical backfill mode
node bizimhesap_bot.js --gecmis 2026-01-01 2026-03-20
```

Logs are appended to `bot_log.txt`. Debug screenshots are saved as `debug_<firma_id>.png` and `debug_error.png` on failure.

## Setting Up the Scheduler (Windows)

Run once as Administrator in PowerShell to register a Windows Scheduled Task that fires every hour 09:00–19:00:

```powershell
# In PowerShell (Admin)
.\aperion_zamanlayici_kur.ps1
```

Task name: `AperiON_BizimHesap_Bot`

## Architecture

### Backend — `bizimhesap_bot.js`

Single-file Node.js script (no framework). Flow:

1. **Login** to bizimhesap.com with Puppeteer using credentials in `CONFIG`
2. **For each active firm** (`FIRMALAR` array), select the firm context via the multi-account switcher
3. **Smart mode** (default): query Supabase for which of the last 7 days are missing per `firma_id`, then only fetch those dates
4. **Historical mode** (`--gecmis`): iterate every calendar date in the given range
5. **Scrape** the sales report table (`NgnNewSalesReport`) for each date, parse rows from the DOM
6. **Upsert** to Supabase `sales_raw` table with conflict key `(tarih, urun, unvan, firma_id)`
7. Write status to `bot_logs` table and optionally send WhatsApp alerts via CallMeBot API

### Frontend — Static HTML Files

No build step. All dependencies (Supabase JS, Chart.js, SheetJS/XLSX) are loaded from CDN.

| File | Purpose |
|---|---|
| `login.html` | Supabase Auth login page; redirects to `index.html` on success |
| `index (12).html` | Main dashboard — KPI cards, charts, data tables with firm/date filters |
| `index (20).html` | Alternative/newer dashboard version |
| `veri_yukle (7).html` | Manual Excel upload page — parses XLSX client-side and upserts to Supabase |

### Database (Supabase)

Key tables:

- **`sales_raw`** — one row per (date × product × customer × firm). Columns: `urun`, `adet`, `ciro`, `tarih`, `unvan`, `kategori`, `firma_id`, `firma_adi`, `yil`, `ay`, `kaynak`
- **`bot_logs`** — execution log: `tarih`, `firma_id`, `durum` (`basarili`/`bos`/`hata`), `kayit_sayisi`, `ciro_toplam`, `hata_mesaji`, `bot_versiyonu`
- **`aperion_users`** — user profiles linked to Supabase Auth `user_id`

### Configuration (hardcoded in `bizimhesap_bot.js`)

- `CONFIG` — BizimHesap login credentials and URLs
- `SUPABASE` — Supabase URL, publishable key, table name
- `FIRMALAR` — array of active firms with `id`, `adi`, `sektor` (used as search text in the firm switcher UI)
- `WP` — WhatsApp notification recipients (CallMeBot); `phone` and `apikey` must be filled in to enable alerts
