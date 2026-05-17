# AperiON v53 Zero Keyboard Interaction Principle

## Ana hedef

AperiON iSTasyon'da klavye ile iletişim en aza indirilecek.

Kullanıcı mümkün olduğunca:

```text
Konuşarak
Seçerek
Butona basarak
Hazır öneriyi onaylayarak
Fotoğraf / ekran görüntüsü / fatura yükleyerek
Telegram / WhatsApp tarzı kısa komutlarla
```

sistemi yönetecek.

## Neden önemli?

AperiON sahada, telefonda ve yoğun iş akışında kullanılacak. Klavye ile uzun veri girişi hata üretir, yavaşlatır ve sistemi kullanılmaz hale getirir.

Bu nedenle v53 ile ana kural:

```text
Yazı yazdırma, seçenek sun.
Uzun form doldurtma, akıllı öneri üret.
Ham veri isteme, dosya/görsel/konuşmadan çıkar.
Kesin kayıt yapmadan önce onaylat.
```

## Ana kullanım biçimleri

### 1. Konuşarak işlem oluşturma

Örnek:

```text
Gamze Eczanesi 24 adet 8li bel bantlı Jender M beden, 12 adet 7li bel bantlı L Jender
```

Sistem bunu otomatik ayrıştırır:

```text
Cari: Gamze Eczanesi
Ürün 1: 8li bel bantlı Jender M beden
Adet: 24
Ürün 2: 7li bel bantlı Jender L beden
Adet: 12
İşlem türü: Satış / Sipariş / Fatura kontrolü
Durum: Onay bekliyor
```

### 2. Hazır butonlarla işlem

Her kayıt için ana aksiyonlar buton olacak:

```text
Onayla
Reddet
Düzelt
Fatura Kesildi
Tahsil Edildi
Ödendi
Ertele
Detay
Cariyi Aç
Belge Yükle
```

### 3. Akıllı cari seçimi

Kullanıcı cari adını tam yazmak zorunda kalmayacak.

Sistem:

```text
Geçmiş kayıtlar
Benzer isimler
Telefon / açıklama / fatura bilgisi
Banka açıklaması
Moka bildirimi
```

üzerinden cari önerisi getirecek.

Belirsiz durumda:

```text
Bu kayıt Gamze Eczanesi mi?
[Gamze Eczanesi] [Gamze Medikal] [Yeni Cari] [Emin Değilim]
```

şeklinde buton sunacak.

### 4. Dosya / ekran görüntüsü ile veri girişi

Kullanıcı şunları yükleyebilecek:

```text
Fatura görseli
Ekran görüntüsü
Banka hareketi dosyası
BizimHesap export
Moka bildirimi
Satış listesi
Stok listesi
```

Sistem:

```text
Okur
Ayrıştırır
Önerir
Kontrol eder
Onaya düşürür
```

### 5. Finansal tabloları konuşarak sorgulama

Örnek komutlar:

```text
Bugünkü net satış kaç?
Bu ay net kar ne durumda?
Moka'da bekleyen ne kadar?
Gamze Eczanesi cari durumunu aç.
Bugün tahsil edilmesi gerekenleri göster.
Bilanço denk mi?
Satış var maliyeti olmayan ürünleri göster.
```

Sistem yazı yazdırmadan ilgili kartı/drawer'ı açacak.

## Ana ekran tasarım etkisi

v53 Dinamik Gelir Tablosu + Dinamik Bilanço ekranında klavye minimum olacak.

Ana ekran aksiyonları:

```text
Dönem seç
Firma seç
Cari seç
Filtre seç
Konuşarak ara
Hazır aksiyon butonları
Detay drawer
Onay merkezi
```

Serbest metin kutusu sadece gerektiğinde olacak.

## Mobil öncelik

Telefon kullanımında:

```text
Büyük butonlar
Kısa seçenekler
Tek elle kullanım
Alt sheet / drawer
Sesli komut alanı
Son kullanılan cariler
Favori işlemler
Hızlı işlem şablonları
```

kullanılacak.

## Hızlı işlem şablonları

Sık kullanılan işlemler şablon olacak:

```text
Satış Gir
Tahsilat Gir
Gider Gir
Ödeme Gir
Fatura Kontrol
Cari Aç
Moka Kontrol
Bugünkü Rapor
Bilanço Kontrol
```

Her şablon mümkün olduğunca hazır seçeneklerle ilerleyecek.

## Onay merkezi mantığı

Sistem otomatik işlem önerir ama emin olmadığı şeyi kesin kayıt yapmaz.

Her öneride:

```text
Önerilen cari
İşlem türü
Tutar/adet
Güven puanı
Eşleşme sebebi
Kaynak
Onay/Reddet/Düzelt butonları
```

bulunacak.

## Klavye kullanımını azaltma kuralları

```text
1. Her uzun form yerine akıllı kısa akış kullanılacak.
2. Her serbest metin alanının yanında hazır seçenek olacak.
3. En çok kullanılan cariler ve ürünler önerilecek.
4. Ürün/cari arama yazıyla değil, son kullanılan + kategori + sesli arama ile desteklenecek.
5. Tahsilat/ödeme/fatura durumları butonla işaretlenecek.
6. Belirsiz kayıtlar onay merkezine düşecek.
7. Kesin kayıt öncesi özet ekranı gösterilecek.
8. Geri alma / düzeltme akışı kolay olacak.
```

## Teknik hedef

v53 geliştirme sırası:

```text
1. Zero Keyboard UX ilkesi ana dokümana eklenecek.
2. Finansal tablo ana ekranında büyük seçim/buton akışı tasarlanacak.
3. Sesli/metin komut parser tasarlanacak.
4. Hızlı işlem şablonları kurulacak.
5. Onay merkezi buton odaklı hale getirilecek.
6. Cari/ürün öneri motoru geliştirilecek.
7. Fatura/görsel/dosya yükleme akışı bağlanacak.
```

## Değişmez kurallar

```text
Önceki özellikler silinmez.
Main branch doğrudan değiştirilmez.
Deploy onaysız yapılmaz.
Sayılar tam gösterilir, K/M kısaltması kullanılmaz.
Açık tema korunur.
Kullanıcıya gereksiz yazı yazdırılmaz.
```
