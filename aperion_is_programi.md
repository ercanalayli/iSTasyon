# AperiON Ana Is Programi

Bu liste her islemden sonra guncellenecek.

## Yesil - Bitti

- [x] BizimHesap kalici oturum / ALAYLI MEDIKAL firma secimi
- [x] Fatura detay okuma altyapisi
- [x] Gider karti + fatura detayi baglama altyapisi
- [x] Satis maliyet / kar katsayi motoru
- [x] Banka Onay Merkezi analiz kolonlari: hareket, tutar, karar, BizimHesap kayit plani, kontrol
- [x] Guvenli onay kilidi: kuyruk ID uretmeden "onaylandi" gibi gosterme engeli
- [x] Queue worker yapisal dogrulama: onay -> bizimhesap_queue -> worker -> processed/failed hatti
- [x] Supabase canli kontrol: pending_bank_movements, bizimhesap_queue ve approve/reject RPC var
- [x] GitHub Actions Mail Ekstre Pipeline canli basarili
- [x] BizimHesap GitHub secret preflight eklendi
- [x] BizimHesap secret preflight yerel env/Actions env ile dogrulandi
- [x] BizimHesap yerel senkron saglikli: satis, son islemler, masraf, urun/stok OK
- [x] Bugun/dun satis verisi kaynak kontrolu saglikli
- [x] BizimHesap GitHub workflow saatlik veri cekimi olarak korundu
- [x] 10:00 ve 17:00 Turkiye saati sabit kontrol mantigi ana ekranda/raporda hazirlandi
- [x] Bekleyen banka hareketleri icin BizimHesap kayit plani dry-run raporu
- [x] Mail ekstre banka aciklamalarinda Turkce karakter bozulmasi rapor ve ekranda onarildi
- [x] Banka Canli ekrani tarayicida dogrulandi: 120 satir, cari/kategori/guven/BizimHesap plani gorunuyor
- [x] Canli BizimHesap tek kayit testi: Akbank 09.06.2026 banka masrafi 0,80 TL kaydedildi
- [x] GitHub main branch canli push tamamlandi: 57cf13e
- [x] Supabase SQL install workflow main push ile otomatik calisacak sekilde baglandi
- [x] Planlanan / sozlesmeli / sabit / ongorulen isletme ve kisisel kart seed dosyasi eklendi
- [x] Gelir tablosu agir sorgu icin 5 dk sicak cache + 1 saat kalici cache eklendi
- [x] Hourly BizimHesap Sync workflow main push ile otomatik canli test calistiracak sekilde baglandi
- [x] Mail ekstre preflight raporuna BizimHesap kuyruk kapatma RPC kontrolu eklendi
- [x] Yeni main push kontrolu: Mail Ekstre Pipeline, Bot CI, Live Visual Control ve Pages basarili
- [x] Banka hareketi -> BizimHesap kayit plani ortak karar motoruna alindi; preview ve queue worker ayni motoru kullaniyor
- [x] Banka onay dry-run: 25 hareket analiz edildi, 19 yuksek guven, 6 inceleme gerekli; queue dry-run 1 hazir kayit plani uretildi
- [x] GitHub secret kilidi acildi: BIZIMHESAP_EMAIL/PASSWORD ve SUPABASE_DB_URL artik workflow tarafinda okunuyor
- [x] GitHub BizimHesap secret kontrolu gecti: BIZIMHESAP_EMAIL alaylimedikal@gmail.com ve password workflow tarafinda okunuyor
- [x] GitHub Hourly BizimHesap Sync kismi canli calisti: masraf_raw ve product_raw yenilendi
- [x] GitHub Hourly BizimHesap Sync canli run: satis_raw 899 kayit yazdi
- [x] GitHub Hourly BizimHesap Sync son run: product_raw 3211 kayit, satis_raw 900 kayit, son islemler 3 yeni kayit yazdi
- [x] GitHub Hourly BizimHesap Sync retry mekanizmasi canli logda calisti
- [x] GitHub Hourly BizimHesap Sync son run: satis_raw 903 kayit, masraf_raw 88 kayit yazdi
- [x] GitHub Actions icin BizimHesap kalici oturum cache'i eklendi: .bizimhesap-profile restore/save
- [x] GitHub Actions cache ilk run'da basariyla kaydedildi
- [x] BizimHesap senkron runner final tekrar eklendi: zorunlu is kalirsa isinmis oturumla sonda yeniden denenir
- [x] GitHub Actions Hourly BizimHesap Sync basarili: satis_raw 904 kayit, product_raw 3211 kayit, masraf_raw 88 kayit, son islemler OK
- [x] Verify sales today screen source basarili: Bugun/Dun/Hafta/Ay/Yil ve sales_raw static stress check OK

## Sari - Kismen Bitti

- [ ] Ana ekran tek sayfa ust akil paneli
- [ ] Gelir tablosu: planlanan / tahakkuk / gerceklesen
- [ ] Satis ve urun karliligi ekrani
- [ ] Banka ekstre okuma ve Onay Merkezi'ne dusme
- [ ] Onay Merkezi analiz ekrani: kayit plani ortak motorla gorunuyor, tek tik sonrasi kuyruk kapatma SQL canli kilidi bekliyor
- [ ] Kalici cache / isletme hafizasi: satis ve gelir modeli baglandi, diger agir sorgular sirada
- [ ] BizimHesap GitHub senkron akisi: masraf/stok basarili, satis/son islemler icin oturum isinma sirasi ve login retry eklendi
- [ ] Ana ekran / rapor tasarimi: tek sayfa ust akil kalite seviyesine tasinacak

## Kirmizi - Kaldi

- [ ] SUPABASE_DB_URL secret icindeki database password hatali: psql "password authentication failed for user postgres" verdi
- [ ] Telegram gorsel / evrak akisi
- [ ] Sabit / sozlesmeli / ongorulen gelir-gider kartlarinin Supabase RPC ile tam canli kayit testi
- [ ] Kisisel ikinci beyin finans modulunun gercek banka/kredi karti ekstreleriyle canli testi
- [ ] Canli profesyonel yayin

## Aktif Siradaki Is

Hourly BizimHesap Sync yesil. Siradaki kilit SUPABASE_DB_URL dogru database password ile guncellenince Supabase SQL Install yeniden calistirilacak; sonra Telegram/mail ekstre/onay merkezi akisi tamamlanacak.
