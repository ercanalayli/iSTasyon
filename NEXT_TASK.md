# AperiON Next Task

Son guncelleme: 2026-06-29 Europe/Istanbul

## Aktif Tek Hedef

Yeni banka ekstrelerini Onay Merkezi'nden kontrollu sekilde BizimHesap kuyruğuna almak.

Durum: Ilk BizimHesap kayit kaniti ve queue kapanisi tamamlandi. Yeni kontrolde Onay Merkezi'nde 25 bekleyen banka hareketi var; 19'u yuksek guvenli, 6'si inceleme istiyor. Akbank 2026-06-09, -15,96 TL Banka/POS masrafi kullanici onayi ile queue id `d65f907a-1255-442c-9db4-ed639820c1c9` olarak `ready_for_bizimhesap` durumuna alindi. BizimHesap formu kaydetmeden dolduruldu; kesin kayit icin ikinci acik onay bekleniyor.

## Neden Bu Hedef?

Kullanici bankadan gelen hareketlerin analiz edilmis sekilde Onay Merkezi'ne dusmesini, tek tek onaylanmasini ve BizimHesap'a kontrollu islenmesini istiyor. Bir onceki kayit kanitlandi; siradaki hedef ayni guvenli akisi yeni kayitlarda tekrar etmek.

## Siradaki Is Paketi

1. Kullanici `BizimHesap'a kaydetmeyi onayliyorum` derse sadece queue id `d65f907a-1255-442c-9db4-ed639820c1c9` icin canli save calistirilacak.
2. Save sonrasi BizimHesap kayit kaniti ve diagnostik alinacak.
3. Queue `processed` durumuna kapanacak mi kontrol edilecek.
4. `bizimhesap:queue:dry` yeniden calistirilip hazir kuyruk 0'a indi mi bakilacak.
5. Sonraki banka adayina gecilmeden durum dosyalari guncellenecek.

## Kabul Kriteri

- Secilen hareketin kullanici tarafindan onaylandigi net: tamamlandi.
- Onay sonrasi `bizimhesap_queue` icinde hazir kayit gorulmelidir: tamamlandi.
- Worker dry-run planinda hesap/cari/kayit turu okunmalidir: tamamlandi.
- BizimHesap formu kaydetmeden doldurulmalidir: tamamlandi.
- Kesin canli kayit kullanici onayi olmadan yapilmamalidir: devam ediyor, ikinci acik onay bekleniyor.
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
