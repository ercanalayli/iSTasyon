# AperiON ERP Ust Akil Kapsami

Son guncelleme: 2026-07-10

## Ana Karar

AperiON yalnizca banka hareketi isleyen bir bot degildir.

AperiON; BizimHesap, Gmail, Telegram, Drive/Excel/PDF, manuel kartlar ve harici kaynaklardan gelen veriyi okuyup isletme icin CFO/CEO gibi yorumlayan ust akil sistemidir.

## Ana Veri Alanlari

1. Para hareketleri
   - Banka, kasa, POS, Moka, kredi karti, cek, senet.
   - Tahsilat, odeme, virman, banka masrafi, vergi/SGK.

2. Satis
   - Bugun, dun, bu hafta, bu ay, gecen ay, bu yil, gecen yil.
   - Kategori, urun, cari, kanal ve temsilci kirilimlari.
   - Tahsilatla baglantili satis gercekligi.

3. Alis ve gider
   - Tedarikci faturasi, e-fatura, gider karti, sabit/degisken gider.
   - Sozlesmeli, sabit, ongorulen ve gerceklesen gider ayrimi.
   - Kisisel/sirket disi gider ayrimi.

4. Stok ve karlilik
   - FIFO maliyet, satilan malin maliyeti, brut kar, net kar.
   - Stok omru, kac gunluk stok kaldi, siparis onerisi.
   - Hasta bezi ve diger kritik kategori karar ekranlari.

5. Cari ve risk
   - Musteri/tedarikci bakiye, tahsilat riski, vade, gecikme.
   - Banka hareketi ile cari hareket mutabakati.
   - BizimHesap'ta olan ama AperiON'da olmayan, AperiON'da olan ama BizimHesap'ta olmayan hareketler.

6. Anomali ve kontrol
   - Ortalama ustu/altinda satis, alis, gider, tahsilat.
   - Mukerrer kayit, eksik cari, ters hareket, sahsi/sirket karisimi.
   - Firma izolasyonu ve veri guveni.

7. Hayat asistani
   - Kisisel faturalar, okul, arac, saglik, aile, kredi karti, takvim.
   - Sirket ve kisisel hareketlerin ayri izlenmesi.

## Karar Motorlari

- CFO Finans Motoru: nakit, tahakkuk, planlanan/gerceklesen, banka-kasa uyumu.
- CEO Satis Motoru: ne sattim, kime sattim, neden artti/azaldi.
- Alis/Gider Motoru: ne aldim, hangi tedarikci, hangi gider karti, sabit/degisken.
- Stok/FIFO Motoru: gercek maliyet, kar, stok omru, siparis ihtiyaci.
- Anomali Motoru: risk, sapma, mukerrer, eksik/eslesmeyen kayit.
- Hayat Asistani Motoru: kisisel finans, hatirlatici, belge ve gunluk plan.

## Uygulama Prensibi

AperiON gorur.
AperiON anlar.
AperiON kontrol eder.
AperiON onerir.
Kullanici onaylar.
AperiON isler.
AperiON raporlar.

## Mutlak Kurallar

- Onaysiz kesin BizimHesap kaydi yok.
- Demo veri canli karar gibi gosterilmez.
- Firma verisi karistirilmaz.
- Her kaydin kaynak, kanit, guven puani ve sonuc izi olur.
- Para hareketi, satis, alis, stok ve cari ayni ust akil ekranindan izlenir.
