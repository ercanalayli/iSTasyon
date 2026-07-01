# AperiON Next Task

Son guncelleme: 2026-07-01 Europe/Istanbul

## Aktif Tek Hedef

Gmail OAuth yenilemesini GitHub Secrets uzerinden tamamlamak.

Durum: Yerel PowerShell GitHub repository secrets degerlerini okuyamadigi icin `gmail-oauth-start.js` yerelde `GOOGLE_CLIENT_ID ve GOOGLE_CLIENT_SECRET gerekli` hatasi verdi. Yeni `AperiON Gmail OAuth Refresh Helper` workflow'u bu sorunu asar: start modu GitHub secrets ile izin linki uretir, finish modu Google code ile yeni refresh token uretir. Kullanici sadece uretilen token'i `GOOGLE_REFRESH_TOKEN` secret'ina guncelleyecek.

## Neden Bu Hedef?

Kullanici bu sistem raporunu duzenli gondererek gelecek donem tahsilatlarini butceye eklemek istiyor. Bu veri nakit akisi, planlanan gelir, tahsil edilecekler ve ay bazli karar ekranlarini besleyecek.

## Siradaki Is Paketi

1. GitHub Actions icinde `AperiON Gmail OAuth Refresh Helper` workflow'u `mode=start` ile calistirilacak.
2. Logdaki `GMAIL_OAUTH_URL_BEGIN/END` arasindaki link acilacak ve sadece `alaylimedikal@gmail.com` ile izin verilecek.
3. Google'in verdigi code ile ayni workflow `mode=finish` calistirilacak.
4. Logdaki `GOOGLE_REFRESH_TOKEN_BEGIN/END` arasindaki token GitHub repository secret `GOOGLE_REFRESH_TOKEN` olarak guncellenecek.
5. `gmail:oauth:check`, mail-ekstre ve DealerStatement workflow run'lari tekrar kontrol edilecek.

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
