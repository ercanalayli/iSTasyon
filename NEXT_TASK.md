# AperiON Next Task

Son guncelleme: 2026-07-01 Europe/Istanbul

## Aktif Tek Hedef

Gmail OAuth yenilemesini GitHub Secrets uzerinden dogrulamak ve mail ekstre pipeline'ini yeniden calistirmak.

Durum: Yerel PowerShell GitHub repository secrets degerlerini okuyamadigi icin `gmail-oauth-start.js` yerelde `GOOGLE_CLIENT_ID ve GOOGLE_CLIENT_SECRET gerekli` hatasi verdi. `AperiON Gmail OAuth Refresh Helper` workflow'u kullanildi: start modu izin linki uretti, finish modu Google code ile yeni refresh token uretti. `GOOGLE_REFRESH_TOKEN` repository secret'i guncellendi. Siradaki net is: yenilenmis tokenla mail-ekstre workflow run sonucunu kontrol etmek.

## Neden Bu Hedef?

Kullanici bu sistem raporunu duzenli gondererek gelecek donem tahsilatlarini butceye eklemek istiyor. Bu veri nakit akisi, planlanan gelir, tahsil edilecekler ve ay bazli karar ekranlarini besleyecek.

## Siradaki Is Paketi

1. Yenilenmis `GOOGLE_REFRESH_TOKEN` ile `AperiON Mail Ekstre Pipeline` yeniden calistirilacak.
2. `Gmail OAuth token check` adiminin success dondugu dogrulanacak.
3. Dry-run sonucunda kac mail/ek/hesap hareketi okundugu raporlanacak.
4. SQL hazirsa ve dry-run rows > 0 ise live adiminin `pending_bank_movements` onay kuyruguna yazip yazmadigi kontrol edilecek.
5. DealerStatement workflow'u da ayni yenilenmis Gmail token ile tekrar kontrol edilecek.

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
