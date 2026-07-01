# AperiON Next Task

Son guncelleme: 2026-07-01 Europe/Istanbul

## Aktif Tek Hedef

Mail ekstre ve DealerStatement Gmail otomasyonlarini dogru rapor tipleriyle kullanilir hale getirmek.

Durum: Gmail OAuth yenilendi ve GitHub Actions tarafinda dogrulandi. Mail ekstre pipeline run `28525249930` basarili; 214 yeni banka hareketi `pending_bank_movements` onay kuyruguna yazildi. DealerStatement workflow'unda Gmail OAuth basarili ama bulunan ek beklenen gelecek tahsilat raporu degil; kolon eslesmesi `build_failed` verdi.

## Neden Bu Hedef?

Kullanici bu sistem raporunu duzenli gondererek gelecek donem tahsilatlarini butceye eklemek istiyor. Bu veri nakit akisi, planlanan gelir, tahsil edilecekler ve ay bazli karar ekranlarini besleyecek.

## Siradaki Is Paketi

1. Onay Merkezi ekraninda yeni gelen 214 banka hareketinin gorunurlugu kontrol edilecek.
2. Banka hareketleri icin BizimHesap hedef analizi ve tek tik kuyruga alma akisi tekrar dogrulanacak.
3. DealerStatement icin sadece dogru gelecek tahsilat raporunu ayiran mail/ek filtresi guclendirilecek.
4. Yanlis tibbi cihaz durum raporu gelirse workflow `wrong_attachment_type` gibi net sebep yazacak.
5. Dogru DealerStatement raporu gelince Finans Takvimi dry-run planinin uretildigi dogrulanacak.

## Kabul Kriteri

- Parser raporu bozmadan okumali: tamamlandi.
- Gelecek tahsilatlar tarih ve tutarla ayrilmali: tamamlandi.
- Cikti Finans Takvimi modeline uygun olmali: tamamlandi.
- Canli insert onaysiz yapilmamali: tamamlandi.
- Supabase insert sonrasi ana ekranda gorunurluk: UI hazir, canli insert onayi gerekli.
- Gmail otomasyonu canli insert yapmadan plan/dry-run kaniti uretmeli: tamamlandi.

Yeni aday kabul kriteri:

- Aday id net olacak.
- Hedef hesap/cari/kategori net olacak.
- Dusuk guven veya inceleme isteyen kayit otomatik alinmayacak.
- Kullanici onayi olmadan RPC veya BizimHesap save calismayacak.

## Bekleyen Sonraki Hedefler

- BizimHesap B2B API secretlarini ekle: `BIZIMHESAP_B2B_TOKEN`, `BIZIMHESAP_FIRM_ID`.
- BizimHesap uyelik ekraninda `Api Key(FirmID)` ve `Zirve Express Aktarim Api Key` bulundu; degerler koda yazilmadan GitHub secret/env olarak kullanilacak.
- BizimHesap'tan B2B token/API yetkisinin aktif olup olmadigi teyit edilmeli; Zirve Express anahtari GET endpointlerinde 401 verdi.
- Fatura/cari/urun/stok hattini B2B API'ye tasima planini cikar.
- Banka onay hareketlerinde her kaydin BizimHesap'a islenip islenmedigini kanitlayan durum kolonu.
- Finans Komuta Merkezi tek ekran karar akisi.
- Firma izolasyonu: Alayli verisi baska firmalara karismayacak garanti.
- Urun karti ve cari karti icin gercek kaynak eksiklerini kapatma.
- Telegram evrak/gorsel akisini Onay Merkezi'ne baglama.
