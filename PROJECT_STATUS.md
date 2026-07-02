# AperiON Project Status

Son guncelleme: 2026-07-02 Europe/Istanbul

## Calisma Protokolu

AperiON gelistirmesinde koordineli calisma protokolu gecerlidir.

- ChatGPT: urun yonu, mimari karar, oncelik, kalite kontrol, ekran/akis analizi.
- Codex: repo uygulama, dosya duzenleme, script calistirma, test sonucu, commit, durum dosyalari.
- Her turda sadece 1 ana hedef secilir.
- Tur sonunda `PROJECT_STATUS.md`, `NEXT_TASK.md`, `CHANGELOG_APERION.md` guncellenir.
- Onaysiz canli kayit, demo veriyi kesin veri gibi gosterme ve firma verilerini karistirma yasaktir.

## Mevcut Teknik Durum

Genel durum: Sistem calisan bir omurgaya sahip, ancak tum moduller gunluk guvenilir kullanim icin production-ready degil.

Koordineli calisma protokolu dosyalari `main` branch'e alinmistir. Bundan sonraki turlarda durum, karar, sonraki is ve kalite kontrol bu dosyalardan surdurulecektir.

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
