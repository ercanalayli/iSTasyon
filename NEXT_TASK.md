# AperiON Next Task

Son guncelleme: 2026-07-01 Europe/Istanbul

## Aktif Tek Hedef

DealerStatement raporundan gelecek tahsilatlari Finans Takvimi / butce hattina guvenli baglamak.

Durum: `DealerStatement (3).xls` dosyasi okundu. Dosya `.xls` uzantili HTML tablo formatinda. `finance-calendar:dealer-statement` komutu 2026-07-01 itibariyla 705 satirdan 80 gelecek tahsilat cikardi ve toplam TL 657.666,43 plan uretti. 1 sifir satis tutarli kayit incelemeye ayrildi. `finance-calendar:dealer-statement:import:dry` calisti; canli Supabase insert yapilmadi. Ana Finans Takvimi paneli canli import sonrasi `Gelecek Tahsilat Butcesi` kartinda bu kayitlari gosterecek sekilde hazirlandi. Gmail otomasyonu `dealer-statement-receivables.yml` ile 10:20 ve 17:20 TR dry-run olarak hazirlandi. Canli insert icin `--commit --confirm ONAYLIYORUM` kilidi hazir.

## Neden Bu Hedef?

Kullanici bu sistem raporunu duzenli gondererek gelecek donem tahsilatlarini butceye eklemek istiyor. Bu veri nakit akisi, planlanan gelir, tahsil edilecekler ve ay bazli karar ekranlarini besleyecek.

## Siradaki Is Paketi

1. GitHub Actions `AperiON DealerStatement Receivables` workflow ilk run sonucu kontrol edilecek.
2. Uretilen artifact icindeki `dealer_statement_finance_calendar_plan.json` ve `dealer_statement_finance_calendar_import_proof.json` incelenecek.
3. Kullanici acik onay verirse `finance-calendar:dealer-statement:import -- --confirm ONAYLIYORUM` calistirilacak.
4. Ana ekranda `Gelecek Tahsilat Butcesi` kartinda toplam, siradaki tarih ve ay kirilimi gorulecek.
5. Ayni rapor tekrar geldiyse `Bayi Ekstre ID` ile mukerrer kayit olusmayacak.

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
