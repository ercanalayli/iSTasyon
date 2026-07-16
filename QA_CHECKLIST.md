# AperiON QA Checklist

Son guncelleme: 2026-07-16 Europe/Istanbul

## 2026-07-16 Apsiyon kaynak bakiye ayrimi v115

- [x] Apsiyon kalici oturumuyla Batikent kisisel finans ekrani salt-okunur okundu.
- [x] Aidat ve Dogalgaz kaynak bakiyeleri ayri kategoriler olarak alindi.
- [x] Vade olmayan toplam bakiyeler aylik odeme/tahakkuk diye Finans Takvimi'ne yazilmadi.

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

- [ ] Planlanan, tahakkuk ve gerceklesen ayrimi gorunuyor.
- [ ] Banka onay bekleyen sayisi gercek kaynaktan geliyor.
- [ ] Gelir tablosu tutarlari kaynak belirtmeden kesin veri gibi sunulmuyor.
- [ ] Banka bakiyeleri son ekstreye gore tarih ve kaynakla gorunuyor.
- [ ] Kullanici onayi olmadan kesin kayit yapilmiyor.

## Urun ve Cari Kontrolleri

- [ ] Urun karti satis, adet, ciro ve maliyet kaynagini gosteriyor.
- [ ] Kategori katsayisi ile hesaplanan maliyet kaynak notu tasiyor.
- [ ] Cari karti satis/tahakkuk ile tahsilat/acik bakiye ayrimini karistirmiyor.
- [ ] Eksik tahsilat veya bakiye kaynagi acikca isaretleniyor.

