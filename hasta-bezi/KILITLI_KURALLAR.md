# ALAYLI Hasta Bezi Dashboard - Kilitli Kurallar

Bu dosya operasyon kurallarıdır. Kullanıcı açıkça "değiştir" veya "sil" demeden bu kurallar değiştirilemez.

## 1. Geriye gitmeme kuralı
- Yapılan hiçbir geliştirme geri alınmayacak.
- Bir ekran, kolon, hesaplama, veri kaynağı veya görünüm kaldırılmadan önce kullanıcıdan açık onay alınacak.
- Kullanıcı sadece format sorarsa, mevcut kural değiştirilmeden önce "kuralı değiştireyim mi?" diye sorulacak.

## 2. Sürüm rozeti kuralı
- Sağ üst rozet metni "Güncelleme No:" yazmayacak.
- Rozet "🆚" ile başlayacak.
- Format: `🆚 HHMMYYDDMM`
- Örnek: `1134260807` = 11:34 / 2026 / 08 / 07.
- Örnek: `0920260907` = 09:20 / 2026 / 09 / 07.
- Kullanıcı sadece `0920` derse otomatik format değiştirilmeyecek; önce sorulacak.

## 3. Veri eksiltmeme kuralı
- Kullanıcıdan alınan alış raporu, satış raporu, fiyat listesi veya PDF verileri silinmeyecek.
- Yeni veri eklenirken eski veri korunacak.
- Eksik bağlanan veri varsa "tamamlandı" denmeyecek.

## 4. FIFO / satışlar durumu
- ALIŞ RAPORU (5) ve SATIŞ RAPORU (24) üzerinden ürün-hareket-FIFO motoru hesaplandı.
- 1.882 ürün, 38.258 hareket, 34.869 satış/FIFO satırı ve 20.250 kontrol/uyarı satırı henüz canlı dashboard veri paketi olarak tamamen bağlanmadı.
- Bu iş bitmeden dashboard tam FIFO canlı sistemi tamamlanmış sayılmayacak.

## 5. Hesaplama kuralları
- Kâr KDV hariç hesaplanır.
- Net Kâr = Satış KDV Hariç - FIFO Maliyet - Nakliye.
- Kâr Marjı = Kâr / Satış KDV Hariç.
- Kâr Oranı = Kâr / FIFO Maliyet.
- Fatura + sevk tarihi olmadan sipariş kapanmaz.
- Serme = Yatak Koruyucu Örtü.
- Bel Bantlı = Bağlama.
