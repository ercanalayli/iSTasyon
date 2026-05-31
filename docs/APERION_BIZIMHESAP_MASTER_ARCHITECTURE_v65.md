# AperiON v65 - BizimHesap Ana Program Mimarisi

## Ana karar

BizimHesap, ALAYLI Medikal operasyonunun ana programıdır.

AperiON, BizimHesap'in yerine gecmeyecek.

AperiON, BizimHesap uzerinde calisan akilli komuta, kontrol, eslestirme, onay ve raporlama katmani olacaktir.

## Sistem rolleri

### BizimHesap

Ana operasyon kaynagi:

- Hesaplar
- Banka hesaplari
- Kasa hesaplari
- POS hesaplari
- Kredi kartlari
- Cari kartlar
- Satislar
- Alislar
- Giderler
- Tahsilatlar
- Odemeler
- Stok / urun bilgileri

### AperiON

Ust akil ve kontrol katmani:

- Veriyi okur
- Siniflandirir
- Mükerrer kontrol yapar
- Cari onerir
- Gider yeri onerir
- Gelir yeri onerir
- Guven puani verir
- Emin degilse needs_review durumunda bekletir
- Onay Merkezine dusurur
- Onaydan sonra kesin isleme hazirlar
- CEO / CFO ekranlarinda sinyal verir

## Kritik kural

BizimHesap ana kayittir.

AperiON dogrudan kesin muhasebe kaydi olusturmaz.

AperiON once onay ister.

## Hesap mantigi

Ekran goruntulerindeki hesaplar su gruplarda takip edilecektir:

1. Kasa Hesaplari
2. Banka Hesaplari
3. POS Hesaplari
4. Kredi Kartlari
5. Ortaklar
6. Veresiye Hesaplari
7. Doviz Kasalari
8. Depozito / Emanet Hesaplari

## Hesap eslestirme prensibi

Banka hesabi cari degildir.

Kasa hesabi cari degildir.

Kredi karti cari degildir.

POS hesabi cari degildir.

Bunlar finansal hesap veya ara hesaptir.

Islemde asil cari/karşı taraf ayrica tespit edilir.

Ornek:

- `YAPI KREDI SIRKET` = banka hesabi
- `AKBANK SIRKET` = banka hesabi
- `ALAYLI MOKA POS` = POS / ara tahsilat hesabi
- `KK YAPI KREDI SIRKET` = kredi karti hesabi
- `TL Kasa` = nakit kasa

## Banka hareketi akisi

1. Gmail'e banka ekstresi gelir.
2. AperiON mail ekini okur.
3. Banka ve hesap tespit edilir.
4. Satir ID uretilir.
5. Daha once islenen ID varsa elenir.
6. Yeni satirlar pending havuza duser.
7. Sistem hareket tipi onerir.
8. Sistem cari/karşı taraf onerir.
9. Sistem gider/gelir yeri onerir.
10. Guven puani ve oneri sebebi gosterilir.
11. Kullanici onaylar, duzeltir, bekletir veya reddeder.

## BizimHesap hesaplari icin ana sozluk ihtiyaci

AperiON'un dogru calismasi icin BizimHesap hesap adlari bir sozluge alinacak.

Her hesap icin alanlar:

- hesap_kodu
- bizimhesap_adi
- hesap_grubu
- para_birimi
- rol
- aktif_pasif
- aciklama
- eslestirme_anahtar_kelime
- varsayilan_islem_tipi

## Hesap grubu ornekleri

### Banka hesaplari

- YAPI KREDI SIRKET
- AKBANK SIRKET
- VAKIF SIRKET
- IS BANKASI
- GARANTI SIRKET
- ERCAN YAPI KREDI
- ERHAN YAPI KREDI
- GARANTI ERCAN
- GARANTI ERHAN
- EURO YAPI KREDI

### POS / ara hesaplar

- ALAYLI MOKA POS
- MOCA SONOVA POS KREDI
- POS POS POS KREDI KARTI
- SGK KESINTI
- SIVANTOS MAIL ORDER HESABI

### Kasa hesaplari

- TL Kasa
- KULAK KASA
- DOLAR
- EURO
- KIRA DEPOZITO

### Kredi kartlari

- KK YAPI KREDI SIRKET
- KK ARTI AKBANK SIRKET
- KK ERCAN YAPIKREDI
- KK ERHAN HSBC
- KK ERHAN YAPIKREDI
- KK FINANS ERHAN
- KK HALKBANK ERCAN
- KK IS ERHAN
- KK IS SIRKET
- KK VAKIF SIRKET
- KK ERCAN HSBC
- KK ERHAN BONUS GARANTI

## Onay Merkezi kart zorunluluklari

BizimHesap'tan veya mailden gelen her hareket kartinda su bilgiler olmali:

- Kaynak: BizimHesap / Gmail / Telegram / Manuel
- Hesap grubu
- BizimHesap hesap adi
- Banka/kasa/POS/kredi karti hesap kodu
- Islem tarihi
- Tutar
- Aciklama
- Sistem onerisi: hareket tipi
- Sistem onerisi: cari/karşı taraf
- Sistem onerisi: gider yeri veya gelir yeri
- Guven puani
- Oneri sebebi
- Durum

## Ana ekran sinyal kurallari

AperiON ana ekraninda su sinyaller gorunmeli:

- Mailden yeni banka hareketi var
- Onay bekleyen hareket var
- Mükerrer ekstre geldi
- Cari eslesmesi eksik
- Gider yeri eksik
- Moka/POS eslesmesi bekliyor
- Kredi karti hareketi bekliyor
- Nakit/kasa farki var

## Kullanici deneyimi kuralı

Kullanici ham hesap listesini tek tek dusunmek zorunda kalmayacak.

AperiON hesaplari tanıyacak.

AperiON islem onerecek.

AperiON emin degilse bekletecek.

Kullanici son karari verecek.

## Sonuc

BizimHesap ana programdir.

AperiON, BizimHesap'in ustunde calisan zeki finans kontrol ve onay merkezidir.
