# AperiON Next Task

Son guncelleme: 2026-07-03 Europe/Istanbul

## Aktif Tek Hedef

Guncel tur notu: Kullanici ana ekranin sol sekmelerden kurtulup 6-8 tiklanabilir ana bolgeye ayrilmasini istedi. Masaustu gorunumde sidebar kapatildi ve ana sayfaya 8 bolgeli 4x2 komuta haritasi eklendi. Bu bolgeler Banka Canli, Onay Merkezi, Gelir Tablosu, Satis & Tahsilat, Urun & Stok, Cari Risk, Veri Guveni ve Bildirim Merkezi ekranlarina gider. GitHub Pages uzerinde sol menusuz 8 bolgeli canli HTML ve tarayici olcumu dogrulandi. Siradaki tek hedef, Banka Canli / Onay Merkezi bolgesinde her kaydin nereye gittigini ve BizimHesap'a islenip islenmedigini tek ekranda kanitlamaktir.

Onceki guvenlik notu: Claude'un canli Supabase tarafinda yaptigi cookie/API guvenlik isinin uzerine repo tarafinda `supabase_security_hardening_v77.sql` ve `verify:supabase-security-hardening` eklendi. SQL canliya otomatik uygulanmadi. Bu is sonraki guvenlik turunda ayrica ele alinacak.

Onceki tur notu: Banka Komuta Merkezi'ndeki `Siradaki BizimHesap adayi` bandina `Adayi Ac` eylemi eklendi. Bu eylem canli kayit yapmaz; Finans > Banka Canli ekranini acar, secili pending id satirina gider ve satiri sari cerceveyle odaklar. Kart artik BizimHesap hedefi, banka hesabi, cari/karsi taraf ve kategori alanlarini acik gosterir; onayin ilgili satirdan verilecegini yazar. Siradaki canli adim hala ayni kilitte: kullanici tekil kayit icin acik onay verirse queue olusumu ve BizimHesap worker kaniti dogrulanacak.

Guncel ek not: Banka Canli satirlarinda artik `AperiON onayi -> BizimHesap kuyrugu -> Kayit sonucu` seridi gorunur. Siradaki is, bu seridi kullanarak tekil onay sonrasi queue ve BizimHesap worker sonucunu ekranda kanitlamak.

Guncel ek not 2: Ayni kayit kanit seridi sabah onay kartlarina da eklendi; ana ekran karti ve Banka Canli tablosu ayni durum dilini kullanir.

Guncel ek not 3: `Siradaki BizimHesap adayi` karti artik taranan hareket, guvenli aday, inceleme ve kuyruk sayaclarini da gosterir. Siradaki is tekil onay sonrasi bu sayaclarin ve satir seridinin birlikte guncellenmesini kanitlamak.

Guncel ek not 4: Aday karti artik status rapor saatini de gosterir; eski snapshot ile yeni mail akisi karismayacak.

Guncel ek not 5: Aday karti ve sabah onay kartlari artik 4 adimli onay/kuyruk/bot/sonuc yolunu gosterir. Siradaki is, tekil onaydan sonra bu seridin gercek kuyruk ve islenme sonucuyla otomatik degistigini kanitlamak.

Guncel ek not 6: `dbbd736` kod/CI olarak basarili, Pages deploy asamasi hata verdi; yeniden deploy tetiklendi. Siradaki kontrolde Pages sonucunu tekrar oku.

Guncel ek not 7: Canli yayin kaynagi GitHub Pages olarak kilitlendi. Netlify PR preview/e-posta bilgileri yardimci kanittir; production kabul kriteri GitHub CI + Pages deploy + canli URL icerik kontroludur.

Guncel ek not 8: `d7ea3d7` dokuman commit'inde Pages deploy yeniden hata verdi; HTML production-source marker ile yeni deploy tetiklendi. Sonraki turda Pages sonucunu oku.

Guncel ek not 9: GitHub Pages deploy hatasi connector ile incelendi; log `try again later` dedi. Failed deploy job tekrar calistirildi ve `9e7d68a` attempt 2 basarili oldu. Canli GitHub Pages URL'de production marker ve banka onay akisi dogrulandi. Netlify production kaynagi degil; Cloudflare bu ortamdan erisilemedi.

Guncel ek not 10: Canli kontrol botlari `APERION_LIVE_URLS` fallback listesine gecirildi. Cloudflare acilmazsa GitHub Pages denenir; secilen URL rapora yazilir. Siradaki is Onay Merkezi'nde tekil onay sonrasi kuyruk/worker sonucunu ekranda kanitlamak.

Onay Merkezi analiz guvenini production seviyesine tasimak.

Durum: Ana is programi kullanicinin tum isteklerine gore 20 maddelik siraya indirildi. 04 numarali Onay Merkezi analiz guveni ilk katmani tamamlandi: risk etiketleri, kanit kutusu, 84 guven esigi, tazelik/mukerrer/kuyruk/cari kanit gosterimi eklendi. 05 numarali BizimHesap tek tik kayit kanitinin ilk katmani da eklendi: queue worker dry-run raporu artik evidence ve summary uretir; ana ust akil karti onay bekleyen/kuyrukta/islenmis/hata ayrimini gosterir. `bank:approval:status` tek komutla guncel aday, dry-check, kuyruk kaniti ve BizimHesap worker dry-run sonucunu toplar; Banka Komuta Merkezi artik bu raporu `Sıradaki BizimHesap adayı` bandinda gosterir. `AperiON Bank Approval Status` workflow'u bu snapshot'i otomatik yeniler ve sadece `data/aperion_bank_approval_status.json` dosyasini commitler. Ana ekran Pages JSON gecikirse GitHub raw fallback ile ayni statusu okur. Son kanit: `2026-06-30 Yapi Kredi -3.56 TL Vergi/SGK odemesi`, pending id `d1455265-abaf-4ea1-a6d4-386bf16b93c1`, status `pending`, queue `0`. Siradaki is, kullanicinin bu tekil ID icin acik onay vermesi halinde kaydi kuyruga alip worker kanitini gercek kayit uzerinde dogrulamak.

## Neden Bu Hedef?

Kullanici sabah banka maillerinden gelen hareketleri analiz edilmis sekilde gormek ve tek tikla BizimHesap'a gondermek istiyor. Bu akista hata olursa finansal kayit, cari, banka/kasa ve raporlar zincirleme bozulur. Bu yuzden once Onay Merkezi'nin neyi neden onerdiğini acik kanitlamasi gerekiyor.

## Tum Isteklerin Uygulama Sirasi

1. Veri guveni ve firma izolasyonu - bitti.
2. BizimHesap giris / kalici oturum - bitti.
3. Mail ekstre ve cok bankali okuma - kismen.
4. Onay Merkezi analiz guveni - kismen/birinci katman bitti.
5. BizimHesap'a tek tik kayit kaniti - kismen/siradaki kanit testi.
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

1. Banka Canli / Onay Merkezi bolgesinde kayit akis kaniti netlestirilecek.
2. Her banka hareketi icin `AperiON onayi`, `BizimHesap kuyrugu`, `BizimHesap kayit sonucu`, `mukerrer kontrol` ayni satirda kesin okunacak.
3. Kullanici `Onayla` dediginde hangi cari, hangi banka/kasa hesabi, hangi kategori ve hangi BizimHesap kayit turu olacagi ekranda acik gorunecek.
4. BizimHesap'a islenmis kayit tekrar onaya dusmeyecek; sonuc kaniti ekranda kalacak.
5. Kullanici acik onay vermeden toplu canli kayit veya DB hardening uygulanmayacak.

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
