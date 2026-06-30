# AperiON Next Task

Son guncelleme: 2026-06-30 Europe/Istanbul

## Aktif Tek Hedef

DealerStatement raporundan gelecek tahsilatlari Finans Takvimi / butce hattina guvenli baglamak.

Durum: `DealerStatement (3).xls` dosyasi okundu. Dosya `.xls` uzantili HTML tablo formatinda. Yeni `finance-calendar:dealer-statement` komutu 705 satirdan 83 gelecek tahsilat cikardi ve toplam TL 681.416,43 plan uretti. Kaynak anahtar `Bayi Ekstre ID`; hedef finans takvimi modeli `receivable / in / forecast`. Canli Supabase insert yapilmadi.

## Neden Bu Hedef?

Kullanici bu sistem raporunu duzenli gondererek gelecek donem tahsilatlarini butceye eklemek istiyor. Bu veri nakit akisi, planlanan gelir, tahsil edilecekler ve ay bazli karar ekranlarini besleyecek.

## Siradaki Is Paketi

1. Uretilen `data/dealer_statement_finance_calendar_plan.json` plan dosyasi incelenecek.
2. `sql_preview` icindeki `not exists` mukerrer kilidi Supabase `finance_calendar_items` icin canliya alinacak.
3. Finans Takvimi ve ana ekran Planlanan/Gerceklesen tahsilat kartlarinda bu kayitlar gorunecek.
4. Ayni rapor tekrar geldiyse `Bayi Ekstre ID` ile mukerrer kayit olusmayacak.
5. Mail/Drive otomasyonunda DealerStatement eki gelince bu parser calisacak.

## Kabul Kriteri

- Parser raporu bozmadan okumali: tamamlandi.
- Gelecek tahsilatlar tarih ve tutarla ayrilmali: tamamlandi.
- Cikti Finans Takvimi modeline uygun olmali: tamamlandi.
- Canli insert onaysiz yapilmamali: tamamlandi.
- Supabase insert sonrasi ana ekranda gorunurluk: bekliyor.

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
