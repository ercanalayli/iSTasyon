# AperiON iSTasyon – Roadmap

Bu roadmap, AperiON iSTasyon'un parça parça dağılmadan ürün gibi geliştirilmesi için ana sırayı belirler.

## Sprint 0 – Mimari Sabitleme

Amaç: Proje kurallarını tek doğruluk kaynağına almak.

Yapılacaklar:

- /docs klasörü oluşturuldu.
- Vizyon, mimari, veri modeli ve ana kurallar yazıldı.
- Yanlış isimlerin temizlenmesi planlanacak.
- Kod geliştirmeden önce kurallar referans alınacak.

## Sprint 1 – İş Bankası Mutabakatı

Amaç: Bir banka hesabını baştan sona güvenilir şekilde bitirmek.

Yapılacaklar:

1. İş Bankası onay kuyruğunu doğrula.
2. ID 33-35 onay durumunu kontrol et.
3. Sadece onaylı kayıtları BizimHesap'a işle.
4. AperiON AUTO notu ekle.
5. İşlem sonrası BizimHesap'ı tekrar oku.
6. Eşleşmeyi doğrula.
7. Telegram durumunu güncelle.
8. ID 26-32 için onay durumunu kontrol et.
9. ID 36-50'yi 10'arlı batch ile yeni formatta gönder.

Başarı ölçütü:

- Kullanıcı onaysız kayıt yok.
- Mükerrer kayıt yok.
- Onaylananlar işlendi.
- İşlenenler doğrulandı.

## Sprint 2 – Operasyon Merkezi Ana Ekranı

Amaç: Tüm sinyalleri tek profesyonel mobil ekranda göstermek.

Kartlar:

- Kritik
- Bankalar
- Gmail
- e-Fatura / BizimHesap
- Moka / POS
- Kredi Kartı / KMH / Kredi
- Satış / Stok
- Riskler

## Sprint 3 – Gmail Sinyal Motoru

Amaç: Gmail'deki finans/operasyon maillerini otomatik sınıflandırmak.

Öncelikler:

- Banka ekstresi
- FAST/EFT/dekont
- e-Fatura
- Vergi/SGK
- Moka
- BizimHesap
- ÜTS

## Sprint 4 – Diğer Bankalara Yayılım

İş Bankası modeli başarıyla tamamlanınca sıralama:

1. VakıfBank
2. Yapı Kredi
3. Akbank
4. Halkbank

## Sprint 5 – Satış / Masraf / Stok Analizi

SATIŞ RAPORU dosyaları ve masraf verileri standart import yapısına bağlanacak.

Amaç:

- Ürün satış analizi
- Cari performans
- Kategori satışları
- Alış fiyatı eksik uyarısı
- Kâr analizi
- Stok bağlantısı

## Sprint 6 – ALAYLI Genel Bilanço

Amaç: Varlıklar, borçlar, çekler, SGK alacağı, Moka alacağı, kredi kartları, KMH, krediler ve ortak ayrılığı takibi.

Başlık standardı:

**ALAYLI Genel Bilanço**

“Çalışması” ifadesi kullanılmayacak.

## Sprint 7 – Şahsi Finans Otomasyonu

Amaç: Şahsi banka, kredi kartı, KMH, abonelik ve ödeme risklerini ALAYLI'dan ayrı ama aynı merkezde takip etmek.
