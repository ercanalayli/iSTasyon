# AperiON v53 Main Financial Statements Vision

## Öncelik

Ana ekranda iki ana finansal tablo yan yana gösterilecek:

```text
Sol / Bölüm 1: Dinamik Gelir Tablosu
Sağ / Bölüm 2: Dinamik Bilanço
```

Bu özellik AperiON iSTasyon için ana finans komuta ekranının en kritik parçasıdır.

## Amaç

AperiON sadece satış/gider listesi gösteren bir dashboard olmayacak. Her işlemden sonra otomatik güncellenen, yönetim kararına hazır bir finansal tablo merkezi olacak.

## Ana kural

Her satış, gider, tahsilat, ödeme, banka/kasa hareketi, Moka United aktarımı, cari hareket, stok etkisi ve finansal işlem sonrasında:

```text
Gelir Tablosu güncellenecek
Bilanço güncellenecek
Özet KPI kartları güncellenecek
Risk/uyarı alanları güncellenecek
```

## Ana ekran yerleşimi

```text
+---------------------------------------------------------------+
| AperiON Finansal Durum Merkezi                                |
+------------------------------+--------------------------------+
| Dinamik Gelir Tablosu        | Dinamik Bilanço                 |
|                              |                                |
| Satış Gelirleri              | Varlıklar                       |
| Satış İadeleri/İskontolar    | - Kasa                          |
| Net Satışlar                 | - Banka                         |
| Satışların Maliyeti          | - Moka United                   |
| Brüt Kar                     | - Müşteri Alacakları            |
| Operasyonel Giderler         | - Stoklar                       |
| Faaliyet Karı                | - Sabit Kıymetler               |
| Finansman Giderleri          |                                |
| Vergi Öncesi Kar             | Borçlar                         |
| Vergi Karşılığı              | - Tedarikçi Borçları            |
| Net Kar                      | - Kredi Kartları                |
|                              | - Banka Kredileri               |
|                              | - Vergi/SGK Borçları            |
|                              |                                |
|                              | Öz Kaynak / Net Varlık          |
+------------------------------+--------------------------------+
```

## Dinamik Gelir Tablosu

Gelir tablosu dönem seçimine göre çalışacak:

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
Kar Marjı
```

## Dinamik Bilanço

Bilanço anlık durum mantığıyla çalışacak.

Ana kalemler:

```text
VARLIKLAR
- Kasa
- Banka
- Moka United bekleyen tahsilatlar
- Müşteri alacakları
- Stoklar
- Verilen avanslar
- Sabit kıymetler
- Diğer varlıklar

BORÇLAR
- Tedarikçi borçları
- Kredi kartları
- Banka kredileri
- Vergi borçları
- SGK borçları
- Alınan avanslar
- Diğer borçlar

ÖZ KAYNAK / NET VARLIK
- Sermaye / başlangıç değerleri
- Dönem net karı
- Geçmiş dönem kar/zarar
- Net varlık
```

## İşlem etkisi mantığı

Her işlem türü finansal tablolara otomatik etki eder.

### Satış

```text
Gelir Tablosu:
+ Brüt Satışlar
+ Net Satışlar
+ Brüt Kar etkisi

Bilanço:
+ Müşteri alacakları veya + Kasa/Banka/Moka
- Stok / + Satışların maliyeti
```

### Gider

```text
Gelir Tablosu:
+ İlgili gider kalemi
- Net kar

Bilanço:
- Kasa/Banka veya + Borç
```

### Tahsilat

```text
Gelir Tablosu:
Kar/gelir tekrar yazılmaz

Bilanço:
- Müşteri alacağı
+ Kasa/Banka/Moka United
```

### Ödeme

```text
Gelir Tablosu:
Gider daha önce tahakkuk ettiyse tekrar gider yazılmaz

Bilanço:
- Borç
- Kasa/Banka
```

### Moka United

```text
Tahsilat anı:
+ Moka United
- Müşteri alacağı

Bankaya geçiş:
- Moka United
+ Banka
```

## Veri kaynakları

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

## Teknik hedef

Bu modül önce güvenli okuma/view katmanı olarak kurulacak.

Öncelik:

```text
1. SQL view/model tasarımı
2. Ana ekran UI tasarımı
3. Demo veri ile preview
4. Supabase canlı bağlantı
5. İşlem bazlı otomatik güncelleme
6. Mutabakat/kontrol kartları
```

## Ana dashboard kuralları

- Sayılar tam gösterilecek, K/M kısaltması kullanılmayacak.
- Açık tema korunacak.
- Gelir tablosu ve bilanço yan yana görünecek.
- Mobilde alt alta düşecek.
- Her kalem tıklanabilir olacak.
- Tıklanınca ilgili hareket detayları/detay drawer açılacak.
- Doğrulanmamış veri kesin sonuç gibi gösterilmeyecek.
- Veri kaynağı ve son güncelleme zamanı görünecek.
- Eski modüller silinmeyecek.

## Kontrol kartları

Ana ekranın üstünde veya altında şu kontrol kartları olacak:

```text
Net Satış
Brüt Kar
Net Kar
Nakit + Banka
Moka Bekleyen
Müşteri Alacakları
Tedarikçi Borçları
Net Varlık
Veri Güven Skoru
Son Güncelleme
```

## Mutabakat uyarıları

Sistem şu uyarıları verecek:

```text
Bilanço denk değil
Moka bekleyen ile banka transferleri uyuşmuyor
Cari toplamı ile müşteri alacakları uyuşmuyor
Stok maliyeti eksik
Gider tahakkuk etmiş ama ödeme durumu yok
Ödeme var ama gider/cari bağlantısı yok
Satış var ama maliyet yok
```

## v53 uygulama notu

Bu dosya v53 geliştirme yönünü tanımlar. v52 risk alarm tekrar engeli korunur. v53 geliştirmeleri mevcut özellikleri silmeden, ana ekranı canlı Gelir Tablosu + Bilanço merkezi haline getirecek şekilde ilerler.
