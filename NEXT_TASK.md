# AperiON Next Task

Son guncelleme: 2026-06-29 Europe/Istanbul

## Aktif Tek Hedef

Banka hareketinin BizimHesap kaydi sonrasi kuyruk kapanis kanitini tamamlamak.

Durum: Kullanici `BizimHesap'a kaydetmeyi onayliyorum` dedi. Sadece queue id `3b30e1a0-0f02-4b0d-b03c-ae2779d448fa` icin worker save modu calisti ve BizimHesap kaydet butonuna basildigi loglandi. Kullanici BizimHesap listesinde kaydin olustugunu gosterdi. SQL kurulumu GitHub Actions ile basarili oldu; son kanitta queue status `processed`, hazir BizimHesap kuyrugu `0`.

## Neden Bu Hedef?

Kullanici bankadan gelen hareketlerin BizimHesap tarafinda gercekten olusup olusmadigini gormek istiyor. Ilk ornek hareket icin kaydet butonuna basildi; siradaki kritik adim ayni kaydi tekrar kaydetmeden Supabase kuyruk kapanis fonksiyonunu kurmak ve BizimHesap kayit kanitini dogrulamak.

## Siradaki Is Paketi

1. Yeni gelen banka ekstreleri icin mail pipeline ve Onay Merkezi sayimi kontrol edilmeli.
2. Onaylanan yeni hareketlerde BizimHesap hedef hesap/cari/kayit turu ekranda net gorunmeli.
3. Bir sonraki canli kayit, yine tek kayit ve acik kullanici onayi ile denenmeli.
4. B2B API icin BizimHesap'tan yetkili token/endpoint teyidi beklenmeli.

## Kabul Kriteri

- Secilen hareketin kullanici tarafindan onaylandigi net: tamamlandi.
- Onay sonrasi `bizimhesap_queue` icinde hazir kayit gorulmelidir: tamamlandi.
- Worker dry-run planinda hesap/cari/kayit turu okunmalidir: tamamlandi.
- BizimHesap formu kaydetmeden doldurulmalidir: tamamlandi.
- Kesin canli kayit kullanici onayi olmadan yapilmamalidir: tamamlandi, kullanici onayi sonrasi tek id icin save calisti.
- Kuyruk kapanis fonksiyonu kurulu olmalidir: tamamlandi.
- Kayit olustu kaniti BizimHesap ekranindan alinmalidir: kullanici tarafindan dogrulandi.
- Mukerrer kayit engeli olmalidir: tamamlandi, manuel kanitli queue tekrar save yapmadan atlanir.
- Test sonucu tur sonunda raporlanmalidir: tamamlandi.

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
