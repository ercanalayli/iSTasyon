# AperiON Project Status

Son guncelleme: 2026-07-29 Europe/Istanbul

## Guncel Tur - Hasta Bezi BizimHesap Veri Motoru v126

`hasta-bezi/` ana veri kaynagi saatlik BizimHesap senkronundan uretilen
denetlenebilir satis, alis, urun, cari ve stok snapshot dosyalaridir. Urun,
cari, fatura ve kar alanlari tiklanabilir. Alis lotu veya fatura kaniti
eksikse kesin rakam uydurulmaz ve `KONTROL` gosterilir. Onceki siparis,
sevkiyat ve kontrol ekrani `hasta-bezi/operasyon-legacy.html` adresinde
korunmustur. Guncelleme no `1245290726`.

Ilk canli workflow'da BizimHesap cekimi, snapshot uretimi ve kaynak
sozlesmesi dogrulamasi basarili oldu. Eszamanli banka snapshot commit'i
nedeniyle son push yarisi tespit edildi; workflow rebase ve uc denemeli
guvenli push ile kalici olarak duzeltildi.
Buyuk veri setinde urun ve cari satis gecmisi tek gecisli indekslerle
hesaplanir; her kart icin tum satislari yeniden tarayan karesel sorgu
kaldirildi.

## Guncel Tur - Moka United POS Aktarim Kurali v124

Is Bankasi'na gelen `4.500 TL` ve `2.740 TL` iki hareket, kullanicinin
gordugu `Moka United` aciklamasiyla yeniden siniflandirildi. Bunlar emanet
veya cari tahsilat degil; `*MOCA SONOVA POS KREDI KARTI -> *IS BANKASI`
hesaplar arasi POS tahsilat aktarimidir. Iki mevcut hareket immutable AperiON
kimligiyle kalici override'a baglandi; gelecekte Moka United anahtar kelimesi
bulunan girisler ayni kuraldan gecerek dogru kaynak hesabi onerir.

## Guncel Tur - Bugun Satis, Maliyet ve Kar Karari v121

Ana finans yuzeyinin varsayilan donemi artik `Bugun`dur. Ilk gorunen karar
satiri; Satislar, Satilan Malin Maliyeti, Brut Kar, Giderler ve Net Sonuc
kalemlerini ayni yerde verir. Her kalem tiklanarak mevcut detay zincirine
iner. Donem dugmeleri ile Dun, Bu Hafta, Bu Ay, Gecen Ay ve Bu Yil ayni
gorunume gecilir; donem matrisi ayrintili karsilastirma icin hemen asagida
kalir.

## Guncel Tur - Ana Ekran Donemsel Gelir Tablosu Matrisi v120

Ana finans yuzeyinde Excel benzeri donem matrisi gorunur hale getirildi.
Satirlarda satis kategorileri, satislar toplam, satilan malin maliyeti, brut
kar, sabit ve degisken gider, vergi/SGK ve net kar bulunur. Sutunlarda Bugun
icin `Tahmini`, `Tahakkuk`, `Nakit`; Dun, Bu Hafta, Bu Ay, Gecen Ay, Bu Yil
ve Gecen Yil icin `Tahakkuk` ve `Nakit` ayri gorunur.

Kategori satirlarinin tahakkuk tutari kategori -> urun -> kaynak kayit
zincirine iner. Banka/POS hareketi henuz urun kategorisine kanitli olarak
baglanmadiginda kategoriye paylastirilmaz; nakit sadece toplam satis/gider/net
satirinda gosterilir. Bu, nakit ile satis tahakkukunu yapay sekilde eslestirip
yaniltici kategori karliligi uretmemek icindir.

## Guncel Tur - Ana Sayfa Finans Onceligi v119

Gelir Tablosu ve Bilanco artik ayri CFO sayfasinda veya alt kartta beklemez.
`index.html` acildiginda ilk ve genis alan bu finans karar yuzeyidir. Satis,
satilan malin maliyeti, brut kar, gider, net sonuc, banka/kasa, tahsilat ve
odeme farklari bu yuzeyde gorunur; sekiz is alani bunun altindaki tiklanabilir
komuta katmanidir.

## Guncel Tur - Tahsilat ve Odeme Kanal Kirilimi v118

Ana CFO yuzeyine, Excel gelir tablosundaki ayni donem secimiyle calisan iki ayri nakit akis paneli eklendi. Tahsilatlar ve Odemeler; `Nakit`, `Kredi Karti`, `Cek` ve `Diger` kanallarinda ayri gorunur ve her kanal ilgili detay ekranina iner. Banka onay adayi sayisi, bakiye veya tahsilat/odeme toplami olarak kullanilmaz.

Kanal bazli tutarlar, tum hareketleri kapsayan tarihli nakit snapshot'i baglanmadan gosterilmez. Bu nedenle mevcut ekranda `Kaynak bekliyor` ifadesi veri eksigini anlatir; sifir veya uydurma tutar anlamina gelmez.

## Guncel Tur - Ana Ekran Canli Gelir Tablosu ve Bilanco v117

`aperion-ust-akil.html` artik yonlendirme/vaat ekrani degil, ilk gorunen
finans karar yuzeyidir. Ekranin ust yarisi Gelir Tablosu ve Bilanco olarak
yeniden kuruldu: net satis, satilan malin maliyeti, brut kar, sabit/deÄŸisken
gider, vergi, net kar, banka/kasa, alacak, borc ve stok ayni yuzeyde gorunur.
Kalemler ilgili karar ekranlarina tiklanabilir baglantilar tasir.

Satis tutari yalnizca mevcut `sales_report_summary_2025_2026.json` kaynagi
okunursa gosterilir. Maliyet, gider, vergi, bakiye, alacak, borc veya stok
kaynagi eksikse sifir ya da sahte kar yazilmaz; "kaynak bekliyor" olarak
gorunur. Bu nedenle ekran her an neyin kanitli oldugunu ve net karin hangi
veri eksigi nedeniyle henuz kesin olmadigini aciklar.

## Guncel Tur - Apsiyon Aylik Tahakkuk ve Odeme Defteri v116

Batikent Ercan Apsiyon kisisel finans ekrani salt-okunur olarak ayrintili
okundu. Apsiyonun kendi kategori kirilimi, Aidat icin Ocak-Temmuz 2026
ayrilmis borc makbuzlarini; belge tarihi, son odeme tarihi, tutar, gecikme
bedeli ve tahsilat satiriyla birlikte veriyor. Aidat tahakkuklari her biri
`4.500,00 TL`, son odeme gunu ayin `15`i olarak kaynakta kanitlandi.

Dogalgaz satirlari da kaynak tarih/tutar ile ayri okunur. Devir bakiyesi
tahakkuk veya odeme adayi sayilmaz. Okuyucu toplam bakiye ile aylik satiri
karistirmaz; sonuc `finance_imports/apsiyon` altinda yerel dry-run kaniti
olarak kalir. Finans Takvimi'ne yazma bu turda yapilmadi.

## Guncel Tur - Banka Tarihi Duzeltmesi Dogrulandi v114

Vakif Sirket hesabindaki iki denetlenmis resmi kayit, yeni hareket
olusturulmadan kaynak banka tarihi olan `14.07.2026` ile kontrol edildi.
`a4bb5122-798c-4d12-8354-507216c5b9cf` POS banka tahsilati ve
`7d269b6a-a80c-4cab-b84e-eb31ce85c154` POS komisyonu, hem duzenleme
formunda hem de hesap hareketleri satirinda `14.07.2026` gorunuyor.
Kaynak tarih ile form tarihi farkliysa gelecekteki kayitlar kaydetmeden
bloklanir.

## Guncel Tur - Banka Tarihi Kayit KorumasÄ± v113

Banka ekstresindeki islem tarihi, BizimHesap kaydinin zorunlu finans tarihi
olarak kilitlendi. Kuyruk worker'i formu doldurduktan sonra tarih alanini
yeniden okur; kaynak tarih yoksa veya formdaki tarih farkliysa kaydetme
durdurulur. Botun calistigi tarih sadece denetim/zaman damgasi olabilir;
finansal hareket tarihinin yerine gecemez.

## Scope Note - Halkbank Ercan Alayli Account

This account belongs to the separate ALKAM Mali project, not AperiON. It is
kept outside all AperiON and BizimHesap sync/reporting boundaries until an
explicit future integration request.

## Guncel Tur - Apsiyon Kisisel Aidat ve Yakit Tahakkuk Hatti v112

Batikent Ercan ev aidati ve yakit tahakkuklari icin kalici yerel Apsiyon
oturum kurucusu ile salt-okunur kaynak okuyucu eklendi. Aidat icin kullanici
tarafindan verilen aylik 16. gun kuralini korur. Yakit tutari ve son odeme
gunu Apsiyon kaynak kaniti olmadan varsayilmaz. Ham ekran metni ve cikti
Git disi `finance_imports/apsiyon` klasorunde kalir. Bu turda odeme, banka
hareketi veya BizimHesap kaydi olusturulmaz.

## Guncel Tur - Ana Sayfa Gelir Tablosu ve Bilanco Karar Yuzeyi v111

Kullanicinin `GELIR TABLOSU-BILANCO .xlsx` calisma formu ana ekran finans
yuzeyine uyarlandi: Bugun, Dun, Bu Hafta, Bu Ay, Gecen Ay, Bu Yil ve Gecen
Yil donemleri; planlanan, tahakkuk ve gerceklesen mantigiyla korunur.
Satislar ve Satilan Malin Maliyeti ayri tiklanabilir karar kalemleridir.
Her ikisi kategori -> urun -> kaynak satis kaydi zincirine iner.

Bilanco yuzeyi yalnizca ekstre bakiyesi bulunan banka/kasa hesaplarini
toplar. Tahsilat farki ve odeme farki kesin ticari alacak/borc gibi
gosterilmez; ana kaynak baglanana kadar acik durumuyla gorunur. Stok/FIFO,
ticari alacak ve borc toplamlarini uydurmak yasaktir.

Son guncelleme: 2026-07-15 Europe/Istanbul

## Guncel Tur - Sirket Banka Gecmis Mutabakati v109

Kullanicinin Indirilenler alaninda bulunan iki VakifBank ve iki Is Bankasi
sirket ekstre dosyasi salt-okunur olarak incelendi. VakifBank islem numarali
XLS/XLSX ve ALAYLI MEDIKAL adli Is Bankasi hesap ozeti XLS ayni mutabakat
motorunda taninir. Ilk kaynak seti 741 satir verir: 6 VakifBank, 735 Is
Bankasi. Ercan Alayli adli vadesiz hesap dosyalari sirket mutabakatina
otomatik katilmaz; kisisel finans kapsaminda ayri ele alinacaktir.

`tools/invoke_secure_bank_history_reconcile.ps1`, DPAPI ile sifrelenmis
Supabase servis anahtarini sadece calisma aninda acarak bu satirlari
`pending_bank_movements` ve `bizimhesap_queue` kanitiyla karsilastirir.
Ham ekstre, anahtar veya rapor Git'e yazilmaz. Bu turda canli BizimHesap
kaydi olusturulmamistir; once islenmis/kuyrukta/eksik satir raporu kapanir.

## Guncel Tur - Hattat Aylik Odeme Listesi Hatti v108

Hattat Musavir `Aylik Odeme Listesi` PDF'leri icin salt-okunur parser ve
Finans Takvimi import plani eklendi. Kaynak PDF her ayin vergi/SGK tahakkuk
ve vade bilgisini tasir; bu nedenle satirlar **odendi** olarak degil,
`beklenen/tahakkuk` olarak olusturulur. Banka hareketi ile eslesme olmadan
odeme kapanmaz. Ham PDF'ler ile parse/canli import kanitlari Git disi
`finance_imports/hattat` alaninda kalir.

Ocak-Haziran 2026 icin verilen alti PDF ile parser dogrulanacaktir. Hattat
portalinden otomatik alma, kalici yerel oturumla sadece listeyi indiren ayri
okuma adimi olarak eklenecek; giris bilgisi repoya, `.env` dosyasina veya
GitHub'a yazilmaz.

Dry-run sonucu: 6 PDF, 21 tahakkuk adayi ve `TL 644.070,38`. Her ayda kaynak
satir toplami Hattat `Genel Toplam`i ile birebir eslesti. Supabase'e canli
Finans Takvimi yazimi bu turda yapilmadi.

## Guncel Tur - VakifBank Masraf Hesabi Kaniti v107

VakifBank POS komisyonu ilk kayit formunda portal varsayilani olan `AKBANK
SIRKET` hesabi gorundugu icin yanlis hesaba kaydolma riski olustu. Kayit ayni
BizimHesap satirinda `*VAKIF SIRKET` hesabina duzeltildi; ikinci kayit
olusturulmadi. Worker artik banka masrafi kaydetmeden once formdaki secili
hesap adini plana ait hedef hesapla yeniden okur. Eslesme yoksa kaydetme
durdurulur; varsayilan AKBANK secimi sessizce kullanilamaz.

## Guncel Tur - Tarihsel Banka Ekstresi Mutabakat Hatti v106

Ocak 2026'dan itibaren saglanacak ekstreler icin yerel, Git disi
`inbox/banka-ekstreleri` giris noktasi eklendi. Salt-okunur mutabakat araci
dosyalari tarar; taninan VakifBank XLS/XLSX satirlarini duplicate key ile
AperiON banka kaydi ve BizimHesap kuyruk sonucuna karsi kontrol eder.
Rapor her satiri `bizimhesap_islenmis`, `bizimhesap_kuyrukta`,
`aperionda_bekliyor`, `guvenli_isleme_adayi` veya `inceleme_gerekli` olarak
ayirir. Ham ekstre ve rapor GitHub Pages'e yazilmaz.

Yeni banka hesabi acilmayacak: cari belirsiz gelen para, kaynak banka
hesabinda `Hesaba Para Girisi` olarak tutulacak; banka mutabakati bozulmadan
sonradan dogru cari/hesaba aktarilabilecek. Ilk import salt-okunur raporla
baslar; hicbir tarihsel satir korlemesine tekrar kaydedilmez.

## Guncel Tur - VakifBank POS Batch Kayit Akisi v100

15 Temmuz 2026 tarihli VakifBank XLS ekstresi islem numarasi ile okundu.
`2026009923018191` 46.540 TL Batch Yatan satiri `POS POS POS KREDI KARTI`
hesabindan `*VAKIF SIRKET` hesabina sirket ici POS banka transferi olarak;
`2026009923018202` 902,81 TL Batch Komisyonu satiri ise VakifBank banka
masrafi olarak planlandi. Her iki kaynak duplicate key ile Supabase onay/kuyruk
zincirine birer kez alindi.

15 Temmuz 2026 tarihinde kullanici onayi ile iki kayit da BizimHesap'a
islenmistir. `a4bb5122-798c-4d12-8354-507216c5b9cf` kuyrugu, `POS POS POS
KREDI KARTI -> *VAKIF SIRKET` 46.540,00 TL transferi olarak islenmis ve
`processed` durumuna kapanmistir. `7d269b6a-a80c-4cab-b84e-eb31ce85c154`
kuyrugu 902,81 TL Banka/POS masrafi olarak islenmistir. Ilk kayitta portalin
varsayilan hesap secimi AKBANK SIRKET oldugu icin bu masraf satiri ayni
BizimHesap kaydi uzerinde `*VAKIF SIRKET` hesabina duzeltilmistir; ikinci
masraf kaydi olusturulmamistir. Kayit ve duzeltme ekran kanitlari diagnostics
klasorundedir.

## Guncel Tur - Saatlik Tam Kaynak Yenileme v99

Saatlik guvenli klon, her saat `:05` tetiklenecek ve cakisan ikinci ornegi
baslatmayacak sekilde kuruldu. Yenileme sirasi satis, urun/stok, masraf, son
islemler, gider kartlari, fatura acma kuyrugu, fatura ayrintilari ve
fatura-gider karti eslesmesidir. Fatura ayrintilari kalici sonuc dosyasindan
devam eder; her saat en fazla dort yeni aday okunur ki uzun bir ekran aramasi
temel satis/stok/masraf yenilemesini geciktirmesin.

14 Temmuz 2026 saatlik tam akis canli denetimde `SONUC: BASARILI` ile kapandi.
Son saglik kaniti: son 15 gun 962 satis, bugun 71, dun 86, 343 masraf, 5.667
urun/stok ve 3 son hareket. Gider karti uretimi 100 kaynak satirindan 34 kart
olusturdu; fatura ayrintisi sonucunda 7 dogrulanmis, 17 inceleme, 8 bulunamayan
aday vardir. Bu sayilar kaynak/fatura arama sonucudur; kesin muhasebe kaydi
degildir.

## Guncel Tur - BizimHesap Canli Klon Dogrulamasi v98

14 Temmuz 2026 tarihinde yerel Windows kullanicisi icin sifreli Supabase servis
anahtari ve BizimHesap parolasi kasasi kuruldu. `AperiON_BizimHesap_Klon_Saatlik`
gorevi guncel kod kokunden etkinlestirildi; her saat `:05` yerel saatinde
calisacak. Manuel canli gorev denetimi basarili bitti: `LastTaskResult=0` ve
runner logunda `SONUC: BASARILI` goruldu.

Kaynak dogrulama: son 15 gun icin 957 satis, bugun 66, dun 86, 2026 icin 343
masraf, 5.667 urun/stok ve 3 son hareket okunabildi. Saglik kontrolu tum
denetimlerde `saglikli`. Bu klon BizimHesap'a yeni muhasebe kaydi olusturmaz;
sadece kaynak verisini AperiON/Supabase'e yeniler.

Saatlik kapsam: satis, urun/stok, masraf, son islemler, gider kartlari, fatura
detay kuyrugu, okunabilir fatura detaylari ve fatura-gider karti eslesmesi.
Banka kaydi ayri onay akisi olarak kalir; saatlik klon kullanici onayi olmadan
BizimHesap'a tahsilat, odeme veya gider kaydi olusturmaz.

## Guncel Tur - BizimHesap Canli Klon Guvenli Calisma Koku v97

Denetimde Windows gorevinin guncel repo yerine eski
`C:\Users\HP\Desktop\ErpaltH` klasorundeki runner'i calistirdigi goruldu.
Eski bot kalici BizimHesap oturumuyla giris yapabiliyor ve ALAYLI MEDIKAL'i
secebiliyor; basarisizlik giris degil, eski botun public Supabase anahtariyla
`sales_raw` ve `masraf_raw` yazmaya calisip RLS tarafindan reddedilmesidir.

Guncel repo icin DPAPI sifreli yerel servis anahtari, guvenli clone runner ve
10:00/17:00 Windows gorev kurulum betikleri eklendi. Servis anahtari ne
repoya ne `.env` dosyasina yazilir; sadece bu Windows kullanicisinin acabilecegi
`.aperion-secrets` dosyasinda saklanir ve runner calisirken bellekte kullanilir.
Canli kurulum, servis anahtari bir kez kullanici tarafindan girilmeden
baslatilmayacak.

## Guncel Tur - Komuta Masasi v96

`aperion-ust-akil.html` tanitim/launcher gorunumu olmaktan cikarildi ve
operasyonel Komuta Masasi olarak yeniden kuruldu. Buyuk slogan ve anlamsiz
ozet kutulari kaldirildi. Yeni ekran; banka onay durumunu
`data/aperion_bank_approval_status.json` dosyasindan, urun/FIFO kapsamini ise
`hasta-bezi/fifo_chunks/manifest.json` dosyasindan salt-okunur olarak okur.
Kaynak okunamazsa rakam uretmez ve bunu acikca belirtir.

Ekranda sekiz is alani vardir: CFO/Gelir Tablosu, Gunluk Banka Onayi, Hasta
Bezi/FIFO, Cari/Tahsilat, Mail/Ekstre, Urun/Stok, Finans Takvimi ve Veri
Sagligi. Sol menu yoktur; kartlar ilgili is ekranina gider. Tarayici denetimi
8 kart, 3 oncelik karti, kaynak veri yuklenmesi ve yatay tasma olmadan gecti.

Koruma notu: Kullanici fonksiyonu koruma kurali `DECISIONS.md` D-008 olarak
kilitlendi. Yeni Komuta Masasi eski Hasta Bezi, banka veya finans ekranlarinin
yerine gecmez; her birine gorunur giris verir. Eski Hasta Bezi ana sayfasinda
karakter kodlama ve karar ekrani gorunurlugu ayri arayuz turunda duzeltilecek.
Hasta Bezi eski operasyon ana sayfasi ile yeni karar ekrani arasina cift
yonlu gorunur gecis eklendi; siparis, sevkiyat, urun/cari arama ve kontrol
araclari korunur.

## Guncel Tur - Hasta Bezi Giris Rotasi

Ust Akil ekranindaki `Hasta Bezi / FIFO` butonu ve modul karti eski
`hasta-bezi/` gorunumune gidiyordu. Iki giris de
`hasta-bezi/karar-ekrani.html` karar ekranina yonlendirildi. Bu degisiklik
veri veya FIFO sonucu degistirmez; kullanicinin yeni kaynakli ekrana tek
tikla ulasmasini saglar.

## Guncel Tur - Tarihsel FIFO Kaynak Girisi v95

Tarihsel satis, alis ve devir stok raporlarini ana FIFO paketinden ayri tutan
salt-okunur on kontrol eklendi. `npm run hasta-bezi:history:preflight`,
`C:\Users\HP\Downloads\AperiON Tarihsel FIFO` altindaki dosyalari tarar;
satis, alis ve acilis stok kaynaklarinin gerekli sutunlarini ve tarih
araliklarini kontrol eder. Uc kaynak dogrulanmadan FIFO paketi degismez.

## Guncel Tur - FIFO Maliyet Kaniti v94

Hasta Bezi satis/alis disavurumlarinin yeniden denetiminde 19.202 fallback
maliyet satirinin barkod veya urun kodu ayrismasindan degil, kaynak donemde
alis lotunun bulunmamasindan kaynaklandigi goruldu. Paket artik bu satirlari
ayri nedenlerle isaretler: 5.813 donem basi stok/gecmis alis eksigi, 11.442
alis kaydi yok ve 1.947 yetersiz alis lotu. Bu ayrim kesin FIFO maliyetini
yanlislikla gostermeyi engeller; karar ekraninin kaynak kaniti satirinda da
gorunur.

## Guncel Tur - Hasta Bezi Karar Ekrani v93

`hasta-bezi/karar-ekrani.html` eklendi ve mevcut Hasta Bezi/FIFO veri paketiyle
baglandi. Ekran, sistem saatine degil paketin en son kaynak tarihine gore
Bugun, Dun, Bu hafta, Bu ay, Gecen ay, Bu yil ve Gecen yil donemlerini
hesaplar. Kategori kartina tiklaninca ayni ekranda urun performans penceresi
acilir; satis, adet, maliyet, brut kar, marj, kalan stok ve kontrol durumu
gosterilir.

Maliyet alanlari kaynakta eksi isaretli gelebilecegi icin karar gorunumunde
mutlak maliyet kullanilir ve brut kar `satis - maliyet` olarak hesaplanir.
19.202 fallback maliyet satiri kesin FIFO olarak sunulmaz; ekranda
`Maliyet kontrol` olarak ayri gorunur. Tarayici testi: 12 kategori karti,
49 urunlu detay penceresi ve kaynak kapsami basariyla yuklendi.

## Guncel Tur - Hasta Bezi Kaynak Kaniti

2026-07-13 tarihinde kullanicinin sagladigi BizimHesap disavurumlari ile Hasta
Bezi/FIFO paketi yeniden denetlendi. Satis kaynagi 34.869 satir ile
2025-01-01 - 2026-07-08 araligini; alis kaynagi 3.389 satir ile
2025-01-02 - 2026-07-06 araligini kapsar. Mevcut FIFO paketindeki 38.258
hareket tam olarak bu iki satir sayisinin toplamina, 34.869 satis satiri da
satis raporuna esittir. Dashboard artik bu kaniti gorunur okur.

Ham cari, tedarikci ve fatura satirlari public GitHub Pages'e eklenmedi.
Detayli kaynak verisi yerelde kalir; public sayfa sadece kapsama ve satir
sayisi kanitini gosterir. Sonraki ana hedef, bu kanitli paketi mevcut Hasta
Bezi ekraninin tek ekranlik karar gorunumune baglamaktir.

## Guncel Tur - FIFO Veri Paketi

Bos kalan eski manifest sorunu kapatildi: `hasta-bezi/fifo_chunks` altinda
gercek gzip parcalari yeniden uretildi. Paket 1.881 urun, 38.258 hareket ve
34.869 satis satiri tasir. Ancak 19.202 satis satirinda alis raporundaki lot
eslesmesi bulunamadigi icin satis raporundaki `Alis Fiyati` yedek maliyet
olarak kullanilmistir. Bu satirlar kesin FIFO kabul edilmez; yeni karar
ekraninda ayri maliyet kontrol uyarisi olarak gorunmelidir.

## Calisma Protokolu

AperiON gelistirmesinde koordineli calisma protokolu gecerlidir.

- ChatGPT: urun yonu, mimari karar, oncelik, kalite kontrol, ekran/akis analizi.
- Codex: repo uygulama, dosya duzenleme, script calistirma, test sonucu, commit, durum dosyalari.
- Her turda sadece 1 ana hedef secilir.
- Tur sonunda `PROJECT_STATUS.md`, `NEXT_TASK.md`, `CHANGELOG_APERION.md` guncellenir.
- Onaysiz canli kayit, demo veriyi kesin veri gibi gosterme ve firma verilerini karistirma yasaktir.

## Mevcut Teknik Durum

2026-07-13 gunluk banka karar akisi v90: Mail/ekstreden gelen kayitlar icin
ham Telegram dump'i yerine `pending_bank_movements` kaynagindan en yeni islem
gununu secen gunluk inceleme raporu eklendi. Rapor kayda hazir, cari
dogrulama isteyen ve inceleme isteyen hareketleri ayirir; ham JSON, tekrarli
baglanti ve gereksiz ayrinti gondermez. Mail pipeli…9192 tokens truncated…nk 2026-05-13, -34 TL, Banka/POS masrafi, hedef cari `VakifBank`, guven %90, pending id `d4164166-5427-4f46-8f66-a84b43dddd0b`. `npm run bizimhesap:queue:dry` 0 hazir BizimHesap kuyrugu gosterdi. Kullanici onayi olmadan RPC, queue approve veya BizimHesap save calistirilmadi.

2026-06-30 DealerStatement gelecek tahsilat turu sonucu: Kullanici `DealerStatement (3).xls` sistem raporunu paylasti. Dosyanin `.xls` uzantili HTML tablo oldugu goruldu. `tools/build_dealer_statement_receivables_v72.cjs` eklendi; rapor `Bayi Ekstre ID` anahtariyla okunur, `Odeme Tarihi >= as-of` ve `Durum=Aktif` kayitlari `finance_calendar_items` icin `receivable/in/forecast` planina cevirir. `npm run finance-calendar:dealer-statement -- --file="C:\Users\HP\Downloads\DealerStatement (3).xls" --as-of=2026-06-30 --company=ALAYLI` calisti: 705 satir, 83 gelecek tahsilat, TL 681.416,43 toplam plan uretti. Canli Supabase insert yapilmadi.

2026-07-01 DealerStatement guvenli import turu sonucu: `tools/import_dealer_statement_receivables_v73.cjs` eklendi. Komut `--commit --confirm ONAYLIYORUM` olmadan Supabase'e yazmaz. `npm run finance-calendar:dealer-statement -- --file="C:\Users\HP\Downloads\DealerStatement (3).xls" --as-of=2026-07-01 --company=ALAYLI` calisti: 705 satirdan 80 gelecek tahsilat, TL 657.666,43 plan uretti. 1 sifir satis tutarli ama yatirilan tutari olan kayit `needs_review` listesine ayrildi. `npm run finance-calendar:dealer-statement:import:dry` calisti; canli insert yapilmadi.

2026-07-01 DealerStatement ana ekran gorunurluk turu sonucu: Ana Finans Takvimi paneli `finance_calendar_items` icinden `source_table='dealer_statement'` gelecek tahsilatlarini ayrica okur hale getirildi. Boylesiyle Eylul/Ekim/Kasim gibi `finance_calendar_drawer_view` yakin donem filtresine girmeyen gelecek tahsilatlar da `Gelecek Tahsilat Butcesi` kartinda gorunur. `verify:dealer-statement-dashboard`, `finance-calendar:dealer-statement:import:dry`, `finance-smoke` ve `verify:main-finance-flow-v55` gecti. Canli insert yapilmadi.

2026-07-01 DealerStatement mail otomasyon turu sonucu: `tools/dealer_statement_gmail_worker_v74.mjs` ve `dealer-statement-receivables.yml` eklendi. Workflow yalnizca `alaylimedikal@gmail.com` posta kutusunu tarar, DealerStatement ekini indirir, Finans Takvimi planini uretir ve sadece dry-run import kaniti yazar. Schedule 10:20 ve 17:20 Turkiye saati olarak kuruldu. `--commit` workflow ve worker icinde yasaklandi; canli Supabase insert yine kullanici onayi ve ayri komut olmadan yapilmaz.

2026-07-01 DealerStatement workflow ilk run kontrolu sonucu: GitHub Actions run `28500494014` DealerStatement Gmail dry-run step'inde failure verdi; ayni committe mail-ekstre pipeline `success` dondu. Worker Gmail/OAuth hatasi olursa artik `data/dealer_statement_gmail_worker_report.json` raporu yazacak, workflow dry-run step'i `continue-on-error` ile artifact yukleme ve sonuc raporu adimina devam edecek. Canli insert yine yok.

2026-07-01 DealerStatement workflow gate turu sonucu: Run `28502969360` success dondu ve artifact olustu; ancak dry-run step'i `continue-on-error` oldugu icin Gmail/parser hatasinin yesil kalma riski tespit edildi. Workflow'a artifact yukleme sonrasinda `Gate DealerStatement result` eklendi. Rapor yoksa veya `result` degeri `_failed` ile bitiyorsa workflow artik kirmizi donecek; boylece hata saklanmayacak ama kanit artifact'i yine yukunmus olacak.

2026-07-01 DealerStatement gate canli kontrol sonucu: Run `28506469160` beklenen sekilde `failure` dondu. Kiran step `Gate DealerStatement result`; onceki adimlarda `dealer-statement-receivables` artifact'i olustu. Bu sonuc workflow'un artik hatayi yesil gostermedigini ve kanit dosyasini yine de sakladigini dogrular. Siradaki teknik kontrol artifact icindeki `dealer_statement_gmail_worker_report.json` sonucunun Gmail/OAuth mu yoksa ek bulunamama mi oldugunu okumaktir.

2026-07-01 DealerStatement Gmail retry turu sonucu: Artifact raporlari okundu. Run `28506469160` attempt 1 ve attempt 2 ayni hatayi verdi: `Invalid response body while trying to fetch https://oauth2.googleapis.com/token: Premature close`. Bu Google OAuth token isteginde gecici baglanti kopmasi olarak siniflandi. Worker'a Gmail arama, mesaj okuma ve ek indirme icin `withRetry` eklendi; `Premature close`, socket/network ve timeout hatalarinda 3 deneme yapacak.

2026-07-01 Gmail OAuth saglik kontrol turu sonucu: Mail-ekstre workflow artifact'i incelendi ve pipeline'in `success` donmesine ragmen tum banka sorgularinda `invalid_grant` verdigi goruldu. Bu Google refresh token'in gecersiz/iptal oldugunu gosterir. `automation/gmail-oauth-check.cjs` ve `gmail:oauth:check` komutu eklendi. DealerStatement ve mail-ekstre workflow'lari artik Gmail OAuth token bozuksa erken kirmizi donecek; hatayi yesil raporlamayacak.

2026-07-01 Gmail OAuth yenileme turu sonucu: GitHub Actions helper ile izin linki uretildi, kullanici Chrome oturumunda `alaylimedikal@gmail.com` icin Gmail okuma izni verdi. Helper `finish` modu yeni refresh token uretti ve `GOOGLE_REFRESH_TOKEN` repository secret'i guncellendi. Token degeri repo dosyalarina yazilmadi ve sohbette paylasilmadi. Yenilenmis secret sonrasi mail-ekstre pipeline yeniden tetikleniyor; hedef Gmail OAuth check, dry-run ve gerekirse `pending_bank_movements` onay kuyrugu yazimini dogrulamak.

2026-07-01 Gmail OAuth kesin dogrulama turu sonucu: `GOOGLE_REFRESH_TOKEN` GitHub repository secret'i API uzerinden yeniden yazildi ve `AperiON Mail Ekstre Pipeline` workflow_dispatch ile calistirildi. Run `28525249930` success dondu. `gmail:oauth:check` success; Gmail query `to:alaylimedikal@gmail.com newer_than:1d` 1 mesaj buldu. Dry-run 99 mesaj, 64 ek, 14 okunabilir ek, 326 satir okudu; 324 benzersiz satir ve 0 hata raporladi. Live ingest 296 girdiden 214 yeni kaydi `pending_bank_movements` tablosuna yazdi, 82 mukerreri suzdu. Onay merkezi kontrolunde `pending_bank_movements` ALAYLI sayisi 1965, `bizimhesap_queue` sayisi 4.

2026-07-01 DealerStatement OAuth ayrimi sonucu: `AperiON DealerStatement Receivables` run `28525566041` calisti. `gmail:oauth:check` success; Gmail erisimi artik calisiyor. Workflow failure sebebi OAuth degil: mail eki bulundu, fakat ek `DealerStatement` gelecek tahsilat kolonlarini tasimadigi icin `build_failed` oldu. Eksik kolonlar: `idKey`, `qtyKey`, `amountKey`, `startKey`, `endKey`, `paymentKey`, `statusKey`. Bulunan ek adi son 1 saat icinde durumu degismis tibbi cihazlar raporuna benziyor; gelecek tahsilat butcesi icin dogru DealerStatement raporu gerekiyor.

2026-07-01 banka mail guncellik turu sonucu: Temmuz ekraninda gorunen Ramiz Yigit tahsilatinin yeni Temmuz maili degil, `2026-06-10` tarihli eski bekleyen Akbank/Yapi Kredi tahsilat adayi oldugu dogrulandi. Banka hareket ekranlari ve preview sirasinda `created_at` yerine `transaction_date` esas alindi. Sabah onay kartlari yalnizca son 7 gunluk yeni hareketleri ana ekranda gosterir; eski bekleyenler `eski bekleyen` etiketiyle Banka Canli ekraninda kalir. Ust akil ozeti mail-ekstre workflow hatasini Gmail OAuth/refresh token kontrolu olarak gosterir.

2026-07-01 Gmail OAuth yenileme yardimcisi turu sonucu: Kullanici Google client bilgilerini daha once GitHub secrets'a verdigi halde yerel PowerShell'in bu secretlari okuyamadigi netlestirildi. `gmail-oauth-refresh.yml` workflow'u ve `automation/gmail-oauth-refresh-helper.cjs` eklendi. Artik `GOOGLE_CLIENT_ID` ve `GOOGLE_CLIENT_SECRET` yerelde tekrar yazilmadan GitHub Actions uzerinden izin linki uretilebilir; finish modunda Google code refresh token'a cevrilir ve kullanici bunu `GOOGLE_REFRESH_TOKEN` secret'ina yazar. Akis sadece `alaylimedikal@gmail.com` icin kilitlidir.

Son denetimde calisan komutlar:

- `npm run preflight`: gecti.
- `npm run sync:bizimhesap:plan`: gecti.
- `npm run sync:bizimhesap:dry`: gecti, ancak dry-run davranisi tam guvenli degil.
- `npm run finance-smoke`: gecti.
- `npm run verify:main-finance-flow-v55`: gecti.
- `npm run bank:approval:preview`: gecti.
- `npm run verify:bizimhesap:queue`: gecti.
- `npm run verify:daily-readiness`: gecti.
- `npm run verify:firm-isolation`: gecti.
- `npm run verify:bank-approval-action`: gecti.
- `npm run verify:dealer-statement-automation`: gecti.
- `npm run verify:gmail-oauth-refresh`: gecti.
- `npm run dealer-statement:gmail:dry -- --as-of=2026-07-01`: yerel ortamda Gmail secret/yetki yoksa beklenen sekilde blokaj verir; GitHub secrets ile workflow calisacak.
- GitHub Actions `AperiON DealerStatement Receivables` run `28500494014`: ilk run failure; hata raporu/artifact dayanimi eklendi.
- GitHub Actions `AperiON DealerStatement Receivables` run `28502969360`: success; artifact var. Sonuc gate'i eklendi.
- GitHub Actions `AperiON DealerStatement Receivables` run `28506469160`: failure; artifact var; gate hatayi saklamadi.
- Artifact raporu: `gmail_failed`, hata `oauth2.googleapis.com/token: Premature close`; retry eklendi.
- Mail-ekstre artifact raporu: tum banka sorgulari `invalid_grant`; Gmail refresh token yenilenmeli.
- GitHub raw `index.html`: yeni kod var.
- GitHub Pages `?v=5370338`: yeni kod var.
- `npm run bizimhesap:queue:dry`: gecti, hazir kuyruk 0.
- `npm run bank:approval:candidates`: gecti, ilk aday secildi.
- `npm run verify:bank-candidate-guard`: gecti.
- `npm run bank:approval:candidate:dry`: gecti, RPC calistirilmadi.
- `npm run bank:approval:candidate:proof`: gecti, pending durum ve queue yok kanitlandi.
- `node tools/approve_bank_candidate_v70.cjs --id 9b91f984-c94b-4005-92ab-7fb334aa31e7 --confirm ONAYLIYORUM`: kullanici onayi sonrasi gecti, queue id `3b30e1a0-0f02-4b0d-b03c-ae2779d448fa` olustu.
- `npm run bank:approval:candidate:proof`: gecti, pending `approved`, queue `ready_for_bizimhesap`.
- `npm run bizimhesap:queue:dry`: gecti, 1 hazir kuyruk icin dry-run plan yazildi.
- `BIZIMHESAP_POSTING_LIVE=1 npm run bizimhesap:queue:form`: gecti, form dolduruldu, kaydet tusuna basilmadi.
- `diagnostics/bizimhesap_queue_3b30e1a0-0f02-4b0d-b03c-ae2779d448fa_form.png`: form gorsel kaniti incelendi.
- `BIZIMHESAP_POSTING_LIVE=1 BIZIMHESAP_POSTING_SAVE=1 node bizimhesap_queue_worker.cjs --firma alayli --id 3b30e1a0-0f02-4b0d-b03c-ae2779d448fa --limit 1 --commit --save`: kullanici onayi sonrasi calisti, BizimHesap kaydet butonuna basildi.
- `npm run bank:approval:candidate:proof`: queue statusunun hala `ready_for_bizimhesap` oldugunu dogruladi.
- `npm run verify:bizimhesap:queue`: gecti; worker save sonrasi diagnostik ve queue status dogrulama kontrolu eklendi.
- `BIZIMHESAP_POSTING_LIVE=1 BIZIMHESAP_POSTING_SAVE=1 node bizimhesap_queue_worker.cjs --firma alayli --id 3b30e1a0-0f02-4b0d-b03c-ae2779d448fa --limit 1 --commit --save`: manuel kanit kilidiyle tekrar kaydetme atlandi.
- `npm run verify:bizimhesap:b2b-api`: calisti; `BIZIMHESAP_B2B_TOKEN` ve `BIZIMHESAP_FIRM_ID` eksik oldugu icin blokaj verdi.
- `npm run verify:bizimhesap:b2b-api:live`: token-header, bearer ve query-token modlarinda calisti; ucunde de 401 alindi, canli yazma yapilmadi.
- `node --check tools/mail_ekstre_actions_check.cjs`: gecti.
- `npm run mail:ekstre:actions:check`: komut eklendi; yerelde secret ortam degiskenleri olmadigi icin beklenen blokaj verdi.
- GitHub Actions `supabase-sql-install.yml`: run `28374635626`, conclusion `success`.
- `npm run bank:approval:candidate:proof`: queue status `processed`.
- `npm run bizimhesap:queue:dry`: 0 hazir kuyruk.
- GitHub Actions `mail-ekstre-pipeline.yml`: son run `success`.
- GitHub Actions `bizimhesap-queue-worker.yml`: son run `success`.
- GitHub Actions `hourly-bizimhesap-sync.yml`: son run `success`.
- `npm run bank:approval:preview`: 25 bekleyen, 19 yuksek guven, 6 inceleme.
- `npm run bank:approval:candidates`: sonraki aday `4f32c173-c773-4801-93e1-ce3bae757a1b`.
- `npm run verify:bank-candidate-guard`: gecti.
- `npm run verify:bank-approval-action`: gecti.

## Production'a En Yakin Parcalar

- BizimHesap kalici oturum ve ALAYLI MEDIKAL firma secimi.
- BizimHesap satis verisi cekme.
- Urun/stok ham veri cekme.
- Masraf ham veri cekme.
- Finans smoke test altyapisi.
- Ana finans akis matrisi.
- Banka onay preview ve BizimHesap queue dogrulama testi.

## Kismen Hazir Parcalar

- Finans Komuta Merkezi: ana urune gomulu, karar ekrani var; olgunluk orta.
- Gelir tablosu plan/tahakkuk/gerceklesen: veri modeli var, karar ekrani tam degil.
- Banka onay merkezi: analiz, guven puani, hedef hesap/cari/kayit turu ve kuyruk/worker kaniti gorunur. Dusuk guven/mukerrer/cari belirsiz kayitlar kilitlenir.
- Cari kartlari: satis/tahakkuk analizi var; gercek tahsilat, acik bakiye ve odeme disiplini eksik.
- Urun kartlari: satis ve kar analizi var; tam stok hareketi, alis maliyeti ve dinamik urun karti olgun degil.
- Telegram/evrak: token ve bazi altyapi var; uctan uca akisin bittigi kanitlanmadi.

## Kritik Riskler

1. GitHub hourly BizimHesap workflow son kontrolde basarisiz gorundu.
2. Windows gorevleri kurulu olsa da bazi son sonuc kodlari temiz basari degil.
3. Banka hareketlerinde dusuk guvenli kayitlar var; otomatik kesin kayit riskli.
4. BizimHesap'a tek tik kayit akisi testten geciyor; ancak yeni canli kayit testi kullanici onayi olmadan yapilmadi.
5. Cari ve urun kartlari muhasebe anlaminda tam kaynak bagli degil.
6. Veri guveni var ama tum veri kaynaklari bagli olmadigi icin tam degil.

## Olgunluk Tahmini

- Gunluk kullanilabilirlik: %70
- Teknik olgunluk: %63
- Finans Komuta Merkezi: %69
- Urun karti: %45
- Cari karti: %50

Bu yuzdeler kesin metrik degil; son denetimde calisan testler, eksik kaynaklar ve canli akis kanitlarina gore muhendislik tahminidir.

## Oncelik Sirasi

1. Veri guveni
2. Finans Komuta Merkezi
3. Banka onay kuyrugu
4. Firma izolasyonu
5. Gunluk kullanilabilir surum

## 2026-07-04 Supabase Guvenlik Raporu

- `C:\Users\HP\Downloads\AperiON_Supabase_Guvenlik_Raporu.docx` incelendi.
- Kritik rapor maddeleri `supabase_security_hardening_v77.sql` ile eslendi.
- Eksik kalan finans takvimi RPC kilitleri eklendi: mark_done, postpone, reject, create_plan.
- Kritik ham tablolarda anon select ve sequence erisimi kapatildi: bank_transactions, banka_raw, bizimhesap_events, product_raw, audit_logs.
- `tools/verify_supabase_security_hardening_v77.cjs` testi genisletildi.
- `npm run verify:supabase-security-hardening`: 26/26 gecti.
- Canli Supabase SQL uygulanmadi; kullanici onayi olmadan uygulanmayacak.

## 2026-07-04 Executive Workspace v80

- Kullanici `aperion-ust-akil-tasarim.html` ve `APERION HASTA BEZI EKRAN.xlsx` referanslarini verdi.
- Ana ekran komuta gorunumu sol sekmesiz kullanima alindi; dashboard modunda sidebar ve ac/kapat dugmesi gizlenir.
- Ana karar yuzeyi 8 tiklanabilir bolge olarak korunur: Banka Canli, Onay Merkezi, Gelir Tablosu, Satis & Tahsilat, Urun & Stok, Cari Risk, Veri Guveni, Bildirim Merkezi.
- `APERION HASTA BEZI EKRAN.xlsx` icindeki donem sirasi ve rapor mantigi okundu: Bugun, Dun, Bu Hafta, Bu Ay, Onceki Ay, Bu Yil, Onceki Yil; Belbantli, Kulotlu, Serme/Yatak Koruyucu, Mesane; Perakende ve Distributor/Toptan.
- Ana ekrana `Hasta Bezi Karar Ekrani` mini karti eklendi. Kart ay ciro/adet/brut kar, dun, hafta ve en guclu segmentleri gosterir.
- Hasta bezi karti tiklaninca detay raporu acar; segment ve urun satirlari tiklanabilir, urunler mevcut dinamik urun kartina baglanir.
- Kart veri gecikmesinde sonsuz bos kalmasin diye mevcut RAW/cache verisini kullanir; satis genis sorgusu arkadan gelirse kendini yeniler.
- Tarayici dogrulamada sol sidebar gizli, 8 komuta bolgesi gorunur ve viewport yuksekligi icinde yatay/dikey tasma yok olarak olculdu. Hasta bezi karti icin ek render korumasi eklendi.
- Canli BizimHesap kaydi, Supabase SQL veya finansal veri mutasyonu yapilmadi.

## 2026-07-04 Ana Sayfa v81 Tasarim Dili

- Kullanici `C:\Users\HP\Downloads\aperion-ana-sayfa.html` dosyasini `bu super` diyerek yeni ana sayfa referansi olarak onayladi.
- Referanstaki koyu zemin, brass vurgu, Fraunces basliklar, IBM Plex Mono kod/kucuk metin dili ve kart/kapidan gir mantigi mevcut ana ekrana tasindi.
- 8 tiklanabilir karar bolgesi bozulmadi; 4x2 koyu launcher kartlari olarak gosteriliyor.
- Sol sidebar dashboard modunda gizli kalmaya devam ediyor.
- Yerel tarayici kontrolde arka plan `#0E1420`, kart zemini `#161D2C`, 8 kartin gorunur oldugu, sol menunun gizli oldugu ve 720px viewportta scroll tasmasi olmadigi dogrulandi.
- `npm run verify:single-screen-command-map` ve `npm run finance-smoke` gecti.

## 2026-07-15 Belirsiz Gelen Banka Girisi Akisi

- Canli BizimHesap `Hesaba Para Girisi` formu kaydetmeden incelendi: tarih `txtTransactionDate`, tutar `txtAmount`, aciklama `txtDefinition`, kaydet `btnSave`.
- Kesin banka kaniti olan fakat cari eslesmesi bulunmayan gelen paralar, kaynak banka hesabinda cari/tedarikci bakiyesini etkilemeden `Hesaba Para Girisi` olarak planlanir.
- Aciklama, AperiON kuyruk ID'si, banka, islem numarasi, karsi taraf ve ham ekstre kanitini tasir.
- Reklam/duyuru ile banka adi celisen satirlar otomatik kayda kapali tutulur.
- Gunluk son tarih onizlemesi 2026-07-07 icin sadece bir VakifBank 100,00 TL adayi buldu; canli kuyruk RPC'si Supabase'de eksik `confirmed_counterparty` kolonu nedeniyle durdu. BizimHesap'a yeni kayit atilmadi.

## 2026-07-16 Gelir Tablosu ve Bilanco Yan Yana v122

## 2026-07-16 Is Bankasi Ekstre Ayrisma Guvenligi v123

- Is Bankasi kredi karti hesap ozeti e-postasinin yil bilgisi (`2.026 TL`) POS transferi gibi ayrisabiliyordu.
- Hesap ozeti bildirimi, tekil hareket/refarans kaniti yoksa `Banka disi ozet mail` olarak ayrilir.
- Hatali 2026-07-05 / 2.026 TL adayi onay listesinden cikti; BizimHesap'a kayit atilmadi.
- Gercek Is Bankasi girisleri kayda hazir: 2026-07-02 2.740 TL ve 2026-07-01 4.500 TL. Hedef: `*IS BANKASI` hesabinda `Hesaba Para Girisi`; cari baglanmayacak.

- Ana ekranda gelir tablosu solda, bilanÃ§o ve likidite Ã¶zeti saÄŸda konumlandÄ±.
- DÃ¶nem matrisi BugÃ¼n, DÃ¼n, Bu Hafta, Bu Ay, GeÃ§en Ay, Bu YÄ±l ve GeÃ§en YÄ±l baÅŸlÄ±klarÄ±nÄ± korur.
- BugÃ¼n altÄ±nda `Tahmini`, `Tahakkuk`, `Ã–denen / Tahsilat`; diÄŸer dÃ¶nemlerde `Tahakkuk` ve `Ã–denen / Tahsilat` ayrÄ± gÃ¶sterilir.
- SatÄ±ÅŸ, maliyet, brÃ¼t kar, gider ve net kar satÄ±rlarÄ± tÄ±klanarak kategori, Ã¼rÃ¼n ve kaynak kayda iner.
# v124 - Canonical publication recovery (2026-07-16)

- Canonical user-facing address is `https://aperion-istasyon.pages.dev/`.
- `https://ercanalayli.github.io/iSTasyon/` is a legacy GitHub Pages backup; it is not the authoritative live cockpit.
- Cloudflare address currently times out from this machine. The repository had visual-control workflows that assumed a Cloudflare deploy existed, but no workflow that actually deployed the project.
- Added a production deployment workflow for the `aperion-istasyon` Pages project. It requires the repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; deployment is not claimed successful until the workflow runs green and the canonical URL answers.

## 2026-07-29 - Hasta Bezi Gercek Kaynak Tamamlama v127

- BizimHesap satis raporu ham satirlari artik fatura no, urun kodu ve KDV haric/dahil tutarlari kaybetmeden saklanir.
- BizimHesap stok raporu `stock_raw` kaynagina urun, depo, miktar, tarih ve hareket tipiyle yazilir.
- Okunmus gercek alis/gelen e-fatura detaylarini `purchase_raw` kaynagina aktaran importer eklendi.
- Hasta Bezi veri motoru Supabase kaynagi yaninda botun kanitli yerel ham ciktilarini da okuyabilir; sahte veri veya tahmini fatura numarasi uretmez.
- Yeni kaynak tamlik testi sales, purchase, stock, satis fatura no, alis/satis gecmisi, FIFO KONTROL, Jender XXL ve Ilkbahar Eczanesi kabul kosullarini ayri raporlar.
- Yerel checkout'ta kaynak dosyalari bos oldugu icin tamlik testi bilincli olarak basarisizdir. Canli sonuc, secrets bulunan saatlik GitHub calismasi tamamlanmadan basarili sayilmayacak.
