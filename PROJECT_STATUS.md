# AperiON Project Status

Son guncelleme: 2026-07-14 Europe/Istanbul

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
baglanti ve gereksiz ayrinti gondermez. Mail pipeline'i 10:00 ve 17:00 Istanbul
kontrollerinden sonra bu kisa ozeti Telegram'a gonderecek sekilde baglandi.
Iki gunluk Gmail taramasi yeni mailleri yakalar; kaynak `duplicate_key` filtresi
gecmis tarihli ekstreyi tekrar kayda sokmaz. Bu tur onaysiz BizimHesap kaydi
olusturmaz. `gunluk-banka-karar.html` ayni raporu tek ekranda acar: sadece son
islem gunu, kayda hazir, cari dogrulama ve inceleme sutunlari gorunur. Kayda
hazir hareket kullanicinin acik tiklamasiyla `approve_pending_bank_movement`
RPC'sine gider; cari belirsizse once cari dogrulanir, sonra kuyruk olusur.
Gunluk snapshot Bank Approval Status workflow'u tarafindan repo/Pages'e yazilir.

2026-07-13 BizimHesap uctan uca salt-okunur denetimi: Gercek Windows
`AperiON_BizimHesap_Klon_Saatlik` gorevi repo calisma kopyasini degil,
`C:\\Users\\HP\\Desktop\\ErpaltH` altindaki ayri eski kopyayi calistiriyor.
Bu kopyada login ve ALAYLI MEDIKAL firma secimi basarili; satis, urun/stok ve
son islemler cekiliyor. Masraf okunmasina ragmen `masraf_raw` insert'i
`new row violates row-level security policy` ile reddediliyor. Gorev `.env`
dosyasinda Supabase servis rol anahtari yok, eski masraf botu da servis rolunu
okumuyor. Sonuc olarak retry runner basarisiz kapanmakta; gider/finans
gorunumunun tamamen guncel oldugu iddia edilemez. Ayrintili kanit:
`docs/BIZIMHESAP_UCTAN_UCA_DENETIM_2026-07-13.md`.

2026-07-13 operasyon ayrisma karari: Basarili GitHub `Hourly BizimHesap Sync`
ana yazici akisi olarak tutuldu. Hata ureten eski yerel saatlik gorev
`AperiON_BizimHesap_Klon_Saatlik` devre disi birakildi. Eski sabah kontrol
gorevi ayri yonetici yetkisi nedeniyle bu oturumdan kapatilamadi; durum
`Erisim engellendi` olarak kayit altinda. Bu tek kalan yerel gorev kapatilana
kadar eski klasorden ek basarisiz deneme riski vardir.

2026-07-13 Finans Takvimi gercek zaman/fallback turu sonucu: Takvimde kalan sabit Mayis 2026 filtre tarihi kaldirildi; sayfa acildiginda gercek gun kullanilir. Supabase tarafinda canli finans kaydi yoksa veya baglanti yoksa eski demo borclar yerine `aperion_payment_obligation_registry.json` icindeki kaynakli odeme hafizasi gosterilir. Bu sayede tutari veya hesap/vadesi eksik olan kartlar `tutar bekliyor`/`hesap ve vade bekliyor` olarak gorunur; demo tahsilat, kart borcu veya cek gercek karar gibi gorunmez.

2026-07-13 odeme hatirlatma adayi v88: kaynakli odeme hafizasi, Istanbul tarihine gore geciken/bugun/7-3-1 gun kala adaylari uretir. Batikent Ercan Ev Aidati her ayin 16'si icin kayitli; tutar veya odeme hesabi kaynakta yoksa bildirim bunu acikca belirtir. Telegram komutu once dry-run calisir; `--send` olmadan mesaj gondermez ve hicbir odeme/BizimHesap kaydi yaratmaz.

2026-07-13 Telegram odeme bildirimi: `payment-reminder-digest.yml` 07:00 ve 17:00 Istanbul saatlerinde salt-okunur aday listesini calistirir. Sadece geciken/bugun/vadesi yaklasan kartlar Telegram'a gonderilir; bilgi eksigi olan kredi karti ve KMH kartlari gunluk spam yapmaz. Workflow artifact'i aday listesini saklar; odeme, Supabase veya BizimHesap yazimi yapmaz.

2026-07-13 Telegram hedef uyumlulugu: mevcut ortamda tekil `TELEGRAM_CHAT_ID` yerine `TELEGRAM_CHAT_IDS` tanimli gorundu. Odeme hatirlatma gondericisi sirasiyla `TELEGRAM_CHAT_ID`, `TELEGRAM_ALLOWED_CHAT_ID` ve `TELEGRAM_CHAT_IDS` ilk degerini kullanacak sekilde uyumlandi. Gizli degerler okunmadi veya loglanmadi.

2026-07-13 Finans Takvimi erisim ve metin onarimi: `finans-takvimi.html` artik ara baslatici ekraninda bekletmeden canli Finans Takvimi'ne gecis yapar. Canli ekranda mevcut kaynak kodu/ekstre metni bozuk karakter isaretleri tasiyorsa goruntuleme katmani bunu onarmaya calisir; aylik vade hesabi ayin gercek gun sayisini kullanir.

2026-07-13 odeme takvimi ve gezinme turu sonucu: Finans Takvimi icin ayri odeme yukumlulugu hafizasi eklendi. Sahsi `Batıkent Ercan Ev Aidati` her ayin 16'si icin kaydedildi; tutar verilmedigi icin sistem tutar uydurmaz ve `tutar bekliyor` durumunda kalir. Sahsi/sirket kredi kartlari, sirket KMH hesaplari ve onceki Sena Medikal odeme notu da kaynak/hesap/vade bilgisi eksikse kesin borc sayilmayan kontrol kartlari olarak kayda alindi. Bildirim politikasi dashboard ve Telegram icin 7/3/1/0 gun oncedir; gonderim kanali canli kanitlanmadan bildirim gonderildi iddia edilmez. AperiON ust akil girisindeki guncelleme etiketi artik `HHmmYYMMdd` formatinda dinamik uretilir. Finans Takvimi ekranlarina gorunur `AperiON Ana Ekran` baglantisi eklendi.

2026-07-10 banka onay karakter duzeltme turu sonucu: Mobil banka onay ekraninda OCR veya upstream kodlama nedeniyle `BAKIM ?CRET?` gibi gorunen aciklamalar icin goruntuleme onarimi eklendi. `banka_onay.html` ham aciklama ve ham ekstre JSON'unu ayni onarimdan gecirir; `banka_gorsel_parser.js` yeni gorsel kayitlarda ayni `?CRET?` kalibini `UCRETI` olarak duzeltir. Belirsiz, taninmayan karakterler sessizce finansal anlam degistirecek sekilde silinmez. Bu tur finansal onay, Supabase yazimi veya BizimHesap kaydi yapilmadi.

2026-07-10 cari dogrulama ve kuyruk kaniti turu sonucu: Mail Ekstre Onay Merkezi'nde ilgili kisi/firma adiyla gelen tahsilatlar icin `Cari dogrula` eylemi eklendi. Kullanici, ornegin `ERCAN ALAYLI` hareketinde hedef BizimHesap carisini onaylar; ad, zaman ve not `pending_bank_movements` kaydina yazilir. Onaydan sonra olusan BizimHesap kuyrugu tahmini cari yerine dogrulanan cariyi `confirmed_counterparty`, `target_counterparty` ve kanit bayragiyla tasir. SQL paketi `automation/sql/007_confirm_pending_bank_counterparty.sql` ile idempotent hale getirildi; tam kurulum dosyasi da ayni alanlari icerir. Testler: `verify:finance-decision-rules` ve `verify:bank-approval-action` basarili. Bu tur canli cari dogrulamasi, kuyruga alma veya BizimHesap kaydi yapilmadi.

2026-07-10 canli workflow kontrolu: Cari dogrulama SQL push'u sonrasi `Supabase SQL Install` GitHub Actions run `29082485210` basariyla tamamlandi; yeni tablo alanlari ve RPC canli kurulum paketinden gecmistir. Ayni committe `AperiON Mail Ekstre Pipeline` run `29082485201` basarisiz oldu: secret'lar, Supabase tablolar/RPC'ler ve mailbox `alaylimedikal@gmail.com` kontrolleri gecti; blokaj `Gmail OAuth token check` adiminda. Mevcut `GOOGLE_REFRESH_TOKEN` Google tarafinda gecersiz/iptal edilmis gorunuyor ve yeni kullanici izniyle yenilenmeli. `Live Visual Control` run `29082485175` de Telegram kutusu beklentisi nedeniyle basarisiz; bu bir finansal veri/SQL hatasi degil, canli ekran kontrolu Telegram canli durumunu bulamiyor. Bu iki durum production-ready kabul edilmez.

2026-07-10 Telegram/gorsel ekstre virman karari turu sonucu: Gorsel ekstre parser'i `virman` gorunce hareketi otomatik `islenmeyecek` durumuna alma hatasi duzeltildi. Virman artik `onay_bekliyor` olarak kalir. Telegram onay karti ham aciklamayi `Aciklama kaniti` olarak, kaynak hesap, hedef hesap, BizimHesap hedefi, kategori, guven ve insan dilindeki soruyu birlikte gosterir. Ornek Is Bankasi -> VakifBank 17.300 TL hareketi `Sirket bankalari arasi virman` olarak siniflanir ve soru `Is Bankasi banka hesabindan VakifBank banka hesabina 17.300 TL sirket ici virman olarak BizimHesap'a isleyeyim mi?` olur. `verify:telegram-bank-virman` ve `verify:finance-decision-rules` basarili. Canli onay veya kayit yapilmadi.

2026-07-10 dashboard zaman damgasi turu sonucu: Canli dashboard incelemesinde ust cubuktaki eski `25.05.2026` metninin kodda kalmis sabit build etiketi oldugu goruldu. `index.html` artik Banka Onay Status raporunun `created_at` degerini de guncellik hesabina alir ve ust cubukta `SON RAPOR <zaman> · CANLI` yazar. Bu zaman bir finansal kaynak tarihi degil, ekranda gorulen karar snapshot'inin olusturulma zamanidir. `verify:bank-approval-action` ve `finance-smoke` basarili.

Genel durum: Sistem calisan bir omurgaya sahip, ancak tum moduller gunluk guvenilir kullanim icin production-ready degil.

Koordineli calisma protokolu dosyalari `main` branch'e alinmistir. Bundan sonraki turlarda durum, karar, sonraki is ve kalite kontrol bu dosyalardan surdurulecektir.

2026-07-10 finans karar hafizasi turu sonucu: Kullanici hayatini ve sirket CFO akislarini otomasyona cevirmek istedigini, bankaya gelen `Ercan Alayli` havalesinin cari dogrulamasi sonrasi BizimHesap'a tahsilat olarak islenmesini, ayrica sahsi/sirket giderlerinin sabit-degisken olarak takip edilmesini acil hedef olarak belirtti. `config/aperion_finance_rules.json` eklendi; sirket bankalari, POS hesaplari, ilgili kisi/firma dogrulama listesi, sirket sabit giderleri, kisisel sabit giderler ve inceleme isteyen anahtar kelimeler tek hafizada toplandi. `tools/bank_posting_plan.cjs` ve ana ekran banka karar metinleri bu hafizaya baglandi. Ilgili kisi/firma hareketleri ve kisisel/aile/okul/bagis gibi hareketler kullanici dogrulamasi olmadan kesin BizimHesap kaydina gitmez. Testler: `verify:finance-decision-rules`, `finance-smoke`, `verify:bank-approval-action` basarili. Bu tur canli BizimHesap kaydi, Supabase yazimi veya banka onayi yapilmadi.

2026-07-10 ERP ust akil kapsam netlestirme sonucu: Kullanici AperiON'un sadece para hareketi degil; satis, alis, raporlama, analiz, anomali tespiti, CFO, CEO, ERP ve ust akil sistemi olmasi gerektigini vurguladi. `config/aperion_intelligence_scope.json` ve `docs/APERION_ERP_UST_AKIL_KAPSAM.md` eklendi. Kapsam CFO finans, CEO satis, alis/gider, stok/FIFO, anomali/risk ve hayat asistani motorlari olarak kalici hale getirildi. Bundan sonraki uygulama turlari banka akisiyla baslasa bile satis/alis/stok/cari/anomali ayni mimari altinda ele alinacak.

2026-07-09 birlesik ust akil link turu sonucu: Kullanici AperiON'u tam ERP gibi komplekslestirmek yerine tek linkten calisan CFO / ust akil / hayat asistani dashboard'u olarak kullanma fikrini onayladi ve Hasta Bezi/FIFO projesiyle AperiON iSTasyon projesinin birlestirilmesini istedi. `aperion-ust-akil.html` eklendi: isletme CFO paneli, Hasta Bezi & FIFO, Mail/Ekstre ust akil, BizimHesap onayi, Cari Hafiza, Urun Hafiza, Hayat Asistani ve Veri Guveni olmak uzere 8 tiklanabilir modul tek giriste toplandi. `aperion.html` kisa giris kapisi olarak `aperion-ust-akil.html` sayfasina yonlendirir. Rebase sonrasi `finance-smoke` icinde gorulen Moka/POS siniflandirma ezilmesi duzeltildi; Moka banka yatisi artik genel POS kuralina dusmeden `Moka banka transferi` olarak kalir. Bu tur canli BizimHesap kaydi, Supabase yazimi veya banka onayi yapilmadi.

2026-07-04 canli ana sayfa ve banka aday snapshot turu sonucu: GitHub Pages `https://ercanalayli.github.io/iSTasyon/?v=cf81c26` HTML iceriginde v81 koyu launcher tasarimi, Fraunces fontu, koyu zemin, 8 komuta haritasi ve hasta bezi karar karti dogrulandi. `bank:approval:status` salt-okunur calisti; 25 bekleyen hareketten 4 aday, 2 dusuk risk, 21 inceleme isteyen kayit goruldu. Secilen guvenli aday `2026-07-03 Yapi Kredi 4.600 TL POS tahsilati`, pending id `c7f757fa-939a-45e3-aa0b-145259234045`, guven `%88`, status `pending`, queue `0`. `bizimhesap:queue:dry` 0 hazir kuyruk gosterdi. Canli RPC, kuyruga alma veya BizimHesap save calismadi.

2026-07-04 saatlik BizimHesap sync RLS turu sonucu: GitHub Actions logu connector ile okundu. Basarisiz `Hourly BizimHesap Sync` run'inda BizimHesap login ve ALAYLI MEDIKAL firma secimi calismis; asil hata `sales_raw` ve `masraf_raw` yaziminda `new row violates row-level security policy` olarak gorulmustur. Kök neden, bazi BizimHesap yazici botlarinin GitHub secret olarak verilen `SUPABASE_SERVICE_ROLE_KEY` yerine gomulu publishable/anon key ile Supabase'e yazmaya calismasidir. `bizimhesap_bot.js`, `bizimhesap_masraf_cek.js`, `bizimhesap_urun_stok_cek.js` ve `bizimhesap_son_islemler_izle.js` servis rolunu onceliklendirecek ve Supabase auth session persist etmeyecek sekilde guncellendi. `verify:bizimhesap:supabase-service-key` testi eklendi; 12/12 gecti. Fix commit'i sonrasi `Hourly BizimHesap Sync` run `28701917165` basariyla tamamlandi: satis kaynak yenileme 963 kayit, urun/stok 3203 kayit, masraf 82 kayit, son islemler 3 yeni kayit ve sales today stress check OK. Canli BizimHesap kaydi veya Supabase SQL hardening uygulanmadi.

2026-07-03 tek ekran komuta haritasi turu sonucu: Kullanici sol taraftaki sekmelerin kaldirilmasini ve ana ekranin 6-8 tiklanabilir bolgeye ayrilmasini istedi. Masaustu gorunumde sol sidebar ve ac/kapat dugmesi gizlendi; ana ekran tam viewport genisligine alindi. Dashboard basina 8 tiklanabilir komuta bolgesi eklendi: Banka Canli, Onay Merkezi, Gelir Tablosu, Satis & Tahsilat, Urun & Stok, Cari Risk, Veri Guveni, Bildirim Merkezi. Bolgeler renkli, hover/focus cerceveli ve 4x2 karar haritasi olarak calisir. Tarayici kontrolde 8 bolge, 2 satir, sol menusuz gorunum, yatay tasma olmamasi ve bolge cakismamasi dogrulandi. `verify:single-screen-command-map` komutu eklendi. Commit `c9672fd` main'e pushlandi; otomasyon snapshot commitleri sonrasi en guncel `main` uzerinde de haritanin kaldigi ve GitHub Pages deploy'unun basarili oldugu dogrulandi.

2026-07-03 banka kayit rotasi turu sonucu: Banka Canli tablosu ve sabah onay kartlarina `bankLedgerRouteHtml` eklendi. Her banka hareketi artik Kaynak, AperiON karari, BizimHesap hedefi ve Sonuc bolumleriyle okunur. `Onay anlami` kutusu kullaniciya bu hareket onaylanirsa hangi banka hesabi, hangi cari, hangi kategori ve hangi BizimHesap kayit turu ile kuyruga alinacagini aciklar. `verify:bank-approval-action` testine rota, insan dilinde onay anlami, tablo ve sabah karti baglantisi kontrolleri eklendi. Canli BizimHesap kaydi veya toplu onay calismadi.

2026-07-03 CFO modu gorsel referans turu sonucu: Kullanici `Finans Direktoru (CFO) Egitimi` gorselini referans vererek benzer bir finans direktoru/ust akil sistemi yapmak istedigini belirtti. Bu istek `APERION_CFO_MODUL_PLANI.md` dosyasina cevrildi. Plan; finansal tablolar, raporlama, stratejik finans, maliyet/butce, isletme sermayesi, yatirim, finansal zorluk ve risk yonetimini AperiON verilerine baglayan CFO modu kurgusunu tanimlar. Aktif uygulama hedefi yine Banka Canli / Onay Merkezi kanit akisini bitirmek olarak kalir; CFO modu bu guvenli para/veri temeli uzerine insa edilecek.

2026-07-03 Supabase/BizimHesap guvenlik devami sonucu: Claude'un canli tarafta yaptigi cookie/API guvenlik notu repo durumuna alindi. Cookie'nin koddan cikarilip kilitli `integrations` tablosuna tasindigi, `bizimhesap-proxy` JWT dogrulamasina alindigi ve resmi BizimHesap API'nin gercek urun verisi dondurdugu not edildi. Repo tarafinda `supabase_security_hardening_v77.sql` eklendi; amaci anon kullanicinin banka/onay/finans RPC'lerini calistirmasini, `bank_transactions`, `banka_raw`, `bizimhesap_events`, `product_raw`, `audit_logs` gibi kritik tablolara yazmasini engellemek ve okumalari `aperion_users.firma_id` uzerinden authenticated role'e baglamaktir. Bu SQL canli DB'ye otomatik uygulanmadi; once denetim ve onay gerektirir. `verify:supabase-security-hardening` komutu eklendi ve 16/16 gecti.

2026-07-03 istek ve gorsel toparlama sonucu: Kullanicinin sohbette ilettigi ana istekler, oncelikler, sistem vizyonu, banka/BizimHesap/onay/gelir tablosu/urun/hasta bezi/kisisel ikinci beyin talepleri ve gorsel referans dosyalari `APERION_ISTEKLER_VE_GORSELLER.md` icinde tek kaynak olarak toplandi. Bu dosya sonraki tasarim ve uygulama turlarinda kapsam kaybi olmamasi icin referans alinacak.

2026-07-02 banka aday odaklama turu sonucu: Banka Komuta Merkezi'ndeki `Siradaki BizimHesap adayi` bandina `Adayi Ac` aksiyonu eklendi. Bu aksiyon canli kayit yapmaz; Finans > Banka Canli ekranini acar, secili pending id satirini bulur, ekrana getirir ve sari cerceveyle isaretler. Kartta artik BizimHesap hedefi, banka hesabi, cari/karsi taraf ve kategori ayrica gorunur; onayin ilgili satirdan verilecegi acik yazilir. Banka onay satirlari artik `data-bank-pending-id` / `data-bank-row-id` tasir. `verify:bank-approval-action` icine focus helper, row id, karar alani ve buton kontrolleri eklendi. Canli RPC veya BizimHesap save calismadi.

2026-07-02 banka satir kayit kaniti turu sonucu: Banka Canli satirlarina uc adimli kayit kanit seridi eklendi: `AperiON onayi`, `BizimHesap kuyrugu`, `Kayit sonucu`. Boylece her hareket icin onay bekliyor mu, kuyruga alinmis mi, BizimHesap'a islenmis mi veya hata mi var satir uzerinde gorunur. `verify:bank-approval-action` bu seridin varligini kontrol eder. Canli RPC veya BizimHesap save calismadi.

2026-07-02 sabah onay karti kayit kaniti turu sonucu: Banka Canli tablosundaki uc adimli `AperiON onayi -> BizimHesap kuyrugu -> Kayit sonucu` seridi sabah onay kartlarina da eklendi. Ana ekrandaki yeni mail/onay karti ile detay tablosu ayni kayit diliyle konusur. `verify:bank-approval-action` sabah kartlarinin bu helper'i kullandigini kontrol eder. Canli RPC veya BizimHesap save calismadi.

2026-07-02 banka aday ozet sayaclari turu sonucu: `Siradaki BizimHesap adayi` kartina status raporundan gelen taranan hareket, guvenli aday, inceleme isteyen kayit ve hazir kuyruk sayaclari eklendi. Ana ekran artik sadece tek adayi degil, aday seciminin arka planindaki is hacmini de gosterir. Canli RPC veya BizimHesap save calismadi.

2026-07-03 banka status rapor zamani turu sonucu: `Siradaki BizimHesap adayi` kartindaki ozet sayaclara status raporunun `created_at` zamani Turkiye saatiyle eklendi. Boylece ekranda gorunen aday/sayac bilgisinin hangi snapshot'a ait oldugu anlasilir. Canli RPC veya BizimHesap save calismadi.

2026-07-03 banka onay islem yolu turu sonucu: Ana aday karti ve sabah onay kartlarina 4 adimli islem yolu eklendi: onay, BizimHesap kuyrugu, bot kaydi, sonuc kontrolu. Kullanici artik kartta hangi dugmeye basacagini ve sonrasinda kaydin nereden izlenecegini gorur. Canli RPC veya BizimHesap save calismadi.

2026-07-03 Pages retry notu: `dbbd736` icin CI ve Live Visual Control basarili oldu, fakat GitHub Pages deploy asamasi hata verdi. Kod build/syntax hatasi gorulmedi; Pages yeniden tetiklemek icin durum notu commit'i hazirlandi.

2026-07-03 yayin kaynagi netlestirme turu sonucu: Netlify e-postalari/PR preview linkleri canli production teyidi olarak kabul edilmeyecek. AperiON iSTasyon icin tek canli dogrulama kaynagi `ercanalayli/iSTasyon` main branch, GitHub Actions ve GitHub Pages yayini olarak kilitlendi. Son kontrol: `a28d28d` icin CI, Live Visual Control ve Pages deploy basarili; canli URL'de bank approval path, posting flow ve report chip mevcut.

2026-07-03 yayin kaynagi retry sonucu: `d7ea3d7` dokuman commit'inde CI ve Live Visual Control basarili oldu, Pages deploy asamasi tekrar hata verdi. HTML basina production-source marker eklendi ve Pages yeniden tetiklendi.

2026-07-03 Pages deploy kesinlestirme sonucu: GitHub connector ile failed Pages deploy job logu okundu; hata `Deployment failed, try again later.` oldugu icin kod/artifact hatasi degil gecici GitHub Pages deploy hatasi olarak siniflandi. Failed deploy job tekrar calistirildi ve `9e7d68a` icin Pages deploy attempt 2 basarili oldu. Canli GitHub Pages URL'de production marker, bank approval path, posting flow ve report chip dogrulandi. Cloudflare `aperion-istasyon.pages.dev` bu ortamdan erisilemedi; Netlify production kaniti sayilmadi.

2026-07-03 canli kontrol fallback turu sonucu: `live_visual_control_bot.cjs`, `live_data_status_control_bot.cjs` ve `verify_aperion_live_home_fetch.cjs` tek URL'ye bagimli olmaktan cikarildi. `APERION_LIVE_URLS` virgullu listeyi dener; yoksa once Cloudflare, sonra GitHub Pages denenir. Fallback basarili olursa ilk URL hatasi raporu kirmizi yapmaz; secilen URL rapora yazilir. HTTP, veri durumu ve gorsel kontrol botlari GitHub Pages URL ile basarili test edildi.

2026-07-02 banka status Pages fallback turu sonucu: GitHub raw uzerinde `data/aperion_bank_approval_status.json` mevcut oldugu dogrulandi; GitHub Pages deploy `in_progress` oldugu icin ayni dosya Pages altinda gecici 404 dondu. Ana ekran `fetchBankApprovalStatusReport()` artik once Pages/local `data/aperion_bank_approval_status.json`, olmazsa `raw.githubusercontent.com/ercanalayli/iSTasyon/main/data/aperion_bank_approval_status.json` yolunu dener. Boylece Pages deploy gecikmesi status bandini bos birakmaz. `verify:bank-approval-action`, HTML script parse ve `finance-smoke` gecti. Canli RPC veya BizimHesap save calismadi.

2026-07-02 banka onay status otomasyonu turu sonucu: `AperiON Bank Approval Status` GitHub Actions workflow'u eklendi. Workflow manuel, mail ekstre pipeline sonrasi, BizimHesap queue worker sonrasi ve zamanli olarak calisir; sadece okuma/dry-run yapar, `npm run bank:approval:status` ile `data/aperion_bank_approval_status.json` uretir ve degisiklik varsa yalnizca bu snapshot dosyasini commitler. Ana ekran artik workflow beklemeden de ilk statusu okuyabilsin diye guvenli snapshot repo icine alindi. Guard testleri workflow'un canli RPC icermedigini ve sadece status snapshot commitledigini kontrol eder. `verify:bank-candidate-guard`, `verify:bank-approval-action`, `bank:approval:status`, `verify:bizimhesap:queue`, `finance-smoke` ve syntax kontrolu gecti. Canli BizimHesap kaydi yapilmadi.

2026-07-02 ana ekran banka onay durumu turu sonucu: Banka Komuta Merkezi icine `Sıradaki BizimHesap adayı` durum bandi eklendi. Ekran `data/aperion_bank_approval_status.json` varsa secili aday, tutar, karar tipi, cari/kategori, guven, queue status ve gerekli tekil onay metnini gosterir; dosya yoksa mevcut banka kartlari bozulmadan devam eder. Dashboard modunda bandin tasmasini engelleyen kompakt CSS eklendi. `verify:bank-approval-action`, `verify:bank-candidate-guard`, `finance-smoke`, `bank:approval:status`, `verify:bizimhesap:queue` ve HTML script parse kontrolu gecti. Canli RPC veya BizimHesap save calismadi.

2026-07-02 banka onay tek durum raporu turu sonucu: `tools/build_bank_approval_status_v76.cjs` ve `bank:approval:status` komutu eklendi. Komut sirayla guncel aday secimi, dry-check, kuyruk kaniti ve BizimHesap worker dry-run calistirip `data/aperion_bank_approval_status.json` raporunu uretir. Rapor secili aday, hedef hesap/cari/kategori, guven, risk, pending status, queue status, blokajlar, kullanicinin vermesi gereken tekil onay metni ve onaydan sonra calisacak komutu tek yerde gosterir. Son durum: `2026-06-30 Yapi Kredi -3.56 TL Vergi/SGK odemesi`, pending id `d1455265-abaf-4ea1-a6d4-386bf16b93c1`, queue `0`, canli RPC ve BizimHesap save calismadi.

2026-07-02 banka aday kanit guncel secim turu sonucu: `bank:approval:candidate:proof` komutu artik eski sabit pending id'ye dusmez; once `bank:approval:candidates` calistirir ve `data/banka_onay_guvenli_adaylar.json` icindeki guncel `recommended_first_approval` kaydini kanitlar. `approve_bank_candidate_v70.cjs` guvenli odeme/vergi/SGK adaylarini da kuru onay kontrolunde taniyacak sekilde guncellendi; dusuk risk, %84 guven, inceleme istememe ve acik kullanici onayi kilitleri aynen duruyor. Son dry-check adayi: `2026-06-30 Yapi Kredi -3.56 TL Vergi/SGK odemesi`, pending id `d1455265-abaf-4ea1-a6d4-386bf16b93c1`. Kanit sonucu: pending bulundu, status `pending`, queue count `0`, queue status `queue_yok`. Canli RPC, kuyruga alma veya BizimHesap kaydi yapilmadi.

2026-07-02 banka mail metin temizleme turu sonucu: Gmail ekstre pipeline'i calisir durumda; son dogrulanmis run 214 yeni banka hareketini `pending_bank_movements` onay kuyruguna yazdi. Temmuz kayitlari `bank:approval:preview` icinde gorundu. Bozuk karakterli banka aciklamalari ve cari ipuclari icin `fixMojibake` katmani guclendirildi; yeni gelen kayitlar `automation/lib/pending-normalize.js` icinde temizlenir, mevcut bekleyen kayitlar `tools/bank_posting_plan.cjs` ile planlanirken temiz okunur. `bank:approval:preview` sonucu: 25 ornek kayit, 14 yuksek guven, 11 inceleme isteyen kayit. `bizimhesap:queue:dry` sonucu: 0 hazir kuyruk; yani kullanici onayi olmadan BizimHesap'a kayit yok.

2026-07-02 banka cari guvenlik kilidi turu sonucu: Banka onay analizinde `ACIKL`, `ACIKLAMA`, `HESAP SUBE`, `IBAN`, `YATIRILAN TUTAR`, `KART NO`, `ATM NO` gibi alan basliklari veya banka teknik parcalari artik cari/karsi taraf kabul edilmez. Bu kural hem `tools/bank_posting_plan.cjs` hem ana ekrandaki `index.html` anlik analiz fonksiyonuna eklendi. Yeni preview sonucu: 25 ornek kayit, 7 guvenli aday, 18 inceleme isteyen kayit. Ilk onerilen dusuk riskli aday: `2026-07-02 Akbank 57 TL POS tahsilati`. `bizimhesap:queue:dry` yine 0 hazir kuyruk gosterdi.

2026-07-02 banka disi mail filtresi turu sonucu: BizimHesap gunluk finans/hareket ozetleri mail ekstre parser'indan banka hareketi gibi gecmeyecek sekilde engellendi. Mevcut bekleyenlerde de `Banka disi ozet mail` olarak inceleme moduna alinir. `Akilli Asistan`, `Anlik Odeme Bilgilendirmesi` gibi bildirim basliklari cari kabul edilmez. Yeni `bank:approval:preview` sonucu: 25 ornek kayit, 2 guvenli aday, 23 inceleme isteyen kayit. `bank:approval:candidates` ilk dusuk riskli adayi `2026-06-30 Yapi Kredi -3.56 TL Vergi/SGK odemesi` olarak secti. Canli onay veya BizimHesap kaydi yapilmadi.

2026-07-02 banka bildirim cari yakalama turu sonucu: Gmail banka bildirim parser'i artik `Gonderen / Aciklama`, `Alici`, `Karsi Taraf`, `Cari` ve `Gelen/Giden FAST/EFT/Havale` kaliplarindan gercek karsi taraf ipucunu `suggested_counterparty` alanina yazar. `FAST`, `EFT`, `HAVALE`, IBAN, kart/hesap/bakiye/tutar teknik parcalari cari adindan temizlenir. Testte sentetik Akilli Asistan gelen EFT metni `RAMIZ YIGIT` olarak yakalandi; BizimHesap gunluk finans ozetleri yine 0 banka hareketi dondurdu. Mevcut eski pending satirlari otomatik degistirilmedi; bundan sonraki yeni mail kayitlari daha temiz analizlenecek.

2026-07-02 ana is programi sira kilidi sonucu: Kullanici tum isteklerin sirayla yapilmasini istedi. Ana ekrandaki `AperiON Ana Is Programi` 20 maddelik gercek siraya guncellendi: veri guveni, BizimHesap giris, mail ekstre, Onay Merkezi, BizimHesap tek tik kanit, banka/kasa/cari esgudum, ana ekran ust akil, gelir tablosu, sabit/sozlesmeli kartlar, satis/urun, hasta bezi, maliyet/marj, fatura detayi, gider karti, Telegram/gorsel, banka ekran goruntusu, piyasa fiyat botu, kisisel ikinci beyin, cache/isletme hafizasi ve gunluk kullanilabilir surum. Bundan sonraki aktif hedef 04 numarali `Onay Merkezi analiz guveni` olarak kilitlendi.

2026-07-02 Onay Merkezi analiz guveni turu sonucu: Banka onay satirlarina risk etiketleri ve kanit kutusu eklendi. Her satirda artik yon, cari kanit kaynagi, hareket tazeligi, kuyruk durumu, karar nedeni ve mukerrer durumu gorunur. Sabah onay kartlari da ayni risk etiketlerini kullanir. BizimHesap'a gonderilebilir kabul edilen banka hareketleri icin guven esigi 70'ten 84'e cikarildi; 84 alti kayitlar `Güven düşük` sebebiyle pasif kalir. `verify:bank-approval-action`, `bank:approval:candidates`, `bizimhesap:queue:dry` ve `finance-smoke` gecti. Canli BizimHesap kaydi yapilmadi.

2026-07-02 BizimHesap tek tik kayit kaniti turu sonucu: `bizimhesap_queue_worker.cjs` dry-run raporu artik her kuyruk kaydi icin `evidence` alani uretir: queue id, pending id, kuyruk statusu, hedef, hesap, cari, kategori, guven, otomatik kayit guvenli mi, blokajlar, manuel kanit/tekrar kayit kilidi ve sonraki adim. Rapor `summary` alaninda queue_count, safe_to_auto_save, needs_review ve manual_proof_locked sayilarini verir. Ana ust akil kartinda BizimHesap'a gidecek banka kaydi artik onay bekleyen/kuyrukta/islenmis/hata ayrimini gosterir. Kuyruk su an 0 hazir kayit; canli BizimHesap kaydi yapilmadi.

2026-06-27 veri guveni turu sonucu: BizimHesap dry-run satis akisi artik satis tablosuna delete/insert yapmadan `[DRY-RUN] ... yazilmayacak` logu ile cikiyor. Son islemler botu dry-run modunda Supabase/state yazimini atliyor; Supabase hatasi olursa artik sadece loglanmayip hata olarak yukari tasiniyor.

2026-06-27 banka onay zinciri turu sonucu: Banka Canli ekrani artik iki onay hattini birlikte okur: mail ekstre icin `pending_bank_movements -> bizimhesap_queue`, Telegram/gorsel eski hat icin `bank_transactions -> bizimhesap_posting_queue`. Her kayitta kuyruk id, worker sonucu ve BizimHesap kayit var/yok bilgisi ekranda gosterilir.

2026-06-27 firma izolasyonu turu sonucu: ALAYLI karar ekranlarinda kritik queue ve log sorgulari firma filtresiyle kilitlendi. `verify:firm-isolation` komutu eklendi ve ALAYLI disi verinin ana karar ekranlarina karismamasi icin statik kontrol baslatildi.

2026-06-27 gunluk kullanilabilir surum turu sonucu: Ana veri denetimi kartina `Gunluk Kullanim Durumu` paneli eklendi. Panel, ana modulleri gunluk kullanilabilir / kismen hazir / blokajli olarak ayirir ve ilk 5 blokaji ekranda gosterir. `verify:daily-readiness` komutu eklendi.

2026-06-27 banka onay aksiyonu turu sonucu: Banka Canli / Onay Akisi satirlarinda BizimHesap hedefi, hesap, cari, kayit turu, kuyruk/worker kaniti ve hazir degil sebebi gorunur hale getirildi. Hazir olmayan, dusuk guvenli, mukerrer adayli veya zaten kuyrukta/islenmis kayitlarda `BizimHesap'a Kaydet` butonu pasif hale gelir. `verify:bank-approval-action` komutu eklendi.

2026-06-29 canli yayin turu sonucu: GitHub push kilidi hesap secimiyle cozuldu. `GCM_ACCOUNT=ercanalayli` ile iki yerel commit `main` branch'e pushlandi. GitHub raw ve GitHub Pages URL'sinde `Gunluk Kullanim Durumu`, `bankActionState` ve `bank-posting-proof` metinleri dogrulandi. Canli commit: `5370338`.

2026-06-29 banka -> BizimHesap kanit turu sonucu: `bank:approval:preview` 25 onay bekleyen banka hareketi buldu; 19'u yuksek guvenli, 6'si inceleme istiyor. `bizimhesap:queue:dry` calisti ve `bizimhesap_queue` icinde 0 hazir kayit oldugunu dogruladi. Yani worker hatti bagli, fakat islenecek kayit yok; canli islem icin once kullanici onayli bir banka hareketi kuyruga alinmali.

2026-06-29 banka onay adayi turu sonucu: `bank:approval:candidates` komutu eklendi ve calisti. Komut once banka onay preview uretir, sonra dusuk riskli ilk onay adayini secer. Ilk onerilen aday: VakifBank 2026-06-10, -8,37 TL, Banka/POS masrafi, guven %90, pending id `9b91f984-c94b-4005-92ab-7fb334aa31e7`. Canli onay/RPC calistirilmadi.

2026-06-29 guvenlik kilitli kuyruga alma turu sonucu: `tools/approve_bank_candidate_v70.cjs` eklendi. Komut `--id` ve `--confirm ONAYLIYORUM` olmadan `approve_pending_bank_movement` RPC'sine gitmez. `bank:approval:candidate:dry` calisti, ayni VakifBank adayini dogruladi ve RPC calistirmadan `data/banka_onay_kuyruk_kaniti.json` dry-check raporu uretti.

2026-06-29 banka aday kanit okuma turu sonucu: `bank:approval:candidate:proof` komutu eklendi ve calisti. Secilen VakifBank -8,37 TL adayinin `pending_bank_movements.status=pending` oldugu, `bizimhesap_queue` icinde henuz kayit olmadigi dogrulandi. Komut salt-okunur calisir; canli onay/RPC calistirmadi.

2026-06-29 kullanici onayli banka kuyruk turu sonucu: Kullanici `onayliyorum` dedi. Sadece secili VakifBank 2026-06-10, -8,37 TL banka masraf adayi icin `approve_pending_bank_movement` RPC calisti. Pending id `9b91f984-c94b-4005-92ab-7fb334aa31e7` status `approved` oldu ve `bizimhesap_queue` icinde queue id `3b30e1a0-0f02-4b0d-b03c-ae2779d448fa`, status `ready_for_bizimhesap` kaydi olustu. `bizimhesap:queue:dry` 1 hazir kayit buldu ve planin BizimHesap gider/masraf kaydi oldugunu gosterdi. BizimHesap'a kesin kaydetme / save islemi yapilmadi.

2026-06-29 BizimHesap form kontrol turu sonucu: `BIZIMHESAP_POSTING_LIVE=1 npm run bizimhesap:queue:form` calisti. BizimHesap kalici oturum acildi, ALAYLI firma portalina girildi, queue id `3b30e1a0-0f02-4b0d-b03c-ae2779d448fa` icin masraf formu dolduruldu ve kaydet tusuna basilmadi. Diagnostik gorsel `diagnostics/bizimhesap_queue_3b30e1a0-0f02-4b0d-b03c-ae2779d448fa_form.png` icinde tarih `10.06.2026`, tutar `8,37`, odeme durumu `Odendi` ve aciklama alaninda queue id goruldu. Kuyruk statusu `ready_for_bizimhesap` kaldi; kesin BizimHesap kaydi icin ayri onay gerekir.

2026-06-29 BizimHesap canli kaydetme turu sonucu: Kullanici `BizimHesap'a kaydetmeyi onayliyorum` dedi. Sadece queue id `3b30e1a0-0f02-4b0d-b03c-ae2779d448fa` icin `BIZIMHESAP_POSTING_LIVE=1` ve `BIZIMHESAP_POSTING_SAVE=1` ile worker calisti. Worker BizimHesap kaydet butonuna bastigini logladi. Ancak `mark_bizimhesap_queue_processed` RPC Supabase schema cache icinde bulunmadigi icin queue kapanmadi ve `ready_for_bizimhesap` kaldigi dogrulandi. DB password ile yerel SQL kurulum denemesi `password authentication failed for user "postgres"` hatasi verdi. Worker sonraki calismalar icin save sonrasi diagnostik ve queue status dogrulama logu uretecek sekilde guclendirildi.

2026-06-29 manuel BizimHesap kanit kilidi sonucu: Kullanici BizimHesap listesinde `APERION QUEUE:3b30e1a0-0f02-4b0d-b03c-ae2779d448fa` aciklamali 8,37 TL banka masraf kaydinin olustugunu bildirdi. Bu kanit `data/bizimhesap_manual_posting_proofs.json` dosyasina islendi. Worker save modunda bu queue id icin BizimHesap'a tekrar login/form/save yapmadan `tekrar kaydetme atlandi` sonucunu verir; boylece SQL kapanisi eksik olsa bile mukerrer BizimHesap kaydi engellenir.

2026-06-29 BizimHesap B2B API dokuman turu sonucu: Kullanici Entegrasyon API dokumanini paylasti. Repo icinde `bizimhesap_api_client.cjs` zaten `addinvoice`, `cancelinvoice`, `products`, `warehouses`, `inventory`, `customers`, `abstract`, `addcustomer`, `addproduct` metodlarini destekliyor. `npm run verify:bizimhesap:b2b-api` calisti ancak `BIZIMHESAP_B2B_TOKEN` ve `BIZIMHESAP_FIRM_ID` eksik oldugu icin preflight basarisiz oldu. Dokumanda banka/kasa hareketi, banka masrafi, tahsilat/odeme fisi veya virman endpointi gorunmedigi icin banka onay -> BizimHesap kaydi hattinda Puppeteer worker simdilik gerekli.

2026-06-29 BizimHesap B2B canli GET turu sonucu: Kullanici uyelik ekranindaki `Api Key(FirmID)` ve `Zirve Express Aktarim Api Key` degerlerini gosterdi. Bu degerler sadece komut ortaminda kullanildi, dosyaya yazilmadi. `token-header`, `bearer` ve `query-token` auth modlariyla `products`, `customers`, `warehouses` GET denendi. Uc modda da BizimHesap `401 Authorization has been denied for this request` dondurdu. Sonuc: Bu anahtar B2B GET icin yetkili degil veya API erisimi BizimHesap tarafinda acilmamis.

2026-06-29 SQL queue kapanis tetikleme turu sonucu: `mark_bizimhesap_queue_processed` kurulum dosyasina islevsiz tetikleyici yorum eklendi ve `main` branch'e alindi. `supabase-sql-install.yml` workflow'u push ile calisti ve GitHub API kontrolunde `success` sonucu verdi. `tools/mail_ekstre_actions_check.cjs` icin `mail:ekstre:actions:check` npm komutu eklendi. Son kanitta queue id `3b30e1a0-0f02-4b0d-b03c-ae2779d448fa` status `processed`; `bizimhesap:queue:dry` 0 hazir kayit gosteriyor.

2026-06-29 mail/banka onay kontrol turu sonucu: GitHub Actions tarafinda `mail-ekstre-pipeline.yml`, `bizimhesap-queue-worker.yml` ve `hourly-bizimhesap-sync.yml` son runlari `success`. Yerel `mail:ekstre:preflight` beklenen sekilde secret eksigi nedeniyle blokaj verdi; yerel `.env` kullanilmiyor. `bank:approval:preview` 25 bekleyen banka hareketi buldu: 19 yuksek guven, 6 inceleme istiyor. `bizimhesap:queue:dry` 0 hazir BizimHesap kuyrugu gosterdi. Sonraki guvenli aday: Akbank 2026-06-09, -15,96 TL, Banka/POS masrafi, id `4f32c173-c773-4801-93e1-ce3bae757a1b`.

2026-06-30 ana ekran main entegrasyon turu sonucu: `origin/main` uzerindeki guncel analiz board calismasi korunarak `codex/b2b-api-delta` branch'indeki ana ekran toparlama commitleri cherry-pick ile main tabanina alindi. Main artik `Polish executive command dashboard`, `Add dashboard income command matrix` ve `Polish morning approval cards` degisikliklerini icerir: banka/onay/gelir tek ekran kurgusu, gelir tablosu komuta matrisi, `gg.aa.yyyy · ss:dd` tarihli sabah onay kartlari ve BizimHesap/cari/kategori/guven plan kutulari main'e hazirlandi.

2026-06-30 ana ekran netlik katmani turu sonucu: Dashboard uzerine son baskin tasarim katmani eklendi. Banka, gelir, sabah onay ve is programi kartlari daha net ayrildi; hover cerceveleri, renkli sol seritler, beyaz operasyon kartlari ve kompakt grid olculeri eklendi. Banka Komuta Merkezi artik dis karta tasmaz; `#bankCommandCenter` flex kapsayiciya alindi ve banka grid'i kart sinirinda kalacak sekilde kilitlendi. Roadmap/ana is programi eski gizleme kuralindan kurtarildi. 1920x1080 yerel kontrolde ana kartlar tek ekranda gorundu, banka paneli sinir icinde kaldi ve gelir matrisi async yukleme sonrasi render oldu. JS syntax, `finance-smoke`, `verify:bank-approval-action` ve `verify:bizimhesap:queue` gecti.

2026-06-30 banka aday kontrol turu sonucu: Canli ana ekran `a5f3548-final` uzerinden 1920x1080 olculdu; ana kartlar sinir icinde, gelir matrisi veri yukleme sonrasi render oldu. `npm run bank:approval:candidates` salt-okunur calisti: 25 bekleyen hareket, 18 yuksek guven, 7 inceleme isteyen kayit var. Onerilen ilk dusuk riskli aday: VakifBank 2026-05-13, -34 TL, Banka/POS masrafi, hedef cari `VakifBank`, guven %90, pending id `d4164166-5427-4f46-8f66-a84b43dddd0b`. `npm run bizimhesap:queue:dry` 0 hazir BizimHesap kuyrugu gosterdi. Kullanici onayi olmadan RPC, queue approve veya BizimHesap save calistirilmadi.

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
