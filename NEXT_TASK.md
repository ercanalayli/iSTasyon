# AperiON Next Task

Son guncelleme: 2026-06-29 Europe/Istanbul

## Aktif Tek Hedef

Banka hareketinin BizimHesap'a kesin kayit oncesi son dogrulamasi.

Durum: Kullanici `onayliyorum` dedi ve yalnizca secili VakifBank 2026-06-10, -8,37 TL banka masraf adayi kuyruga alindi. Pending id `9b91f984-c94b-4005-92ab-7fb334aa31e7` artik `approved`. BizimHesap queue id `3b30e1a0-0f02-4b0d-b03c-ae2779d448fa`, status `ready_for_bizimhesap`. `bizimhesap:queue:dry` 1 hazir kaydi BizimHesap gider/masraf kaydi olarak planladi. `bizimhesap:queue:form` formu doldurdu; tarih `10.06.2026`, tutar `8,37`, odeme durumu `Odendi`, aciklama queue id ile goruldu. Canli BizimHesap'a kaydetme/save yapilmadi.

## Neden Bu Hedef?

Kullanici bankadan gelen hareketlerin BizimHesap tarafinda gercekten olusup olusmadigini gormek istiyor. Ilk ornek hareket AperiON tarafinda onaylandi ve BizimHesap worker kuyruguna alindi; siradaki kritik adim, kesin kaydetmeden once planin dogru hesap/cari/kategori ile form seviyesinde dogrulanmasi.

## Siradaki Is Paketi

1. BizimHesap'a kesin kayit icin kullanicidan ayri ve net onay al.
2. Onay gelirse `BIZIMHESAP_POSTING_LIVE=1` ve `BIZIMHESAP_POSTING_SAVE=1` kilitleriyle yalnizca queue id `3b30e1a0-0f02-4b0d-b03c-ae2779d448fa` icin save calistir.
3. Kesin kayit sonrasi `bizimhesap_queue.status=processed`, `processed_at`, worker sonucu ve ekrandaki kanit kolonunu dogrula.
4. BizimHesap ekranindan kaydin olustugunu ayrica kontrol et.

## Kabul Kriteri

- Secilen hareketin kullanici tarafindan onaylandigi net: tamamlandi.
- Onay sonrasi `bizimhesap_queue` icinde hazir kayit gorulmelidir: tamamlandi.
- Worker dry-run planinda hesap/cari/kayit turu okunmalidir: tamamlandi.
- BizimHesap formu kaydetmeden doldurulmalidir: tamamlandi.
- Kesin canli kayit kullanici onayi olmadan yapilmamalidir.
- Test sonucu tur sonunda raporlanmalidir.

## Bekleyen Sonraki Hedefler

- Banka onay hareketlerinde her kaydin BizimHesap'a islenip islenmedigini kanitlayan durum kolonu.
- Finans Komuta Merkezi tek ekran karar akisi.
- Firma izolasyonu: Alayli verisi baska firmalara karismayacak garanti.
- Urun karti ve cari karti icin gercek kaynak eksiklerini kapatma.
- Telegram evrak/gorsel akisini Onay Merkezi'ne baglama.
