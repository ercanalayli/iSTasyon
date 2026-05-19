# AperiON Analiz ve Rapor Gereksinimleri

Bu belge AperiON / iSTasyon sisteminde canlı ekranda analiz edilmesi ve raporlanması gereken ana başlıkları sabitler.

## Ana Amaç

İşyerindeki Windows bilgisayarda çalışan BizimHesap Klonu verileri düzenli çeker. AperiON bu verileri işler. Kullanıcı cep telefonundan işyerini canlı kontrol eder.

## 1. Satış Analizi

- Bugün satış toplamı
- Dün satış toplamı
- Bu hafta satış toplamı
- Bu ay satış toplamı
- Bu yıl satış toplamı
- Geçen yıl satış toplamı
- İşlem sayısı
- Adet toplamı
- Ortalama satış fiyatı
- En büyük satış
- Son satış tarihi
- Günlük / haftalık / aylık trend

## 2. Kategori Analizi

- Kategori bazlı ciro
- Kategori bazlı adet
- Kategori bazlı işlem sayısı
- Kategori performansı
- En çok satan kategoriler
- Zayıf kalan kategoriler
- Kategoriye tıklayınca ürün kırılımı

## 3. Ürün Analizi

- Ürün bazlı ciro
- Ürün bazlı adet
- Ürün bazlı müşteri sayısı
- Ürün bazlı son satış tarihi
- En çok satan ürünler
- Yavaşlayan ürünler
- Satışı duran ürünler
- Ürün kârlılığı
- Alış fiyatı / satış fiyatı kontrolü
- Kategorisi olmayan ürün kontrolü
- Alış fiyatı olmayan ürün kontrolü

## 4. Müşteri / Cari Analizi

- Müşteri bazlı satış toplamı
- Müşteri bazlı son satış tarihi
- Müşteri bazlı tahsilat durumu
- En çok alış yapan müşteriler
- Uzun süredir alış yapmayan müşteriler
- Riskli cariler
- Tahsilat bekleyen müşteriler
- Cari bakiye / satış ilişkisi

## 5. Finans Analizi

- Gelir toplamı
- Gider toplamı
- Net durum
- Kasa / banka durumu
- Kredi kartı / banka / Moka etkisi
- Günlük finans özeti
- Haftalık finans özeti
- Aylık finans özeti
- Gelir tablosu
- Bilanço özeti
- Finansal uyarılar

## 6. Gider Analizi

- Bugün gider
- Bu ay gider
- Bu yıl gider
- Kategori bazlı gider
- En büyük gider
- Gider / ciro oranı
- Masraf trendi
- Beklenmeyen gider artışı

## 7. Banka / Moka Analizi

- Moka United bekleyen tahsilatlar
- Moka'dan bankaya geçen tutarlar
- Banka hareketleri
- Eşleşmeyen banka hareketleri
- Onay bekleyen kayıtlar
- Tahsilat gecikmeleri
- POS / taksit / vade takibi

## 8. Veri Güvenilirliği

- Son BizimHesap Klon senkron zamanı
- Son başarılı veri çekimi
- Son satış tarihi
- Bugün kayıt sayısı
- Dün kayıt sayısı
- Bu hafta kayıt sayısı
- Veri eski mi güncel mi?
- Bot hata verdi mi?
- Kaynak veri ile AperiON toplamı uyumlu mu?
- Doğrulandı / Kontrol Gerekli / Uyuşmazlık etiketi

## 9. Uyarı ve Alarm Sistemi

- Veri 1 saatten eskiyse uyarı
- Gün içinde satış yoksa uyarı
- Dün satış 0 ise kontrol uyarısı
- Bot hata verdiyse kırmızı alarm
- Kategori / ürün / cari olağan dışı değişim uyarısı
- Riskli cari uyarısı
- Moka bekleyen tahsilat uyarısı

## 10. Telefon Kullanımı

- Ana ekranda tek bakışta durum
- Bugün / Dün / Bu Hafta / Bu Ay hızlı filtreleri
- Yeşil / turuncu / kırmızı durum kartları
- Detaya tıklayınca ürün / müşteri / kategori kırılımı
- Gereksiz teknik bilgi göstermeden yönetici özeti

## 11. Temel Kural

- Ayrı ayrı kopuk ekranlar olmayacak.
- AperiON ana ekran olacak.
- Finans, satış, cari, banka, Moka ve veri kontrol aynı sistemde birleşecek.
- Eski sistem silinmeyecek.
- Beğenilmeyen canlı değişiklikte geri dönüş hızlı olacak.
- Her geliştirme bu analiz ve rapor gereksinimlerine göre yapılacak.
