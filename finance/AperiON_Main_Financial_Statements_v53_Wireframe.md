# AperiON v53 Ana Ekran Wireframe

## Amaç

AperiON ana ekranında Gelir Tablosu ve Bilanço yan yana, canlı ve dinamik şekilde gösterilecek.

Bu ekran rapor sayfası değil, canlı finans işletim ekranıdır.

## Ana Yerleşim

```text
+--------------------------------------------------------------------------------+
| APERION CANLI FİNANS MERKEZİ                                                    |
| Firma: ALAYLI | Dönem: Bu Ay | Son Güncelleme | Veri Güven Skoru              |
+--------------------------------------------------------------------------------+
| Net Satış | Brüt Kar | Net Kar | Kasa+Banka | Moka Bekleyen | Net Varlık     |
+--------------------------------------------------------------------------------+
| + Satış | + Tahsilat | + Gider | + Ödeme | + Belge | Sesli İşlem | Onay Merkezi |
+--------------------------------------+-----------------------------------------+
| DİNAMİK GELİR TABLOSU                | DİNAMİK BİLANÇO                         |
|                                      |                                         |
| Brüt Satışlar                        | VARLIKLAR                               |
| Satış İadeleri                       | Kasa                                    |
| Satış İskontoları                    | Banka                                   |
| Net Satışlar                         | Moka United Bekleyen                    |
| Satışların Maliyeti                  | Müşteri Alacakları                      |
| Brüt Kar                             | Stoklar                                 |
| Operasyonel Giderler                 | Sabit Kıymetler                         |
| Finansman Giderleri                  | Diğer Varlıklar                         |
| Vergi Öncesi Kar                     |                                         |
| Vergi Karşılığı                      | BORÇLAR                                 |
| Net Kar                              | Tedarikçi Borçları                      |
| Kar Marjı                            | Kredi Kartları                          |
|                                      | Banka Kredileri                         |
|                                      | Vergi / SGK                             |
|                                      | Diğer Borçlar                           |
|                                      |                                         |
|                                      | ÖZ KAYNAK / NET VARLIK                  |
+--------------------------------------+-----------------------------------------+
| Risk Akışı | Mutabakat Uyarıları | Yapılacaklar | Gecikenler | Son İşlemler       |
+--------------------------------------------------------------------------------+
```

## Üst KPI Kartları

Ana ekranda ilk bakışta şunlar görünecek:

```text
Net Satış
Brüt Kar
Net Kar
Kasa + Banka
Moka Bekleyen
Müşteri Alacakları
Tedarikçi Borçları
Net Varlık
Risk Skoru
Veri Güven Skoru
```

Kural:

```text
Sayılar tam gösterilecek.
K/M kısaltma kullanılmayacak.
TL formatı korunacak.
```

## Dönem Seçimi

Gelir tablosu dönem bazlı çalışacak:

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

Bilanço ise anlık durum mantığında çalışacak.

## Dinamik Gelir Tablosu

Gelir tablosu ana kalemleri:

```text
Brüt Satışlar
Satış İadeleri
Satış İskontoları
Net Satışlar
Satışların Maliyeti
Brüt Kar
Brüt Kar Marjı
Operasyonel Giderler
Personel Giderleri
Kira / Sabit Giderler
Finansman Giderleri
Diğer Giderler
Vergi Öncesi Kar
Vergi Karşılığı
Net Kar
Net Kar Marjı
```

Her satır tıklanabilir olacak.

Tıklanınca:

```text
Hareket detayları drawer açılır.
Kaynak kayıtlar görünür.
Satış/gider/fatura/cari bağlantısı gösterilir.
```

## Dinamik Bilanço

Bilanço ana kalemleri:

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
- Başlangıç Sermaye / Açılış Değeri
- Geçmiş Dönem Kar/Zarar
- Dönem Net Karı
- Net Varlık
```

Her satır tıklanabilir olacak.

## Zero Keyboard Hızlı İşlem Barı

Klavye minimum kullanılacak.

Ana butonlar:

```text
+ Satış
+ Tahsilat
+ Gider
+ Ödeme
+ Belge Yükle
Sesli İşlem
Onay Merkezi
```

Butona basınca sağ drawer açılır.

Drawer içinde:

```text
Hazır cari önerileri
Son kullanılan ürünler
Tutar/adet önerileri
Kaynak belge yükleme
Onayla / Reddet / Düzelt butonları
```

## İşlem Etkisi

Her işlem event olarak alınacak.

```text
finance_event
```

Her event şu alanlara sahip olacak:

```text
event_id
company
event_type
source
event_date
amount
currency
customer_id
vendor_id
product_id
account_id
status
confidence_score
created_at
```

Event sonrası sistem şunları güncelleyecek:

```text
Gelir Tablosu
Bilanço
KPI Kartları
Risk Skoru
Mutabakat Uyarıları
Onay Merkezi
```

## İşlem Örnekleri

### Satış

```text
Gelir Tablosu:
+ Brüt Satışlar
+ Net Satışlar
+ Brüt Kar

Bilanço:
+ Müşteri Alacakları veya + Kasa/Banka/Moka
- Stoklar
```

### Gider

```text
Gelir Tablosu:
+ Gider
- Net Kar

Bilanço:
- Kasa/Banka veya + Borç
```

### Tahsilat

```text
Gelir Tablosu:
Etki yok, gelir tekrar yazılmaz.

Bilanço:
- Müşteri Alacağı
+ Kasa/Banka/Moka
```

### Ödeme

```text
Gelir Tablosu:
Gider daha önce tahakkuk ettiyse tekrar gider yazılmaz.

Bilanço:
- Borç
- Kasa/Banka
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

## Mutabakat Uyarıları

Ana ekran aşağıdaki uyarıları gösterecek:

```text
Bilanço denk değil
Satış var ama maliyet yok
Gider var ama ödeme bağlantısı yok
Ödeme var ama cari/gider bağlantısı yok
Moka bekleyen ile banka geçişleri uyuşmuyor
Cari toplamı ile müşteri alacakları uyuşmuyor
Stok değeri eksik
Vergi/SGK alanı güncel değil
```

## Mobil Görünüm

Desktop:

```text
Gelir Tablosu solda, Bilanço sağda.
```

Mobil:

```text
Önce KPI kartları
Sonra Gelir Tablosu
Sonra Bilanço
Sonra Hızlı İşlem Barı
Sonra Onay/Risk alanı
```

## Sonraki Teknik Adım

Bu wireframe'den sonra yapılacaklar:

```text
1. v53 HTML preview dosyası
2. v53 SQL view modeli
3. finance_event şeması
4. financial_statement_engine mantığı
5. Supabase canlı view bağlantısı
6. Zero Keyboard drawer akışı
```
