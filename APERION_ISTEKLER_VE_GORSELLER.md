# AperiON - Kullanici Istekleri ve Gorsel Referanslari

Son guncelleme: 2026-07-03

Bu dosya, kullanicinin AperiON iSTasyon icin sohbette ilettigi ana istekleri, oncelikleri ve gorsel referanslari tek yerde toplar. Amac: islerin tekrar tekrar kaybolmamasi, ChatGPT/Codex turlari arasinda ayni hedefe devam edilmesi.

## Ana Vizyon

AperiON sadece muhasebe, cari, gelir tablosu veya otomasyon paneli degil.

AperiON kullanicinin isletmesi ve kisisel hayati icin:

- ust akil
- ikinci beyin
- veri orkestra merkezi
- onay ve karar sistemi
- guvenli otomasyon altyapisi

olarak calismali.

Ana prensip:

1. AperiON gorur.
2. AperiON anlar.
3. AperiON kontrol eder.
4. AperiON onerir.
5. Kullanici onaylar.
6. AperiON isler.
7. AperiON raporlar.

## Temel Kurallar

- BizimHesap kaynak sistemdir.
- AperiON ust akil / ikinci beyin sistemidir.
- Kullanici onayi olmadan kesin muhasebe kaydi yapilmaz.
- Demo veya uydurma veri canli karar ekrani gibi gosterilmez.
- ALAYLI Medikal aktif firma kabul edilir.
- Diger firmalar coklu firma mimarisine uygun ama pasif/izole tutulur.
- Her kayit kaynak, tarih, firma, ID ve islem durumuyla izlenebilir olmalidir.
- Banka, kasa, cari, tedarikci, urun ve BizimHesap hareketleri birebir koordine olmalidir.

## Oncelik Sirasi

1. Veri guveni
2. Finans Komuta Merkezi
3. Banka onay kuyrugu
4. BizimHesap tek tik kayit
5. Firma izolasyonu
6. Gunluk kullanilabilir surum
7. Profesyonel ana ekran tasarimi
8. Gelir tablosu ve nakit/tahakkuk/planlanan karar ekrani
9. Urun, stok, satis ve karlilik zekasi
10. Hasta bezi karar ekrani
11. Telegram / mail / gorsel evrak akisi
12. Kisisel ikinci beyin finans modulu

## Ana Ekran Isteği

Ana ekran tek bakista her seyi anlatmali. Asagi kayan karmasik ekran degil, mumkun oldugunca tek ekran karar merkezi olmali.

Ana ekranda olmasi istenen ana bloklar:

- Komuta Merkezi
- Banka Komuta Merkezi
- Banka onay bekleyen kayitlar
- BizimHesap'a gidecek kayit sayisi
- Planlanan net
- Tahakkuk net
- Gerceklesen/nakit net
- Gelir tablosu ozet matrisi
- Sabah onay kartlari
- Bugun ne yapmaliyim / aksiyon kuyrugu
- Senkron ve veri guveni durumu
- Mail ekstre ve Telegram evrak durumu

Ana ekranda istenen tasarim:

- Profesyonel operasyon dashboard'u gibi olmali.
- Retool, Geckoboard, Odoo gibi profesyonel is uygulamalarindan esinlenmeli.
- Kartlar birbirinden net ayrilmali.
- Renkler islevsel olmali: risk, onay, gelir, gider, banka, tahakkuk ayri okunmali.
- Hover uzerinde cerceve/parlama/odak etkisi olmali.
- Butonlar net, tiklanabilir, bos ve etkisiz gorunmemeli.
- Karma renk yiginindan kacinilmali.
- Yazi fontu, tablo sikligi ve kart bosluklari profesyonel olmali.

## Finans Komuta Merkezi

Ana ekranin en ust ve en onemli bolumu olacak.

Istenen uc finans mantigi:

1. Planlanan / Ongörülen
   - Sozlesmeli gelirler
   - Sabit gelirler
   - Sozlesmeli giderler
   - Sabit giderler
   - Beklenen gelir/gider

2. Tahakkuk
   - Fatura kesilmis gelir
   - Gider olusmus ama odenmemis gider
   - Tahakkuk ayi
   - Odeme/tahsilat durumu ayri

3. Gerceklesen / Nakit
   - Tahsil edilen gelir
   - Odenen gider
   - Banka/kasa/Moka/POS hareketleri

Ana kartlar:

- Bugun Gelir Tablosu
- Dun Gelir Tablosu
- Bu Hafta Gelir Tablosu
- Bu Ay Gelir Tablosu
- Gecen Ay Gelir Tablosu
- Bu Yil Gelir Tablosu
- Gecen Yil Gelir Tablosu

Her tarih filtresi su uc gorunumde calismali:

- Planlanan
- Tahakkuk
- Gerceklesen

Ana gelir/gider tablo yapisi:

- Satislar
- Satis kategorileri
- Satilan malin maliyeti
- Brut kar
- Sabit giderler
- Degisken giderler
- Vergi
- Net kar
- Tahsil edilen
- Tahsil edilecek
- Odenen
- Odenecek
- Nakit farki
- Tahakkuk farki

Kullanicinin Excel benzeri istedigi zaman kolonlari:

- Bugun
- Dun
- Bu Hafta
- Bu Ay
- Gecen Ay
- Bu Yil
- Gecen Yil

Bugun kolonunda ayrica:

- Tahmini
- Tahakkuk
- Odenen / Tahsilat

olacak.

## Banka Sistemi ve Onay Merkezi

En acil islerden biri.

Istenen akış:

1. Bankalardan mail gelir.
2. AperiON maili okur.
3. PDF/XLS/HTML ekstre veya mail govdesinden hareketleri cikarir.
4. Mukkerrer kayitlari suzer.
5. Her kayda benzersiz ID verir.
6. Hangi bankadan, hangi hesaptan, hangi tarihten geldigini gosterir.
7. Cari/karsi taraf/kategori/tahsilat/odeme/masraf/virman analizi yapar.
8. Guven puani verir.
9. Emin olmadiklarini Onay Merkezi'ne dusurur.
10. Kullanici tek tikla onaylar veya siler/reddeder.
11. Onaylanan kayit BizimHesap kuyruguna girer.
12. Bot BizimHesap'a kaydeder.
13. Kaydin BizimHesap'a islenip islenmedigi geri kontrol edilir.

Bankalar:

- Akbank
- Garanti BBVA
- Is Bankasi
- VakifBank
- Yapi Kredi
- Halkbank
- Moka/POS hareketleri

Banka ekraninda gorunmesi gerekenler:

- Banka adi
- Hesap
- Tarih/saat
- Aciklama
- Borc
- Alacak
- Bakiye
- Cari
- Kategori
- Kayit turu
- Guven puani
- Mukkerrer durumu
- BizimHesap kuyruk durumu
- BizimHesap kayit sonucu
- En son hangi hareket ID'sine kadar okundu

Kritik istek:

> Ben bankaya girdigimde hesap hareketlerini bankadaki gibi gormeliyim ve kayitlar nereye gitmis gormeliyim.

## BizimHesap Entegrasyonu

Istenenler:

- BizimHesap kalici oturum calismali.
- Guncel giris sistemi ve firma secimi desteklenmeli.
- Firma seciminde alttaki `ALAYLI MEDIKAL` secilmeli.
- Gormeli sistem degilse B2B API kullanilabilir ama banka/kasa endpointi yoksa Puppeteer worker korunacak.
- Tek tik onaydan sonra BizimHesap'a kayit yapilmali.
- Kayit yapildiktan sonra kayit tekrar yapilmasin diye kanit/lock tutulmali.
- BizimHesap'ta olup AperiON'da olmayan, AperiON'da olup BizimHesap'ta olmayan hareketler karsilastirilmali.

Kritik not:

- Kullanici acik onay vermeden canli BizimHesap kaydi yapilmayacak.
- Ancak kullanici "BizimHesap'a kaydetmeyi onayliyorum" dediginde secili kayit icin ilerlenmeli.

## Mail Ekstre ve Gmail

Kullanici dogru mail hesabini belirtti:

- Dogru hesap: `alaylimedikal@gmail.com`
- Yanlis/karistirilmamasi gereken hesap: `alkammaliyonetim@gmail.com`

Istenen:

- Her sabah ve her aksam banka ekstreleri maile gelecek.
- AperiON bu mailleri otomatik okuyacak.
- Eski tarihli ekstre gelirse daha once kaydedilmis hareketleri suzecek.
- Yeni hareketleri Onay Merkezi'ne dusurecek.
- Mailden gelen kayitlarda hangi maile/eke/harekete ait oldugu izlenebilir olacak.

Saat istekleri:

- Sabah sabit kontrol: 08:05 yerine 10:00
- Aksam sabit kontrol: 19:05 yerine 17:00

## Telegram / Gorsel Evrak Akisi

Istenen:

- Telegram'dan gonderilen banka ekran goruntuleri AperiON Onay Merkezi'ne dusmeli.
- Gorseldeki tarih, tutar, bakiye, islem tipi, banka, aciklama OCR/parser ile okunmali.
- Tek tikla onaylaninca BizimHesap'a kayit yapilmali.
- Telegram ile kullaniciya sabah/aksam ozet ve kritik bildirim gitmeli.

Gorsel ornegi:

- IsCep hesap hareketleri ekran goruntusu
- Tarih: 26/05/2026
- FAST/POS hareketleri
- Tutar ve bakiye kolonlari
- Bu formatta gelen goruntu Onay Merkezi'ne dusmeli.

## Satis / Urun / Karlilik Sistemi

Istenen:

- Satislar bugun, dun, bu hafta, bu ay, gecen ay, bu yil, gecen yil karsilastirmali gorunmeli.
- Kategoriye tiklaninca kategori acilsin.
- Urune tiklaninca dinamik urun karti acilsin.
- Urun kartinda:
  - satis kayitlari
  - stok
  - kalan gun
  - karlilik
  - alis/satis fiyatlari
  - satis trendi
  - pazar/rakip fiyat bilgisi
  - siparis onerisi
  - fiyat degistirme onerisi
  - anomali/risk uyarisi

Tablolarda:

- Sutun basligina tiklayinca siralama yapilmali.
- Arama kutusu olmali.
- A-Z, buyukten kucuge, kucukten buyuge siralama olmali.
- Kategori icine girilebilmeli veya sag panelde acilmali.

## Satilan Malin Maliyeti / Kar Katsayilari

Kullanici tarafindan verilen kategori katsayilari:

- Hasta bezi: 1,35
- Distribütör ve toptan hasta bezi: 1,16
- Ortopedi tekstil: 1,8
- Medikal sonda: 1,35
- Ortopedi yürümeye yardimci: 1,7
- Medikal sarf: 1,5
- Kolostomi: 1,20
- Kiralik: 0 maliyet
- Medikal solunum: 1,6
- Medikal islak mendil / vucut temizleme: 1,6
- Medikal elektronik: 1,6
- Medikal karyola: 1,5
- Medikal tekerlekli sandalye: 1,5
- Medikal akulu: 1,5

Kural:

- Urunun uzerine kar koyuyoruz.
- Satilan malin maliyeti bu katsayilarla hesaplanacak.
- Kategoriye girmeyen olursa sistem kar oranini soracak.

## Hasta Bezi Karar Ekrani

Kullanici APERION HASTA BEZI EKRAN.xlsx dosyasini referans verdi.

Istenen:

- Ana ekranda az yer kaplayacak bir hasta bezi ozet karti olsun.
- Tiklayinca tam rapor acilsin.
- Ana ekranda:
  - toplam hasta bezi adet
  - toplam hasta bezi ciro
  - belbantli / kulotlu / serme-yatak koruyucu / mesane gibi ana gruplar
  - adet ve ciro
  - perakende ve distributor/toptan ayrimi

Tam raporda:

- Bugun
- Dun
- Bu Hafta
- Bu Ay
- Onceki Ay
- Bu Yil
- Onceki Yil
- TL
- Adet
- Ortalama TL
- Ortalama %
- Kar TL
- Stok
- Kalan stok gunu
- Ortalama satisa gore kac zamanlik stok kaldi

Gorsel istekleri:

- Hucrenin uzerine gelince bilgi penceresi acilsin.
- Renklendirilmis sablon olsun.
- Isi haritasi olsun.
- Ortalama uzeri TL/adet alarm rengiyle gorunsun.
- Ortalama alti veya hic satmayan urunler uyari versin.
- Ana kategoriler acilip kapanabilsin.
- Urun tiklanabilir olsun.
- Tek ekran mantigina yakin, gereksiz kaydirma az olsun.

## Fiyat Listesi ve Piyasa Botu

Istenen:

- Firmalarin fiyat listeleri okunacak.
- Kullanicinin belirledigi internet siteleri analiz edilecek.
- Alis ve satis fiyatlari dinamik, dengeli ve guncel tutulacak.
- Rakip/piyasa fiyatlari urun kartinda gorulecek.
- Fiyat degisikligi onerileri verilecek.
- Dusuk marj, pahali alis, rekabet riski ve stok riski uyarilacak.

## Fatura Detay Okuma ve Gider Kartlari

Istenen:

- BizimHesap'tan gelen e-faturalar, alis faturalar, gider faturalar ve cari hareket icindeki faturalar acilip okunacak.
- Masraf ozetiyle karar verilmeyecek; fatura detayi acilmadan gider karti kesinlesmeyecek.
- Fatura detayindan:
  - fatura tipi
  - fatura no
  - fatura tarihi
  - vade tarihi
  - cari unvan
  - vergi no
  - aciklama
  - mal/hizmet kalemleri
  - miktar
  - birim fiyat
  - KDV orani
  - KDV tutari
  - ara toplam
  - genel toplam
  - odeme durumu
  - cari acik/kapali durumu
  - PDF/XML belge yolu

Fatura detayina gore gider karti olusacak veya mevcut gider kartina baglanacak.

## Sabit / Sozlesmeli / Ongörülen Gelir-Gider Kartlari

Istenen:

- Sozlesmeli gelir
- Sabit gelir
- Sozlesmeli gider
- Sabit gider
- Ongörülen gelir/gider
- Baslangic tarihi
- Bitis tarihi
- Tutar
- Firma/kisi
- Sorumluluk/yaptirim
- Aciklama

Isletme icin ornek sabit/ongorulebilir giderler:

- kira
- elektrik
- su
- isinma
- yemek
- personel
- maas
- akaryakit
- market
- kargo
- banka masrafi
- iletisim
- vergi
- SGK

## Kisisel Ikinci Beyin Finans

Sistem sadece isletme degil, kisisel hayata da ust akil olacak.

Kisisel takip edilecekler:

- telefon faturasi
- su faturasi
- elektrik
- dogalgaz/isinma
- cocuk okul ucreti
- maas
- kredi karti ekstresi
- arac sigortasi
- kira
- market
- aile/kisisel odemeler
- sozlesmeli veya tahmin edilebilir yukumlulukler

Isletme gideri olmayan okul, hayir, kurban, zekat gibi kayitlar otomatik isletme gideri olmayacak; Onay Merkezi / kisisel-aile kontrolune dusecek.

## Veri Hafizasi / Cache / Agir Sorgu Sorunu

Kullanici agir veri sorgularindan rahatsiz.

Istenen:

- Her seferinde agir sorgu calismasin.
- Isletme hafizasi/cache katmani olsun.
- Sorgu sonucu snapshot olarak saklansin.
- Ana ekran hizli acilsin.
- Arka planda veri yenilenince ekran guncellensin.
- Gunluk/haftalik/aylik ozetler tekrar hesaplanmadan okunabilsin.

## Veri Guveni ve RLS

Istenen:

- Supabase tarafinda veriler firma bazli izole olsun.
- Anon role finansal yazma yapamasin.
- Onay RPC'leri girişi olmayan kullaniciya acik kalmasin.
- Dashboard okuma yapar; kesin yazma bot/edge/service role ile olur.
- Cookie/secrets koda gomulmez.
- BizimHesap cookie DB/secret yapisinda korunur.

Bu is icin repo dosyasi:

- `supabase_security_hardening_v77.sql`
- `tools/verify_supabase_security_hardening_v77.cjs`

## Gorsel Referanslar

Aşağıdaki gorseller sohbette referans olarak paylasildi. Bunlar tasarim ve akis gereksinimi icin kaynak kabul edilecek.

### AperiON mevcut ekranlar

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-6aeeb14f-31c4-4bfe-af5c-bef4825f7f0c.png`
  - Banka Komuta Merkezi / BizimHesap kayıt paneli.
  - Kullanicinin yorumu: Bu sekilde olmamali; kayitlar BizimHesap'a onayla islenmeli.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-d6131a78-0a76-477e-aa64-aa752a95c11a.png`
  - Finans Operasyonu tablo ekranı.
  - Kullanicinin yorumu: BizimHesap'a kaydet tusu calismiyor; hangi cariye nasil kayit edecegi analiz gorunmuyor.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-cc9c304a-5053-44c9-a935-db5fbfa65017.png`
  - BizimHesap'a kaydet butonu ve onay bekleyen liste.
  - Eksik: analiz, cari, hesap, kategori, kayit sonucu kaniti.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-d4540f97-6595-4d6a-8ed1-f96fe11840b4.png`
  - Canli ekranin cok kotu/karmasik gorundugu referans.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-9b9585a0-f43a-4399-808f-18affc96c493.png`
  - Komuta Merkezi ve Banka paneli.
  - Kullanicinin yorumu: Profesyonel degil, tasarim toparlanmali.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-0146dfca-9454-4d7d-b7ee-aeda9b94f57e.png`
  - Ana ekran altindaki tarih/kart duzeni.
  - Not: tarih/toparlama sorunu.

### Banka / Telegram / Onay gorselleri

- `C:/Users/HP/Downloads/WhatsApp Image 2026-05-26 at 11.12.26.jpeg`
  - IsCep hesap hareketi ekran goruntusu.
  - Telegram/gorsel evrak akisi icin OCR/parser referansi.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-48761ce8-00e1-4dfa-b1ce-91b9a2aa82f6.png`
  - Mobil onay merkezi ornegi.
  - Kartlarda mail ekstre, tarih, tutar, ID, grup ID, bakiye, ONAYLA/SIL butonlari.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-a75f3d1c-806d-41cd-9285-0c30df329086.png`
  - Sabah onay karti: Ramiz Yigit tahsilat.
  - Kullanicinin istegi: Bu islem BizimHesap'a islenmis mi kontrol edilmeli.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-d9cb084e-d590-414f-9e9c-496307471bfe.png`
  - BizimHesap'a Kaydet butonlari calismiyor referansi.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-20000903-5ca3-4165-aa2f-42fafbeb72f1.png`
  - Gmail banka mailleri: VakifBank, Is Bankasi, Yapi Kredi, e-ekstre.
  - Cok bankali mail akisi icin kaynak.

### Gelir tablosu / karar matrisi gorselleri

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-ef935a8a-b0b5-4dd3-aaa7-bf90708b9002.png`
  - Excel benzeri ana gelir tablosu iskeleti.
  - Satis kategorileri, SMM, brut kar, giderler, vergi, net kar; bugun/dun/bu hafta/bu ay/gecen ay/bu yil/gecen yil kolonlari.

- Ekran goruntusu: "Gelir Tablosu" karti.
  - Gelir tahakkuklari, gider tahakkuklari, gelen odeme, odenen, brut kar, net kar.
  - Tutar tiklaninca kategori ve urun kayitlari acilacak.

### Hasta bezi / satis analizi gorselleri

- `C:/Users/HP/Desktop/APERİON HASTA BEZİ EKRAN.xlsx`
  - Hasta bezi karar ekrani icin Excel referansi.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-619f31d5-d5bd-496a-93ba-81882a48a138.png`
  - Satis analiz tablo fikri.
  - Kategori/urun secimi, bugun ciro, bu hafta, bu ay, kritik stok, hedef gerceklesme.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-1ab9d100-e2a0-40be-b822-c730825beb5e.png`
  - Satis analiz / isi haritasi / stok / trend tablo referansi.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-5f365183-8fdc-475e-b5c3-50f04e377709.png`
  - Kanal filtresi: Tum kanallar, Perakende, Dist-Toptan, Recete.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-10156a44-778b-4e53-a4c7-5d013f63fd2e.png`
  - Yillik kolonlar ve trend grafigi olan satis tablosu.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-999afa42-ef41-4be2-84cc-785258a3e168.png`
  - Donem kolon sirasi:
    - Bugun
    - Dun
    - Bu Hafta
    - Bu Ay
    - Onceki Ay
    - Bu Yil
    - Onceki Yil

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-af375566-028d-4d7c-8081-3bbadcfe05ff.png`
  - Donem / Adet / TL / Ort. / Yorum tablosu.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-77a05ff9-4365-4cd7-8184-b470350642ca.png`
  - Hasta Bezi Karar Ekrani, filtreli versiyon.
  - Kullanici bunu iyi buldu ama ana ekranda ozet, iceri girince detay istedi.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-928a0a5b-96a8-495e-8a33-c41e18d5bbb7.png`
  - Hasta bezi Excel matrisi.
  - Belbantli, kulotlu, serme-yatak koruyucu, mesane gibi temsili ana kategoriler.

### Profesyonel dashboard tasarim referanslari

- Retool site ekranlari
  - Kullanici sadece renk degil, operasyonel data app mantigi istiyor.

- Geckoboard site ekranlari
  - Canli veri, paylasilan dashboard, KPI kartlari ve data visualization referansi.

- Odoo accounting sayfasi
  - Font, renk, muhasebe uygulamasi sadeligi, menu/kategori duzeni icin referans.

### BizimHesap gorselleri

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-4289fa9d-5946-46ae-b47f-8296d7038a51.png`
  - Yeni BizimHesap giris ekrani.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-d6233d45-f13b-4fc7-a0f5-f3be8470b4e7.png`
  - Firma secim ekrani.
  - Alttaki `ALAYLI MEDIKAL` secilecek.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-9e8a2ce1-17c0-4dc9-9e26-b2a613fb69e8.png`
  - BizimHesap API key / uyelik bilgileri ekrani.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-d77d5d03-2052-4470-b5e6-e743c7081565.png`
  - BizimHesap API dokumani maili.

- `C:/Users/HP/Desktop/BizimHesap_B2B_API_New.pdf`
  - BizimHesap B2B API dokumani.

- `C:/Users/HP/AppData/Local/Temp/codex-clipboard-31d48f6a-24e5-42a2-a6b3-d547dd492f3f.png`
  - BizimHesap uyelik/API bilgileri.

### Mimari gorseller

- `C:/Users/HP/Downloads/aperion_tam_mimari.png`
  - Katmanli AperiON mimarisi:
    - Veri kaynaklari
    - Veri orkestrasyon katmani
    - Analiz motoru
    - Ust Akil Paneli
    - Satis & Tahsilat
    - Finans Operasyonu
    - Urun & Stok Zekasi
    - Cok sirket katmani

- `C:/Users/HP/Downloads/aperion_ekran_haritasi.html`
  - Ekran haritasi referansi.

## Tamamlanan / Kismen / Kalan Ozet

### Bitti / Temel Omurga Var

- Koordineli calisma protokolu dosyalari.
- GitHub Pages production kaynak karari.
- Banka onay status snapshot workflow.
- Gmail OAuth yenileme yardimcisi.
- Mail ekstre pipeline ilk calisan omurga.
- Banka aday analiz ve guven puani ilk katman.
- BizimHesap queue worker guard/dry-run/save kilitleri.
- Bir kaydin BizimHesap'a manuel/gercek islenme kaniti ve tekrar kayit kilidi.
- Supabase security hardening dosyasi ve verify scripti.

### Kismen Bitti

- Ana ekran Ust Akil Paneli.
- Banka Komuta Merkezi.
- Gelir tablosu plan/tahakkuk/nakit modeli.
- Satis/urun karlilik ekrani.
- Hasta bezi karar ekrani preview.
- DealerStatement gelecek tahsilat planlayici.
- BizimHesap B2B API arastirmasi.
- Fatura detay okuma altyapisi.
- Gider karti + fatura baglama altyapisi.
- Cache/isletme hafizasi fikri.

### Kalan / Kritik

- Supabase hardening SQL'nin canliya kontrollu uygulanmasi.
- Hardening sonrasi mail ekstre/onay/BizimHesap queue testleri.
- Onay Merkezi'nin tam production guven seviyesi.
- Tek tik BizimHesap kaydin UI'da kusursuz kanitlanmasi.
- Banka/kasa/cari/BizimHesap birebir esgudum.
- Profesyonel ana ekran tasarimi.
- Gelir tablosu karar matrisi tam uygulama.
- Hasta bezi karar ekrani ana urune entegre.
- Urun karti ve cari karti tam dinamik hale getirme.
- Telegram/gorsel evrak akisi production.
- Kisisel ikinci beyin finans modulu.
- Fiyat listesi + internet piyasa botu.
- Tum moduller icin firma izolasyonu ve veri guveni son testi.
