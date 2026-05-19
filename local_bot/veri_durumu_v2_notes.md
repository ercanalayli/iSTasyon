# Veri Durumu Kontrol Mantığı v2

Amaç: Telefonda tek bakışta sistem sağlığını göstermek.

## Kontrol Sırası

1. BizimHesap Klonu son senkron zamanı
2. Son satış kayıt zamanı
3. Bugün işlem sayısı
4. Dün işlem sayısı
5. Son satış tarihi

## Karar Mantığı

- 75 dakikadan yeni veri: Güncel
- 75-180 dakika arası: Kontrol gerekli
- 180 dakikadan eski veri: Veri eski
- Klon status failed: Klon hata
- Bugün işlem 0: Bugün satış yok uyarısı

## Canlı Ekran

Canlı ekran: `/veri-durumu.html`

Kartlar:

- Klon Senkronu
- Bugün Satış
- Dün Satış
- Son Satış Tarihi

Detay satırında Yorum alanı bu karar mantığına göre güçlendirilecek.
