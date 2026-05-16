# AperiON BizimHesap Veri Sözleşmesi v40

## Amaç
BizimHesap, banka, kredi kartı, Moka ve manuel evraklardan gelen verileri AperiON Finans v39 motorlarına tek standart formatta akıtmak.

## Ana prensip
Hiçbir veri doğrudan kesin kayıt sayılmayacak. Önce ham veri, sonra sınıflandırma, sonra kontrol/onay, sonra kesin rapor.

---

## 1. Satış verisi → Ürün Kâr Motoru

Hedef tablo:
- `product_sales_profit`

Zorunlu alanlar:
- `company`
- `sale_date`
- `invoice_no`
- `cari_name`
- `product_code`
- `product_name`
- `quantity`
- `unit_sale_price`
- `unit_cost`

Hesaplananlar:
- `sales_amount = quantity x unit_sale_price`
- `cogs_amount = quantity x unit_cost`
- `gross_profit = sales_amount - cogs_amount`
- `net_profit = gross_profit - dynamic_expense_share - variable_expense`

Kontrol:
- Ürün satışında `unit_cost = 0` ise `cost_missing`.
- Maliyeti eksik ürün kesin kâr raporuna alınmaz.

---

## 2. Stok verisi → Kaç Aylık Stok Kaldı

Hedef tablolar:
- `product_stock_snapshot`
- `product_sales_qty_history`

Zorunlu alanlar:
- `company`
- `snapshot_date`
- `product_code`
- `product_name`
- `category`
- `stock_qty`
- `sale_date`
- `quantity`

Formül:
- `avg_monthly_sales_qty = last_12_month_sales_qty / 12`
- `stock_months_left = stock_qty / avg_monthly_sales_qty`

Durumlar:
- `out_of_stock`
- `critical_under_1_month`
- `low_under_3_months`
- `ok`
- `overstock_over_12_months`
- `no_sales_12m`

---

## 3. Gider verisi → Gider Sınıflandırma

Hedef tablo:
- `expense_raw_items`

Zorunlu alanlar:
- `company`
- `expense_date`
- `source_type`
- `source_name`
- `description`
- `amount`

Kategori örnekleri:
- `RENT`
- `PERSONNEL`
- `SGK`
- `TAX`
- `LOAN`
- `CREDIT_CARD`
- `BANK_FEE`
- `POS_MOKA`
- `LOGISTICS`
- `VEHICLE`
- `SOFTWARE`
- `REPAIR`
- `OTHER`

Kontrol:
- Güven skoru düşük veya `OTHER` olan gider onaya düşer.
- Onaylanmamış gider kesin net kârı bozmasın diye kontrollü raporda gösterilir.

---

## 4. Gün sonu kâr raporu

Gün sonu raporu şu zincirle oluşur:

1. Satış toplamı
2. Satılan malın maliyeti
3. Brüt kâr
4. Sabit gider günlük payı
5. Değişken giderler
6. POS/Moka komisyonları
7. Banka/kart/finansman giderleri
8. Eksik maliyet kontrolü
9. Gider onay kontrolü
10. Net kâr
11. Stok alarmı

---

## 5. Veri güvenliği

- Ham veri korunacak.
- İşlenen veri ayrıca tutulacak.
- Onay bekleyen veri silinmeyecek.
- Mükerrer kontrol yapılacak.
- Kaynak, tarih, dosya adı ve açıklama her kayıtta saklanacak.
- BizimHesap'a yazma işlemi dry-run/onay mantığı olmadan yapılmayacak.

---

## Sıradaki entegrasyon

1. BizimHesap satış export → `product_sales_profit`
2. BizimHesap stok export → `product_stock_snapshot`
3. BizimHesap ürün satış adetleri → `product_sales_qty_history`
4. Banka/kart/Moka giderleri → `expense_raw_items`
5. Onay merkezi → kesin rapor
