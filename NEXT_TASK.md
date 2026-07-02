# AperiON Next Task

Son guncelleme: 2026-07-02 Europe/Istanbul

## Aktif Tek Hedef

Onay Merkezi analiz guvenini production seviyesine tasimak.

Durum: Ana is programi kullanicinin tum isteklerine gore 20 maddelik siraya indirildi. Siradaki tek hedef 04 numarali Onay Merkezi analiz guvenidir. Gmail OAuth calisiyor; mail ekstre pipeline banka hareketlerini `pending_bank_movements` onay kuyruguna yaziyor. Banka disi BizimHesap ozetleri artik hareket sayilmiyor; teknik alanlar cari kabul edilmiyor; yeni banka bildirimlerinde `Gonderen/Alici/Karsi Taraf` alanlari `suggested_counterparty` olarak yakalaniyor. Ancak mevcut bekleyen kayitlarda hedef cari/hareket turu/kategori kaniti her satirda yeterince guclu degil. Bu nedenle bir sonraki uygulama hedefi Onay Merkezi satirlarini daha acik, kanitli ve guvenli yapmak.

## Neden Bu Hedef?

Kullanici sabah banka maillerinden gelen hareketleri analiz edilmis sekilde gormek ve tek tikla BizimHesap'a gondermek istiyor. Bu akista hata olursa finansal kayit, cari, banka/kasa ve raporlar zincirleme bozulur. Bu yuzden once Onay Merkezi'nin neyi neden onerdiğini acik kanitlamasi gerekiyor.

## Tum Isteklerin Uygulama Sirasi

1. Veri guveni ve firma izolasyonu - bitti.
2. BizimHesap giris / kalici oturum - bitti.
3. Mail ekstre ve cok bankali okuma - kismen.
4. Onay Merkezi analiz guveni - siradaki.
5. BizimHesap'a tek tik kayit kaniti - kismen.
6. Banka / kasa / cari birebir esgudum - kaldi.
7. Ana ekran profesyonel ust akil - kismen.
8. Gelir tablosu karar matrisi - kismen.
9. Sabit / sozlesmeli / ongorulen kartlar - kismen.
10. Satis ve urun karliligi - kismen.
11. Hasta bezi karar ekrani - kismen.
12. Satilan malin maliyeti ve marj motoru - kismen.
13. Fatura detay okuma - kismen.
14. Gider karti + fatura detayi baglama - kismen.
15. Telegram / gorsel evrak akisi - kaldi.
16. Banka ekran goruntusu isleme - kaldi.
17. Fiyat listesi ve internet piyasa botu - kaldi.
18. Kisisel ikinci beyin finans - kismen.
19. Kalici cache / isletme hafizasi - kismen.
20. Gunluk kullanilabilir canli surum - kismen.

## Siradaki Is Paketi

1. Onay Merkezi satirlarinda `ne olarak kaydedilecek`, `hangi cariye`, `hangi banka/kasa hesabina`, `hangi kategoriye`, `hangi kanita gore` alanlari tek kutuda gosterilecek.
2. Guven puani 84 alti, cari belirsiz, teknik alan, banka disi ozet, mukerrer veya eski bekleyen hareketlerde buton pasif ve sebep acik olacak.
3. Guvenli aday listesi sadece islem tipi + cari + hesap + kategori net olan kayitlari alacak.
4. `bank:approval:preview`, `bank:approval:candidates`, `verify:bank-approval-action`, `bizimhesap:queue:dry` tekrar calistirilacak.
5. Canli BizimHesap kaydi bu turda yapilmayacak; sadece analiz ve onay guveni bitirilecek.

## Kabul Kriteri

- Parser raporu bozmadan okumali: tamamlandi.
- Gelecek tahsilatlar tarih ve tutarla ayrilmali: tamamlandi.
- Cikti Finans Takvimi modeline uygun olmali: tamamlandi.
- Canli insert onaysiz yapilmamali: tamamlandi.
- Supabase insert sonrasi ana ekranda gorunurluk: UI hazir, canli insert onayi gerekli.
- Gmail otomasyonu canli insert yapmadan plan/dry-run kaniti uretmeli: tamamlandi.

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
