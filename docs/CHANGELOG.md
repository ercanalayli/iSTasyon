# AperiON Changelog

Bu dosya, root `CHANGELOG_APERION.md` (767 satır, en güncel/en tam changelog)
temel alınarak, eski `docs/CHANGELOG.md`'nin tek girdisi (2026-07-08, docs/
klasörünün başlangıcı) en alta eklenerek ve `QA_CHECKLIST.md`'nin sürüm
numarasıyla eşleşen test maddeleri ilgili girdilerin altına "QA" notu olarak
katlanarak 2026-07-31'de birleştirildi. `QA_CHECKLIST.md`, sürüme bağlı
olmayan genel/standing kontrol listeleri "Kalıcı QA kontrol listeleri"
bölümüne taşınarak retire edildi. Kaynak dosyaların tamamı `docs/archive/`
altındadır.

**Tarih tutarsızlığı notu:** En alttaki "2026-07-08 — docs/ klasörünün
başlangıcı" girdisinin tarihi, hemen üstündeki "2026-06-27" girdisinden
kronolojik olarak daha yenidir. Orijinal konsolidasyon talimatı bu girdiyi
"en eski" olarak en alta koymayı istiyordu (muhtemelen docs/ yapısının
mantıksal/temel başlangıcı olduğu için); tarih sırası tam kronolojik değil,
bilerek böyle bırakıldı — bu bir hata değil, kaynaktaki tarih etiketleme
tutarsızlığının şeffaf şekilde taşınmasıdır.

## 2026-08-02 - İstek defteri: Ercan'ın bugün istediği her şey, ne yapıldı, nasıl doğrulandı

Ercan'ın "bugüne kadar yazdıklarımı listele, istediklerim yapıldı mı, nasıl
yapıldı — kontrol edeceğim" isteği üzerine, bugünkü tüm istekler ve karşılığı
tek yerde. Her madde canlıda (localhost + `aperion-ust-akil.html` GitHub Pages
aynası) test edildi, commit hash'i ile kod tarafında da doğrulanabilir.

1. **"Cep telefonu modunu çok daha kullanışlı hale getir"** → ✅ Dönem sekmeleri
   29px→38px, tablo satırları 38px→44px (parmak dokunma boyutu), iç scroll
   kutusu 620px→440px, uzun kaynak notu katlanabilir hale getirildi.
   (`6b70b89`)
2. **"Erhan Sevinç'in bunca zamandır sessiz olması hiçbir şey ifade etmiyor,
   sattığım ürün ticari değildi"** → ✅ Kök neden bulundu: DİĞER kategorisinin
   %54'ü araç/motosiklet satışıydı (Erhan Sevinç, Suat Ulutaş, Mehmet Memiş).
   Yeni `aperion_category_bucket_v2()` fonksiyonu bunları "ARAÇ/VARLIK SATIŞI
   (TİCARİ DEĞİL)" olarak ayırıp TÜM raporlardan (gelir tablosu, müşteri
   sinyalleri) çıkardı. (`058ee22`, `2789ba7`)
3. **"Konumuz olan ürünler önemli, profesyonel bir analist gibi bak"** →
   ✅ Aynı analizde iki gerçek bulgu daha çıktı: Odyoform (ilişkili/grup
   şirketi, gerçek müşteri değil) ayrı etiketlendi; İşitme Cihazı (Phonak/
   Signia, ~3,5M TL/yıl) hiç kategorisi olmadığı için DİĞER'e karışıyordu,
   kendi satırı oldu. (`2789ba7`)
4. **"Gelir tablosunun yanında tam bilanço istiyorum — ticari mal, ev, araba,
   demirbaş, nakit, banka, kredi kartı borcu, krediler, çekler, her ay yeniden
   değerleme"** → ✅ (kısmen) Ticari mal (alış+satış fiyatıyla) ve banka canlı
   hesaplanıyor. Ev/araba/demirbaş/kredi kartı/kredi/çek için sistemde hiç
   veri yoktu — yeni `aperion_balance_sheet_items` tablosu hazır, "kaynak
   bekliyor" olarak açıkça işaretli, veri girilince otomatik dolacak.
   Aylık piyasa fiyatı araştırması: veri girilmeden hangi varlığın
   araştırılacağı bilinmiyor, veri geldikten sonra kurulacak. (`bafa3e1`)
5. **"2055 vizyonu nasıl / senin profesyonel olarak düşüneceğin ne varsa"** →
   ✅ Sayfa başına otomatik "BUGÜN DİKKAT" bulgu motoru: negatif banka
   bakiyesi, sessizleşen büyük müşteri, yığılmış onay, düşük maliyet
   eşleşmesi, biten stok, yüksek gider oranı, banka maili durması — 7 kural,
   kritik olay yoksa sessiz kalıyor. (`55ff2d3`, sonradan performans hatası
   düzeltildi `e6bc9e2`, mail-hattı kuralı eklendi `fc22977`)
6. **"Kaç para kazanıyorum, ne kadar varlığım var, uluslararası standartlarda
   stratejik yönetim raporu istiyorum"** → ✅ STRATEJİK YÖNETİM ÖZETİ paneli:
   brüt kâr marjı (%23), en büyük kategori yoğunlaşması (Buffett kuralı
   referansıyla), müşteri yoğunlaşması (top 2 = %31), sabit gider payı/
   operasyonel kaldıraç. (`e6bc9e2`)
7. **"Harcamalarımı analiz et, raporla, yönlendir"** → ✅ HARCAMA ANALİZİ
   paneli + gerçek bir hata bulundu: "Tedarikçiden Alış...ÜRÜN ALIŞ" satırları
   (stok alımı, 1.155.024 TL) yanlışlıkla "değişken gider" sayılıyordu — bu
   madde 6'daki sabit gider oranını da etkiliyordu, düzeltilince %64'ten
   gerçek değeri olan **%89**'a çıktı; bu düzeltme aynı commit'te önceki
   rapora açıkça not düşüldü. (`8831165`)
8. **"Bütün banka/KMH/kredi kartı hesaplarımı listele, günlük hareketleri ve
   kredi kartı ekstrelerini takip et"** → ⏳ Kısmen — bilinen 4 banka
   (İş Bankası, VakıfBank, Akbank, Yapı Kredi) son bilinen bakiyeleriyle
   listeleniyor (`8ccd8ba`). KMH/kredi kartı/hangi hesapların gerçek listesi
   hiçbir yerde kayıtlı değil — `finance_account_cards` tablosu hazır, gerçek
   liste Ercan'dan bekleniyor.
9. **"Son bilinen bakiye ne demek, mail her gün gelmeli, gelmeyeni iste,
   bildirim gönder"** → ✅ BUGÜN DİKKAT motoruna kural eklendi: bilinen en
   taze banka verisi 2+ gün eskiyse tek, açık bir uyarı veriyor ("Banka
   ekstresi maili X gündür okunmuyor"). Kök neden zaten biliniyordu: Gmail
   OAuth kırık, `gmail-oauth-reauth-helper.yml` ile Ercan'ın PC başında
   3 adımı tamamlaması bekleniyor. (`fc22977`)
10. **"Eksiklerin hepsini Telegram'dan gönder"** → ✅ Ürün (alış fiyatı
    eksik), müşteri (cari kartı yok), tedarikçi (hiç kart sistemi yok),
    gider (kategorisi boş) — 4 tam liste, dosya olarak Telegram'a
    gönderildi, iş bitince tek seferlik workflow silindi. (`96094de`,
    `2d8c4b9`)
11. **"Sağlığımı da kontrol et, doktor gibi yönlendir, Huawei Watch
    kullanıyorum"** → ❌ Yapılmadı, bilinçli: Huawei Watch verisine erişim
    yok (gerçek API/geliştirici kurulumu gerektirir, tek seferlik onay
    değil). Daha önemlisi: doktor değilim, tanı/tedavi yönlendirmesi
    yapmam — bu net bir sınır olarak Ercan'a açıkça söylendi, sahte bir
    "doktor gibi" rol üstlenilmedi.
12. **Ayrıca istenmeden, denetim sırasında bulunup düzeltilen gerçek
    hatalar:** `normalizeBank()` Türkçe I/ı hatası (aynı bankanın 3 farklı
    yazımı ayrı satır gösteriyordu, `8ccd8ba`); `product_raw.alış_fiyat`
    sessizce sıfırlanması riski (upsert güvenlik trigger'ı eklendi,
    `2789ba7`); master vizyonun 50 bölümü koda karşı kanıtlı denetlendi,
    en kritik bulgu BizimHesap'a otomatik yazmanın hiç çalışmamış olması
    (`18143fa`).

13. **"Maliyeti olmayan ürünlerin satışına tıklayınca % kâr göreyim,
    renklendir, anomali varsa tespit et; aynı oranı giderler/faturalar/alışta
    da kullan"** → ✅ (kısmi, ürün için mümkün olan yapıldı) Maliyeti bilinmeyen
    ürünlerde gerçek kâr hesaplanamıyor (maliyet yok ki) — bunun yerine liste
    (referans) satış fiyatı ile fiili satış fiyatı kıyaslanıp renklendirildi
    ("MALİYETİ EKSİK" drill-in listesinde). Giderlere de uygulandı: her
    kategorinin bu ayki tutarı geçmiş aylık ortalamasıyla kıyaslanıp %150+
    veya %50- sapanlar otomatik işaretleniyor (HARCAMA ANALİZİ panelinde).
    Fatura/alış tarafı henüz yok — ayrı bir veri kaynağı gerektiriyor.
    (`6712d24`)

**Doğrulama yöntemi (her madde için tekrarlanan disiplin):** kod değişikliği
→ localhost'ta canlı Supabase veriyle test → konsol hatası kontrolü → mobil
görünüm kontrolü → commit+push → GitHub Pages aynasında (`ercanalayli.github.io/
iSTasyon`) fetch ile canlı doğrulama. Hiçbir madde "yapıldı" denilip
doğrulanmadan bırakılmadı; madde 4 ve 8 açıkça "kısmi" olarak işaretli çünkü
gerçekten öyle.

## 2026-07-31 - Doküman konsolidasyonu ve güvenlik doğrulaması

- Canlı Supabase güvenlik denetimi tekrarlandı: `ingest_mail_bank_movements`,
  `mark_bizimhesap_queue_processed`, `finance_calendar_log_action`,
  `kullanici_firma_idler`, `on_maliyet_upload`, `rls_auto_enable`
  fonksiyonlarının hâlâ anon çalıştırılabilir olduğu bulundu (ikisi PUBLIC
  rolü üzerinden miras) ve hepsi REVOKE edilip doğrulandı.
- Yeni bulgu: `bank_transactions` tablosunda anon herkes okuyabiliyor, giriş
  yapan herkes sınırsız yazabiliyor — kullanıcı ile birlikte tasarlanacak,
  bu turda dokunulmadı (bkz. `docs/OPERATIONS_RULES.md` §9).
- `docs/BANK_RULES.md`'ye üç haftadır eksik olan Moka/KMH/Batch sınıflandırma
  kuralları eklendi (şimdi `docs/OPERATIONS_RULES.md` §1.4).
- Kanonik canlı adres doğrulandı: `_redirects` → `aperion.html` →
  `aperion-ust-akil.html` (bkz. `docs/ARCHITECTURE.md`).
- 56 markdown dosyası (`docs/` 38-41 + kök 17) tek doğruluk kaynağı olacak
  11 aktif dosyaya konsolide edildi; orijinaller `docs/archive/` altına
  taşındı, hiçbiri silinmedi.

## 2026-07-29 - Hasta Bezi BizimHesap Veri Motoru v126

- Satis, alis, urun, cari, stok ve kaynak denetimi icin alti JSON sozlesmesi eklendi.
- Saatlik BizimHesap workflow'u snapshot uretip degisiklik varsa commit edecek sekilde baglandi.
- Urun ve cari kartlari, fatura kaniti ve kar hesap detayi tiklanabilir hale getirildi.
- FIFO lotlari tarih sirasiyla tuketilir; eksik kanitta kesin kar uydurulmaz.
- Mevcut siparis/sevkiyat ekrani `hasta-bezi/operasyon-legacy.html` olarak korundu.
- Eszamanli otomasyon commit'lerinde veri push'unun kaybolmamasi icin
  `pull --rebase` ve uc denemeli push korumasi eklendi.
- Urun ve cari satis eslestirmeleri tek gecisli indekslere alinarak buyuk
  BizimHesap veri setindeki snapshot uretim suresi dusuruldu.
- Guncelleme no `1245290726`.

## 2026-07-16 - Moka United POS aktarim ogrenmesi v124

- `Moka United` aciklamasi, artik Emanet veya belirsiz cari hareketi degil,
  POS tahsilatinin bankaya aktarimi olarak siniflanir.
- Kaynak BizimHesap hesabi, gercek hesap adi olan `*MOCA SONOVA POS KREDI
  KARTI`; hedef Is Bankasi hareketinde `*IS BANKASI`dir.
- 1 ve 2 Temmuz tarihli iki aday, kalici ve kimlik bazli kullanici dogrulamasi
  ile tekrar islenebilir hale getirildi.

**QA (eski QA_CHECKLIST.md, "2026-07-16 Moka United POS aktarim ogrenmesi v124"):**
- [x] Moka United anahtar kelimesi, POS aktarimi kuralina baglandi.
- [x] Gercek BizimHesap kaynak hesabi `*MOCA SONOVA POS KREDI KARTI` olarak sabitlendi.
- [x] 1 ve 2 Temmuz Is Bankasi adaylari kimlik bazli override ile Emanet sinifindan cikarildi.
- [ ] Plan yeniden uretildikten sonra iki adayda kaynak/hedef/tutar/tarih kanitinin kontrolu.
- [ ] Kullanici onayi ardindan BizimHesap'ta iki transferin kayit ve tekrar-okuma kaniti.

## 2026-07-16 - Bugun satis, maliyet ve kar karari v121

- Ana gelir yuzeyinin varsayilan donemi `Bugun` yapildi.
- Ust gorunume tiklanabilir Satislar, Satilan Malin Maliyeti, Brut Kar,
  Giderler ve Net Sonuc kartlari eklendi.
- Donem degistirme dugmeleri ayni karar yuzeyine tasindi; ayrintili donem
  matrisi korunarak ikinci katmanda kaldi.

**QA (eski QA_CHECKLIST.md, "2026-07-16 Bugun satis, maliyet ve kar karari v121"):**
- [x] Ana gelir modelinin varsayilan donemi `today` yapildi.
- [x] Satis, maliyet, brut kar, gider ve net sonuc ilk gorunen karar satirindadir.
- [x] Her karar karti mevcut ayrinti akimina tiklanabilir baglantidir.
- [x] Donem degistirme dugmeleri ayni yuzeydedir.
- [x] Inline JavaScript syntax ve `git diff --check` gecti.
- [ ] Canli kaynakta bugun tarihli satis satirinin saatlik klon sonrasi denetimi.

## 2026-07-16 - Ana ekran donemsel gelir tablosu matrisi v120

- Ana finans yuzeyine, kullanicinin tarif ettigi Excel mantiginda donem
  matrisi eklendi: Bugun icin plan/tahakkuk/nakit; diger donemlerde
  tahakkuk/nakit.
- Satis kategorileri, satislar toplam, satilan malin maliyeti, brut kar,
  sabit-degisken gider, vergi/SGK ve net kar ayni tabloda gorunur.
- Tahakkuk tutarlari tiklaninca mevcut kategori -> urun -> kaynak kayit
  ayrintisina iner.
- Banka/POS nakdi, kategoriyle kanitli esleme yoksa kategori satirlarina
  dagitilmaz; toplam satirda tutulur.

**QA (eski QA_CHECKLIST.md, "2026-07-16 Ana ekran donemsel gelir tablosu matrisi v120"):**
- [x] Bugun, Dun, Bu Hafta, Bu Ay, Gecen Ay, Bu Yil ve Gecen Yil sutun gruplari olusturuldu.
- [x] Bugun grubu plan/tahakkuk/nakit; diger donemler tahakkuk/nakit olarak ayrildi.
- [x] Satis, maliyet, brut kar, gider ve net kar satirlari matriste ayridir.
- [x] Satis kategori tahakkuk tutari kategori -> urun -> kaynak kayit ekranina iner.
- [x] Kategoriyle kanitli eslesmeyen banka/POS nakdi kategori satirina dagitilmaz.
- [x] Inline JavaScript syntax ve `git diff --check` gecti.
- [ ] Masaustu ve mobil canli ekran goruntusuyle yerlesim onayi.
- [ ] Banka/POS nakit hareketlerinin cari/fatura/kategori kanitiyla eslenmesi.

## 2026-07-16 - Ana sayfa gelir tablosu ve bilanco onceligi v119

- Gelir Tablosu ve Bilanco, ana acilis ekraninin ilk ve genis finans yuzeyine
  tasindi.
- Banka, onay, satis, urun, cari, kaynak ve bildirim alanlari silinmedi;
  gelir tablosunun ardindaki sekiz tiklanabilir komuta alaninda tutuldu.

**QA (eski QA_CHECKLIST.md, "2026-07-16 Ana sayfa finans onceligi v119"):**
- [x] `index.html` acildiginda Gelir Tablosu ve Bilanco ilk finans yuzeyidir.
- [x] Finans yuzeyi, komuta alanlarindan once ve genislik onceligiyle gorunur.
- [x] Sekiz komuta alani korunur ve finans yuzeyinin ardinda tiklanabilir kalir.
- [ ] Masaustu ve mobil ekran goruntusuyle son yerlesim onayi.

## 2026-07-16 - Tahsilat ve odeme kanal kirilimi v118

- CFO komuta ekranina ayni donem secicisiyle calisan iki ayri nakit akis yuzeyi eklendi: Tahsilatlar ve Odemeler.
- Her iki yuzey `Nakit`, `Kredi Karti`, `Cek` ve `Diger` kanallarini ayri ve tiklanabilir olarak gosterir.
- Kanal toplamlarinin banka onay adaylarindan turetilmesi engellendi. Tarihli tam nakit snapshot'i gelmeden herhangi bir tutar veya sifir gosterilmez.

**QA (eski QA_CHECKLIST.md, "2026-07-16 Tahsilat ve odeme kanal kirilimi v118"):**
- [x] Tahsilat ve odeme ayni ekranda birbirinden ayri gorunur.
- [x] Nakit, kredi karti, cek ve diger kanallari iki akis icin de ayridir.
- [x] Donem secimi Bugun, Dun, Bu Hafta, Bu Ay, Gecen Ay, Bu Yil ve Gecen Yil icin kanal basliklarini birlikte degistirir.
- [x] Banka onay adayi sayisi kanal toplamina donusturulmez.
- [x] Her kanal ilgili detay ekranina tiklanabilir baglantidir.
- [ ] Canli tam nakit snapshot'i ile kanal tutarlarinin kaynak/tarih bazli mutabakati.

## 2026-07-16 - Ana ekran gelir tablosu ve bilanço operasyon yuzeyi v117

- Komuta sayfasinin ust yarisi, buyuk slogan ve yonlendirme kartlari yerine
  Gelir Tablosu ve Bilanco karar yuzeyine donusturuldu.
- Net satis, maliyet, brut kar, sabit/değisken gider, vergi ve net kar ile
  banka/kasa, alacak, borc, stok ayni ekranda ve tiklanabilir kalemler halinde
  gorunur oldu.
- Mevcut satis ozetinden sadece kaynakli net satis okunur. Maliyet, gider,
  vergi ve bilanço kaynaklari bagli degilse sifir veya sahte net kar
  gosterilmez; durum acikca "kaynak bekliyor" olarak belirtilir.

**QA (eski QA_CHECKLIST.md, "2026-07-16 Ana ekran gelir tablosu ve bilanco operasyon yuzeyi v117"):**
- [x] Ust yarida Gelir Tablosu ve Bilanco birlikte gorunur.
- [x] Satis, maliyet, brut kar, gider, vergi ve net kar kalemleri ayridir.
- [x] Her finans kalemi ilgili detay/karar ekranina tiklanabilir baglantidir.
- [x] Satis tutari sadece mevcut kaynak ozetinden okunur.
- [x] Eksik maliyet, gider, vergi veya bilanço kaynagi sifir kabul edilmez.
- [ ] Canli clone snapshot ile tum kalemlerin ayni as-of tarihte mutabakati.
- [ ] Mobil ve masaustu gorunumunun tarayici ekran goruntusuyle onayi.

## 2026-07-16 - Apsiyon aylik tahakkuk ve odeme defteri v116

- Apsiyonun `Tumunu Goster` kategori kirilimi kendi oturum istegiyle
  salt-okunur okundu.
- Aidat icin Ocak-Temmuz 2026 ayri borc makbuzlari, belge tarihi, son odeme
  tarihi, tutar, gecikme ve tahsilat kanitlariyla ayrildi.
- Dogalgaz satirlari ayri kaynak kalemi olarak korundu; devir bakiyesi yeni
  tahakkuk veya odeme adayi sayilmadi.
- Kaynak HTML'nin standart tablo satiri disindaki acilir ayrintilari da
  ayristrildi. Bu turda Finans Takvimi veya BizimHesap'a yazim yapilmadi.

**QA (eski QA_CHECKLIST.md, "2026-07-16 Apsiyon aylik tahakkuk ve odeme defteri v116"):**
- [x] Apsiyon `Tumunu Goster` kaynak kirilimindan aylik Aidat borc makbuzlari okundu.
- [x] Aidat belge tarihi, son odeme tarihi ve `4.500,00 TL` tutar her ay icin ayri kanitlandi.
- [x] Tahsilat satirlari borc satirlarindan ayri tutuldu.
- [x] Dogalgaz ve Aidat kaynaklari birbirine karistirilmadi.
- [x] Devir bakiyesi odeme/tahakkuk adayi sayilmadi.
- [x] Okuma dry-run olarak kaldi; Finans Takvimi ve BizimHesap'a yazim yapilmadi.

## 2026-07-16 - Apsiyon kaynak bakiye ayrimi v115

- Apsiyon kisisel finans ekrani aidat ve dogalgaz kaynak bakiyeleri icin
  salt-okunur olarak dogrulandi.
- Okuyucu, kaynak bakiye kirilimini aylik tahakkuk adaylarindan ayirir.
  Vade yoksa Finans Takvimi'ne kesin odeme kaydi olusturmaz.

**QA (eski QA_CHECKLIST.md, "2026-07-16 Apsiyon kaynak bakiye ayrimi v115"):**
- [x] Apsiyon kalici oturumuyla Batikent kisisel finans ekrani salt-okunur okundu.
- [x] Aidat ve Dogalgaz kaynak bakiyeleri ayri kategoriler olarak alindi.
- [x] Toplam bakiye aylik odeme/tahakkuk diye Finans Takvimi'ne yazilmadi.

## 2026-07-16 - Kaynak banka tarihi resmi kayit duzeltmesi v114

- Vakif Sirket hesabindaki iki mevcut hareket, yeni kayit olusturmadan ayni
  resmi BizimHesap kaydi uzerinde duzeltildi ve tekrar okundu.
- POS banka tahsilati (`a4bb5122-798c-4d12-8354-507216c5b9cf`) ve POS
  komisyonu (`7d269b6a-a80c-4cab-b84e-eb31ce85c154`) artik `14.07.2026`
  finansal tarihini tasiyor.
- Tekil tarih duzeltme araci formdaki asenkron veri yuklenmesini, tarih
  kanitini ve sonradan hesap hareketi satiri kontrolunu zorunlu tutar.

**QA (eski QA_CHECKLIST.md, "2026-07-16 Kaynak banka tarihi duzeltmesi v114"):**
- [x] Kaynak `transaction_date`, BizimHesap form tarihinden once ve sonra kontrol edildi.
- [x] Aynı iki mevcut Vakif Sirket kaydi ikinci hareket olusturulmadan duzeltildi.
- [x] POS tahsilati ve POS komisyonu hesap hareketleri listesinde `14.07.2026` olarak tekrar okundu.
- [x] Formdaki asenkron eski kayit riski test edilip bekleme kaniti eklendi.

## 2026-07-16 - Banka tarihi form kaniti v113

- BizimHesap kuyruk worker'ina kaynak banka tarihi korumasi eklendi.
- Transfer, hesaba para girisi ve gider formlarinda kaydetmeden once ekrandaki
  tarih, kaynak `transaction_date` ile tekrar karsilastirilir.
- Tarih yoksa veya form bugunun tarihi gibi farkli bir deger tasiyorsa kayit
  durdurulur; kaynak finans tarihi varsayilan form tarihiyle ezilemez.

## 2026-07-16 - Scope boundary for Halkbank Ercan Alayli account

- Recorded the account as an ALKAM Mali-only source and excluded it from
  AperiON, personal assistant, BizimHesap, and CFO reporting.

## 2026-07-16 - Apsiyon personal accrual intake v112

- Added local persistent Apsiyon session setup without storing credentials.
- Added read-only Batikent aidat/yakit accrual extraction with source evidence.
- Added a personal Batikent fuel obligation; amount and due date remain source-bound.
- Added local-only ignore rules for Apsiyon profile, session state, and raw imports.

**QA (eski QA_CHECKLIST.md, "2026-07-16 Apsiyon personal accrual intake v112" — hiçbiri işaretlenmemişti, hepsi açık kalmıştı):**
- [ ] `apsiyon_oturum_kur.cmd` opens a local browser profile without writing credentials to the repository.
- [ ] Authenticated Apsiyon Borclar/Tahakkuk page is detected and session status is local-only.
- [ ] `apsiyon_tahakkuk_oku.cmd` emits evidence-backed aidat and yakit candidates.
- [ ] Aidat preserves day 16; fuel due date comes only from source evidence.
- [ ] No candidate is marked paid before bank/dekont reconciliation.

## 2026-07-16 - Ana Sayfa Gelir Tablosu ve Bilanco Karar Yuzeyi v111

- Ana ekrana Exceldeki gelir tablosu siralamasina uygun iki parca karar
  yuzeyi eklendi: gelir tablosu ve bilanço durumu.
- `Satilan Malin Maliyeti` artik ayri tiklanabilir satirdir; kategori,
  urun ve satis kaydina kadar iner.
- Bilanço tarafinda banka/kasa yalnizca bakiye alanli ekstrelerden hesaplanir.
  Tahsilat/odeme farki izleme kalemi olarak etiketlenir; ticari alacak veya
  borc diye kesinlestirilmez.

**QA (eski QA_CHECKLIST.md, "2026-07-16 Ana Sayfa Gelir Tablosu ve Bilanco v111"):**
- [x] Excel donem sirasi (Bugun -> Gecen Yil) gelir tablosu motorunda var.
- [x] Planlanan / tahakkuk / gerceklesen kolonlari ayridir.
- [x] Satis -> kategori -> urun -> kaynak kayit ayrintisi korunur.
- [x] Satilan Malin Maliyeti ayri tiklanabilir kategori/urun akisi olarak eklendi.
- [x] Banka/kasa toplami sadece bakiye alanli ekstre kaynaklarindan hesaplanir.
- [x] Stok, ticari alacak ve ticari borc kaynagi yoksa kesin bilanço tutari uydurulmaz.
- [ ] Canli Supabase kaynaklariyla donem ve drilldown arayuzu manuel kontrol edildi.

## 2026-07-15 - Sirket Banka Gecmis Mutabakati v109

- Tarihsel banka mutabakat motoruna ALAYLI MEDIKAL Is Bankasi XLS hesap
  ozeti adapteri eklendi; VakifBank ve Is Bankasi satirlari islem
  numarasi/referansla ayni duplicate/evidence zincirinde okunur.
- Sayisal ve tarihsel alan parseri, VakifBank ve Is Bankasi'nin farkli
  ondalik/tarih bicimlerini kayipsiz okuyacak sekilde genellestirildi.
- DPAPI ile sifreli servis anahtarini yalnizca calisma aninda kullanan
  `bank:history:reconcile:secure` komutu eklendi. Bu komut salt-okunurdur;
  BizimHesap'a kayit yazmaz.
- Is Bankasi ayni referansla ana hareket ve ucret urettiginde ikisini ayri
  duplicate anahtarla izleyen koruma eklendi. Giris yonundeki sirket ici
  virmanlarda kaynak/hedef hesap yonu ters yazilamaz.

**QA (eski QA_CHECKLIST.md, "2026-07-15 Sirket Banka Gecmis Mutabakati v109"):**
- [x] VakifBank islem numarali XLS/XLSX kaynaklari tanindi.
- [x] ALAYLI MEDIKAL Is Bankasi hesap ozeti XLS kaynaklari tanindi.
- [x] Kisisel vadesiz hesap dosyalari sirket akisi disinda tutuldu.
- [x] Salt-okunur rapor 741 kaynak satir uzerinde uretildi.
- [x] Is Bankasi ayni referansli ana hareket/masraf satirlari ayri duplicate anahtarla korunuyor.
- [x] Is Bankasi giris ve cikis virmanlarinda kaynak/hedef yon testi gecti.
- [ ] Sifreli servis anahtariyla Supabase/BizimHesap kaniti cekildi.
- [ ] Islenmis ve eksik satirlar kaynak kanitiyla ayrildi.
- [ ] Herhangi bir eksik satir canli kayda aday yapilmadan once hesap ve kayit turu dogrulandi.

## 2026-07-15 - Banka Masrafi Kaynak Hesap Kilidi v107

- BizimHesap masraf formunun `AKBANK SIRKET` varsayilanini sessizce
  kullanabilme riski kapatildi.
- Kaydetme oncesi secili hesap, planlanan kaynak hesapla tekrar okunur;
  eslesme yoksa kaydetme durur.
- VakifBank POS komisyonu ayni kayit uzerinde `*VAKIF SIRKET` hesabina
  duzeltildi; mukerrer masraf kaydi olusturulmadi.

## 2026-07-15 - Tarihsel Banka Mutabakat Hatti v106

- Ocak 2026 ve sonrasi banka ekstreleri icin Git disi yerel giris klasoru ve
  salt-okunur mutabakat araci eklendi.
- VakifBank XLS/XLSX satirlari islem numarasi/duplicate key ile AperiON
  pending kaydi ve BizimHesap kuyruk sonucuna karsi karsilastirilir.
- Rapor, islenmis veya kuyruktaki kaydi tekrar yazmaz; guvenli isleme adayi
  ile inceleme gerektiren kaydi ayri gosterir.
- Belirsiz gelen para icin yeni hesap acmak yerine kaynak banka hesabinda
  `Hesaba Para Girisi` politikasi korundu.

## 2026-07-15 - BizimHesap Canli VakifBank Kayit Kaniti v101

- Yeni BizimHesap transfer dropdown/modal akisi gerçek Puppeteer tiklamasiyla
  acilacak sekilde duzeltildi; hedef hesap, tarih, tutar ve aciklama kaydetme
  oncesi zorunlu olarak dogrulanir.
- VakifBank `2026009923018191` Batch Yatan kaydi `POS POS POS KREDI KARTI ->
  *VAKIF SIRKET` 46.540,00 TL transferi olarak BizimHesap'a kaydedildi.
- VakifBank `2026009923018202` Batch Komisyonu kaydi 902,81 TL Banka/POS
  masrafi olarak kaydedildi. Portal varsayilan AKBANK SIRKET secimini ilk
  kanitta gosterdigi icin ayni satir `*VAKIF SIRKET` hesabina guncellendi;
  yeni ya da mukerrer masraf kaydi olusturulmadi.
- Banka masrafi formunda hesap, kategori ve odeme durumu bulunmadan kaydetmeye
  izin verilmeyecek sekilde koruma eklendi.

**QA (eski QA_CHECKLIST.md, "2026-07-15 Canli VakifBank Kaniti"):**
- [x] Kullanici onayi alindi: iki net VakifBank POS batch kaydi.
- [x] `2026009923018191` 46.540,00 TL transfer formu, hedef hesap, tarih ve tutar dogrulandi.
- [x] Transfer BizimHesap'ta kaydedildi; ilgili kuyruk `processed` durumunda.
- [x] `2026009923018202` 902,81 TL POS komisyonu kaydedildi.
- [x] Ilk masraf kaydindaki yanlis AKBANK SIRKET hesabi ayni satirda `*VAKIF SIRKET` olarak duzeltildi.
- [x] Masraf duzeltme basari ekrani ve son satir kaniti alindi.

## 2026-07-15 - VakifBank POS Batch Akisi v100

- VakifBank XLS ekstrelerini kaynak hesap ve islem numarasi ile okuyup
  duplicate key ile Supabase'e alan guvenli importer eklendi.
- `Batch Yatan` POS tahsilat aktarimi, `Batch Komisyonu` ise banka masrafi
  olarak ayrildi; sirket ici hesap ve gider hedefi kuyruk payloadina yazildi.
- Gunluk Telegram ozeti ham ekstre dump'i yerine kayit turu, tutar, hedef ve
  islem numarasini kisa olarak gosterir. Sadece belirsiz hareketler soru sorar.
- BizimHesap hesap adlari icin portal adlari kullanildi: `*VAKIF SIRKET`,
  `*IS BANKASI`, `*YAPI KREDI SIRKET`, `AKBANK SIRKET` ve `GARANTI SIRKET`.
- Canli form denetiminde yeni portal transfer menusu eski seciciyle formu
  acmadigi goruldu. Kaydet tusuna basilmadi ve kuyruk kayitlari korunarak
  tekrar denenebilir duruma getirildi.

## 2026-07-14 - Saatlik Tam Kaynak Yenileme v99

- Saatlik BizimHesap klonu satis, urun/stok, masraf, son islemler, gider
  kartlari, fatura kuyrugu ve fatura-gider karti eslesmesini birlikte yeniler.
- Eksik `tools/aperion_memory.cjs` katmani eklendi; gider karti/fatura
  otomasyonunun isletme hafizasi ve yerel islem gunlugu calisir duruma geldi.
- ESM fatura okuyucusunun CJS gibi calistirilmasina neden olan runtime ayrimi
  duzeltildi.
- Fatura ayrintisi okumasi kalici sonuc dosyasindan devam eden, saatlik en fazla
  dort yeni adaylik partiye alindi; uzun arama temel kaynak yenilemesini
  engellemez.
- Canli denetim `SONUC: BASARILI`: 962 son-15-gun satis, 71 bugun, 86 dun,
  343 masraf, 5.667 urun/stok ve 3 son hareket saglik kontrolunden gecti.

## 2026-07-14 - BizimHesap Canli Klon Kaniti v98

- Windows DPAPI ile sifreli yerel BizimHesap parola kasasi eklendi; parola
  `.env`, Git veya gorev tanimina yazilmaz.
- Klon saglik denetimi service-role anahtarini kullanacak sekilde duzeltildi;
  RLS nedeniyle gorunen yanlis `0 kayit` sonucu kapatildi.
- Son islem akisi ayni hash ile gelen yinelenen portal satirlarini upsert
  oncesinde suzer; PostgreSQL cift conflict-key hatasi kapatildi.
- `AperiON_BizimHesap_Klon_Saatlik` guncel kod kokunde etkin: 10:00 ve 17:00.
  Manuel canli denetim: task sonucu `0`, runner sonucu `SONUC: BASARILI`.
- Saglik kaniti: son 15 gun 957 satis, bugun 66, dun 86, 343 masraf,
  5.667 urun/stok ve 3 son hareket; tum denetimler saglikli.
- Zamanlama kullanici karariyla her saat `:05` olarak guncellendi.
- Saatlik kapsama gider karti, fatura detay kuyrugu, fatura detayi okuma ve
  fatura-gider karti eslestirme katmanlari eklendi. Cakisan uzun calismalar
  yeni bir gorev baslatmak yerine atlanir.

## 2026-07-14 - BizimHesap Guvenli Yerel Klon v97

- `tools/set_local_supabase_service_role.ps1` eklendi: servis anahtarini
  Windows DPAPI ile sifreler; `.env` veya repo icine yazmaz.
- `tools/invoke_secure_bizimhesap_clone.ps1` eklendi: sifreli anahtari sadece
  calisma aninda bellekte acar, kalici BizimHesap profilini kullanir.
- `tools/install_live_bizimhesap_clone_task.ps1` eklendi: guncel kod kokunu
  kullanan 10:00 ve 17:00 gorevini kurar.
- Sistem preflight'i kalici oturum ve DPAPI sifreli servis anahtarini ayrica
  denetleyecek sekilde guncellendi.

## 2026-07-14 - Komuta Masasi v96

- `aperion-ust-akil.html` operasyonel Komuta Masasi olarak yeniden tasarlandi.
- Buyuk tanitim basligi ve anlamsiz kutular kaldirildi; kaynakli karar
  oncelikleri ve sekiz tiklanabilir is alani eklendi.
- Banka onay durumu ve FIFO kapsam bilgisi mevcut salt-okunur JSON
  kaynaklarindan yuklenir; kaynak okunamazsa ekran rakam uydurmaz.
- Yerel tarayici testi 8 modul karti, 3 oncelik karti ve yatay tasma olmadan
  basariyla tamamlandi.

## 2026-07-14 - Kullanici Fonksiyonu Koruma Kurali

- `DECISIONS.md` icine D-008 eklendi.
- Kullanici tarafindan tarif edilen veya mevcutta bulunan fonksiyonlar acik
  emir olmadan kaldirilmaz, gizlenmez ya da daraltilmaz.
- Yeni tasarimlar eski ekranlari silmek yerine gorunur giris ve gecisle
  tamamlar.
- Hasta Bezi eski operasyon sayfasi ile yeni karar ekrani arasina cift yonlu
  gecis eklendi; mevcut siparis, sevkiyat, arama ve kontrol araclari korunur.

## 2026-07-14 - Hasta Bezi Giris Rotasi

- Ust Akil ana butonu ve Hasta Bezi modul karti eski gorunum yerine
  `hasta-bezi/karar-ekrani.html` sayfasina baglandi.

## 2026-07-14 - Tarihsel FIFO Kaynak Girisi v95

- `tools/preflight_historical_fifo_sources_v95.cjs` eklendi.
- Komut, tarihsel satis, alis ve acilis stok raporlarini ayri klasorde
  denetler; gerekli sutun, tarih araligi ve kaynak tipi olmadan FIFO paketine
  veri eklemez.
- Komut: `npm run hasta-bezi:history:preflight`.
- Yerel kontrol raporu public repoya alinmaz.

## 2026-07-14 - FIFO Maliyet Kaniti v94

- FIFO paketindeki fallback maliyet satirlari nedenlerine ayrildi:
  donem basi stok/gecmis alis eksigi, alis kaydi yok, yetersiz alis lotu.
- Kaynak disavurumunda 5.813 donem basi stok, 11.442 alis kaydi yok ve
  1.947 yetersiz alis lotu satiri kanitlandi.
- `hasta-bezi/karar-ekrani.html` kaynak satiri bu ayrimi gorunur gosterir.
- Bu tur eski alis verisi uydurmadi ve fallback maliyeti kesin FIFO olarak
  isaretlemedi.

## 2026-07-13 - Hasta Bezi Karar Ekrani v93

- `hasta-bezi/karar-ekrani.html` eklendi; sol menusuz, tek ekran karar
  gorunumu gercek FIFO veri paketini tarayicida acar.
- Bugun, Dun, Bu hafta, Bu ay, Gecen ay, Bu yil ve Gecen yil donemleri;
  satis, adet, maliyet, brut kar ve maliyet kontrol sayaclariyla calisir.
- Kategori kartlari tiklanabilir hale getirildi. Urun penceresi satis,
  maliyet, kar, marj, kalan stok ve kontrol etiketlerini listeler.
- Kaynak maliyetinin eksi isaretle gelmesi durumunda karar gorunumu mutlak
  maliyeti kullanir; brut kar satis eksi maliyet olarak hesaplanir.
- Alis lotu bulunamayan satirlar `MALIYET KONTROL` etiketiyle ayrilir;
  fallback maliyet kesin FIFO gibi gosterilmez.

## 2026-07-13 - Hasta Bezi FIFO paket onarimi v92

- Manifestin isaret ettigi ancak repoda bulunmayan FIFO gzip parcalari iki
  kaynak rapordan yeniden uretildi.
- Yeni paket: 1.881 urun, 38.258 hareket ve 34.869 satis satiri.
- Alis lotu bulunamayan 19.202 satis satiri, satis raporundaki alis fiyatini
  fallback maliyet olarak tasir; kesin FIFO sonucu gibi sunulmaz.
- Komut: `npm run hasta-bezi:fifo:build`.

## 2026-07-13

### Gunluk Banka Onay Ekrani

- `gunluk-banka-karar.html` eklendi. Ekran yalnizca en yeni islem gununu
  gosterir; kayda hazir, cari dogrulama ve inceleme islerini ayri tutar.
- Kayda hazir harekette kullanicinin tek tik onayi `approve_pending_bank_movement`
  RPC'siyle BizimHesap kuyrugunu olusturur. Cari belirsizse kullanici adi yazar,
  sistem once cari dogrulamasi sonra kuyruk islemi yapar.
- `AperiON Bank Approval Status` workflow'u gunluk snapshot'i olusturup Pages
  tarafindan okunabilir `data/aperion_daily_bank_review.json` dosyasina yazar.
- Ust Akil girisindeki Onay modulu eski uzun onay sayfasi yerine Gunluk Banka
  Onay ekranina baglandi.

### Gunluk Banka Karar Akisi

- `tools/build_daily_bank_review_v89.cjs` eklendi. En yeni islem gununu secip
  bekleyen banka hareketlerini `hazir`, `cari_dogrulama` ve `inceleme`
  olarak ayirir.
- `telegram/aperion_daily_bank_review_digest_v89.cjs` eklendi. Ham JSON ve
  tekrarli link yerine kisa gunluk karar ozeti uretir; varsayilan mod sadece
  onizlemedir, `--send` olmadikca Telegram mesaji gondermez.
- Mail ekstre workflow'u 10:00 ve 17:00 Istanbul zamanli kontrollerinde bu
  ozeti gonderecek sekilde baglandi. Yeni mail akisi iki gun penceresiyle
  calisir; `duplicate_key` gecmis tarihli ekstrelerin tekrar kayda girmesini
  engeller.
- `verify:bank:daily-review` eklendi ve gecti.

### BizimHesap Uctan Uca Denetimi

- Windows gorevleri, yerel senkron loglari, repo botlari, kuyruk dogrulamasi,
  B2B on kontrolu ve GitHub saatlik workflow sonucu salt-okunur denetlendi.
- Kök neden: Windows'un calistirdigi ayri `ErpaltH` kopyasinda masraf botu
  `masraf_raw` tablosuna publishable anahtarla yazmaya calisiyor; RLS bu
  yazimi reddediyor.
- Giris ve firma secimi, satis/urun/stok/son-islemler adimlari kanitlandi;
  masraf ve dolayisiyla tam finans guncelligi kanitlanmadi.
- Denetimde canli BizimHesap kaydi, banka onayi veya Supabase veri yazimi
  yapilmadi. Ayrintilar (2026-07-31 itibarıyla `docs/archive/BIZIMHESAP_UCTAN_UCA_DENETIM_2026-07-13.md`
  içindeydi, çözülüp çözülmediği yeniden doğrulanmadı — bkz.
  `docs/OPERATIONS_RULES.md` §9).
- Cift ve hatali yerel calismayi kesmek icin
  `AperiON_BizimHesap_Klon_Saatlik` Windows gorevi devre disi birakildi.
  Ayri yonetici sahipli sabah kontrol gorevi bu oturumdan kapatilamadi;
  takip listesine eklendi.

### Odeme Takvimi, Bildirim ve Gezinme

- `tools/build_payment_reminder_candidates_v88.cjs` eklendi; kaynakli odeme hafizasindan gecikme ve vade yaklasimi adaylari uretir.
- `telegram/aperion_payment_reminder_digest_v88.cjs` eklendi; varsayilan olarak sadece onizleme yapar, `--send` olmadan Telegram'a mesaj gondermez.
- `verify:payment-reminders` eklendi; Batikent Ercan Ev Aidati ve Sena Medikal kaynakli ornekleriyle tarih, bildirim ve guvenlik kuralini denetler.
- `payment-reminder-digest.yml` eklendi; 07:00 ve 17:00 Istanbul saatleri icin salt-okunur Telegram odeme ozeti planlandi. Eksik bilgi kartlari gunluk bildirim spaminden ayrildi.
- Odeme hatirlatma gondericisi mevcut `TELEGRAM_CHAT_IDS` coklu hedef secret yapisini da destekler hale getirildi.
- Finans Takvimi baslaticisi canli ekrana dogrudan yonlendirilir hale getirildi; mevcut bozuk metinler icin goruntuleme onarimi ve ay sonu vade hesap korumasi eklendi.
- `data/aperion_payment_obligation_registry.json` eklendi; sahsi/sirket yukumluluklari icin kaynakli hafiza baslatildi.
- Batikent Ercan Ev Aidati aylik, ayin 16'si, tutar bekliyor olarak eklendi.
- Finans Takvimi live ekraninda odeme hafizasi, vade, veri eksigi ve 7/3/1/0 gun bildirim politikasi gorunur hale getirildi.
- Finans Takvimi ekranlarina `AperiON Ana Ekran` geri donus baglantisi eklendi.
- Ust Akil guncelleme etiketi `HHmmYYMMdd` formatinda dinamiklestirildi.
- `verify:payment-calendar-navigation` eklendi.
- Takvimde kalan sabit Mayis 2026 tarihi kaldirildi; gercek gun ve ayla filtreleme yapilir.
- Supabase kaydi yoksa eski demo borclari yerine kaynakli odeme hafizasi fallback olarak gosterilir.

## 2026-07-13 - Hasta Bezi kaynak denetimi v91

- `SATIS RAPORU (24)` ve `ALIS RAPORU (5)` yerel BizimHesap exportlari icin
  yeniden calistirilabilir denetim eklendi.
- Kanit: 34.869 satis satiri, 3.389 alis satiri, toplam 38.258 FIFO hareketi.
- Tarih kapsami: satis 2025-01-01 - 2026-07-08; alis 2025-01-02 - 2026-07-06.
- Public dashboard icin sadece guvenli aggregate kanit dosyasi
  `hasta-bezi/fifo_chunks/source_audit.json` yazilir; ham cari, tedarikci ve
  fatura satirlari yerelde kalir.
- `hasta-bezi/index.html` kaynak denetimi basariliysa kapsami ust bantta
  gorunur hale getirir.
- Komutlar: `npm run hasta-bezi:source-audit` ve
  `npm run verify:hasta-bezi:source-audit`.

## 2026-07-15 - Guvenli belirsiz banka girisi v103-v105

- `tools/probe_bizimhesap_account_income_form_v103.cjs`: Gercek BizimHesap hesap-hareketi giris formu kaydetmeden dogrulandi.
- `tools/bank_posting_plan.cjs`: Cari eslesmesi belirsiz, ancak banka hareketi kanitli gelen para icin `bank_unmatched_incoming` karari eklendi.
- `bizimhesap_queue_worker.cjs`: Bu karar kaynaktaki banka hesabinda `Hesaba Para Girisi` formuna yazilir; cari/tedarikci bakiyesi degismez.
- `tools/queue_unmatched_bank_incoming_v104.cjs`: Sadece en yeni gunun guvenli adaylarini idempotent kuyruga alir.
- `tools/apply_pending_bank_counterparty_schema_v105.cjs`: Canli Supabase sema kurulumunu denetler; mevcut projede `exec_sql` RPC'si olmadigi icin SQL Editor kurulumu zorunlu oldugu acikca raporlanir.

**QA (eski QA_CHECKLIST.md, "2026-07-15 Belirsiz Gelen Para Kontrolu"):**
- [x] BizimHesap `Hesaba Para Girisi` form alanlari kaydetmeden dogrulandi.
- [x] Son gun aday secimi yalnizca dogrulanmis banka hareketini aliyor.
- [x] Banka adi celiskisi ve reklam/duyuru adaylari otomatik kayda kapali.
- [x] Cari eslesmesi belirsiz gelen para, cari bakiyesine dokunmayan planla olusturuluyor.
- [ ] Canli Supabase `confirmed_counterparty` semasi uygulandi.
- [ ] Gunluk belirsiz para girisi kuyrugu canli olusturuldu.
- [ ] BizimHesap'ta canli kayit ve son satir kaniti alindi.

## 2026-07-15 - Hattat Aylik Odeme Listesi v108

- Hattat Musavir PDF'lerinden vergi/SGK vade ve tahakkuk adaylarini okuyan
  `tools/build_hattat_monthly_payment_plan_v108.cjs` eklendi.
- Plan, kaynak dosya SHA-256 anahtari ve satir bazli source id ile
  mukerrer korumasina sahiptir; ham PDF ve plan dosyalari Git disi
  `finance_imports/hattat` alaninda tutulur.
- `tools/import_hattat_monthly_payment_plan_v108.cjs` Finans Takvimi icin
  dry-run ve onayli canli import ayrimini uygular.
- Odeme listesi tek basina banka odemesi kaniti sayilmaz: satirlar tahakkuk
  olarak acilir, banka mutabakati ile kapanir.
- `hattat_oturum_kur.cjs` yerel kalici profil ile kullanicinin kendi
  tarayicisinda oturum kurmasi icin eklendi; parola kaydedilmez.

**QA (eski QA_CHECKLIST.md, "2026-07-15 Hattat Odeme Listesi Kontrolu"):**
- [x] Hattat PDF'leri salt-okunur parse edildi.
- [x] Kaynak PDF veya ham vergi bilgisi GitHub Pages'e yazilmadi.
- [x] Her adayda kaynak dosya, source id, vade ve tutar var.
- [x] Odeme listesi "odendi" olarak yorumlanmadi.
- [ ] Canli Finans Takvimi importu ayrica onaylandi.
- [ ] Banka mutabakati kapanis kaniti ayri tutuldu.

## 2026-07-16 - Gelir Tablosu ve Bilanco Yan Yana v122

- Ana ekrandaki gelir tablosu matrisi bilanço/likidite özetinin soluna alındı.
- Nakit sütunu kullanıcı diliyle "Ödenen / Tahsilat" olarak adlandırıldı.
- Dönem başlıkları ve gün içi Tahmini/Tahakkuk/Ödenen-Tahsilat ayrımı korunarak tıklanabilir detay akışına bağlandı.

## 2026-07-16 - Is Bankasi Hesap Ozeti Koruması v123

- Kredi karti hesap ozeti e-postalari, tekil hareket/refarans kaniti olmadan banka hareketi olarak siniflanmaz.
- `POS`, `kredi karti` veya yil bilgisi tek basina POS banka transferi kaydi olusturamaz.
- Yanlis 2.026 TL Is Bankasi adayi guvenli onay listesinden cikti; iki kanitli gelen para girisi ayri aday olarak korundu.

**QA (eski QA_CHECKLIST.md, "Is Bankasi Ayrisma Kontrolleri v123"):**
- [x] Kredi karti hesap ozeti e-postasi hareket adayindan dislanir.
- [x] `POS` kelimesi tek basina POS banka transferi sinifi vermez.
- [x] Hatali 2026 TL hesap ozeti adayi guvenli listeden cikti.
- [x] Gercek Is Bankasi para girisleri `Hesaba Para Girisi` planiyla ayrildi.
- [ ] Iki gercek girisin BizimHesap resmi satir kaniti alinacak.

## 2026-07-16 - Canonical Pages deployment repair

- Added `.github/workflows/cloudflare-pages-deploy.yml` so pushes to `main` can publish the canonical `aperion-istasyon` Cloudflare Pages project.
- Documented that GitHub Pages is a legacy backup and must not be presented as the primary AperiON cockpit.
- Added an explicit secret gate so a missing Cloudflare credential fails safely rather than pretending a deploy exists.

**QA (eski QA_CHECKLIST.md, "Canonical publication checks"):**
- [x] GitHub Pages and Cloudflare Pages endpoints checked separately.
- [x] Confirmed `aperion-istasyon.pages.dev` was unreachable from the current machine at audit time.
- [x] Confirmed no Cloudflare deployment workflow existed in the repository.
- [x] Added deploy workflow with a non-secret credential presence gate.
- [ ] Confirm a successful `Deploy AperiON Cloudflare Pages` run.
- [ ] Confirm canonical root returns the current `main` cockpit.
- [ ] Replace legacy GitHub Pages entry point only after canonical verification.

*(2026-07-31 güncelleme: bu son üç madde artık doğrulanmış kabul edilir —
bkz. `docs/ARCHITECTURE.md` §1, canlı zincir `_redirects` → `aperion.html`
→ `aperion-ust-akil.html` olarak teyit edildi.)*

## 2026-07-29 - Hasta Bezi BizimHesap Kaynak Motoru v127

- Satis botuna kanitli ham rapor snapshot'i ve fatura/urun/KDV alanlari eklendi.
- Stok botuna `stock_raw` yazimi eklendi.
- Fatura detaylarindan gercek `purchase_raw` ureten importer eklendi.
- Hasta Bezi snapshot builder'a yerel ham kaynak fallback'i, satis-fatura eslestirmesi ve stok hareket alanlari eklendi.
- Saatlik workflow'a alis importer'i ve kaynak tamlik denetimi eklendi.
- Yeni test sales/purchase/stock, fatura no, urun gecmisleri, FIFO KONTROL, Jender XXL ve Ilkbahar Eczanesi sonucunu sayisal olarak raporlar.

## 2026-07-29 - v127 Actions calisma duzeltmesi

- BizimHesap satis botundaki Unicode fonksiyon adi GitHub Actions uyumu icin ASCII yapildi.
- Alis fatura importer'inin komut satiri secenekleri ile dosya yollarini ayirmasi saglandi.
- Kaynak semasi Actions uzerinde basariyla kurulmus olarak dogrulandi.

## 2026-07-10

### Banka Onay Karakter Onarimi

- Mobil banka onay ekranina ham aciklama ve ekstre JSON'u icin kodlama onarimi eklendi.
- `BAKIM ?CRET?` gibi OCR kaynakli bilinen bozulmalar ekranda `BAKIM UCRETI` olarak goruntulenir.
- Gorsel ekstre parser'i ayni kalibi yeni kayit olusmadan duzeltir.
- `verify:bank-approval-encoding` komutu eklendi.

### Cari Dogrulama -> BizimHesap Tahsilat Kaniti

- Mail Ekstre Onay Merkezi'ne `Cari doğrula` eylemi eklendi.
- Ilgili kisi/firma hareketinde kullanici hedef BizimHesap carisini yazar ve ikinci bir onayla dogrular.
- `confirmed_counterparty`, `counterparty_confirmed` ve `counterparty_confirmed_at` alanlari banka hareketinde karar destegi olarak eklendi.
- Mobil canli ana ekran `a5f3548-final` uzerinden 1920x1080 olculdu; ana kartlar sinir icinde kaldi.
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

- Veri guveni, Banka mail ekstre, Onay Merkezi, BizimHesap kaydi, Gelir Tablosu, Urun Karliligi, Hasta Bezi Raporu, Telegram/Mail evrak, sabit/sozlesmeli gelir-gider ve cache/isletme hafizasi istekleri `PROJECT_STATUS.md` icine urun yon haritasi olarak yazildi (bu içerik 2026-07-31'de `docs/VISION_AND_ROADMAP.md`'ye taşındı).

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
- `docs/bizimhesap_b2b_api_notlari.md` guncellendi (bu içerik 2026-07-31'de `docs/DATA_MODEL_AND_STANDARDS.md` Ek A'ya taşındı).
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
- `PROJECT_STATUS.md`, `NEXT_TASK.md`, `QA_CHECKLIST.md`, `DECISIONS.md` ve `CHANGELOG_APERION.md` tek-kaynak dosyalari olusturuldu (bu dosyalar 2026-07-31'de `docs/` altına konsolide edildi — bkz. `docs/DECISIONS.md` D-002 güncellemesi).
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
- `BizimHesap'a Kaydet` / `Kuyruğa Al` aksiyonu yalnizca hazir kayitlarda aktif kalir.
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
- Canli Supabase SQL uygulanmadi (**2026-07-31 güncelleme:** kısmen uygulandı, sonra yeniden kontrol edilip eksik kalan anon izinleri de kapatıldı — bkz. yukarıdaki "2026-07-31" girdisi ve `docs/OPERATIONS_RULES.md` §9).

---

## 2026-07-08 - docs/ klasörünün başlangıcı

*(Bu girdi eski `docs/CHANGELOG.md`'nin tek girdisiydi; kaynak konsolidasyon
talimatı gereği burada "en eski" olarak listeleniyor — tarih notu için
dosyanın en üstündeki uyarıya bakın.)*

### Yapılanlar

- AperiON iSTasyon için `/docs` klasörü başlatıldı.
- `VISION.md`, `ARCHITECTURE.md`, `DATABASE.md`, `BANK_RULES.md`,
  `GMAIL_RULES.md`, `BIZIMHESAP_RULES.md`, `TELEGRAM_RULES.md`,
  `AUTOMATION_RULES.md`, `UI_STANDARDS.md`, `ROADMAP.md`,
  `REPO_AUDIT_2026-07-08.md` oluşturuldu.
- `OPERATING_MODEL.md`, `CHATGPT_CONTINUITY_PROTOCOL.md`, `START_HERE.md`,
  `SESSION_STATE.md`, `NEXT_ACTION.md`, `PERSONAL_FINANCE_RULES.md`,
  `FINANCIAL_DATA_STANDARDS.md` ve `DASHBOARD_BLUEPRINT.md` eklendi.
- Banka sınıflandırma motorunda POS banka yatışları düzeltildi: `POS
  tahsilati` yerine `POS banka transferi`, hedef olarak da `BizimHesap
  hesaplar arasi transfer` kullanılacak.
- POS banka aktarım planına `source_account` ve `target_account` alanları
  eklendi. Kaynak hesap standardı: `POS POS POS KREDI KARTI`; hedef hesap:
  paranın yattığı banka hesabı.
- Banka onay aday seçim motoru pilot banka kuralına göre düzeltildi. İş
  Bankası pilot banka olarak önceliklendirilir; pilot aday varsa Yapı
  Kredi/Akbank/VakıfBank gibi farklı banka adayları ilk sıraya alınmaz.
- Aday seçim skorunda eski `POS tahsilati` ödülü kaldırıldı; doğru `POS
  banka transferi / POS banka aktarimi` sınıfı pozitif kriter yapıldı.
- `verify_bank_candidate_pilot_scope_v83.cjs` testi eklendi.
- `AperiON Bank Approval Status` workflow'u `BANK_APPROVAL_PILOT_BANK=IS
  BANKASI` ile çalışacak ve pilot kapsam testi geçmeden banka onay status
  raporu üretmeyecek şekilde güncellendi.
- BizimHesap worker uyumu için POS banka transferi teknik `kind` değeri
  `bank_transfer` yoluna alındı; kullanıcıya görünen `type` yine "POS banka
  transferi" olarak kalır.
- `aperion-home-v3.html` Operasyon Merkezi kokpitine çevrildi. Başlık
  `AperiON iSTasyon – Operasyon Merkezi` yapıldı, `ErpaltH` canlı başlık izi
  kaldırıldı, ana kartlar eklendi (**not:** bu ekran daha sonra kanonik
  canlı ekran olmaktan çıktı — bkz. `docs/ARCHITECTURE.md` §1).
- Operasyon kokpitine Bankalar, BizimHesap, Moka/POS, Kredi Kartları,
  Faturalar/Abonelikler, Şahsi Finans ve Sistem Sağlığı kartları eklendi.

### Kararlar

- Doğru proje adı: AperiON iSTasyon.
- Operasyon Merkezi tek ana ekran olacak.
- İş Bankası banka mutabakatı pilot iş olarak kabul edildi.
- Kullanıcı onayı olmadan BizimHesap'a finansal kayıt yazılmayacak.
- POS kredi kartı tahsilatlarının ertesi gün bankaya yatması tahsilat değil
  transfer sayılacak.
- Telegram onay mesajlarında kanıt zorunlu olacak.
- Mükerrer kayıt kontrolü `bank_row_key` ve `duplicate_key` ile zorunlu
  tutulacak.
- Şahsi finans, ALAYLI şirket mutabakatından ayrı tutulacak.

### Kalanlar (2026-07-08 tarihli — büyük ölçüde ilerledi, ayrıntı için yukarıdaki daha yeni girdilere bakın)

- Yanlış isimlerin repo içinde kontrollü temizliği.
- İş Bankası ID 33-35 onay durumunun gerçek sistem kanıtıyla doğrulanması.
- Onaylı kayıtların BizimHesap'a işlenmeden önce dry-run planının
  üretilmesi.
- İşlem sonrası BizimHesap doğrulamasının yapılması.
- Operasyon kokpiti için gerçek Gmail, kredi kartı, fatura/abonelik ve
  şahsi finans data JSON kaynaklarının bağlanması.

---

## Kalıcı QA kontrol listeleri (eski `QA_CHECKLIST.md`, sürüme bağlı olmayan standing checklist'ler)

Bu bölüm, `QA_CHECKLIST.md`'de belirli bir sürüm etiketine bağlı olmayan,
her turda tekrar kullanılan genel kontrol listelerini içerir. Yukarıdaki
sürüme özel QA notlarının aksine bunlar tek bir tarihe ait değildir; her yeni
çalışma turunda hâlâ referans olarak kullanılabilir.

### Her Tur Zorunlu Kontrol

- [ ] Tek ana hedef belirlendi.
- [ ] Canli kayit gerekiyorsa kullanici onayi alindi.
- [ ] Demo/uydurma veri canli karar ekrani gibi sunulmadi.
- [ ] Firma izolasyonu kontrol edildi.
- [ ] Degisiklikten once ilgili dosyalar okundu.
- [ ] Test komutlari calistirildi veya neden calistirilamadigi yazildi.
- [ ] `docs/CURRENT_STATUS.md` guncellendi (eski karşılığı: `PROJECT_STATUS.md`/`NEXT_TASK.md`).
- [ ] `docs/CHANGELOG.md` guncellendi (eski karşılığı: `CHANGELOG_APERION.md`).
- [ ] Tur sonunda Yapilanlar / Kalanlar / Kontrol Ettiklerim / Commit / Guncellenen dosyalar raporlandi.

### Veri Guveni Kontrolleri

- [ ] Dry-run canli tabloya yazmiyor.
- [ ] Commit modu acikca ayriliyor.
- [ ] Hata alan komut basarili gibi raporlanmiyor.
- [ ] `aperion_last_sync.json` gercek sonucu yaziyor.
- [ ] Mukkerrer kayit kontrolu var.
- [ ] Kaynak, firma, tarih ve kayit ID izlenebilir.
- [ ] Duzeltme ve ret islemleri loglaniyor.
- [ ] Anon role finansal onay RPC'lerini calistiramiyor.
- [ ] Anon role finansal ham/queue/log tablolarina yazamiyor.
- [ ] Authenticated okuma firma izolasyonu ile sinirli.
- [ ] Service role yazma hattinin testleri hardening sonrasi tekrar kosuldu.

*(2026-07-31 notu: bu listenin son üç maddesi `bank_transactions` tablosu
için hâlâ tam sağlanmıyor — bkz. `docs/OPERATIONS_RULES.md` §9.)*

### BizimHesap Kontrolleri

- [ ] Login calisiyor.
- [ ] ALAYLI MEDIKAL firma secimi dogru.
- [ ] Satis cekimi calisiyor.
- [ ] Urun/stok cekimi calisiyor.
- [ ] Masraf cekimi calisiyor.
- [ ] Fatura detay okuma hatalari gorunur.
- [ ] Onaylanan banka hareketi BizimHesap kuyruğuna giriyor.
- [ ] Worker islenen kaydi processed/failed olarak isaretliyor.

### Finans Komuta Merkezi Kontrolleri

- [x] Gelir tablosu solda, bilanço ve likidite özeti sağda gösteriliyor.
- [x] Bugün için Tahmini, Tahakkuk ve Ödenen / Tahsilat sütunları ayrı gösteriliyor.
- [x] Dönem matrisindeki satış/maliyet/kar hücreleri kaynak detayına inecek şekilde korunuyor.
- [ ] Planlanan, tahakkuk ve gerceklesen ayrimi gorunuyor.
- [ ] Banka onay bekleyen sayisi gercek kaynaktan geliyor.
- [ ] Gelir tablosu tutarlari kaynak belirtmeden kesin veri gibi sunulmuyor.
- [ ] Banka bakiyeleri son ekstreye gore tarih ve kaynakla gorunuyor.
- [ ] Kullanici onayi olmadan kesin kayit yapilmiyor.

### Ürün ve Cari Kontrolleri

- [ ] Urun karti satis, adet, ciro ve maliyet kaynagini gosteriyor.
- [ ] Kategori katsayisi ile hesaplanan maliyet kaynak notu tasiyor.
- [ ] Cari karti satis/tahakkuk ile tahsilat/acik bakiye ayrimini karistirmiyor.
- [ ] Eksik tahsilat veya bakiye kaynagi acikca isaretleniyor.
