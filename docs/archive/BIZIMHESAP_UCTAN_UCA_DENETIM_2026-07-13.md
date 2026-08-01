# BizimHesap Uctan Uca Denetim - 2026-07-13

Denetim modu: salt-okunur. Bu denetimde BizimHesap'a kayit, banka onayi,
Supabase yazimi veya finansal hareket olusturulmamisti.

## Sonuc

BizimHesap girisi ve ALAYLI MEDIKAL firma secimi calisiyor. Windows'taki
saatlik klon ise tamamen saglikli degil: masraf okunuyor fakat Supabase
`masraf_raw` yazimi RLS politikasi nedeniyle reddediliyor. Bu nedenle retry
runner her saat `BASARISIZ` ile kapanmakta ve gider/finans gorunumu eksik veya
eski kalabilmektedir.

## Kanitlar

- Gercek Windows gorevi `C:\Users\HP\Desktop\ErpaltH` klasorundeki
  `aperion_clone_retry_runner.cmd` dosyasini calistiriyor; aktif GitHub repo
  calisma kopyasi `C:\Users\HP\Desktop\ErpaltH_live_main` degil.
- `AperiON_BizimHesap_Klon_Saatlik` ve sabah kontrol gorevinin son sonucu
  `1` (basarisiz) goruldu.
- 2026-07-13 yerel son senkronda satis, urun/stok ve son islemler basarili;
  masraf adimi basarisizdir.
- `masraf_cek_log.txt` tekrarli olarak su hatayi veriyor:
  `new row violates row-level security policy for table "masraf_raw"`.
- Eski gorev klasorundeki `bizimhesap_masraf_cek.js`, servis rol anahtarini
  okumuyor; yalnizca `SUPABASE_KEY` veya gomulu publishable anahtar kullanir.
  Gorev klasorunun `.env` dosyasinda ise yalnizca BizimHesap giris/profil
  ayarlari vardir; Supabase servis rol anahtari yoktur.
- Guncel repo kopyasindaki masraf botu `SUPABASE_SERVICE_ROLE_KEY` onceligini
  destekliyor, fakat Windows gorevi bu guncel kopyayi calistirmiyor.
- GitHub `hourly-bizimhesap-sync` workflow'unun son calismalari basarili
  gorunuyor. Bu, CI adiminin tamamlandigini gosterir; Windows'taki yerel
  saatlik gorevin basarili oldugunu veya masraf verisinin tam yazildigini
  kanitlamaz.
- Kod seviyesinde `verify:bizimhesap:queue` basarili; fakat denetimde yeni
  olusmus bir canli kuyruk kaydi/sonuc kaniti bulunmadi.
- B2B API on kontrolu token ve firm id eksigi nedeniyle canli API cagrisi
  yapmadi. Bu denetim B2B ile veri degistirmedi.

## Etki

- Satis ve stok kaynaklari son yerel calismada okunabilmektedir.
- Gider verisi `masraf_raw` tablosuna yazilamadigi icin gelir tablosu,
  plan/tahakkuk/nakit karsilastirmasi ve gider analizleri tam guncel kabul
  edilmemelidir.
- Onay Merkezi -> BizimHesap kuyruk hatti kod olarak bagli olsa da bu denetimde
  tekil bir kaydin canli kuyruk ve BizimHesap sonucuyla kapandigi kanitlanmadi.

## Duzeltme Sirasi

1. Windows gorevinin tek bir guncel, surum kontrollu proje klasorunu
   calistirmasi saglanacak.
2. Gorevin kullandigi ortamda Supabase servis rol anahtari sadece guvenli
   secret/Windows Credential veya gorev ortami uzerinden saglanacak; anahtar
   koda veya loga yazilmayacak.
3. Masraf botu servis rol anahtarini oncelikle kullanacak ve eksikse acik
   yapilandirma hatasiyla duracak.
4. Salt-okunur testten sonra tek masraf senkronu calistirilacak; `masraf_raw`
   yazimi, `aperion_last_sync.json` ve retry sonucu birlikte dogrulanacak.
5. Sonra bir onay kaydi icin kuyruk -> BizimHesap sonuc kaniti ayri ve
   kullanici onayli olarak kapatilacak.

## Operasyon Karari - 2026-07-13

- GitHub `Hourly BizimHesap Sync` son bes calismada basarili oldugu icin
  tek kaynak senkron yazicisi olarak korunacaktir.
- Eski yerel `AperiON_BizimHesap_Klon_Saatlik` gorevi durduruldu. Bu gorev
  basarisiz RLS yazimlarini tekrarliyor ve ayri klasor calistiriyordu.
- `AperiON_Ofis_Sabah_0805_Klon_Kontrol` gorevi ayri yonetici sahibiyle
  olusturuldugu icin bu oturumdan devre disi birakilamadi (`Erisim engellendi`).
  Bu gorev kaldigi surece sabah eski klasorde bir ek deneme yapabilir; yonetici
  yetkili oturumda devre disi birakilmasi gerekir.
