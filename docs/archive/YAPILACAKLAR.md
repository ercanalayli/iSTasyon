# AperiON Is Listesi

## Istenenler

- BizimHesap verileriyle calisan genis vizyonlu ERP radar sistemi.
- Satis, cari, stok, finans, banka ve gider verilerinin tek ekranda izlenmesi.
- Satis raporlarinda bugun, dun, bu hafta, bu ay, gecen ay, bu yil ve gecen yil karsilastirmalari.
- Urun ve cari bazli dinamik yonetim raporlari.
- Kategoriye gore ayrilmis, kategoriye tiklaninca detayina girilebilen satis analizi.
- Urun bazinda adet, ciro, son fiyat ve ortalama fiyat takibi.
- BizimHesap'ta urun adi/kategorisi degisince AperiON raporlarinin da guncellenmesi.
- Secilen urunlerin satis ozetinin telefona bildirim olarak gelmesi.
- 2024, 2025, 2026 ve gecmis yillar icin karsilastirmali raporlar.
- Gider raporlari.
- Banka ekstresi hareketlerinin onayli sekilde BizimHesap'a islenmesi.
- Bilinmeyen banka hareketlerinde risk alinmamasi, kullaniciya sorulmasi ve sistemin ogrenmesi.
- Birden fazla telefona secilebilir bildirim.
- BizimHesap'i otomatik gezip menuleri, formlari, alanlari ve kaydetme akisini ogrenmesi.
- Telegram'dan yazilan notlari tarih/saat ile alip yapilacak, odenecek, tahsil edilecek olarak ayirmak ve zamaninda hatirlatmak.
- AperiON icinde urun siparis yonetimi kurmak.

## Yapilanlar

- Satis analizi ekrani yonetim raporu formatina cevrildi.
- Urun dinamik raporu eklendi.
- Cari dinamik raporu eklendi.
- Kategori performans kartlari eklendi.
- Kategoriye tiklayarak detay raporuna girme eklendi.
- Bugun, bu ay, gecen ay, bu yil ve gecen yil metrikleri eklendi.
- Urunlerde son fiyat, ortalama fiyat ve gecen yil ortalamasi eklendi.
- Renkler ve okunabilirlik duzenlendi.
- Bozuk karakter/yazi sorunlari duzeltildi.
- Her guncellemede gorunen GNC kodu eklendi.
- Secilen urun bildirim raporu eklendi.
- Satis Analizi > Urun Eslestir eklendi.
- Eski urun adi -> yeni urun adi + kategori eslestirmesi eklendi.
- Kategorisiz kayitlar, ayni urunun kategorili hali varsa raporda otomatik toparlanacak hale getirildi.
- Banka hareketleri icin Supabase tablo SQL'i hazirlandi.
- Banka onay web ekrani hazirlandi.
- Banka onay bildirim botu hazirlandi.
- Onaylanmis banka hareketlerini BizimHesap formuna dolduran banka botu hazirlandi.
- BizimHesap otomatik ogrenme botu hazirlandi.
- Eksik gun veri yazma hatasi giderildi.
- Son 7 gun eksik veri kontrolu test edildi.
- 25.04, 29.04 ve 30.04 eksik satis verileri tekrar cekildi.
- Otomatik veri cekimi icin 09:10, 12:30 ve 18:30 Windows gorevleri kuruldu.
- Bot calistirici dosyasi eklendi.
- Telegram not/hatirlatma botu eklendi.
- Telegram hatirlatma botu icin Windows acilis zamanlayici kurulumu hazirlandi.

## Yapilacaklar - Oncelik Sirasi

1. Banka hareketleri sistemini canli repo ve komutlarla stabil hale getirmek.
2. Banka onay ekranini telefondan kullanilabilir hale getirmek.
3. Onaylanan banka hareketini BizimHesap'a once form dolduracak, sonra kontrollu kaydedecek hale getirmek.
4. Bilinmeyen banka hareketlerini soran ve ogrenme kurali olusturan akisi tamamlamak.
5. Banka ekstresi yukleme/parcalama ekranini AperiON icine almak.
6. Urun eslestirmelerini Supabase'e tasimak; tarayiciya bagli kalmasini bitirmek.
7. BizimHesap urun/kategori guncelleme botunu kurmak.
8. Gider raporlarini genisletmek.
9. 2024, 2025, 2026 ve gecmis yil karsilastirmali yonetim raporunu genisletmek.
10. Bildirim ayarlarinda hangi raporun hangi telefona gidecegini secilebilir yapmak.
11. Acilista calisan gorevi yonetici izinli kurulumla eklemek.
12. Telegram not/hatirlatma SQL'ini Supabase'de calistirip zamanlayiciyi aktif etmek.
13. Urun siparis yonetimini tasarlamak: talep, stok kontrol, tedarikci, durum, teslim.

## BizimHesap Ogrenilecek Akislar

- Giris ve firma secimi.
- Nakit Yonetimi > Hesaplar > banka hesabi secimi.
- Bankaya para girisi formu.
- Hesaplar arasi transfer formu.
- Nakit Yonetimi > Masraflar > Yeni Masraf Gir formu.
- Masraf kalemi: Mali Giderler > Banka Masrafi.
- Musteriler > cari arama > cari karti.
- Cari kartindan Tahsilat/Odeme formu.
- Kasa/Banka hesap secimi.
- Tutar, tarih, aciklama ve odeme durumu alanlari.
- Kaydetme sonrasi basari/hata isaretleri.
