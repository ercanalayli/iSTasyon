# AperiON Next Task

Son guncelleme: 2026-06-29 Europe/Istanbul

## Aktif Tek Hedef

Banka hareketinin BizimHesap kaydi sonrasi kuyruk kapanis kanitini tamamlamak.

Durum: Kullanici `BizimHesap'a kaydetmeyi onayliyorum` dedi. Sadece queue id `3b30e1a0-0f02-4b0d-b03c-ae2779d448fa` icin worker save modu calisti ve BizimHesap kaydet butonuna basildigi loglandi. Kullanici BizimHesap listesinde kaydin olustugunu gosterdi. Ancak Supabase `mark_bizimhesap_queue_processed` RPC kurulu olmadigi icin AperiON kuyrugu kapanmadi; `bank:approval:candidate:proof` hala `ready_for_bizimhesap` gosteriyor. Yerelden SQL kurulum denemesi DB sifresi hatasi nedeniyle basarisiz. Mukerrer kaydi engellemek icin manuel kanit dosyasi eklendi ve worker ayni queue id icin tekrar save yapmadan atliyor.

## Neden Bu Hedef?

Kullanici bankadan gelen hareketlerin BizimHesap tarafinda gercekten olusup olusmadigini gormek istiyor. Ilk ornek hareket icin kaydet butonuna basildi; siradaki kritik adim ayni kaydi tekrar kaydetmeden Supabase kuyruk kapanis fonksiyonunu kurmak ve BizimHesap kayit kanitini dogrulamak.

## Siradaki Is Paketi

1. `automation/sql/006_mark_bizimhesap_queue_processed.sql` Supabase'e uygulanmali.
2. Dogru `SUPABASE_DB_URL` GitHub secret veya yerel env ile workflow/psql calistirilmali.
3. Ayni kaydi tekrar BizimHesap'a kaydetmeden queue statusu kapatilabilir mi kontrol edilmeli.
4. SQL kurulduktan sonra `bank:approval:candidate:proof` ile queue statusunun `processed` oldugu dogrulanmali.

## Kabul Kriteri

- Secilen hareketin kullanici tarafindan onaylandigi net: tamamlandi.
- Onay sonrasi `bizimhesap_queue` icinde hazir kayit gorulmelidir: tamamlandi.
- Worker dry-run planinda hesap/cari/kayit turu okunmalidir: tamamlandi.
- BizimHesap formu kaydetmeden doldurulmalidir: tamamlandi.
- Kesin canli kayit kullanici onayi olmadan yapilmamalidir: tamamlandi, kullanici onayi sonrasi tek id icin save calisti.
- Kuyruk kapanis fonksiyonu kurulu olmalidir: eksik.
- Kayit olustu kaniti BizimHesap ekranindan alinmalidir: kullanici tarafindan dogrulandi.
- Mukerrer kayit engeli olmalidir: tamamlandi, manuel kanitli queue tekrar save yapmadan atlanir.
- Test sonucu tur sonunda raporlanmalidir.

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
