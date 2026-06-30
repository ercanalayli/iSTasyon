# AperiON Next Task

Son guncelleme: 2026-06-30 Europe/Istanbul

## Aktif Tek Hedef

Yeni banka ekstrelerini Onay Merkezi'nden kontrollu sekilde BizimHesap kuyruÄŸuna almak.

Durum: Ilk BizimHesap kayit kaniti ve queue kapanisi tamamlandi. Yeni kontrolde Onay Merkezi'nde 25 bekleyen banka hareketi var; 18'i yuksek guvenli, 7'si inceleme istiyor. Hazir BizimHesap kuyrugu 0. Ana ekran toparlama, gelir tablosu komuta matrisi ve sabah onay karti tarih/karar gorunumu main tabanina alindi. Ek netlik katmaniyla banka/onay/gelir/is programi kartlari tek ekranda daha profesyonel ayrildi; 1920x1080 yerel kontrolde tasma giderildi. Sonraki onerilen dusuk riskli aday: VakifBank 2026-05-13, -34 TL, Banka/POS masrafi, guven %90, id `d4164166-5427-4f46-8f66-a84b43dddd0b`.

## Neden Bu Hedef?

Kullanici bankadan gelen hareketlerin analiz edilmis sekilde Onay Merkezi'ne dusmesini, tek tek onaylanmasini ve BizimHesap'a kontrollu islenmesini istiyor. Bir onceki kayit kanitlandi; siradaki hedef ayni guvenli akisi yeni kayitlarda tekrar etmek.

## Siradaki Is Paketi

1. Kullanici secili adayi onaylarsa `approve_pending_bank_movement` sadece bu id icin calistirilacak.
2. Olusan `bizimhesap_queue` dry-run ile okunacak.
3. BizimHesap formu once kaydetmeden doldurulup kanit alinacak.
4. Kullanici ikinci kez acikca onaylarsa canli save calistirilacak.
5. Sonra queue `processed` kaniti alinacak.
6. Canli ana ekran acilip tarih/karar kartlari ve gelir matrisi kullanici ekraninda kontrol edilecek.
7. Kullanici ekran onayi sonrasi siradaki banka adayi icin ayni guvenli Onay Merkezi -> BizimHesap kuyrugu akisi devam edecek.

## Kabul Kriteri

- Secilen hareketin kullanici tarafindan onaylandigi net: tamamlandi.
- Onay sonrasi `bizimhesap_queue` icinde hazir kayit gorulmelidir: tamamlandi.
- Worker dry-run planinda hesap/cari/kayit turu okunmalidir: tamamlandi.
- BizimHesap formu kaydetmeden doldurulmalidir: tamamlandi.
- Kesin canli kayit kullanici onayi olmadan yapilmamalidir: tamamlandi, kullanici onayi sonrasi tek id icin save calisti.
- Kuyruk kapanis fonksiyonu kurulu olmalidir: tamamlandi.
- Kayit olustu kaniti BizimHesap ekranindan alinmalidir: kullanici tarafindan dogrulandi.
- Mukerrer kayit engeli olmalidir: tamamlandi, manuel kanitli queue tekrar save yapmadan atlanir.
- Test sonucu tur sonunda raporlanmalidir: tamamlandi.

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
