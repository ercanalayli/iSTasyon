# AperiON v54 Financial Statement Engine

## Amaç

AperiON ana ekranda canlı Gelir Tablosu ve Bilanço üretmek için merkezi finansal tablo motoru kurar.

Bu motorun görevi:

```text
Her satış, gider, tahsilat, ödeme, banka, Moka, cari ve stok hareketini finansal tablo etkisine çevirmek.
```

## Ana çıktı

v54 ile üretilecek ana çıktılar:

```text
1. Dinamik Gelir Tablosu
2. Dinamik Bilanço
3. KPI Kartları
4. Risk / Mutabakat Uyarıları
5. Drilldown detayları
```

## Temel mimari

```text
raw kaynaklar
   ↓
finance_event
   ↓
finance_ledger
   ↓
financial_statement_engine
   ↓
Gelir Tablosu + Bilanço + KPI + Risk
```

## Ana tablolar / view hedefi

```text
finance_events_v54
finance_ledger_v54
financial_income_statement_v54_view
financial_balance_sheet_v54_view
financial_kpi_summary_v54_view
financial_reconciliation_alerts_v54_view
```

## Kaynaklar

İlk canlı model şu kaynakları okuyacak:

```text
sales_raw
masraf_raw
finance_calendar_items
finance_command_center_records
moka_united_movements
bank/cash movements
customer/vendor ledgers
stock/product movements
manual opening balances
```

Not:

```text
Kaynak tablo yoksa model fail etmeyecek; güvenli fallback veya boş view mantığı kullanılacak.
```

## finance_event mantığı

Her işlem önce standart event'e çevrilir.

Örnek alanlar:

```text
event_id
company
event_type
source_table
source_id
event_date
accounting_date
amount
currency
customer_name
vendor_name
product_name
account_name
status
confidence_score
created_at
```

Event türleri:

```text
sale
sales_return
discount
cost_of_goods_sold
expense
accrued_expense
collection
payment
moka_collection
moka_bank_transfer
bank_in
bank_out
stock_in
stock_out
manual_opening_balance
adjustment
```

## finance_ledger mantığı

Event finansal tablo etkisine çevrilir.

Ledger alanları:

```text
ledger_id
event_id
company
statement_type
line_code
line_name
side
debit_amount
credit_amount
net_amount
period_date
source
confidence_score
```

statement_type:

```text
income_statement
balance_sheet
cash_flow
kpi
```

## Gelir Tablosu view

Ana kalemler:

```text
Brüt Satışlar
Satış İadeleri
Satış İskontoları
Net Satışlar
Satışların Maliyeti
Brüt Kar
Operasyonel Giderler
Personel Giderleri
Kira / Sabit Giderler
Finansman Giderleri
Diğer Giderler
Vergi Öncesi Kar
Vergi Karşılığı
Net Kar
Brüt Kar Marjı
Net Kar Marjı
```

Dönem filtreleri:

```text
Bugün
Dün
Bu Hafta
Bu Ay
Geçen Ay
Bu Yıl
Geçen Yıl
Özel Tarih Aralığı
```

## Bilanço view

Ana kalemler:

```text
VARLIKLAR
- Kasa
- Banka
- Moka United Bekleyen
- Müşteri Alacakları
- Stoklar
- Verilen Avanslar
- Sabit Kıymetler
- Diğer Varlıklar

BORÇLAR
- Tedarikçi Borçları
- Kredi Kartları
- Banka Kredileri
- Vergi Borçları
- SGK Borçları
- Alınan Avanslar
- Diğer Borçlar

ÖZ KAYNAK / NET VARLIK
- Açılış Sermaye / Açılış Net Değer
- Geçmiş Dönem Kar/Zarar
- Dönem Net Karı
- Net Varlık
```

## İşlem etkisi kuralları

### Satış

```text
Gelir Tablosu:
+ Brüt Satışlar
+ Net Satışlar

Bilanço:
+ Müşteri Alacakları veya + Kasa/Banka/Moka
```

### Satış maliyeti

```text
Gelir Tablosu:
+ Satışların Maliyeti

Bilanço:
- Stoklar
```

### Gider tahakkuku

```text
Gelir Tablosu:
+ İlgili gider kalemi

Bilanço:
+ Tedarikçi Borcu veya + Ödenecek Gider
```

### Gider ödemesi

```text
Gelir Tablosu:
Tekrar gider yazılmaz.

Bilanço:
- Borç
- Kasa/Banka
```

### Tahsilat

```text
Gelir Tablosu:
Tekrar gelir yazılmaz.

Bilanço:
- Müşteri Alacağı
+ Kasa/Banka/Moka
```

### Moka United

```text
Kart tahsilatı:
+ Moka United
- Müşteri Alacağı

Bankaya geçiş:
- Moka United
+ Banka
```

## Mutabakat kontrolleri

Motor şu uyarıları üretir:

```text
Bilanço denk değil
Gelir tablosu net karı ile bilanço dönem karı uyuşmuyor
Moka bekleyen ile banka geçişleri uyuşmuyor
Cari alacak toplamı ile bilanço müşteri alacakları uyuşmuyor
Satış var ama maliyet yok
Gider var ama ödeme/cari bağlantısı yok
Ödeme var ama gider/cari bağlantısı yok
Stok değeri eksik
Vergi/SGK alanı güncel değil
Düşük güvenli event var
```

## KPI view

Ana kartlar:

```text
Net Satış
Brüt Kar
Net Kar
Kasa + Banka
Moka Bekleyen
Müşteri Alacakları
Tedarikçi Borçları
Toplam Borç
Net Varlık
Risk Skoru
Veri Güven Skoru
Son Güncelleme
```

## Zero Keyboard bağlantısı

v54 motoru zero-keyboard akışlarından gelen onaylı işlemleri de event'e çevirir.

Örnek:

```text
Kullanıcı konuşur / belge yükler / butona basar
Sistem öneri üretir
Kullanıcı onaylar
finance_event oluşur
ledger etkisi oluşur
Gelir Tablosu + Bilanço güncellenir
```

## Güvenlik kuralları

```text
Önce view/model ile başlanır.
Canlı ana kayıtlar doğrudan değiştirilmez.
Düşük güvenli kayıtlar kesin tabloya alınmaz, onay merkezine düşer.
Önceki v52 risk alarm sistemi korunur.
Ana dashboard silinmez.
K/M kısaltması kullanılmaz.
Açık tema korunur.
```

## Uygulama sırası

```text
1. v54 SQL taslak dosyası
2. finance_events_v54 safe view/table
3. income statement view
4. balance sheet view
5. KPI summary view
6. reconciliation alerts view
7. preview HTML canlı veri adapter'ı
8. index/dashboard entegrasyonu
```
