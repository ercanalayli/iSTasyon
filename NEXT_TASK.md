# AperiON Next Task

Son guncelleme: 2026-06-27 Europe/Istanbul

## Aktif Tek Hedef

Banka onay kaydinin BizimHesap'a gercekten islenip islenmedigini kanitlamak.

Durum: Veri guveni turunda dry-run satis yazimi ve son-islemler hata saklama sorunu duzeltildi. Siradaki tur yeni tasarim degil, banka onay kaydinin uctan uca durum kaniti olmalidir.

## Neden Bu Hedef?

Kullanici banka hareketini onayladiginda ekranda sadece "kuyrukta" yazmasi yetmez. Her kayit icin su durum zinciri gorunmelidir: AperiON onayi, BizimHesap kuyruğu, worker sonucu, BizimHesap'ta kayit var/yok.

## Siradaki Is Paketi

1. Banka onay kartlarindaki queue/result alanlarini Supabase kaynaklariyla eslestir.
2. `bizimhesap_posting_queue` processed/failed sonucunu banka hareketi kartina geri bagla.
3. BizimHesap kaydi yoksa ekranda acikca "BizimHesap kayit yok" goster.
4. Processed kayit icin islenen tarih, queue id ve sonuc notunu goster.
5. `npm run bank:approval:preview` ve `npm run verify:bizimhesap:queue` calistir.

## Kabul Kriteri

- Her banka hareketi icin "nereye gitti" alani gorunur olmalidir.
- Kuyruga alinan kayit queue id ile izlenebilmelidir.
- Islenen kayit processed/failed olarak ayirt edilmelidir.
- Canli BizimHesap kaydi yapilacaksa kullanici onayi alinmalidir.

## Bekleyen Sonraki Hedefler

- Banka onay hareketlerinde her kaydin BizimHesap'a islenip islenmedigini kanitlayan durum kolonu.
- Finans Komuta Merkezi tek ekran karar akisi.
- Firma izolasyonu: Alayli verisi baska firmalara karismayacak garanti.
- Urun karti ve cari karti icin gercek kaynak eksiklerini kapatma.
- Telegram evrak/gorsel akisini Onay Merkezi'ne baglama.
