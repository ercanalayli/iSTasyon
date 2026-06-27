# AperiON Next Task

Son guncelleme: 2026-06-27 Europe/Istanbul

## Aktif Tek Hedef

Finans Komuta Merkezi karar akisini gunluk kullanima hazirlamak.

Durum: Ana veri denetimi kartina gunluk kullanim paneli eklendi. Kullanici artik hangi ana modullerin gunluk kullanilabilir, hangilerinin kismen hazir veya blokajli oldugunu ana ekranda gorebilir. Siradaki tur yeni buyuk tasarim degil; Finans Komuta Merkezi'nde banka onayindan BizimHesap kayit kanitina kadar karar akisini daha net ve daha az karisik hale getirmelidir.

## Neden Bu Hedef?

Veri guveni, banka onay zinciri, firma izolasyonu ve gunluk kullanim durumu gorunur hale geldi. Simdi en buyuk pratik ihtiyac, banka hareketi onaylandiginda hangi cariye/hangi hesaba/ne olarak gideceginin ve BizimHesap'a islenip islenmediginin tek bakista anlasilmasidir.

## Siradaki Is Paketi

1. Banka Canli ve Onay Akisi ekraninda her satirin hedefini netlestir: hesap, cari, kayit turu, guven, kuyruk id, worker sonucu, BizimHesap kaniti.
2. `BizimHesap'a Kaydet` butonunun sadece hazir kayitlarda gorunmesini, digerlerinde neden hazir olmadigini acikca gostermesini sagla.
3. Onay sonrasi `bizimhesap_queue` ve varsa islenmis kayit durumunu tek satirda kanitla.
4. Yeni buyuk tasarim yapmadan mevcut ekrani kullanilabilir hale getir.
5. `npm run verify:daily-readiness`, `npm run verify:firm-isolation`, `npm run finance-smoke`, `npm run verify:main-finance-flow-v55` calistir.

## Kabul Kriteri

- Banka hareketinde "ne olarak kaydedilecek" sorusu tek bakista cevaplanmalidir.
- BizimHesap'a islenmis / kuyrukta / hazir degil durumu gorunmelidir.
- Hazir olmayan hareketlerde buton davranisi belirsiz kalmamalidir.
- Test sonucu tur sonunda raporlanmalidir.

## Bekleyen Sonraki Hedefler

- Banka onay hareketlerinde her kaydin BizimHesap'a islenip islenmedigini kanitlayan durum kolonu.
- Finans Komuta Merkezi tek ekran karar akisi.
- Firma izolasyonu: Alayli verisi baska firmalara karismayacak garanti.
- Urun karti ve cari karti icin gercek kaynak eksiklerini kapatma.
- Telegram evrak/gorsel akisini Onay Merkezi'ne baglama.
