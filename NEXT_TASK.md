# AperiON Next Task

Son guncelleme: 2026-06-27 Europe/Istanbul

## Aktif Tek Hedef

Veri guveni temelini kilitlemek.

Bu turdan sonraki ilk teknik hedef: dry-run, hata yakalama ve senkron saglik durumunu guvenilir hale getirmek.

## Neden Bu Hedef?

Son denetimde ana testler gecti, fakat iki kritik guven sorunu bulundu:

- `npm run sync:bizimhesap:dry` satis botunda DB yaziyor gibi davraniyor.
- `bizimhesap_son_islemler_izle.js` Supabase conflict hatasini basari icinde saklayabiliyor.

Bu iki konu cozulmeden Finans Komuta Merkezi ve banka onay ekrani gunluk karar merkezi olarak tam guvenilir sayilamaz.

## Siradaki Is Paketi

1. `aperion_veri_senkron.js` dry-run davranisini incele.
2. `bizimhesap_bot.js` icinde dry-run/commit ayrimini netlestir.
3. `bizimhesap_son_islemler_izle.js` conflict hatasini gorunur hata haline getir.
4. `aperion_last_sync.json` icinde kismi hata ve uyari alanlarini netlestir.
5. `npm run sync:bizimhesap:dry` tekrar calistir.
6. `npm run preflight` tekrar calistir.

## Kabul Kriteri

- Dry-run hicbir canli tabloya yazmamalidir.
- Son islemler conflict hatasi olursa is `ok` sayilmamalidir veya acik `warning` olarak raporlanmalidir.
- `aperion_last_sync.json` gercek durumu saklamadan yazmalidir.
- Test sonucu tur sonunda raporlanmalidir.

## Bekleyen Sonraki Hedefler

- Banka onay hareketlerinde her kaydin BizimHesap'a islenip islenmedigini kanitlayan durum kolonu.
- Finans Komuta Merkezi tek ekran karar akisi.
- Firma izolasyonu: Alayli verisi baska firmalara karismayacak garanti.
- Urun karti ve cari karti icin gercek kaynak eksiklerini kapatma.
- Telegram evrak/gorsel akisini Onay Merkezi'ne baglama.

