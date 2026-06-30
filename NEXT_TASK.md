# AperiON Next Task

Son guncelleme: 2026-06-30 Europe/Istanbul

## Aktif Tek Hedef

Ana ekrani profesyonel tek ekran Ust Akil komuta paneline donusturmek.

Durum: v73/v75 ana ekran temizligi basladi. Banka paneli, gelir tablosu, sabah onay kartlari ve yol haritasi tek ekran gridine alindi. Ust uste binme yapan eski responsive kural icin yerlestirme ve tasma kilidi eklendi. Akis testleri gecti; hazir BizimHesap kuyrugu 0.

## Neden Bu Hedef?

Kullanici sistemi sabah actiginda bankayi, onayi, gelir tablosunu, riskleri ve aksiyonu tek bakista anlamak istiyor. Mevcut ekran teknik olarak calisiyor ama profesyonel karar ekrani hissi zayif; bu yuzden once ana ekran odaklanacak.

## Siradaki Is Paketi

1. Ana ekran bolum sirasi: Ust karar seridi, Banka/BizimHesap akisi, Gelir tablosu, Sabah onay kartlari.
2. Banka kartlari: bakiye, son hareket, onay bekleyen, BizimHesap kuyrugu ve kayit kaniti tek yerde.
3. Onay kartlari: cari, kategori, kayit turu, guven, mukerrer ve hedef BizimHesap hesabi gorunur.
4. Gelir tablosu: planlanan / tahakkuk / gerceklesen sonucu tek karar panelinde netlestirilecek.
5. Sonraki turda tasarim canliya alinmadan once ekran goruntusu ve smoke test tekrar edilecek.

## Kabul Kriteri

- Banka, gelir, onay ve aksiyon kartlari birbirinin ustune binmeyecek.
- Ana ekran ilk bakista tek is akisini anlatacak: banka geldi -> analiz edildi -> sen onaylarsin -> BizimHesap'a islenir.
- Demo/uydurma rakam karar ekrani gibi sunulmayacak.
- Hazir BizimHesap kuyrugu ve worker durumu gorunur olacak.
- Testler: `verify:bank-approval-action`, `verify:bizimhesap:queue`, `finance-smoke`, `bizimhesap:queue:dry`.

## Bekleyen Sonraki Hedefler

- Banka mail ekstre sistemi: Akbank, Garanti BBVA, Is Bankasi, VakifBank, Yapi Kredi formatlari.
- Onay Merkezi: her hareket icin cari/hesap/kategori/kayit turu/guven/mukerrer analizi.
- BizimHesap'a tek tik kayit: AperiON onayi -> gizli worker -> BizimHesap kaniti.
- Gelir tablosu: planlanan / tahakkuk / gerceklesen; bugun/dun/hafta/ay/yil filtreleri.
- Urun karliligi ve hasta bezi raporu: kategori ac/kapat, urun karti, isi haritasi, stok gunu, fiyat analizi.
- Telegram/mail evrak akisi: gorsel/PDF onay kartina dusmeli.
- Sabit/sozlesmeli/ongorulen gelir-gider ve kisisel ikinci beyin modulu.
- Cache/isletme hafizasi: agir sorgular yerine hazir ozet tablo/dosya.
