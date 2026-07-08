# AperiON iSTasyon – Mimari

AperiON iSTasyon 8 ana motor üzerine kurulacaktır.

## 1. Veri Toplama Motoru

Kaynaklardan ham veriyi toplar. Karar vermez, kayıt işlemez.

Kaynaklar:

- Gmail
- Banka ekstreleri
- BizimHesap
- Moka / POS
- e-Fatura / e-Arşiv
- ÜTS
- Satış raporları
- Masraf raporları
- Telegram
- GitHub Actions
- Manuel kullanıcı girişi

## 2. Kimliklendirme Motoru

Her kaydın ne olduğunu belirler.

Örnek sınıflar:

- Banka ekstresi
- Vadesiz hesap hareketi
- Kredi kartı ekstresi
- FAST / EFT / dekont
- POS banka aktarımı
- e-Fatura
- Vergi / SGK
- Moka hareketi
- Şahsi abonelik
- Operasyon uyarısı

## 3. Bilgi Zenginleştirme Motoru

Kayıt karar verilebilir hale getirilir.

Zorunlu kanıt alanları:

- Kaynak
- Belge adı
- Gönderen
- Tarih / saat
- Banka / hesap
- Tutar
- Açıklama
- Karşı taraf
- Referans / hash
- Bakiye
- Ham ekstre satırı
- PDF sayfa no veya dosya satırı

## 4. Karar Motoru

Kayıt için önerilen aksiyonu belirler:

- Zaten işlenmiş
- Eksik
- Şüpheli
- Mükerrer
- Onay bekliyor
- Transfer
- Tahsilat
- Tedarikçi ödemesi
- Gider
- Sadece arşiv

## 5. Onay Motoru

Kullanıcıya kanıtlı karar ekranı sunar.

Kullanıcı onayı olmadan riskli veya finansal kayıt BizimHesap'a yazılmaz.

## 6. İşleme Motoru

Sadece onaylanmış kayıtları hedef sisteme işler.

Hedefler:

- BizimHesap
- AperiON kayıtları
- Arşiv
- Telegram bildirimleri

## 7. Doğrulama Motoru

İşlemden sonra hedef sistemi tekrar okur.

Kontroller:

- Kayıt gerçekten oluştu mu?
- Tutar doğru mu?
- Tarih doğru mu?
- Hesap doğru mu?
- Bakiye veya mutabakat uyumlu mu?

## 8. Üst Akıl / Operasyon Merkezi

Tüm sinyalleri tek ekranda gösterir:

- Bugün kritik
- Bankalar
- Gmail
- e-Fatura
- Moka / POS
- Kredi kartı / KMH / kredi
- Satış / stok
- Risk ve gecikenler
- Tamamlananlar

## Yasak mimari davranışlar

- Kaynağı belli olmayan kritik görev üretmek
- Demo veriyi gerçek gibi göstermek
- Gmail'den geleni kullanıcı butonuyla manuel onaya düşürtmek
- Finansal kaydı kanıtsız onaya göndermek
- Kullanıcı onayı olmadan BizimHesap'a kayıt atmak
- Aynı banka hareketini ikinci kez işlemek
