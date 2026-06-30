# AperiON Next Task

Son guncelleme: 2026-06-30 Europe/Istanbul

## Aktif Tek Hedef

Ana ekrani profesyonel tek ekran Ust Akil komuta paneline donusturmek.

Durum: v73/v75 ana ekran temizligi basladi. Banka paneli, gelir tablosu, sabah onay kartlari ve yol haritasi tek ekran gridine alindi. Gelir Tablosu Komuta Matrisi eklendi: bugun/dun/hafta/ay/gecen ay/yil/gecen yil kolonlari; satis kategorileri, maliyet, brut kar, gider, vergi ve net kar satirlari tiklanabilir. Sabah onay kartlarinda tarih `gg.aa.yyyy · ss:dd` formatina alindi; kaynak, banka, BizimHesap, cari, kategori ve guven bilgileri ayrildi. Degisiklikler `codex/b2b-api-delta` branch'ine push edildi. Akis testleri gecti; hazir BizimHesap kuyrugu 0.

## Neden Bu Hedef?

Kullanici sistemi sabah actiginda bankayi, onayi, gelir tablosunu, riskleri ve aksiyonu tek bakista anlamak istiyor. Mevcut ekran teknik olarak calisiyor ama profesyonel karar ekrani hissi zayif; bu yuzden once ana ekran odaklanacak.

## Siradaki Is Paketi

1. Matrisin ana ekrandaki gorsel boyutu son kez cilalanacak.
2. Banka kartlari: bakiye, son hareket, onay bekleyen, BizimHesap kuyrugu ve kayit kaniti tek yerde daha okunur hale gelecek.
3. Onay kartlari: canli veride tarih, banka, cari, kategori ve guven alanlari ekran goruntusuyle tekrar kontrol edilecek.
4. Gelir tablosu detay modalinda kategori -> urun -> hareket akisi gorsel olarak zenginlestirilecek.
5. Sonraki turda tasarim canliya alinmadan once ekran goruntusu ve smoke test tekrar edilecek.
6. Branch main'e alinacak veya GitHub Pages kaynagi guncellenecek; sonra kullanici canli ekranda kontrol edecek.

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
