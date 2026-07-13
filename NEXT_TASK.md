# AperiON Next Task

Son guncelleme: 2026-07-10 Europe/Istanbul

## Aktif Tek Hedef

Guncel tur notu 2026-07-13: Odeme yukumluluk hafizasi ve Finans Takvimi ana girise baglandi. Siradaki tek hedef: kullanicidan kredi karti/KMH/banka hesaplarinin adlari, son dort hanesi, kesim gunu, son odeme gunu ve varsa tutarlari geldikce kartlari kesinlestirmek; ardindan Telegram bildirim adaylarini kaynak kanitiyla gondermek. Tutarsiz veya eksik veri icin otomatik borc/kayit uretilmeyecek.

Guncel tur notu 2026-07-10: Banka onay ekranindaki OCR/kodlama bozulmalari onarildi. Siradaki hedef, yenilenmis Gmail OAuth izninden sonra yeni ekstrelerin kaynak metninin bozulmadan Onay Merkezi'ne dustugunu canli veriyle dogrulamak; bu kontroller finansal kayit olusturmadan yapilacak.

Guncel tur notu 2026-07-10: Kullanici acil hedefi netlestirdi: Banka/Gmail/Telegram hareketleri once AperiON tarafindan anlasilacak, cari/kapsam/gider tipi dogrulanacak, sonra kullanici onayi ile BizimHesap'a islenecek. `config/aperion_finance_rules.json` eklendi ve banka karar motoru bu hafizaya baglandi. Ercan Alayli gibi ilgili kisi/firma hareketleri otomatik kesin kayda gitmez; cari dogrulamasi ister. Okul/aile/bagis/zekat/sahsi gibi hareketler sirket gideri sayilmaz; kisisel/hayat asistani incelemesine duser. `Cari dogrula` ekran eylemi ve `confirm_pending_bank_counterparty` SQL/RPC katmani eklendi. Siradaki tek hedef: SQL kurulumunun canlida basarili oldugunu kontrol etmek, sonra tek bir Ercan Alayli tahsilatini kullanici onayiyla dogrula -> kuyruk -> BizimHesap sonucu zincirinde kapatmak.

Canli blokaj 2026-07-10: SQL kurulumu basarili (`Supabase SQL Install` run `29082485210`). Mail ekstre hattinda tek blokaj `GOOGLE_REFRESH_TOKEN`: Gmail OAuth token check basarisiz oldugu icin yeni mail/ekstre okunmuyor ve yeni banka hareketi Onay Merkezi'ne dusmuyor. Token, `alaylimedikal@gmail.com` Google izin ekraninda yeniden onaylanmadan yenilenemez. Bu onaydan sonra tek hedef yine bir Ercan Alayli tahsilatini cari dogrula -> kuyruk -> BizimHesap sonucu zincirinde kapatmaktir.

Telegram/gorsel ekstre kural notu: Virman kayitlari otomatik reddedilmez. Sistem aciklamadan kaynak/hedef sirket bankalarini bulur; Telegram kartinda ham aciklamayi, hesaplari, onerilen kayit turunu ve net soruyu gosterir. Siradaki uygulama hedefi, ayni karar yapisini banka havale/EFT tahsilatinda cari dogrulama ve Telegram onayina da ayni okunurlukte tasimaktir.

Dashboard notu: Ust cubuk sadece rapor snapshot zamanini gosterir; banka/satis/masraf verilerinin kaynak tarihi her karttaki kanit satirinda ayri gorunur. Siradaki hedef, Gmail OAuth bloke oldugu icin yeni mail gelmeyen durumda da hangi kaynagin ne zaman guncellendigini tek panelde acik gostermektir.

Guncel kapsam notu 2026-07-10: AperiON sadece para hareketi otomasyonu degildir. `config/aperion_intelligence_scope.json` ve `docs/APERION_ERP_UST_AKIL_KAPSAM.md` ile kapsam CFO finans, CEO satis, alis/gider, stok/FIFO, cari/risk, anomali ve hayat asistani motorlari olarak kilitlendi. Siradaki is bankadan baslasa bile mimari satis/alis/raporlama/anomali akillarini ayni ust akil paneline baglayacak.

Guncel tur notu 2026-07-09: AperiON artik tam ERP yerine tek linkten calisan CFO / ust akil / hayat asistani dashboard'u olarak kurgulaniyor. `aperion-ust-akil.html` yeni birlesik giris sayfasi oldu; `aperion.html` bu sayfaya yonlendiriyor. Rebase sonrasi testte yakalanan Moka/POS siniflandirma ezilmesi de duzeltildi. Siradaki is: bu kapidaki 8 modulden ilk gercek kullanilabilirlik akisini secmek. Onerilen ilk odak, Banka/Mail/Ekstre -> Onay Merkezi -> BizimHesap kayit kaniti zincirini tam kapatmak; paralel olarak Hasta Bezi/FIFO sayfasina bu yeni kapidan tutarli gecis korunacak.

Guncel tur notu 2026-07-04 v81 canli kontrol: GitHub Pages `?v=cf81c26` yeni koyu launcher ana sayfa kodunu donduruyor. `bank:approval:status` yenilendi ve canli ekranda kullanilan snapshot su adayi gosteriyor: `2026-07-03 Yapi Kredi 4.600 TL POS tahsilati`, pending id `c7f757fa-939a-45e3-aa0b-145259234045`, guven `%88`, queue `0`. Bu turda canli RPC, kuyruga alma veya BizimHesap save calismadi. Siradaki is: kullanici bu tekil kayit icin acik onay verirse sadece bu ID icin approve RPC calistirilacak, olusan queue id kanitlanacak ve ardindan BizimHesap worker sonucunun ayni satirda gorunmesi dogrulanacak.

Guncel tur notu 2026-07-04: Saatlik BizimHesap sync hatasinin logu okundu. Login/firma secimi degil, Supabase RLS yazma hatasi vardi: `sales_raw` ve `masraf_raw` kayitlari publishable/anon key ile yazilmaya calisildigi icin reddediliyordu. Botlar `SUPABASE_SERVICE_ROLE_KEY` oncelikli olacak sekilde duzeltildi ve koruma testi eklendi. Fix sonrasi `Hourly BizimHesap Sync` run `28701917165` basarili tamamlandi; satis, urun/stok, masraf ve son islemler yazimi gecti. Siradaki adim, DealerStatement Receivables yan workflow hatasini ayirmak ve Banka/Onay/BizimHesap tekil kayit kanitini tamamlamaktir.

Guncel tur notu: Banka Canli / Onay Merkezi satirlarina kayit rotasi eklendi. Her hareket artik Kaynak -> AperiON karari -> BizimHesap hedefi -> Sonuc olarak okunur; `Onay anlami` kutusu hangi hesap, cari, kategori ve kayit turuyle kuyruga alinacagini anlatir. Siradaki tek hedef, kullanici bir kaydi onayladiktan sonra bu rotanin gercek queue id ve BizimHesap sonucuyla otomatik kapanmasini canli ekranda kanitlamaktir.

Yeni referans notu: Kullanici CFO egitimi gorseliyle AperiON'un finans direktoru gibi calisan bir CFO modu olmasini istedi. `APERION_CFO_MODUL_PLANI.md` olusturuldu. Bu mod gecerli aktif hedefi degistirmez; Banka/Onay para hareketi kaniti bitince CFO modu ana ekran ve Gelir Tablosu uzerine insa edilecek.

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

1. `aperion-ust-akil.html` canli linki dogrulanacak.
2. Tek linkten mevcut ana CFO paneli, Hasta Bezi/FIFO, Mail/Ekstre ve Onay Merkezi sayfalarina gecis test edilecek.
3. Sonra secili canli pending aday: `c7f757fa-939a-45e3-aa0b-145259234045` / `2026-07-03 Yapi Kredi 4.600 TL POS tahsilati` icin onay/kuyruk/BizimHesap kanit zinciri kapatilacak.
4. Onay sonrasi `approve_pending_bank_movement` RPC sonucunda queue id ekranda gorunecek.
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

## Guncel ek not 11

Supabase guvenlik raporu incelendi. Repo tarafinda hardening plani guclendirildi ve `npm run verify:supabase-security-hardening` 26/26 gecti. Siradaki is, kullanici acik onay verirse `supabase_security_hardening_v77.sql` dosyasini Supabase SQL Editor'da calistirip ana ekran + banka onay + finans takvimi smoke testlerini tekrar almaktir. Onay olmadan canli SQL uygulanmayacak.

## Guncel ek not 12

Ana ekran Executive Workspace v80 katmanina alindi. Sol sekmeler dashboard modunda gizlendi, 8 tiklanabilir karar bolgesi korunup tam genislik komuta yuzeyi yapildi. Hasta bezi Excel referansindaki donem/kategori/kanal mantigi ana ekrana mini karar karti ve detay modal raporu olarak eklendi. Siradaki tek hedef: bu yeni ana ekranin canli GitHub Pages uzerinde dogru render oldugunu dogrulamak ve ardindan Banka Onay -> BizimHesap kayit kanit akisini kaldigi yerden bitirmek.

## Guncel ek not 13

`aperion-ana-sayfa.html` referansi kullanici tarafindan begenildi ve v81 tasarim dili olarak ana ekrana uygulandi. Siradaki is: canli Pages deploy sonrasi koyu launcher gorunumunu dogrulamak, sonra ayni "kaleme tikla, icine gir" mantigini Gelir Tablosu ve Hasta Bezi detaylarinda gercek veriyle daha derinlestirmek.
