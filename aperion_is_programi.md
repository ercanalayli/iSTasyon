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

## Sari - Kismen Bitti

- [ ] Ana ekran tek sayfa ust akil paneli
- [ ] Gelir tablosu: planlanan / tahakkuk / gerceklesen
- [ ] Satis ve urun karliligi ekrani
- [ ] Banka ekstre okuma ve Onay Merkezi'ne dusme
- [ ] Onay Merkezi analiz ekrani
- [ ] Kalici cache / isletme hafizasi: satis ve gelir modeli baglandi, diger agir sorgular sirada

## Kirmizi - Kaldi

- [ ] GitHub Actions BizimHesap senkronunun yeni secret/preflight ile canli yeniden test edilmesi
- [ ] Telegram gorsel / evrak akisi
- [ ] Sabit / sozlesmeli / ongorulen gelir-gider kartlarinin Supabase RPC ile tam canli kayit testi
- [ ] Kisisel ikinci beyin finans modulunun gercek banka/kredi karti ekstreleriyle canli testi
- [ ] Canli profesyonel yayin

## Aktif Siradaki Is

Main branch'e yeni commit push edilecek. Push sonrasi Supabase SQL install ve Hourly BizimHesap Sync workflow run sonuclari kontrol edilecek.
