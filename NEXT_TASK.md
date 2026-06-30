# AperiON Next Task

Son guncelleme: 2026-06-29 Europe/Istanbul

## Aktif Tek Hedef

Yeni banka ekstrelerini Onay Merkezi'nden kontrollu sekilde BizimHesap kuyruğuna almak.

Durum: Ilk BizimHesap kayit kaniti ve queue kapanisi tamamlandi. Akbank 2026-06-09, -15,96 TL Banka/POS masrafi ve VakifBank 2026-05-13, -33,03 TL Banka/POS masrafi kullanici ikinci onaylariyla BizimHesap'a kaydedildi. `npm run bizimhesap:queue:dry` artik `queue_count: 0` gosteriyor. Onay Merkezi dili duzeltildi: kullanici AperiON icinde `AperiON’da Onayla` butonuyla kaydi queue'ya alir; queue olusunca `BizimHesap’a Islenecek / Worker sirada` durumu gorunur.

## Neden Bu Hedef?

Kullanici bankadan gelen hareketlerin analiz edilmis sekilde Onay Merkezi'ne dusmesini, tek tek onaylanmasini ve BizimHesap'a kontrollu islenmesini istiyor. Bir onceki kayit kanitlandi; siradaki hedef ayni guvenli akisi yeni kayitlarda tekrar etmek.

## Siradaki Is Paketi

1. Sonraki banka adayi yine `bank:approval:candidates` ile secilecek.
2. Kullanici onayi AperiON ekraninda `AperiON’da Onayla` butonuyla verilecek.
3. Queue olusan kayitlar worker tarafindan arka planda BizimHesap'a islenecek.
4. Dusuk guvenli veya cari belirsiz kayitlar inceleme listesinde kalacak.
5. Her canli kayit sonrasi dry-run `queue_count: 0` kontrolu yapilacak.

## Kabul Kriteri

- Secilen hareketin kullanici tarafindan onaylandigi net: tamamlandi.
- Onay sonrasi `bizimhesap_queue` icinde hazir kayit gorulmelidir: tamamlandi.
- Worker dry-run planinda hesap/cari/kayit turu okunmalidir: tamamlandi.
- BizimHesap formu kaydetmeden doldurulmalidir: tamamlandi.
- Kesin canli kayit kullanici onayi olmadan yapilmamalidir: tamamlandi, ikinci acik onay sonrasi tek queue icin save calisti.
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
