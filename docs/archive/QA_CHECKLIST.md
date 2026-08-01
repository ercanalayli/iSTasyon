# AperiON QA Checklist

Son guncelleme: 2026-07-16 Europe/Istanbul

## 2026-07-16 Moka United POS aktarim ogrenmesi v124

- [x] Moka United anahtar kelimesi, POS aktarimi kuralina baglandi.
- [x] Gercek BizimHesap kaynak hesabi `*MOCA SONOVA POS KREDI KARTI` olarak sabitlendi.
- [x] 1 ve 2 Temmuz Is Bankasi adaylari kimlik bazli override ile Emanet sinifindan cikarildi.
- [ ] Plan yeniden uretildikten sonra iki adayda kaynak/hedef/tutar/tarih kanitinin kontrolu.
- [ ] Kullanici onayi ardindan BizimHesap'ta iki transferin kayit ve tekrar-okuma kaniti.

## 2026-07-16 Bugun satis, maliyet ve kar karari v121

- [x] Ana gelir modelinin varsayilan donemi `today` yapildi.
- [x] Satis, maliyet, brut kar, gider ve net sonuc ilk gorunen karar satirindadir.
- [x] Her karar karti mevcut ayrinti akimina tiklanabilir baglantidir.
- [x] Donem degistirme dugmeleri ayni yuzeydedir.
- [x] Inline JavaScript syntax ve `git diff --check` gecti.
- [ ] Canli kaynakta bugun tarihli satis satirinin saatlik klon sonrasi denetimi.

## 2026-07-16 Ana ekran donemsel gelir tablosu matrisi v120

- [x] Bugun, Dun, Bu Hafta, Bu Ay, Gecen Ay, Bu Yil ve Gecen Yil sutun gruplari olusturuldu.
- [x] Bugun grubu plan/tahakkuk/nakit; diger donemler tahakkuk/nakit olarak ayrildi.
- [x] Satis, maliyet, brut kar, gider ve net kar satirlari matriste ayridir.
- [x] Satis kategori tahakkuk tutari kategori -> urun -> kaynak kayit ekranina iner.
- [x] Kategoriyle kanitli eslesmeyen banka/POS nakdi kategori satirina dagitilmaz.
- [x] Inline JavaScript syntax ve `git diff --check` gecti.
- [ ] Masaustu ve mobil canli ekran goruntusuyle yerlesim onayi.
- [ ] Banka/POS nakit hareketlerinin cari/fatura/kategori kanitiyla eslenmesi.

## 2026-07-16 Ana sayfa finans onceligi v119

- [x] `index.html` acildiginda Gelir Tablosu ve Bilanco ilk finans yuzeyidir.
- [x] Finans yuzeyi, komuta alanlarindan once ve genislik onceligiyle gorunur.
- [x] Sekiz komuta alani korunur ve finans yuzeyinin ardinda tiklanabilir kalir.
- [ ] Masaustu ve mobil ekran goruntusuyle son yerlesim onayi.

## 2026-07-16 Tahsilat ve odeme kanal kirilimi v118

- [x] Tahsilat ve odeme ayni ekranda birbirinden ayri gorunur.
- [x] Nakit, kredi karti, cek ve diger kanallari iki akis icin de ayridir.
- [x] Donem secimi Bugun, Dun, Bu Hafta, Bu Ay, Gecen Ay, Bu Yil ve Gecen Yil icin kanal basliklarini birlikte degistirir.
- [x] Banka onay adayi sayisi kanal toplamina donusturulmez.
- [x] Her kanal ilgili detay ekranina tiklanabilir baglantidir.
- [ ] Canli tam nakit snapshot'i ile kanal tutarlarinin kaynak/tarih bazli mutabakati.

## 2026-07-16 Ana ekran gelir tablosu ve bilanco operasyon yuzeyi v117

- [x] Ust yarida Gelir Tablosu ve Bilanco birlikte gorunur.
- [x] Satis, maliyet, brut kar, gider, vergi ve net kar kalemleri ayridir.
- [x] Her finans kalemi ilgili detay/karar ekranina tiklanabilir baglantidir.
- [x] Satis tutari sadece mevcut kaynak ozetinden okunur.
- [x] Eksik maliyet, gider, vergi veya bilanço kaynagi sifir kabul edilmez.
- [ ] Canli clone snapshot ile tum kalemlerin ayni as-of tarihte mutabakati.
- [ ] Mobil ve masaustu gorunumunun tarayici ekran goruntusuyle onayi.

## 2026-07-16 Apsiyon aylik tahakkuk ve odeme defteri v116

- [x] Apsiyon `Tumunu Goster` kaynak kirilimindan aylik Aidat borc makbuzlari okundu.
- [x] Aidat belge tarihi, son odeme tarihi ve `4.500,00 TL` tutar her ay icin ayri kanitlandi.
- [x] Tahsilat satirlari borc satirlarindan ayri tutuldu.
- [x] Dogalgaz ve Aidat kaynaklari birbirine karistirilmadi.
- [x] Devir bakiyesi odeme/tahakkuk adayi sayilmadi.
- [x] Okuma dry-run olarak kaldi; Finans Takvimi ve BizimHesap'a yazim yapilmadi.

## 2026-07-16 Apsiyon kaynak bakiye ayrimi v115

- [x] Apsiyon kalici oturumuyla Batikent kisisel finans ekrani salt-okunur okundu.
- [x] Aidat ve Dogalgaz kaynak bakiyeleri ayri kategoriler olarak alindi.
- [x] Toplam bakiye aylik odeme/tahakkuk diye Finans Takvimi'ne yazilmadi.

## 2026-07-16 Kaynak banka tarihi duzeltmesi v114

- [x] Kaynak `transaction_date`, BizimHesap form tarihinden once ve sonra kontrol edildi.
- [x] Aynı iki mevcut Vakif Sirket kaydi ikinci hareket olusturulmadan duzeltildi.
- [x] POS tahsilati ve POS komisyonu hesap hareketleri listesinde `14.07.2026` olarak tekrar okundu.
- [x] Formdaki asenkron eski kayit riski test edilip bekleme kaniti eklendi.

## 2026-07-16 Apsiyon personal accrual intake v112

- [ ] `apsiyon_oturum_kur.cmd` opens a local browser profile without writing credentials to the repository.
- [ ] Authenticated Apsiyon Borclar/Tahakkuk page is detected and session status is local-only.
- [ ] `apsiyon_tahakkuk_oku.cmd` emits evidence-backed aidat and yakit candidates.
- [ ] Aidat preserves day 16; fuel due date comes only from source evidence.
- [ ] No candidate is marked paid before bank/dekont reconciliation.

## 2026-07-16 Ana Sayfa Gelir Tablosu ve Bilanco v111

- [x] Excel donem sirasi (Bugun -> Gecen Yil) gelir tablosu motorunda var.
- [x] Planlanan / tahakkuk / gerceklesen kolonlari ayridir.
- [x] Satis -> kategori -> urun -> kaynak kayit ayrintisi korunur.
- [x] Satilan Malin Maliyeti ayri tiklanabilir kategori/urun akisi olarak eklendi.
- [x] Banka/kasa toplami sadece bakiye alanli ekstre kaynaklarindan hesaplanir.
- [x] Stok, ticari alacak ve ticari borc kaynagi yoksa kesin bilanço tutari uydurulmaz.
- [ ] Canli Supabase kaynaklariyla donem ve drilldown arayuzu manuel kontrol edildi.

## Her Tur Zorunlu Kontrol

- [ ] Tek ana hedef belirlendi.
- [ ] Canli kayit gerekiyorsa kullanici onayi alindi.
- [ ] Demo/uydurma veri canli karar ekrani gibi sunulmadi.
- [ ] Firma izolasyonu kontrol edildi.
- [ ] Degisiklikten once ilgili dosyalar okundu.
- [ ] Test komutlari calistirildi veya neden calistirilamadigi yazildi.
- [ ] `PROJECT_STATUS.md` guncellendi.
- [ ] `NEXT_TASK.md` guncellendi.
- [ ] `CHANGELOG_APERION.md` guncellendi.
- [ ] Tur sonunda Yapilanlar / Kalanlar / Kontrol Ettiklerim / Commit / Guncellenen dosyalar raporlandi.

## 2026-07-15 Hattat Odeme Listesi Kontrolu

- [x] Hattat PDF'leri salt-okunur parse edildi.
- [x] Kaynak PDF veya ham vergi bilgisi GitHub Pages'e yazilmadi.
- [x] Her adayda kaynak dosya, source id, vade ve tutar var.
- [x] Odeme listesi "odendi" olarak yorumlanmadi.
- [ ] Canli Finans Takvimi importu ayrica onaylandi.
- [ ] Banka mutabakati kapanis kaniti ayri tutuldu.

## 2026-07-15 Sirket Banka Gecmis Mutabakati v109

- [x] VakifBank islem numarali XLS/XLSX kaynaklari tanindi.
- [x] ALAYLI MEDIKAL Is Bankasi hesap ozeti XLS kaynaklari tanindi.
- [x] Kisisel vadesiz hesap dosyalari sirket akisi disinda tutuldu.
- [x] Salt-okunur rapor 741 kaynak satir uzerinde uretildi.
- [x] Is Bankasi ayni referansli ana hareket/masraf satirlari ayri duplicate anahtarla korunuyor.
- [x] Is Bankasi giris ve cikis virmanlarinda kaynak/hedef yon testi gecti.
- [ ] Sifreli servis anahtariyla Supabase/BizimHesap kaniti cekildi.
- [ ] Islenmis ve eksik satirlar kaynak kanitiyla ayrildi.
- [ ] Herhangi bir eksik satir canli kayda aday yapilmadan once hesap ve kayit turu dogrulandi.

## Veri Guveni Kontrolleri

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

## BizimHesap Kontrolleri

- [ ] Login calisiyor.
- [ ] ALAYLI MEDIKAL firma secimi dogru.
- [ ] Satis cekimi calisiyor.
- [ ] Urun/stok cekimi calisiyor.
- [ ] Masraf cekimi calisiyor.
- [ ] Fatura detay okuma hatalari gorunur.
- [ ] Onaylanan banka hareketi BizimHesap kuyruğuna giriyor.
- [ ] Worker islenen kaydi processed/failed olarak isaretliyor.

## 2026-07-15 Canli VakifBank Kaniti

- [x] Kullanici onayi alindi: iki net VakifBank POS batch kaydi.
- [x] `2026009923018191` 46.540,00 TL transfer formu, hedef hesap, tarih ve tutar dogrulandi.
- [x] Transfer BizimHesap'ta kaydedildi; ilgili kuyruk `processed` durumunda.
- [x] `2026009923018202` 902,81 TL POS komisyonu kaydedildi.
- [x] Ilk masraf kaydindaki yanlis AKBANK SIRKET hesabi ayni satirda `*VAKIF SIRKET` olarak duzeltildi.
- [x] Masraf duzeltme basari ekrani ve son satir kaniti alindi.

## 2026-07-15 Belirsiz Gelen Para Kontrolu

- [x] BizimHesap `Hesaba Para Girisi` form alanlari kaydetmeden dogrulandi.
- [x] Son gun aday secimi yalnizca dogrulanmis banka hareketini aliyor.
- [x] Banka adi celiskisi ve reklam/duyuru adaylari otomatik kayda kapali.
- [x] Cari eslesmesi belirsiz gelen para, cari bakiyesine dokunmayan planla olusturuluyor.
- [ ] Canli Supabase `confirmed_counterparty` semasi uygulandi.
- [ ] Gunluk belirsiz para girisi kuyrugu canli olusturuldu.
- [ ] BizimHesap'ta canli kayit ve son satir kaniti alindi.

## Finans Komuta Merkezi Kontrolleri

- [x] Gelir tablosu solda, bilanço ve likidite özeti sağda gösteriliyor.
- [x] Bugün için Tahmini, Tahakkuk ve Ödenen / Tahsilat sütunları ayrı gösteriliyor.
- [x] Dönem matrisindeki satış/maliyet/kar hücreleri kaynak detayına inecek şekilde korunuyor.

- [ ] Planlanan, tahakkuk ve gerceklesen ayrimi gorunuyor.
- [ ] Banka onay bekleyen sayisi gercek kaynaktan geliyor.
- [ ] Gelir tablosu tutarlari kaynak belirtmeden kesin veri gibi sunulmuyor.
- [ ] Banka bakiyeleri son ekstreye gore tarih ve kaynakla gorunuyor.
- [ ] Kullanici onayi olmadan kesin kayit yapilmiyor.

## Urun ve Cari Kontrolleri

## Is Bankasi Ayrisma Kontrolleri v123

- [x] Kredi karti hesap ozeti e-postasi hareket adayindan dislanir.
- [x] `POS` kelimesi tek basina POS banka transferi sinifi vermez.
- [x] Hatali 2026 TL hesap ozeti adayi guvenli listeden cikti.
- [x] Gercek Is Bankasi para girisleri `Hesaba Para Girisi` planiyla ayrildi.
- [ ] Iki gercek girisin BizimHesap resmi satir kaniti alinacak.

- [ ] Urun karti satis, adet, ciro ve maliyet kaynagini gosteriyor.
- [ ] Kategori katsayisi ile hesaplanan maliyet kaynak notu tasiyor.
- [ ] Cari karti satis/tahakkuk ile tahsilat/acik bakiye ayrimini karistirmiyor.
- [ ] Eksik tahsilat veya bakiye kaynagi acikca isaretleniyor.

# Canonical publication checks

- [x] GitHub Pages and Cloudflare Pages endpoints checked separately.
- [x] Confirmed `aperion-istasyon.pages.dev` was unreachable from the current machine at audit time.
- [x] Confirmed no Cloudflare deployment workflow existed in the repository.
- [x] Added deploy workflow with a non-secret credential presence gate.
- [ ] Confirm a successful `Deploy AperiON Cloudflare Pages` run.
- [ ] Confirm canonical root returns the current `main` cockpit.
- [ ] Replace legacy GitHub Pages entry point only after canonical verification.
