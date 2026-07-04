# AperiON Changelog

## 2026-07-04

### Executive Workspace ve Hasta Bezi Karar Karti

- `aperion-ust-akil-tasarim.html` referansi ana ekran yonu olarak okundu.
- Dashboard modunda sol sidebar ve toggle gizlendi; ana ekran tam viewport genisliginde calisir.
- 8 tiklanabilir komuta bolgesi tek ekran ana karar yuzeyi olarak kilitlendi.
- `APERION HASTA BEZI EKRAN.xlsx` incelendi; donem sirasi, hasta bezi alt segmentleri, kanal ayrimi ve metrikleri cikarildi.
- Ana ekrana `Hasta Bezi Karar Ekrani` karti eklendi.
- Kart bu ay ciro, adet, brut kar, dun/hafta karsilastirma ve segment ozetlerini gosterir.
- Karttaki `Tam Rapor` ve segment satirlari hasta bezi detay modalini acar.
- Detay modalinda segment, kanal, donem, tutar, adet, kar ve ortalama TL alanlari yer alir.
- Urun listesi mevcut dinamik urun kartina baglanir.
- Veri gecikmesinde kartin sonsuz yukleme yazisinda kalmamasi icin RAW/cache fallback ve arka plan yenileme eklendi.
- Canli BizimHesap kaydi, Supabase SQL veya finansal veri mutasyonu yapilmadi.

### Ana Sayfa v81 Koyu Launcher Tasarimi

- Kullanici `aperion-ana-sayfa.html` referansini begendigini belirtti.
- Referanstaki koyu zemin, brass vurgu, Fraunces/IBM Plex Mono tipografi ve kart/kapidan gir tasarim dili ana dashboard'a uygulandi.
- 8 tiklanabilir ana bolge korunarak 4x2 launcher karti haline getirildi.
- Dashboard topbar, komuta kartlari, banka/gelir/hasta bezi/sabah onay yuzeyleri ayni koyu/brass tasarim diliyle hizalandi.
- Yerel tarayici kontrolde sol sidebar gizli, 8 kart gorunur, koyu arka plan aktif ve 720px viewportta tasma yok olarak olculdu.
- `npm run verify:single-screen-command-map` ve `npm run finance-smoke` gecti.

### Saatlik BizimHesap Sync RLS Duzeltmesi

- GitHub Actions `Hourly BizimHesap Sync` basarisiz run logu incelendi.
- BizimHesap login ve ALAYLI MEDIKAL firma seciminin calistigi, hatanin Supabase yaziminda oldugu dogrulandi.
- `sales_raw` ve `masraf_raw` icin `new row violates row-level security policy` hatasi kok neden olarak belirlendi.
- `bizimhesap_bot.js`, `bizimhesap_masraf_cek.js`, `bizimhesap_urun_stok_cek.js` ve `bizimhesap_son_islemler_izle.js` artik `SUPABASE_SERVICE_ROLE_KEY` degerini publishable/anon key'den once kullanir.
- Supabase client'larinda auth session persist kapatildi.
- `tools/verify_bizimhesap_supabase_service_key_v79.cjs` eklendi.
- `verify:bizimhesap:supabase-service-key` komutu eklendi ve 12/12 gecti.
- Fix sonrasi `Hourly BizimHesap Sync` run `28701917165` basarili tamamlandi.
- Kanit logu: satis 963 kayit, urun/stok 3203 kayit, masraf 82 kayit, son islemler 3 yeni kayit.
- Canli BizimHesap kaydi, toplu onay veya Supabase SQL hardening uygulanmadi.

## 2026-07-03

### Tek Ekran Komuta Haritasi

- Masaustu gorunumde sol sidebar ve sidebar toggle gizlendi.
- Ana ekran tam genislige alindi; dashboard tek ekran karar yuzeyi olarak duzenlendi.
- 8 tiklanabilir ana bolge eklendi: Banka Canli, Onay Merkezi, Gelir Tablosu, Satis & Tahsilat, Urun & Stok, Cari Risk, Veri Guveni, Bildirim Merkezi.
- Bolgeler 4x2 komuta haritasi seklinde, renkli kenar, hover ve focus cercevesiyle ayrildi.
- Dashboard altinda eski kritik kartlar korunarak Banka Komuta Merkezi ve Gelir Tablosu matrisi tek ekran icinde tutuldu.
- `tools/verify_single_screen_command_map_v78.cjs` eklendi.
- `verify:single-screen-command-map` komutu eklendi.
- Tarayici kontrolde sol menusuz gorunum, 8 bolge, iki satir, yatay tasma olmamasi ve kutularin cakismamasi dogrulandi.
- GitHub Pages deploy sonrasi canli URL'de `aperionCommandMap`, 8 komuta bolgesi ve sol menusuz gorunum dogrulandi.

### Banka / BizimHesap Kayit Rotasi

- Banka Canli satirlarina ve sabah onay kartlarina `bankLedgerRouteHtml` eklendi.
- Her hareket Kaynak, AperiON karari, BizimHesap hedefi ve Sonuc bolumleriyle okunur hale geldi.
- `Onay anlami` kutusu eklendi: hangi banka hesabi, hangi cari, hangi kategori ve hangi kayit turuyle kuyruga alinacagi kullanici dilinde yazilir.
- `verify:bank-approval-action` testine rota ve insan dilinde onay anlami kontrolleri eklendi.
- Canli BizimHesap kaydi veya toplu onay yapilmadi.

### CFO Modu Referans Plani

- Kullanici `Finans Direktoru (CFO) Egitimi` gorselini referans olarak verdi.
- `APERION_CFO_MODUL_PLANI.md` eklendi.
- CFO modu; finansal tablolar, butce, maliyet, isletme sermayesi, risk ve stratejik karar ekranini AperiON verilerine baglayacak sekilde planlandi.
- `APERION_ISTEKLER_VE_GORSELLER.md` icine CFO gibi dusunen finans direktoru modu eklendi.
- Aktif uygulama hedefi degismedi: once Banka Canli / Onay Merkezi kayit kaniti bitirilecek.

### Kullanici Istekleri ve Gorsel Referans Dosyasi

- `APERION_ISTEKLER_VE_GORSELLER.md` eklendi.
- Ana vizyon, oncelik sirasi, banka/BizimHesap/mail/Telegram/gelir tablosu/urun/hasta bezi/kisisel finans istekleri tek dosyada toplandi.
- Sohbette paylasilan gorsel referans dosya yollari ve ne anlattiklari listelendi.

### Supabase / BizimHesap Guvenlik Hardening

- Claude'un canli tarafta yaptigi cookie/API guvenlik notu repo akisine alindi.
- `supabase_security_hardening_v77.sql` eklendi.
- Migration anon kullanicinin kritik banka/onay/finans RPC'lerini calistirmasini engelleyecek revoke adimlarini icerir.
- `bank_transactions`, `banka_raw`, `bizimhesap_events`, `product_raw`, `audit_logs` icin eski anon write/read prototip politikalarini kaldiran kilitler eklendi.
- Authenticated okuma politikasi `aperion_users.firma_id` ve `all` admin modeliyle yeniden tanimlandi.
- `tools/verify_supabase_security_hardening_v77.cjs` ve `verify:supabase-security-hardening` komutu eklendi.
- `verify:supabase-security-hardening` 16/16 gecti.
- Canli Supabase SQL uygulanmadi; bu tur repo hazirligi ve denetim turudur.

## 2026-07-02

### Banka Onay Adayi Odaklama

- Banka Komuta Merkezi `Siradaki BizimHesap adayi` bandina `Adayi Ac` eylemi eklendi.
- Eylem canli kayit yapmaz; Finans > Banka Canli ekranini acar ve secili pending id satirini sari cerceveyle odaklar.
- Kartta BizimHesap hedefi, banka hesabi, cari/karsi taraf, kategori, risk ve guven alani ayrica gosterilir.
- Kart onayin ekrandaki ilgili satirdan verilecegini acik yazar.
- Banka onay tablo satirlarina `data-bank-pending-id` ve `data-bank-row-id` isaretleri eklendi.
- `verify:bank-approval-action` icine aday odaklama helper, satir id ve focus CSS kontrolleri eklendi.
- Canli RPC, kuyruga alma veya BizimHesap kaydi yapilmadi.

### Banka Satir Kayit Kaniti

- Banka Canli satirlarina `AperiON onayi`, `BizimHesap kuyrugu`, `Kayit sonucu` seridi eklendi.
- Her hareketin onay bekliyor, kuyruk yok/kuyrukta, bekliyor/islendi/hata durumlari satir uzerinde okunur hale getirildi.
- `verify:bank-approval-action` icine satir kayit kaniti kontrolu eklendi.
- Canli RPC, kuyruga alma veya BizimHesap kaydi yapilmadi.

### Sabah Onay Kartlarinda Kayit Kaniti

- Sabah onay kartlari da `AperiON onayi -> BizimHesap kuyrugu -> Kayit sonucu` seridini kullanir hale getirildi.
- Ana ekran karti ve Banka Canli tablosu ayni kayit durum dilini paylasir.
- `verify:bank-approval-action` sabah karti helper baglantisini kontrol eder.
- Canli RPC, kuyruga alma veya BizimHesap kaydi yapilmadi.

### Banka Aday Ozet Sayaclari

- `Siradaki BizimHesap adayi` kartina taranan hareket, guvenli aday, inceleme isteyen kayit ve hazir kuyruk sayaclari eklendi.
- Ana ekran tek adayin yaninda aday secim raporunun ozetini de gosterir.
- Status raporunun olusturulma zamani Turkiye saatiyle ayni sayac satirinda gorunur.
- Ana aday karti ve sabah onay kartlarina onay, kuyruk, bot kaydi ve sonuc kontrolu islem yolu eklendi.
- `verify:bank-approval-action` bu sayaclarin varligini kontrol eder.
- `dbbd736` icin CI basarili, Pages deploy hata verdigi icin durum notu ile yeniden deploy tetiklenir.
- Canli yayin teyidi GitHub Pages olarak netlestirildi; Netlify PR preview bilgisi production kaniti sayilmaz.
- HTML basina production-source marker eklendi; Netlify linklerinin preview-only oldugu dosya icinde de isaretlendi.
- GitHub Pages deploy hatasi connector logu ile incelendi; gecici `try again later` hatasi oldugu goruldu ve failed deploy job retry sonrasi basarili oldu.
- Canli kontrol botlari `APERION_LIVE_URLS` fallback listesine alindi; Cloudflare acilmazsa GitHub Pages denenir ve secilen URL rapora yazilir.
- Canli RPC, kuyruga alma veya BizimHesap kaydi yapilmadi.

### Banka Status Pages Fallback

- GitHub raw status JSON dosyasinin mevcut oldugu dogrulandi.
- GitHub Pages deploy `in_progress` iken `data/aperion_bank_approval_status.json` gecici 404 donebildigi goruldu.
- `fetchBankApprovalStatusReport()` once Pages/local JSON'u, olmazsa GitHub raw JSON'u dener hale getirildi.
- `verify:bank-approval-action` icine raw fallback kontrolu eklendi.
- `verify:bank-approval-action`, HTML script parse ve `finance-smoke` gecti.
- Canli RPC, kuyruga alma veya BizimHesap kaydi yapilmadi.

### Banka Onay Status Otomasyonu

- `.github/workflows/bank-approval-status.yml` eklendi.
- Workflow manuel, mail ekstre pipeline sonrasi, BizimHesap queue worker sonrasi ve zamanli olarak calisir.
- Workflow canli RPC veya BizimHesap save yapmaz; sadece `npm run bank:approval:status` ile okuma/dry-run raporu uretir.
- Degisiklik varsa yalnizca `data/aperion_bank_approval_status.json` snapshot dosyasini commitler.
- Canli ana ekran workflow beklemeden status bandi gosterebilsin diye guvenli ilk snapshot repo icine alindi.
- `verify:bank-candidate-guard` workflow'un canli RPC icermedigini ve sadece status snapshot commitledigini kontrol eder.
- `verify:bank-candidate-guard`, `verify:bank-approval-action`, `bank:approval:status`, `verify:bizimhesap:queue`, `finance-smoke` ve syntax kontrolu gecti.
- Canli BizimHesap kaydi yapilmadi.

### Ana Ekranda Banka Onay Durumu

- Banka Komuta Merkezi icine `Sıradaki BizimHesap adayı` durum bandi eklendi.
- Ekran `data/aperion_bank_approval_status.json` varsa secili aday, tutar, karar tipi, cari/kategori, guven, queue status ve gerekli tekil onay metnini gosterir.
- Status dosyasi yoksa ana banka kartlari bozulmadan calismaya devam eder.
- Dashboard modunda durum bandinin tek ekran duzenini bozmasini engelleyen kompakt CSS eklendi.
- `verify:bank-approval-action`, `verify:bank-candidate-guard`, `finance-smoke`, `bank:approval:status`, `verify:bizimhesap:queue` ve HTML script parse kontrolu gecti.
- Canli RPC, kuyruga alma veya BizimHesap kaydi yapilmadi.

### Banka Onay Tek Durum Raporu

- `tools/build_bank_approval_status_v76.cjs` eklendi.
- `bank:approval:status` komutu eklendi.
- Komut guncel banka aday secimi, dry-check, kuyruk kaniti ve BizimHesap worker dry-run adimlarini salt-okunur sekilde calistirir.
- Cikti `data/aperion_bank_approval_status.json` icine yazilir.
- Rapor secili aday, hedef hesap/cari/kategori, guven, risk, pending status, queue status, blokajlar, gerekli kullanici onay metni ve sonraki komutu tek yerde gosterir.
- Son durum: `2026-06-30 Yapi Kredi -3.56 TL Vergi/SGK odemesi`, pending id `d1455265-abaf-4ea1-a6d4-386bf16b93c1`, queue `0`.
- Canli RPC, kuyruga alma veya BizimHesap kaydi yapilmadi.

### Banka Aday Kanitinda Guncel Secim

- `bank:approval:candidate:proof` komutu artik once `bank:approval:candidates` calistirir.
- `tools/check_bank_candidate_queue_proof_v71.cjs` eski sabit pending id yerine `data/banka_onay_guvenli_adaylar.json` icindeki guncel `recommended_first_approval` kaydini kullanir.
- `tools/approve_bank_candidate_v70.cjs` guvenli odeme/vergi/SGK adaylarini dry-check icinde taniyacak sekilde genisletildi.
- Dusuk risk, %84 guven, kullanici incelemesi istememe ve canli islem icin `--id` + `--confirm ONAYLIYORUM` kilitleri korunuyor.
- Son dry-check adayi: `2026-06-30 Yapi Kredi -3.56 TL Vergi/SGK odemesi`, pending id `d1455265-abaf-4ea1-a6d4-386bf16b93c1`.
- Kanit sonucu: pending bulundu, status `pending`, queue count `0`, queue status `queue_yok`.
- Canli RPC, kuyruga alma veya BizimHesap kaydi yapilmadi.

### Banka Mail Metin Temizleme ve Onay Kontrolu

- `tools/bank_posting_plan.cjs` icindeki bozuk karakter temizleme mantigi guclendirildi.
- `automation/lib/pending-normalize.js` yeni gelen banka hareketlerinde banka adi, mail konusu, ek adi, aciklama, raw text, tip ve cari ipucunu kayda girmeden once temizler hale getirildi.
- Gmail/HTML kaynakli `AkÄ±llÄ±`, `AnlÄ±k Ã–deme`, `Ãœye Ä°şyeri`, `â‚º` gibi diziler icin ozel onarim eklendi.
- `npm run bank:approval:preview` calisti: 25 ornek hareket, 14 yuksek guven, 11 inceleme isteyen kayit.
- `npm run bank:approval:candidates` calisti: 14 aday, 12 dusuk risk, 11 inceleme isteyen kayit; ilk dusuk riskli aday `2026-06-30 Yapi Kredi -0.62 TL`.
- `npm run verify:bank-approval-action` gecti.
- `npm run bizimhesap:queue:dry` calisti ve 0 hazir BizimHesap kuyrugu oldugunu dogruladi.
- Kullanici onayi olmadan Supabase RPC, kuyruga alma veya BizimHesap kaydetme calistirilmadi.

### Banka Cari Guvenlik Kilidi

- Banka hareketi analizinde `ACIKL`, `ACIKLAMA`, `HESAP SUBE`, `IBAN`, `YATIRILAN TUTAR`, `KART NO`, `ATM NO` gibi banka teknik parcalari cari/karsi taraf kabul edilmiyor.
- Ayni kural ana ekran `index.html` anlik banka planina da eklendi.
- `npm run bank:approval:preview` tekrar calisti: 25 ornek hareket, 7 guvenli aday, 18 inceleme isteyen kayit.
- `npm run bank:approval:candidates` tekrar calisti; ilk dusuk riskli aday `2026-07-02 Akbank 57 TL POS tahsilati`.
- `npm run finance-smoke`, `npm run verify:bank-approval-action` ve `npm run bizimhesap:queue:dry` gecti.

### Banka Disi Mail Filtresi

- BizimHesap gunluk finans/hareket ozetleri mail ekstre parser'inda banka hareketi olarak kabul edilmiyor.
- Mevcut bekleyenlerde bu tip kayitlar `Banka disi ozet mail` ve `Onay Merkezi inceleme` olarak siniflandirilir.
- `Akilli Asistan`, `Anlik Odeme Bilgilendirmesi`, `Bilgi Fisi` gibi bildirim basliklari cari kabul edilmiyor.
- `npm run bank:approval:preview` tekrar calisti: 25 ornek hareket, 2 guvenli aday, 23 inceleme isteyen kayit.
- `npm run bank:approval:candidates` tekrar calisti; ilk dusuk riskli aday `2026-06-30 Yapi Kredi -3.56 TL Vergi/SGK odemesi`.
- `npm run bizimhesap:queue:dry` 0 hazir kuyruk gosterdi; canli onay veya BizimHesap kaydi yapilmadi.

### Banka Bildirimlerinde Karsi Taraf Yakalama

- Gmail banka bildirim parser'i `Gonderen / Aciklama`, `Alici`, `Karsi Taraf`, `Cari` ve `Gelen/Giden FAST/EFT/Havale` kaliplarindan karsi taraf ipucu cikarir hale getirildi.
- Cikarilan karsi taraf `suggested_counterparty` alanina yaziliyor.
- `FAST`, `EFT`, `HAVALE`, IBAN, hesap, sube, bakiye, tutar ve kart teknik parcalari cari adi olarak kabul edilmiyor.
- Sentetik gelen EFT testinde karsi taraf `RAMIZ YIGIT` olarak temiz yakalandi.
- BizimHesap gunluk finans ozet parser testi 0 banka hareketi dondurdu.
- `npm run verify:bank-approval-action`, `npm run bank:approval:candidates`, `npm run bizimhesap:queue:dry` ve `npm run finance-smoke` gecti.

### Ana Is Programi Sira Kilidi

- Ana ekrandaki `AperiON Ana Is Programi` kullanicinin tum isteklerini kapsayan 20 maddelik siraya cevrildi.
- Bitmis, kismen bitmis, kalmis ve siradaki isler ayni listede ayrildi.
- Bundan sonraki aktif hedef `Onay Merkezi analiz guveni` olarak belirlendi.
- Yeni sira `NEXT_TASK.md` icine de yazildi; her tur bu siraya gore ilerleyecek.

### Onay Merkezi Analiz Guveni

- Banka onay satirlarina risk etiketleri eklendi: analiz net, cari net degil, guven dusuk, mukerrer, eski bekleyen, kuyruk/sonuc var.
- Banka karar kutusuna kanit alani eklendi: yon, cari kanit kaynagi, hareket tazeligi, kuyruk, karar nedeni ve mukerrer bilgisi.
- Sabah onay kartlari ayni risk etiketlerini gosterir hale geldi.
- BizimHesap'a gonderilebilir banka hareketi guven esigi 70'ten 84'e cikarildi.
- `verify:bank-approval-action`, `bank:approval:candidates`, `bizimhesap:queue:dry` ve `finance-smoke` gecti.
- Canli BizimHesap kaydi veya Supabase onay/RPC calistirilmadi.

### BizimHesap Tek Tik Kayit Kaniti

- `bizimhesap_queue_worker.cjs` dry-run raporuna `summary` ve her kayit icin `evidence` alani eklendi.
- Evidence artik queue id, pending id, kuyruk statusu, hedef, hesap, cari, kategori, guven, otomatik kayit guvenli mi, blokajlar, manuel kanit/tekrar kayit kilidi ve sonraki adimi gosterir.
- Ana ust akil kartinda BizimHesap'a gidecek banka kaydi sayaci onay bekleyen/kuyrukta/islenmis/hata ayrimina cevrildi.
- `verify:bizimhesap:queue`, `bizimhesap:queue:dry`, `verify:bank-approval-action` ve `finance-smoke` gecti.
- Kuyrukta hazir kayit 0 oldugu icin canli BizimHesap kaydi yapilmadi.

## 2026-07-01

### Gmail OAuth Yenileme Yardimcisi

- Yerel PowerShell'in GitHub repository secrets degerlerini okuyamadigi icin `gmail-oauth-start.js` hata verdigi netlestirildi.
- `.github/workflows/gmail-oauth-refresh.yml` eklendi.
- `automation/gmail-oauth-refresh-helper.cjs` eklendi.
- Workflow `mode=start` ile GitHub secrets uzerinden Gmail izin linki uretir.
- Workflow `mode=finish` ile Google code degerini yeni `GOOGLE_REFRESH_TOKEN` degerine cevirir.
- Akis `alaylimedikal@gmail.com` disinda mailbox ile calismaz.
- `tools/verify_gmail_oauth_refresh_helper_v75.cjs` ve `verify:gmail-oauth-refresh` komutu eklendi.
- Canli mail okuma, Supabase yazma veya BizimHesap kaydi yapilmadi.
- Google izin akisinda `alaylimedikal@gmail.com` hesabi secildi ve yeni Gmail refresh token helper artifact'i uretildi.
- `GOOGLE_REFRESH_TOKEN` GitHub repository secret'i guncellendi; token degeri repo dosyalarina yazilmadi.
- Yenilenmis secret sonrasi mail-ekstre pipeline'in tekrar calismasi icin davranis degistirmeyen workflow tetikleme notu eklendi.
- `GOOGLE_REFRESH_TOKEN` GitHub API uzerinden yeniden yazildi ve `AperiON Mail Ekstre Pipeline` workflow_dispatch ile calistirildi.
- Mail ekstre run `28525249930` success: OAuth success, dry-run 326 satir, live ingest 214 yeni `pending_bank_movements`, 82 mukerrer.
- DealerStatement run `28525566041` OAuth success; failure sebebi yanlis/uyumsuz ek kolonlari. Ekte gelecek tahsilat DealerStatement kolonlari bulunmadi.

### Banka Mail Guncelligi ve Eski Bekleyen Ayrimi

- Ramiz Yigit tahsilatinin yeni Temmuz kaydi degil, `2026-06-10` tarihli eski bekleyen banka hareketi oldugu dogrulandi.
- Ana ekran mail ekstre sorgusu ve `fetchPendingBankMovements` siralamasi `transaction_date` esasina alindi.
- Banka Onay preview komutu `created_at` yerine `transaction_date` ile siralanacak sekilde duzeltildi.
- Sabah onay kartlari yalnizca son 7 gunluk hareketleri ana ekranda gosterir hale getirildi.
- Eski bekleyen banka kayitlari artik ana ekranda yeni mail gibi gorunmez; Banka Canli ekraninda `eski bekleyen` etiketiyle kontrol edilir.
- Ust Akil ozeti mail-ekstre workflow hatasini Gmail OAuth/refresh token kontrolu olarak gorunur hale getirir.
- Canli BizimHesap kaydi veya Supabase onay/RPC calistirilmadi.

### DealerStatement Mail Otomasyonu

- `tools/dealer_statement_gmail_worker_v74.mjs` eklendi.
- `dealer-statement:gmail:dry` npm komutu eklendi.
- `.github/workflows/dealer-statement-receivables.yml` eklendi.
- Workflow 10:20 ve 17:20 Turkiye saatiyle DealerStatement mail eklerini kontrol edecek sekilde kuruldu.
- Dogru posta kutusu `alaylimedikal@gmail.com` olarak kilitlendi.
- Worker DealerStatement ekini indirir, Finans Takvimi planini uretir ve yalnizca dry-run import kaniti yazar.
- Workflow ve worker icinde `--commit` kullanimi yok; canli Supabase insert yapilmaz.
- `tools/verify_dealer_statement_automation_v74.cjs` ve `verify:dealer-statement-automation` eklendi.
- Ilk GitHub run `28500494014` Gmail dry-run step'inde failure verdi.
- Worker Gmail/OAuth hatasinda da `dealer_statement_gmail_worker_report.json` yazacak sekilde guclendirildi.
- Workflow dry-run step'i `continue-on-error` ve ayrica sonuc raporu adimiyla artifact yuklemeye devam eder hale getirildi.
- Workflow'a artifact yukleme sonrasinda `Gate DealerStatement result` eklendi; rapor yoksa veya `result` `_failed` ise workflow artik basarisiz donecek.
- Gate'li GitHub Actions run `28506469160` beklenen sekilde failure verdi ve artifact olusturdu; hata artik yesil gorunmuyor.
- Artifact raporu `oauth2.googleapis.com/token: Premature close` hatasini gosterdi.
- DealerStatement Gmail worker'a gecici OAuth/network kopmalari icin 3 denemeli retry eklendi.
- Mail-ekstre artifact'i incelendi; pipeline success olmasina ragmen Gmail sorgularinin `invalid_grant` verdigi tespit edildi.
- `automation/gmail-oauth-check.cjs` ve `gmail:oauth:check` eklendi.
- DealerStatement ve mail-ekstre workflow'lari Gmail OAuth bozuksa erken kirmizi donecek sekilde guncellendi.

### DealerStatement Finans Takvimi Import Kilidi

- `tools/import_dealer_statement_receivables_v73.cjs` eklendi.
- `finance-calendar:dealer-statement:import:dry` ve `finance-calendar:dealer-statement:import` npm komutlari eklendi.
- Canli Supabase insert `--commit --confirm ONAYLIYORUM` olmadan calismaz.
- 2026-07-01 as-of ile rapor tekrar okundu: 80 gelecek tahsilat, TL 657.666,43.
- Satis tutari 0 olup yatirilan tutari olan 1 kayit otomatik butceye alinmadi, `needs_review` listesine ayrildi.
- Import dry-run basarili; canli insert yapilmadi.

### DealerStatement Ana Ekran Gorunurlugu

- Ana Finans Takvimi paneli `finance_calendar_items` icinden `source_table='dealer_statement'` kayitlarini ayrica okur hale getirildi.
- `Gelecek Tahsilat Butcesi` KPI karti eklendi.
- Ilk 8 gelecek tahsilat ve ay kirilimi ana panelde gosterilecek sekilde hazirlandi.
- `verify:dealer-statement-dashboard` komutu eklendi ve gecti.
- Canli Supabase insert yapilmadi.

## 2026-06-30

### DealerStatement Gelecek Tahsilat Plani

- `tools/build_dealer_statement_receivables_v72.cjs` eklendi.
- `finance-calendar:dealer-statement` npm komutu eklendi.
- `.xls` uzantili HTML DealerStatement raporu okunur hale geldi.
- `Bayi Ekstre ID` kaynak anahtari olarak kullanildi; tekrar gelen raporlarda mukerrer insert engeli icin SQL preview `not exists` uretir.
- `DealerStatement (3).xls` kuru calisti: 705 satir, 83 gelecek tahsilat, TL 681.416,43.
- Cikti `finance_calendar_items` modeline `receivable / in / forecast` olarak hazirlandi.
- Canli Supabase insert yapilmadi.

### Banka Aday Kontrolu

- Canli ana ekran `a5f3548-final` uzerinden 1920x1080 olculdu; ana kartlar sinir icinde kaldi.
- Gelir Tablosu Komuta Matrisi ilk yuklemede bekledi, veri yukleme sonrasi render oldu; console hatasi gorulmedi.
- `npm run bank:approval:candidates` salt-okunur calisti: 25 bekleyen hareket, 18 yuksek guven, 7 inceleme isteyen kayit var.
- Onerilen ilk dusuk riskli aday: VakifBank 2026-05-13, -34 TL, Banka/POS masrafi, guven %90, pending id `d4164166-5427-4f46-8f66-a84b43dddd0b`.
- `npm run bizimhesap:queue:dry` 0 hazir BizimHesap kuyrugu gosterdi.
- Kullanici onayi olmadan RPC, queue approve veya BizimHesap save calistirilmadi.

### Ana Ekran Netlik Katmani

- Dashboard icin baskin son tasarim katmani eklendi.
- Ust karar, banka, gelir matrisi, sabah onay ve is programi kartlari renkli seritler ve hover cerceveleriyle ayrildi.
- Banka Komuta Merkezi kart disina tasmayacak sekilde flex/grid sinirina alindi.
- Roadmap/ana is programi eski gizleme kuralindan kurtarildi.
- 1920x1080 yerel kontrolde ana kartlar tek ekranda ve sinir icinde dogrulandi.

### Main Entegrasyon

- `origin/main` uzerindeki guncel analiz board calismasi korunarak ana ekran toparlama commitleri main tabanina alindi.
- Main artik banka/onay/gelir tek ekran kurgusunu, gelir tablosu komuta matrisini ve sabah onay karti tarih/karar duzeltmesini icerir.
- Yerel stale `main` zorlanmadi; entegrasyon temiz `origin/main` worktree uzerinden yapildi.

### Sabah Onay Kartlari Tarih ve Karar Gorunumu

- Banka onay kartlarinda tarih `yyyy-aa-gg` kirpilmis gorunumden `gg.aa.yyyy · ss:dd` formatina alindi.
- Kart basligi kaynak, banka ve tarih ciplerine ayrildi.
- BizimHesap kayit plani kart icinde `BizimHesap`, `Cari`, `Kategori`, `Guven` kutulari olarak gosterildi.
- Kart okunabilirligi icin hover, cerceve, mini plan grid ve tasma kontrolleri iyilestirildi.

### Sabah Onay Kartlari Dogrulamasi

- `2026-06-10` ornek tarihi `10.06.2026` olarak dogrulandi.
- Inline JS syntax kontrolu gecti.
- `npm run finance-smoke`
- `npm run verify:bank-approval-action`
- `npm run verify:bizimhesap:queue`

### Gelir Tablosu Komuta Matrisi

- Ana ekrana kullanicinin Excel ornegindeki mantiga uygun kompakt gelir tablosu matrisi eklendi.
- Kolonlar: Bugun, Dun, Bu Hafta, Bu Ay, Gecen Ay, Bu Yil, Gecen Yil.
- Satis satirlari kategori bazli kuruldu: medikal akulu, medikal elektronik, hasta alti bezi, perine/vucut temizleme, kiralik, karyola, yurume yardimci, ortopedi tekstil, sarf, sonda, kolostomi, ayakkabi/terlik, SGK, solunum.
- Satilan malin maliyeti, brut kar, sabit gider, degisken gider, vergi/SGK ve net kar satirlari eklendi.
- Hucreler tiklanabilir hale getirildi; modalda arama, siralama ve kaynak listeleme mevcut detay altyapisina baglandi.
- Kategori kar katsayilari maliyet ve brut kar hesabinda kullaniliyor.

### Gelir Tablosu Komuta Matrisi Dogrulamasi

- Inline JS syntax kontrolu gecti.
- `npm run finance-smoke`
- `npm run verify:bank-approval-action`
- `npm run verify:bizimhesap:queue`
- `npm run bizimhesap:queue:dry`

### Ana Ekran Profesyonel Toparlama

- Ust Akil ana ekranina v73/v75 tasarim kilidi eklendi.
- Banka Komuta Merkezi koyu ve tasan bloktan daha sade beyaz operasyon kartina tasindi.
- Banka, Gelir Tablosu, Sabah Onay Kartlari ve Yol Haritasi tek ekran gridine yerlestirildi.
- 1380px altinda eski responsive kuralin kartlari ust uste bindirmesi engellendi.
- Kartlarin kendi hucrelerinde kalmasi icin yukseklik ve tasma kilidi eklendi.
- Yol haritasinda ana ekran ve BizimHesap tek tik kayit satirlari guncellendi.

### Istek Listesi Kilidi

- Veri guveni, Banka mail ekstre, Onay Merkezi, BizimHesap kaydi, Gelir Tablosu, Urun Karliligi, Hasta Bezi Raporu, Telegram/Mail evrak, sabit/sozlesmeli gelir-gider ve cache/isletme hafizasi istekleri `PROJECT_STATUS.md` icine urun yon haritasi olarak yazildi.

### Dogrulandi

- `npm run verify:bank-approval-action`
- `npm run verify:bizimhesap:queue`
- `npm run finance-smoke`
- `npm run bizimhesap:queue:dry`

### Not

- Hazir BizimHesap kuyrugu 0.
- Canli BizimHesap kaydi tetiklenmedi.

## 2026-06-29

### Canli Yayin

- GitHub push kilidi cozuldu.
- `GCM_ACCOUNT=ercanalayli` ile dogru GitHub hesabi secildi.
- `5370338 Clarify bank approval posting actions` commit'i GitHub `main` branch'e pushlandi.
- GitHub raw `index.html` icinde `Gunluk Kullanim Durumu`, `bankActionState` ve `bank-posting-proof` dogrulandi.
- GitHub Pages `https://ercanalayli.github.io/iSTasyon/?v=5370338` yeni kodu dondurdu.

### Canli Yayin Dogrulamasi

- `git ls-remote origin refs/heads/main`
- `Invoke-WebRequest https://raw.githubusercontent.com/ercanalayli/iSTasyon/main/index.html`
- `Invoke-WebRequest https://ercanalayli.github.io/iSTasyon/?v=5370338`
- `npm run verify:bank-approval-action`

### Banka -> BizimHesap Kanit Denetimi

- `npm run bank:approval:preview` calisti.
- 25 onay bekleyen banka hareketi okundu.
- 19 hareket yuksek guvenli, 6 hareket inceleme istiyor.
- `npm run bizimhesap:queue:dry` calisti.
- BizimHesap worker kuyrugunda 0 hazir kayit oldugu dogrulandi.
- Canli BizimHesap kaydi yapilmadi.

### Banka -> BizimHesap Sonuc

- Hat teknik olarak bagli: banka onayi -> `bizimhesap_queue` -> worker -> processed/failed.
- Su anda islenecek kuyruk bos.
- Sonraki adim kullanici onayli bir banka hareketini kuyruga almak.

### Banka Onay Aday Secimi

- `tools/select_bank_approval_candidate_v69.cjs` eklendi.
- `npm run bank:approval:candidates` komutu eklendi.
- Komut preview raporundan dusuk riskli ilk onay adayini secer.
- Ilk onerilen aday: VakifBank 2026-06-10, -8,37 TL, Banka/POS masrafi, guven %90.
- Pending id: `9b91f984-c94b-4005-92ab-7fb334aa31e7`.
- Canli onay veya BizimHesap kaydi yapilmadi.

### Guvenlik Kilitli Kuyruga Alma

- `tools/approve_bank_candidate_v70.cjs` eklendi.
- `npm run bank:approval:candidate:dry` komutu eklendi.
- `npm run bank:approval:approve-selected` komutu eklendi.
- Canli RPC icin `--id` ve `--confirm ONAYLIYORUM` zorunlu hale getirildi.
- `tools/verify_bank_candidate_approval_guard_v70.cjs` eklendi.
- `npm run verify:bank-candidate-guard` komutu eklendi.
- Dry-check calisti ve RPC calistirilmadigi dogrulandi.

### Banka Aday Kanit Okuma

- `tools/check_bank_candidate_queue_proof_v71.cjs` eklendi.
- `npm run bank:approval:candidate:proof` komutu eklendi.
- Secilen VakifBank -8,37 TL adayinin `pending` durumda oldugu dogrulandi.
- Aday icin `bizimhesap_queue` kaydi olmadigi dogrulandi.
- Komut salt-okunur calisti; canli onay/RPC calistirilmadi.

### Kullanici Onayli Banka Kuyruga Alma

- Kullanici yalnizca secili VakifBank 2026-06-10, -8,37 TL banka masraf adayi icin `onayliyorum` dedi.
- `node tools/approve_bank_candidate_v70.cjs --id 9b91f984-c94b-4005-92ab-7fb334aa31e7 --confirm ONAYLIYORUM` calisti.
- Pending id `9b91f984-c94b-4005-92ab-7fb334aa31e7` status `approved` oldu.
- BizimHesap queue id `3b30e1a0-0f02-4b0d-b03c-ae2779d448fa`, status `ready_for_bizimhesap` olustu.
- `npm run bank:approval:candidate:proof` pending ve queue kanitini dogruladi.
- `npm run bizimhesap:queue:dry` 1 hazir BizimHesap kuyruk kaydi buldu.
- BizimHesap'a kesin kaydetme/save islemi yapilmadi.

### BizimHesap Form Kontrolu

- `BIZIMHESAP_POSTING_LIVE=1 npm run bizimhesap:queue:form` calisti.
- BizimHesap kalici oturumla acildi ve ALAYLI firma portalina girildi.
- Queue id `3b30e1a0-0f02-4b0d-b03c-ae2779d448fa` icin masraf formu dolduruldu.
- Formda tarih `10.06.2026`, tutar `8,37`, odeme durumu `Odendi`, aciklama alaninda queue id goruldu.
- Diagnostik gorsel: `diagnostics/bizimhesap_queue_3b30e1a0-0f02-4b0d-b03c-ae2779d448fa_form.png`.
- Kaydet tusuna basilmadi; kuyruk `ready_for_bizimhesap` durumunda kaldi.

### Kullanici Onayli BizimHesap Save Denemesi

- Kullanici `BizimHesap'a kaydetmeyi onayliyorum` dedi.
- Sadece queue id `3b30e1a0-0f02-4b0d-b03c-ae2779d448fa` icin `BIZIMHESAP_POSTING_LIVE=1` ve `BIZIMHESAP_POSTING_SAVE=1` ile save modu calisti.
- Worker BizimHesap kaydet butonuna basildigini logladi.
- Supabase `mark_bizimhesap_queue_processed` RPC kurulu olmadigi icin queue kapanmadi.
- Yerelden SQL kurulum denemesi `password authentication failed for user "postgres"` hatasi verdi.
- Worker save sonrasi diagnostik ve queue status dogrulama logu uretecek sekilde guclendirildi.

### Manuel BizimHesap Kanit Kilidi

- Kullanici BizimHesap listesinde queue id `3b30e1a0-0f02-4b0d-b03c-ae2779d448fa` iceren 8,37 TL banka masraf kaydinin olustugunu bildirdi.
- `data/bizimhesap_manual_posting_proofs.json` eklendi.
- Worker save modunda manuel kanitli queue id icin BizimHesap'a tekrar kaydetme yapmadan atlar.
- Testte ayni queue id tekrar calistirildi ve `tekrar kaydetme atlandi` sonucu alindi.

### BizimHesap B2B API Dokumani

- Kullanici yeni Entegrasyon API dokumanini paylasti.
- Mevcut `bizimhesap_api_client.cjs` dokumandaki fatura, cari, urun, depo, stok ve cari ekstre endpointleriyle karsilastirildi.
- `docs/bizimhesap_b2b_api_notlari.md` guncellendi.
- `npm run verify:bizimhesap:b2b-api` calisti; token ve firm id eksik oldugu icin canli okuma yapilmadi.
- Banka/kasa hareketi icin dokumanda endpoint gorunmedigi not edildi.
- Kullanici BizimHesap uyelik ekraninda `Api Key(FirmID)` ve `Zirve Express Aktarim Api Key` alanlarini gosterdi; bunlar secret eslesmesi olarak not edildi.
- Zirve Express anahtariyla `token-header`, `bearer` ve `query-token` modlarinda canli GET denendi; hepsi 401 verdi, canli yazma yapilmadi.

### Supabase Queue Kapanis SQL Tetikleme

- `automation/sql/006_mark_bizimhesap_queue_processed.sql` dosyasina islevsiz workflow tetikleyici yorum eklendi.
- Bu degisiklik `main` branch'e gitti ve `supabase-sql-install.yml` otomatik calisti.
- GitHub Actions run `28374635626` sonucu `success`.
- `tools/mail_ekstre_actions_check.cjs` icin `mail:ekstre:actions:check` npm komutu eklendi.
- Queue id `3b30e1a0-0f02-4b0d-b03c-ae2779d448fa` son kontrolde `processed` gorundu.
- `npm run bizimhesap:queue:dry` 0 hazir kuyruk gosterdi.

### Mail/Banka Onay Kontrolu

- GitHub Actions son durumlari kontrol edildi.
- `mail-ekstre-pipeline.yml`, `bizimhesap-queue-worker.yml`, `hourly-bizimhesap-sync.yml` son runlari `success`.
- `bank:approval:preview` 25 bekleyen hareket buldu.
- 19 hareket yuksek guvenli, 6 hareket inceleme istiyor.
- `bizimhesap:queue:dry` 0 hazir kuyruk gosterdi.
- Sonraki dusuk riskli aday: Akbank 2026-06-09, -15,96 TL, Banka/POS masrafi, id `4f32c173-c773-4801-93e1-ce3bae757a1b`.
- Canli onay/RPC veya BizimHesap save yapilmadi.

## 2026-06-27

### Eklendi

- Koordineli calisma protokolu repo standardi olarak baslatildi.
- `PROJECT_STATUS.md`, `NEXT_TASK.md`, `QA_CHECKLIST.md`, `DECISIONS.md` ve `CHANGELOG_APERION.md` tek-kaynak dosyalari olusturuldu.
- Mevcut proje durumu son teknik denetim bulgularina gore belgelendi.

### Yayin

- Koordineli calisma protokolu commit'i GitHub `main` branch'e pushlandi.

### Denetlendi

- `npm run preflight`
- `npm run sync:bizimhesap:plan`
- `npm run sync:bizimhesap:dry`
- `npm run finance-smoke`
- `npm run verify:main-finance-flow-v55`
- `npm run bank:approval:preview`
- `npm run verify:bizimhesap:queue`

### Bulunan Kritik Notlar

- BizimHesap dry-run akisi tam guvenli degil; satis tarafinda DB yazimi gorunuyor.
- Son islemler conflict hatasi basari icinde saklanabiliyor.
- Hourly BizimHesap GitHub workflow son kontrolde basarisiz gorundu.
- Banka onay merkezi teknik olarak bagli, ancak tum canli kayitlar icin uctan uca kanit tamam degil.

### Duzeltildi

- `aperion_veri_senkron.js` dry-run modunu satis ve son-islemler botlarina da iletir hale getirildi.
- `bizimhesap_bot.js` dry-run modunda `sales_raw` icin delete/insert yapmadan onizleme sayisini loglar.
- `bizimhesap_son_islemler_izle.js` dry-run modunda Supabase/state yazimini atlar.
- `bizimhesap_son_islemler_izle.js` Supabase hatasini artik sadece loglamaz; hata olarak yukari tasir.

### Dogrulandi

- `node --check aperion_veri_senkron.js`
- `node --check bizimhesap_bot.js`
- `node --check bizimhesap_son_islemler_izle.js`
- `npm run sync:bizimhesap:plan`
- `npm run sync:bizimhesap:dry`
- `npm run preflight`
- `npm run verify:bizimhesap:queue`
- `npm run finance-smoke`

### Banka Onay Zinciri

- Banka Canli ekrani `pending_bank_movements -> bizimhesap_queue` hattina ek olarak `bank_transactions -> bizimhesap_posting_queue` hattini da okur hale getirildi.
- Banka hareketi kontrol alanina kuyruk id, worker sonucu ve BizimHesap kayit var/yok bilgisi eklendi.
- Telegram/gorsel `bank_transactions` kayitlari icin onay/ret butonlari `approve_bank_transaction_v58` ve `reject_bank_transaction_v58` RPC'lerine baglandi.
- Ust KPI'da queue sayimi hem `ready_for_bizimhesap/processed` hem de `pending/posted` durumlarini kapsayacak sekilde genisletildi.

### Banka Onay Dogrulamasi

- `npm run bank:approval:preview`
- `npm run verify:bizimhesap:queue`
- `npm run finance-smoke`
- `npm run verify:main-finance-flow-v55`

### Firma Izolasyonu

- Ana karar ekranindaki `bizimhesap_queue` sorgulari `company_id = alayli` filtresiyle kilitlendi.
- Bot loglari `firma_id = alayli` filtresiyle sinirlandi.
- `tools/verify_firm_isolation_v66.cjs` eklendi.
- `npm run verify:firm-isolation` komutu eklendi.

### Firma Izolasyonu Dogrulamasi

- `npm run verify:firm-isolation`
- `npm run preflight`
- `npm run finance-smoke`
- `npm run verify:main-finance-flow-v55`

### Gunluk Kullanim Durumu

- Ana veri denetimi kartina `Gunluk Kullanim Durumu` paneli eklendi.
- Ana moduller gunluk kullanilabilir / kismen hazir / blokajli olarak ayrildi.
- Ilk 5 blokaj ana ekranda gorunur hale getirildi.
- `tools/verify_daily_readiness_v67.cjs` eklendi.
- `npm run verify:daily-readiness` komutu eklendi.

### Gunluk Kullanim Dogrulamasi

- `node --check tools/verify_daily_readiness_v67.cjs`
- `npm run verify:daily-readiness`
- `npm run verify:firm-isolation`
- `npm run preflight`
- `npm run finance-smoke`
- `npm run verify:main-finance-flow-v55`

### Banka Onay Aksiyonu

- Banka Canli / Onay Akisi satirlarinda hazirlik kontrolu eklendi.
- `BizimHesap'a Kaydet` / `KuyruÄŸa Al` aksiyonu yalnizca hazir kayitlarda aktif kalir.
- Dusuk guvenli, mukerrer adayli, cari belirsiz veya zaten kuyrukta/islenmis kayitlarda buton pasif hale gelir.
- Her satirda hedef hesap, cari, kayit turu ve BizimHesap kanit metni netlestirildi.
- Sabah onay kartlari da ayni hazirlik kontrolunu kullanir.
- `tools/verify_bank_approval_action_v68.cjs` eklendi.
- `npm run verify:bank-approval-action` komutu eklendi.

### Banka Onay Aksiyonu Dogrulamasi

- `node --check tools/verify_bank_approval_action_v68.cjs`
- `npm run verify:bank-approval-action`
- `npm run verify:daily-readiness`
- `npm run verify:firm-isolation`
- `npm run finance-smoke`
- `npm run preflight`
- `npm run bank:approval:preview`

### Degismedi

- Canli BizimHesap kaydi yapilmadi.
- Yeni tasarim veya refactor yapilmadi.
- Firma verisi tasinmadi veya silinmedi.

## 2026-07-04 - Supabase Guvenlik Hardening Plani

- `AperiON_Supabase_Guvenlik_Raporu.docx` raporu incelendi.
- `supabase_security_hardening_v77.sql` finans takvimi RPC'leri icin genisletildi.
- Anon erisimden cikarilan ek RPC'ler: `finance_calendar_mark_done`, `finance_calendar_postpone`, `finance_calendar_reject`, `finance_calendar_create_plan`.
- `bank_transactions`, `banka_raw`, `bizimhesap_events`, `product_raw`, `audit_logs` icin anon select yetkisi ve kritik sequence erisimi kapatildi.
- `tools/verify_supabase_security_hardening_v77.cjs` 26 kontrol yapacak sekilde genisletildi.
- `SUPABASE_GUVENLIK_RAPORU_DEGERLENDIRME.md` eklendi.
- Test: `npm run verify:supabase-security-hardening` 26/26 gecti.
- Canli Supabase SQL uygulanmadi.
