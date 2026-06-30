# AperiON Next Task

Son guncelleme: 2026-06-29 Europe/Istanbul

## Aktif Tek Hedef

Yeni banka ekstrelerini Onay Merkezi'nden kontrollu sekilde BizimHesap kuyruğuna almak.

Durum: Ilk BizimHesap kayit kaniti ve queue kapanisi tamamlandi. Akbank 2026-06-09, -15,96 TL Banka/POS masrafi kullanici ikinci onayi ile BizimHesap'a kaydedildi. VakifBank 2026-05-13, -33,03 TL Banka/POS masrafi kullanici devam onayi ile queue id `9eb2c038-8eec-4d28-82f8-0078285ae902` olarak `ready_for_bizimhesap` durumuna alindi. BizimHesap formu kaydetmeden dolduruldu; kesin kayit icin ikinci acik onay bekleniyor.

## Neden Bu Hedef?

Kullanici bankadan gelen hareketlerin analiz edilmis sekilde Onay Merkezi'ne dusmesini, tek tek onaylanmasini ve BizimHesap'a kontrollu islenmesini istiyor. Bir onceki kayit kanitlandi; siradaki hedef ayni guvenli akisi yeni kayitlarda tekrar etmek.

## Siradaki Is Paketi

1. Kullanici ikinci kez acikca `BizimHesap'a kaydetmeyi onayliyorum` derse sadece queue id `9eb2c038-8eec-4d28-82f8-0078285ae902` icin canli save calistirilacak.
2. Save sonrasi BizimHesap kayit kaniti ve diagnostik alinacak.
3. `npm run bizimhesap:queue:dry` ile hazir kuyruk 0'a indi mi kontrol edilecek.
4. Sonraki banka adayina gecilmeden durum dosyalari guncellenecek.
5. Dusuk guvenli veya cari belirsiz kayitlar inceleme listesinde kalacak.

## Kabul Kriteri

- Secilen hareketin kullanici tarafindan onaylandigi net: tamamlandi.
- Onay sonrasi `bizimhesap_queue` icinde hazir kayit gorulmelidir: tamamlandi.
- Worker dry-run planinda hesap/cari/kayit turu okunmalidir: tamamlandi.
- BizimHesap formu kaydetmeden doldurulmalidir: tamamlandi.
- Kesin canli kayit kullanici onayi olmadan yapilmamalidir: tamamlandi, ikinci acik onay sonrasi tek queue icin save calisti.
- Kuyruk kapanis fonksiyonu kurulu olmalidir: tamamlandi.
- Kayit olustu kaniti BizimHesap ekranindan alinmalidir: kullanici tarafindan dogrulandi.
- Mukerrer kayit engeli olmalidir: tamamlandi, manuel kanitli queue tekrar save yapmadan atlanir.
- Test sonucu tur sonunda raporlanmalidir: tamamlandi.

Yeni aday kabul kriteri:

- Aday id net olacak.
- Hedef hesap/cari/kategori net olacak.
- Dusuk guven veya inceleme isteyen kayit otomatik alinmayacak.
- Kullanici onayi olmadan RPC veya BizimHesap save calismayacak.

## Bekleyen Sonraki Hedefler

- BizimHesap B2B API secretlarini ekle: `BIZIMHESAP_B2B_TOKEN`, `BIZIMHESAP_FIRM_ID`.
- BizimHesap uyelik ekraninda `Api Key(FirmID)` ve `Zirve Express Aktarim Api Key` bulundu; degerler koda yazilmadan GitHub secret/env olarak kullanilacak.
- BizimHesap'tan B2B token/API yetkisinin aktif olup olmadigi teyit edilmeli; Zirve Express anahtari GET endpointlerinde 401 verdi.
- Fatura/cari/urun/stok hattini B2B API'ye tasima planini cikar.
- Banka onay hareketlerinde her kaydin BizimHesap'a islenip islenmedigini kanitlayan durum kolonu.
- Finans Komuta Merkezi tek ekran karar akisi.
- Firma izolasyonu: Alayli verisi baska firmalara karismayacak garanti.
- Urun karti ve cari karti icin gercek kaynak eksiklerini kapatma.
- Telegram evrak/gorsel akisini Onay Merkezi'ne baglama.
