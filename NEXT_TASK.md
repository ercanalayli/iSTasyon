# AperiON Next Task

Son guncelleme: 2026-06-27 Europe/Istanbul

## Aktif Tek Hedef

Firma izolasyonu ve veri karisma riskini kilitlemek.

Durum: Banka onay ekrani iki onay/kuyruk hattini birlikte okuyacak sekilde guncellendi. Siradaki tur yeni tasarim degil, ALAYLI verisinin diger firmalara karismadigini kaynak, sorgu ve ekran seviyesinde garantiye almak olmalidir.

## Neden Bu Hedef?

Tek dashboard coklu firma mimarisine hazirlaniyor. Bu nedenle her sorguda `firma_id`, `company_id` veya `company` filtresi net olmali; ALAYLI disi veri ana karar ekranina karismamalidir.

## Siradaki Is Paketi

1. `index.html` icindeki Supabase sorgularinda firma filtresi olmayan kritik sorgulari bul.
2. Banka, satis, cari, urun, finans ve takvim sorgularini firma izolasyonu acisindan siniflandir.
3. Eksik firma filtresi varsa dar kapsamli duzelt.
4. Veri Guveni ekraninda firma izolasyonu durumunu gorunur hale getir.
5. `npm run preflight`, `npm run finance-smoke`, `npm run verify:main-finance-flow-v55` calistir.

## Kabul Kriteri

- ALAYLI seciliyken baska firma kaydi ana karar ekranina girmemelidir.
- Firma filtresi olmayan kritik sorgular belgelenmeli veya duzeltilmelidir.
- Coklu firma mimarisine uygun kaynak alanlari korunmalidir.
- Test sonucu tur sonunda raporlanmalidir.

## Bekleyen Sonraki Hedefler

- Banka onay hareketlerinde her kaydin BizimHesap'a islenip islenmedigini kanitlayan durum kolonu.
- Finans Komuta Merkezi tek ekran karar akisi.
- Firma izolasyonu: Alayli verisi baska firmalara karismayacak garanti.
- Urun karti ve cari karti icin gercek kaynak eksiklerini kapatma.
- Telegram evrak/gorsel akisini Onay Merkezi'ne baglama.
