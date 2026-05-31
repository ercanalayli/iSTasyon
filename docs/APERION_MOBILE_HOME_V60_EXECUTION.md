# AperiON v60 Mobile Home Execution Brief

## Goal

The mobile home page must look like a professional executive dashboard, not an early prototype.

## First visible area

The user must first see:

- Period filter
- Sales
- Expenses
- Purchases
- Profit

## Period options

Use exactly these options:

- Bugun
- Dun
- Bu Hafta
- Bu Ay
- Gecen Ay
- Bu Yil
- Gecen Yil
- Ozel Aralik

Do not add Son 30 Gun.
Do not rename Ozel Aralik to Tarih Sec.

## Main cards

The mobile home page will have four main cards:

- Satislar
- Giderler
- Alislar
- Kar

Each card must be compact and clickable.

## Drilldown rules

Satislar drilldown:

- Kategori
- Urun
- Musteri
- Marka
- Fatura veya islem

Giderler drilldown:

- Kategori
- Tedarikci
- Odeme tipi
- Sabit ve degisken
- Belge

Alislar drilldown:

- Kategori
- Urun
- Tedarikci
- Marka
- Belge veya fatura

Kar drilldown:

- Tahmini kar
- Gercek kar
- Kategori
- Urun
- Musteri
- Eksik maliyetli urunler

## Profit rule

Profit must be shown in two ways:

- Estimated profit by average margin
- Real profit by real product cost

## Period state rule

The selected period must be preserved in all drilldown screens.

Example:

- Home period: Bu Ay
- Sales detail: Bu Ay
- Category detail: Bu Ay
- Product detail: Bu Ay

## Mobile UI rules

- Left menu closed by default on mobile
- Compact top bar
- Horizontal scroll period chips
- Compact executive cards
- Professional bottom navigation
- No huge floating finance calendar button
- Light theme preserved
- Existing features not removed
- No live data mutation from home page

## Data safety

Home page is display only.
Final records are created only after Approval Center decision.

## Next implementation tasks

1. Build mobile home v60 preview.
2. Add period state helper.
3. Add reusable KPI card component.
4. Add drilldown drawer or detail view.
5. Replace rough mobile layout gradually.
6. Verify no existing feature is removed.
