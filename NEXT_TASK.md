# AperiON Next Task

Son guncelleme: 2026-07-02 Europe/Istanbul

## Aktif Tek Hedef

Onay Merkezi analiz guvenini production seviyesine tasimak.

Durum: Ana is programi kullanicinin tum isteklerine gore 20 maddelik siraya indirildi. 04 numarali Onay Merkezi analiz guveni ilk katmani tamamlandi: risk etiketleri, kanit kutusu, 84 guven esigi, tazelik/mukerrer/kuyruk/cari kanit gosterimi eklendi. Gmail OAuth calisiyor; mail ekstre pipeline banka hareketlerini `pending_bank_movements` onay kuyruguna yaziyor. Banka disi BizimHesap ozetleri artik hareket sayilmiyor; teknik alanlar cari kabul edilmiyor; yeni banka bildirimlerinde `Gonderen/Alici/Karsi Taraf` alanlari `suggested_counterparty` olarak yakalaniyor. Siradaki is, bu guvenli Onay Merkezi uzerinden BizimHesap'a tek tik kayit kanitini her onayli hareket icin tam kapatmaktir.

## Neden Bu Hedef?

Kullanici sabah banka maillerinden gelen hareketleri analiz edilmis sekilde gormek ve tek tikla BizimHesap'a gondermek istiyor. Bu akista hata olursa finansal kayit, cari, banka/kasa ve raporlar zincirleme bozulur. Bu yuzden once Onay Merkezi'nin neyi neden onerdiğini acik kanitlamasi gerekiyor.

## Tum Isteklerin Uygulama Sirasi

1. Veri guveni ve firma izolasyonu - bitti.
2. BizimHesap giris / kalici oturum - bitti.
3. Mail ekstre ve cok bankali okuma - kismen.
4. Onay Merkezi analiz guveni - kismen/birinci katman bitti.
5. BizimHesap'a tek tik kayit kaniti - siradaki.
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

1. Secili bir guvenli banka adayi icin Onay Merkezi -> `approve_pending_bank_movement` -> `bizimhesap_queue` olusum kaniti tekrar uretilecek.
2. `bizimhesap_queue_worker` her kayit icin BizimHesap kayit var/yok, kuyruk id, worker sonucu ve tekrar kayit kilidini daha acik raporlayacak.
3. Ana ekranda `BizimHesap'a gidecek banka kaydi` kutusu hazir/kuyrukta/islenmis ayrimini net gosterecek.
4. Kullanici acik onay verirse sadece secili kayit icin BizimHesap form/save calisir; toplu canli kayit yok.
5. `bizimhesap:queue:dry`, `verify:bizimhesap:queue`, `verify:bank-approval-action` tekrar calistirilacak.

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
