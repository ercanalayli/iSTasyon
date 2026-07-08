# AperiON iSTasyon – Banka Kuralları

Bu dosya banka ekstreleri, POS hareketleri, KMH/kredi kartı ve BizimHesap mutabakat kurallarının tek doğruluk kaynağıdır.

## Genel akış

1. Banka ekstresi Gmail, dosya veya manuel yükleme ile alınır.
2. Ekstre satır satır okunur.
3. BizimHesap ilgili banka hesabı okunur.
4. Kayıtlar ayrılır:
   - Zaten işlenmiş
   - Eksik
   - Muhtemel eşleşen
   - Şüpheli
   - Yanlış hesap/tür
   - Mükerrer
5. Eksikler kanıtlı şekilde onaya gönderilir.
6. Kullanıcı onayı olmadan BizimHesap'a kayıt atılmaz.
7. Onaylanan kayıtlar işlenir.
8. İşlem sonrası BizimHesap tekrar okunur ve doğrulama yapılır.

## İş Bankası pilot durumu

İş Bankası pilot banka olarak kabul edilmiştir.

Bilinen durum:

- Son 1 yıl ekstresi okundu.
- Ekstrede 648 hareket bulundu.
- BizimHesap'ta 189 hareket görüldü.
- Net eşleşen: 173
- Muhtemel eşleşen: 2
- Eksik görünen: 473
- Onay kuyruğuna hazır: 469
- Son 30 gün için ID 26-50 arası 25 hareket kuyruğa alındı.
- ID 26-32 detaylı formatla Telegram'a gönderildi.
- ID 33-35 kullanıcı tarafından onaylandı.
- BizimHesap'a kayıt atılan işlem: 0

Öncelik: İş Bankası tamamlanmadan diğer bankalara geçilmemelidir.

## POS kuralı

POS kredi kartı ile tahsil edilen tutarların ertesi gün bankaya yatması tahsilat değildir.

Bu işlem:

- İşlem tipi: transfer
- Kaynak hesap: POS POS POS KREDI KARTI
- Hedef hesap: paranın yattığı banka hesabı, örn. *İŞ BANKASI

Güven 100/100 olsa bile kullanıcı onayı olmadan BizimHesap'a otomatik yazılmayacaktır.

## Kanıt zorunluluğu

Onay ekranında ve Telegram mesajında şu bilgiler mümkün olduğunca gösterilmelidir:

- Banka
- Hesap
- Ekstre tarihi
- Ekstre saati
- Kaynak dosya / mail eki
- İşlem kanalı
- Referans / hash
- Tutar
- Bakiye
- Açıklama
- Uzun açıklama
- Karşı taraf
- Kaynak hesap
- Hedef hesap
- PDF sayfa no veya Excel satır no
- Ham ekstre satırı
- AperiON yorumu

Sadece “POS Otomatik”, “NET SATIŞ TUTARI” veya benzeri kısa açıklama ile onay alınmaz.

## Mükerrer kontrol

Aynı hareket ikinci defa işlenmeyecektir.

Banka hareketleri için `bank_row_key` zorunludur.

Mükerrer kontrol alanları:

- Banka
- Hesap
- Tarih
- Saat
- Tutar
- Açıklama
- Referans
- Belge hash
- Satır no

## Cari boşsa

Cari/karşı taraf tespit edilemiyorsa boş bırakılmaz.

Gösterilecek ifade:

**Cari eşleşmesi bekliyor**

## Telegram durumları

Onaya gönderildi:

- ONAY BEKLİYOR - APERION

Onaylandı:

- ONAYLANDI - APERION

Reddedildi:

- REDDEDİLDİ - APERION

BizimHesap'a işlendi:

- BİZİMHESAP'A İŞLENDİ - APERION

## Banka bazlı parser notları

- Excel gelen İş Bankası / VakıfBank ekstreleri önceliklidir.
- PDF gelen Halkbank ekstreleri için güvenilir PDF parser gereklidir.
- Fotoğraf/OCR son çare olarak kullanılmalıdır.
