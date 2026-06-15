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

## Sari - Kismen Bitti

- [ ] Ana ekran tek sayfa ust akil paneli
- [ ] Gelir tablosu: planlanan / tahakkuk / gerceklesen
- [ ] Satis ve urun karliligi ekrani
- [ ] Banka ekstre okuma ve Onay Merkezi'ne dusme
- [ ] Onay Merkezi analiz ekrani
- [ ] Kalici cache / isletme hafizasi
- [ ] Supabase queue processed RPC SQL'i canliya uygulanacak; sonra islenen kuyruk satiri processed isaretlenecek

## Kirmizi - Kaldi

- [ ] GitHub Actions BizimHesap senkronunun yeni secret/preflight ile canli yeniden test edilmesi
- [ ] Telegram gorsel / evrak akisi
- [ ] Sabit / sozlesmeli / ongorulen gelir-gider kartlari
- [ ] Kisisel ikinci beyin finans modulu
- [ ] Canli profesyonel yayin

## Aktif Siradaki Is

GitHub'a secili kod/SQL/workflow degisiklikleri push edilecek. Ardindan Supabase SQL kurulumu calistirilip BizimHesap queue satirlari processed olarak kilitlenecek; boylece kaydedilen hareket tekrar islenmeyecek.
