# AperiON Next Task

Son guncelleme: 2026-06-29 Europe/Istanbul

## Aktif Tek Hedef

Banka hareketinin BizimHesap'a kesin kayit oncesi son dogrulamasi.

Durum: Kullanici `onayliyorum` dedi ve yalnizca secili VakifBank 2026-06-10, -8,37 TL banka masraf adayi kuyruga alindi. Pending id `9b91f984-c94b-4005-92ab-7fb334aa31e7` artik `approved`. BizimHesap queue id `3b30e1a0-0f02-4b0d-b03c-ae2779d448fa`, status `ready_for_bizimhesap`. `bizimhesap:queue:dry` 1 hazir kaydi BizimHesap gider/masraf kaydi olarak planladi. Canli BizimHesap'a kaydetme/save yapilmadi.

## Neden Bu Hedef?

Kullanici bankadan gelen hareketlerin BizimHesap tarafinda gercekten olusup olusmadigini gormek istiyor. Ilk ornek hareket AperiON tarafinda onaylandi ve BizimHesap worker kuyruguna alindi; siradaki kritik adim, kesin kaydetmeden once planin dogru hesap/cari/kategori ile form seviyesinde dogrulanmasi.

## Siradaki Is Paketi

1. `data/bizimhesap_queue_dryrun.json` planini kontrol et: hedef `BizimHesap gider/masraf kaydi`, hesap `VakifBank banka hesabi`, cari `VakifBank`, kategori `Banka masrafi`, tutar `8,37 TL`.
2. Gerekirse `npm run bizimhesap:queue:form` ile form doldurma seviyesinde dene; kaydetme kilitleri ve kullanici onayi olmadan save yapma.
3. BizimHesap'a kesin kayit icin kullanicidan ayri ve net onay al.
4. Kesin kayit sonrasi `bizimhesap_queue.status=processed`, `processed_at`, worker sonucu ve ekrandaki kanit kolonunu dogrula.

## Kabul Kriteri

- Secilen hareketin kullanici tarafindan onaylandigi net: tamamlandi.
- Onay sonrasi `bizimhesap_queue` icinde hazir kayit gorulmelidir: tamamlandi.
- Worker dry-run planinda hesap/cari/kayit turu okunmalidir: tamamlandi.
- Kesin canli kayit kullanici onayi olmadan yapilmamalidir.
- Test sonucu tur sonunda raporlanmalidir.

## Bekleyen Sonraki Hedefler

- Banka onay hareketlerinde her kaydin BizimHesap'a islenip islenmedigini kanitlayan durum kolonu.
- Finans Komuta Merkezi tek ekran karar akisi.
- Firma izolasyonu: Alayli verisi baska firmalara karismayacak garanti.
- Urun karti ve cari karti icin gercek kaynak eksiklerini kapatma.
- Telegram evrak/gorsel akisini Onay Merkezi'ne baglama.
