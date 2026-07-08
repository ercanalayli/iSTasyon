# AperiON iSTasyon – BizimHesap Kuralları

BizimHesap, AperiON iSTasyon için hedef kayıt ve doğrulama sistemlerinden biridir.

## Ana ilke

BizimHesap'a kayıt sadece İşleme Motoru üzerinden atılır.

Hiçbir Gmail parser, banka parser veya Telegram scripti doğrudan BizimHesap'a körlemesine kayıt yazamaz.

## İşleme öncesi zorunlu kontroller

Her kayıt için:

- Kaynak belge var mı?
- Kanıt var mı?
- Mükerrer kontrol yapıldı mı?
- Cari/karşı taraf belli mi?
- Hesap belli mi?
- İşlem tipi belli mi?
- Kullanıcı onayı gerekiyor mu?
- Kullanıcı onayı alındı mı?

## İşlem tipleri

- Tahsilat
- Tedarikçi ödemesi
- Gider
- Hesaplar arası transfer
- Kredi kartı ödemesi
- KMH/kredi işlemi
- POS banka aktarımı
- Düzeltme
- Sadece arşiv

## POS banka aktarımı

POS ile tahsil edilen tutarın ertesi gün bankaya yatması tahsilat olarak işlenmez.

Bu işlem hesaplar arası transferdir.

Kaynak örneği:

- POS POS POS KREDI KARTI

Hedef örneği:

- *İŞ BANKASI
- *VAKIFBANK
- ilgili banka hesabı

## Cari boşsa

Cari/karşı taraf tespit edilemiyorsa boş bırakılmaz.

Gösterilecek ifade:

**Cari eşleşmesi bekliyor**

Bu kayıt kullanıcının düzelt/onay ekranında tamamlamasına bırakılır.

## Kayıt notu

AperiON tarafından işlenen kayıtların açıklamasında veya notunda şu iz bulunmalıdır:

**AperiON AUTO**

Örnek:

AperiON AUTO / İş Bankası mutabakat / kaynak: 2026-06 ekstresi

## İşlem sonrası doğrulama

BizimHesap'a kayıt atıldıktan sonra sistem tekrar BizimHesap'ı okur.

Kontrol:

- Kayıt oluştu mu?
- Tutar doğru mu?
- Tarih doğru mu?
- Banka hesabı doğru mu?
- Açıklama/not doğru mu?
- Mükerrer kayıt oluşmadı mı?

Doğrulama yapılmadan kayıt “tamamlandı” sayılmaz.

## Durumlar

- approved: kullanıcı onayladı, henüz işlenmedi
- processing: BizimHesap'a işleniyor
- posted: kayıt atıldı
- verified: tekrar kontrol edildi ve doğrulandı
- failed: kayıt atılamadı veya doğrulanamadı

## Güvenlik

BizimHesap kullanıcı bilgileri, tokenlar, şifreler ve oturum bilgileri frontend'e veya dokümanlara açık yazılmaz.

Bunlar güvenli ortam değişkenleri veya yerel güvenli çalışma alanında tutulur.
