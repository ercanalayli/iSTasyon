# AperiON v60 — Dinamik Ana Ekran ve Drilldown Kuralı

## Ana hedef

Mobil ana ekran profesyonel, sade ve yönetici odaklı olacak.

Kullanıcı uygulamaya girince ilk önce şunları görecek:

```text
Satışlar
Giderler
Alışlar
Kâr
```

Bu kartlar statik olmayacak. Seçilen zaman filtresine göre dinamik hesaplanacak.

## Zaman filtresi kuralı

Ana ekranda üstte tek bir dönem seçici olacak:

```text
Bugün
Dün
Bu Hafta
Bu Ay
Son 30 Gün
Özel Aralık
```

Varsayılan seçim:

```text
Bugün
```

Seçim değişince ana kartlar aynı anda güncellenecek.

## Ana kartlar

### 1. Satışlar

Gösterilecek:

```text
Toplam satış tutarı
Satılan adet
İşlem sayısı
Müşteri sayısı
Önceki dönem karşılaştırması
```

Kart tıklanınca satış detayına girilecek.

Satış detayında yine aynı dönem filtresi korunacak:

```text
Bugün / Dün / Bu Hafta / Bu Ay / Son 30 Gün / Özel Aralık
```

Satış detay kırılımları:

```text
Kategoriye göre satış
Ürüne göre satış
Müşteriye göre satış
Markaya göre satış
Faturaya/işleme göre satış
```

### 2. Giderler

Gösterilecek:

```text
Toplam gider
Gider sayısı
Ciroya oran
Önceki dönem karşılaştırması
```

Kart tıklanınca gider detayına girilecek.

Gider detay kırılımları:

```text
Kategoriye göre gider
Tedarikçiye göre gider
Ödeme tipine göre gider
Sabit / değişken gider
Belgeye göre gider
```

### 3. Alışlar

Gösterilecek:

```text
Toplam alış tutarı
Alış adedi
Tedarikçi sayısı
Önceki dönem karşılaştırması
```

Kart tıklanınca alış detayına girilecek.

Alış detay kırılımları:

```text
Kategoriye göre alış
Ürüne göre alış
Tedarikçiye göre alış
Markaya göre alış
Belgeye/faturaya göre alış
```

### 4. Kâr

Kâr iki türlü gösterilecek:

```text
1. Ortalama kâr marjına göre tahmini kâr
2. Ürünlerin gerçek alış maliyetine göre gerçek kâr
```

Kartta ikisi ayrı görünecek:

```text
Tahmini Kâr
Gerçek Kâr
Kâr Oranı
Eksik maliyetli ürün sayısı
```

Kâr detayına girince:

```text
Kategoriye göre kâr
Ürüne göre kâr
Müşteriye göre kâr
Markaya göre kâr
Eksik alış fiyatı olan ürünler
```

## Drilldown davranışı

Her ana kart tıklanabilir olacak.

Akış:

```text
Ana Ekran
→ Satışlar
→ Kategori
→ Ürün
→ İşlem/Fatura
```

veya

```text
Ana Ekran
→ Giderler
→ Kategori
→ Tedarikçi
→ Belge
```

veya

```text
Ana Ekran
→ Kâr
→ Kategori
→ Ürün
→ Maliyet kontrolü
```

## Dönem filtresi korunma kuralı

Kullanıcı ana ekranda `Bu Hafta` seçtiyse, satış detayına girince de aynı filtre korunacak.

Örnek:

```text
Ana ekran: Bu Hafta
Satış detayı: Bu Hafta
Kategori detayı: Bu Hafta
Ürün detayı: Bu Hafta
```

Kullanıcı detay ekranında dönemi değiştirirse, geri döndüğünde yeni dönem korunur.

## Mobil görünüm kuralı

Mobilde:

```text
Sol menü default kapalı
Üst bar sade
Dönem filtresi sticky / kolay erişilir
Kartlar kompakt
Alt navigasyon profesyonel
Floating buton ekranı kapatmaz
```

Kart yapısı:

```text
Başlık
Ana rakam
Alt metrikler
Trend rozeti
Detay oku
```

## Ana ekran sıralaması

Mobilde ana ekran sırası:

```text
1. Dönem filtresi
2. Satışlar / Giderler / Alışlar / Kâr kartları
3. Bugün yapılacaklar kısa özeti
4. Bekleyen onaylar
5. Son güncelleme / veri güveni
```

## Veri güveni

Her kartta küçük veri güveni alanı olacak:

```text
Kaynak
Son güncelleme
Kayıt sayısı
Kontrol durumu
```

Ama bu bilgi kartın içinde dev alan kaplamayacak; küçük açılır detay veya mini badge olarak gösterilecek.

## Onay ve veri güvenliği

Bu ekran sadece gösterim ekranıdır.

Kesin finans kaydı oluşturmaz.

Kural:

```text
Ana ekran gösterir.
Detay ekran analiz eder.
Onay Merkezi karar verir.
Kesin kayıt onaydan sonra oluşur.
```

## Yapılanlar

```text
✅ Dinamik ana ekran kuralı belirlendi.
✅ Bugün / Dün / Bu Hafta / Bu Ay filtresi ana kural oldu.
✅ Satış / Gider / Alış / Kâr kartları tıklanabilir olacak.
✅ Detay ekranlarında kategori / ürün / müşteri / tedarikçi kırılımları tanımlandı.
✅ Kâr için tahmini kâr ve gerçek kâr ayrımı korundu.
```

## Kalanlar

```text
⬜ Ana ekran v60 UI patch
⬜ Sales drilldown view
⬜ Expense drilldown view
⬜ Purchase drilldown view
⬜ Profit drilldown view
⬜ Mobil bottom nav yenileme
⬜ Dönem filtresi state yönetimi
```
