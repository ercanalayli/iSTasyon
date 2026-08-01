# ALAYLI Otomatik Ödeme ve Abonelik Envanteri

Bu dosya ALAYLI tarafındaki otomatik ödeme, abonelik ve fatura takip mantığını tanımlar.

## Güvenlik kuralı

Public repo içinde tam hesap numarası, tam IBAN, bot token, secret veya özel erişim bilgisi tutulmaz.

Bu dosyada yalnızca maskeli ve operasyonel takip için gerekli özet bilgiler yer alır.

## VakıfBank şirket hesabı

```text
Sınıf             : ALAYLI
Banka             : VakıfBank
Şube              : Organize Sanayi Şube
Hesap Tipi        : Vadesiz TL
IBAN              : TR18 ... 1925 09
Hesap No          : ...192509
Durum             : Aktif
Kullanım          : Şirket ödeme, otomatik ödeme, günlük nakit akışı
```

## Uludağ Elektrik otomatik ödeme talimatları

Bu üç abonelik VakıfBank şirket vadesiz hesaptan otomatik ödeme talimatında izlenecek.

```text
ALAYLI
└── Abonelikler
    └── Elektrik / Uludağ Elektrik
        ├── Kulak
        │   Abone No       : özel veri / private kayıt
        │   Adres Özeti    : İşyeri No:9
        │   Son Fatura     : 2026/06
        │   Son Tutar      : 799,00 TL
        │   Son Ödeme      : 11.06.2026
        │   Ödeme Kaynağı  : VakıfBank şirket vadesiz hesap
        │   Durum          : Otomatik ödeme izleniyor
        │
        ├── Medikal 1
        │   Abone No       : özel veri / private kayıt
        │   Adres Özeti    : İşyeri No:1
        │   Son Fatura     : 2026/06
        │   Son Tutar      : 691,00 TL
        │   Son Ödeme      : 11.06.2026
        │   Ödeme Kaynağı  : VakıfBank şirket vadesiz hesap
        │   Durum          : Otomatik ödeme izleniyor
        │
        └── Medikal 2
            Abone No       : özel veri / private kayıt
            Adres Özeti    : İşyeri No:2
            Son Fatura     : 2026/06
            Son Tutar      : 565,00 TL
            Son Ödeme      : 11.06.2026
            Ödeme Kaynağı  : VakıfBank şirket vadesiz hesap
            Durum          : Otomatik ödeme izleniyor
```

## Aylık kontrol kuralı

Her elektrik faturası için takip zinciri:

```text
Fatura geldi mi?
Son ödeme tarihi geçti mi?
VakıfBank hesabında yeterli bakiye var mı?
Otomatik ödeme banka hareketinde göründü mü?
Fatura kapandı mı?
Dashboard ve Telegram özetine işlendi mi?
```

## Risk kuralı

Banka bakiyesi düşükse ve otomatik ödeme vadesi yaklaşıyorsa dashboardda risk gösterilir.

```text
Risk: Otomatik ödeme başarısız olabilir veya ek hesaptan çekebilir.
```

## Dashboard hedefi

AperiON dashboard içinde aşağıdaki kartlar açılacak:

```text
ALAYLI Elektrik Abonelikleri
Otomatik Ödeme Yaklaşanlar
Banka Bakiye / Talimat Riski
Fatura Kapandı mı Kontrolü
```
