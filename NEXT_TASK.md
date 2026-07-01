# AperiON Next Task

Son guncelleme: 2026-07-01 Europe/Istanbul

## Aktif Tek Hedef

Banka mail guncelligi ve eski bekleyen onay kartlarini net ayirmak.

Durum: Ramiz Yigit tahsilat kartinin yeni Temmuz maili degil, `2026-06-10` tarihli eski bekleyen banka hareketi oldugu dogrulandi. Ekran ve preview siralamasi `transaction_date` esasina alindi. Ana sayfadaki sabah onay kartlari son 7 gunluk hareketlerle sinirlandi; eski bekleyenler Banka Canli ekraninda `eski bekleyen` olarak kalacak. Mail ekstre workflow blokaji Gmail OAuth/refresh token kontrolu olarak Ust Akil ozetinde gorunecek.

## Neden Bu Hedef?

Kullanici bu sistem raporunu duzenli gondererek gelecek donem tahsilatlarini butceye eklemek istiyor. Bu veri nakit akisi, planlanan gelir, tahsil edilecekler ve ay bazli karar ekranlarini besleyecek.

## Siradaki Is Paketi

1. Kullanici `alaylimedikal@gmail.com` icin yeni Google refresh token uretecek ve GitHub secret `GOOGLE_REFRESH_TOKEN` olarak guncelleyecek.
2. `gmail:oauth:check`, mail-ekstre ve DealerStatement workflow run'lari tekrar kontrol edilecek.
3. Temmuz banka mailleri `pending_bank_movements` icine dustugunde ana sayfada yalnizca yeni hareketler gorunecek.
4. Eski Ramiz Yigit gibi kayitlar Banka Canli ekraninda onay/ret ile temizlenecek; dusuk guvenli cari tahsilat otomatik BizimHesap'a islenmeyecek.
5. Sonraki turda kullanici isterse DealerStatement canli import kilidi ayrica calistirilacak.

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
