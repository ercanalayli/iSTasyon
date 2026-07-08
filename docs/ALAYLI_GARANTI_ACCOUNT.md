# ALAYLI Garanti Bankası Hesap Envanteri

Bu dosya Garanti Bankası tarafındaki ALAYLI şirket hesabı için maskeli kalıcı kart kaydıdır.

## Güvenlik

Tam IBAN, tam hesap numarası ve müşteri numarası public repo içinde açık tutulmaz. Gerçek değerler private veri alanında saklanır.

## Banka Hesabı Kartı

```text
Sınıf                  : ALAYLI
Banka                  : Garanti BBVA
Hesap Adı              : alaylı medikal
Hesap Sahibi           : ALAYLI MEDİKAL ORTOPEDİ TAŞIMACILIK TİC. LTD. ŞTİ.
Şube / Hesap Özeti     : İnegöl / maskeli hesap
IBAN                   : TR23 ... 2987 66
Hesap Açılış Tarihi    : 23.02.2006
Hesap Türü             : Vadesiz Hesap
Döviz Kodu             : TL
Bakiye                 : 74,37 TL
Kullanılabilir Bakiye  : 14,56 TL
Blokeli Tutar          : 59,81 TL
Durum                  : Aktif
Risk                   : Kullanılabilir bakiye çok düşük; otomatik ödeme ve tahsilat kontrolünde riskli.
```

## Takip kuralı

```text
Bakiye günlük izlenecek.
Blokeli tutar ayrı gösterilecek.
Kullanılabilir bakiye kritik limitin altındaysa dashboardda uyarı üretilecek.
Hesap hareketleri banka ekstresiyle doğrulanacak.
```
