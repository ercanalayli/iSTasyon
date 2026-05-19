# AperiON BizimHesap Klonu Canlı İşleyiş

Bu sistemin doğru adı ve mantığı: BizimHesap Klonu.

## Amaç

İşyerindeki Windows bilgisayar BizimHesap verisini düzenli çeker. AperiON canlı ekranı bu veriyi kullanır. Kullanıcı cep telefonundan işyerini kontrol eder.

## Mevcut çalışan görevler

### 1. AperiON_BizimHesap_Bot

- Dosya: `C:\Users\HP\Desktop\ErpaltH\bizimhesap_bot.js`
- Görev: BizimHesap satış verisini çeker.

### 2. AperiON_BizimHesap_Klon_Saatlik

- Dosya: `C:\Users\HP\Desktop\ErpaltH\aperion_veri_senkron.js --firma alayli`
- Görev: BizimHesap klon senkronunu çalıştırır.
- Bu görev ana veri çekme hattıdır.

## Klon senkronunun çalıştırdığı parçalar

- `bizimhesap_bot.js`
- `bizimhesap_son_islemler_izle.js`
- `bizimhesap_masraf_cek.js`
- `bizimhesap_urun_stok_cek.js`

## Durum dosyaları

- `C:\Users\HP\Desktop\ErpaltH\data\aperion_last_sync.json`
- `C:\Users\HP\Desktop\ErpaltH\aperion_veri_senkron_log.txt`
- `C:\Users\HP\Desktop\ErpaltH\bot_log.txt`
- `C:\Users\HP\Desktop\ErpaltH\masraf_cek_log.txt`
- `C:\Users\HP\Desktop\ErpaltH\urun_stok_cek_log.txt`
- `C:\Users\HP\Desktop\ErpaltH\bizimhesap_son_islemler_log.txt`

## Canlı ekranda gösterilecekler

AperiON ana ekranda şu bilgiler görünmeli:

- Son klon senkron zamanı
- Bugün satış toplamı
- Bugün işlem sayısı
- Dün satış toplamı
- Dün işlem sayısı
- Son satış tarihi
- Veri durumu: Güncel / Kontrol Gerekli / Eski

## Kritik kural

Yeni ayrı bot kurulmayacak. Mevcut `AperiON_BizimHesap_Klon_Saatlik` görevi esas alınacak.

## Sonraki geliştirme

`aperion_last_sync.json` veya klon senkron sonucu Supabase'e yazılacak. Canlı AperiON ekranı bu status bilgisini okuyacak.
