# AperiON Next Task

Son guncelleme: 2026-07-02 Europe/Istanbul

## Aktif Tek Hedef

Mail ekstre Onay Merkezi kayitlarini temiz metin, guvenli analiz ve BizimHesap kuyrugu kanitiyla kullanilir hale getirmek.

Durum: Gmail OAuth yenilendi ve GitHub Actions tarafinda dogrulandi. Mail ekstre pipeline run `28525249930` basarili; 214 yeni banka hareketi `pending_bank_movements` onay kuyruguna yazildi. 2026-07-02 kontrolunde `bank:approval:preview` 25 ornek kayit icinde 2 guvenli aday, 23 inceleme isteyen hareket gosterdi. Bozuk karakterli banka aciklamalari temizlendi; `ACIKL`, `HESAP SUBE`, `IBAN`, `KART NO`, `ATM NO`, `Akilli Asistan` ve `Anlik Odeme Bilgilendirmesi` gibi teknik basliklar cari kabul edilmiyor. BizimHesap gunluk finans/hareket ozetleri banka hareketi gibi parser'dan gecmiyor. Yeni banka bildirimlerinde `Gonderen/Alici/Karsi Taraf` alanlari `suggested_counterparty` olarak yakalaniyor. `bizimhesap:queue:dry` 0 hazir kuyruk gosteriyor; yani kayitlar kullanici onayi verilene kadar BizimHesap'a gitmiyor.

## Neden Bu Hedef?

Kullanici bu sistem raporunu duzenli gondererek gelecek donem tahsilatlarini butceye eklemek istiyor. Bu veri nakit akisi, planlanan gelir, tahsil edilecekler ve ay bazli karar ekranlarini besleyecek.

## Siradaki Is Paketi

1. Yeni mail-ekstre pipeline run'i sonrasi `suggested_counterparty` alaninin gercek banka maillerinde doldugu kontrol edilecek.
2. Onay Merkezi ekraninda yuksek guvenli banka hareketlerinin hedef hesap/cari/kategori kutulari kontrol edilecek.
3. Kullanici secimli tek bir guvenli banka hareketi `approve_pending_bank_movement` ile kuyruga alinacak.
4. `bizimhesap:queue:dry` ile kuyruk plani kanitlanacak.
5. Kullanici ayrica onay verirse `bizimhesap:queue:form` veya `bizimhesap:queue:save` calistirilacak.
6. DealerStatement icin sadece dogru gelecek tahsilat raporunu ayiran mail/ek filtresi sonraki turda guclendirilecek.

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
