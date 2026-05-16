# AperiON Fiyat Zekası Planı v44

## Amaç
Telegram'dan atılan fiyat listeleri, tedarikçi alış fiyatları, son alış fiyatları ve internet pazar araştırması tek üründe birleşecek.

Hedef cümle:

```text
Bu ürünün olması gereken satış fiyatı şudur.
```

Bunu yaparken sistem sadece fiyat göstermeyecek; sebebini de gösterecek:

- Son alış fiyatı
- Son tedarikçi fiyatı
- Önceki alış fiyatı
- Fiyat değişim oranı
- Ortalama alış maliyeti
- Mevcut satış fiyatı
- İnternet piyasa fiyatı
- Kâr marjı hedefi
- Gider payı
- Moka/POS komisyon etkisi
- Önerilen satış fiyatı
- Risk/uyarı

---

## 1. Veri kaynakları

### A) Telegram fiyat listeleri
Kullanıcı Telegram'dan PDF, Excel, resim veya metin atacak.

Sistem bunları önce ham veri olarak saklayacak:

- Dosya adı
- Gönderen
- Tarih
- Tedarikçi adı
- Ürün adı
- Ürün kodu
- Liste fiyatı
- Para birimi
- KDV dahil/hariç bilgisi
- İskonto varsa iskonto oranı
- Geçerlilik tarihi
- Not

### B) BizimHesap alış kayıtları
BizimHesap'tan geçmiş alışlar çekilecek.

Üründe gösterilecek:

- Son alış tarihi
- Son alış tedarikçisi
- Son alış fiyatı
- Son 3 alış ortalaması
- Son 12 ay alış ortalaması
- En düşük / en yüksek alış

### C) Stok ve satış verisi
Ürünün satışı ve stok hızı hesaba katılacak.

- Mevcut stok
- Son 12 ay satış adedi
- Kaç aylık stok kaldı
- Ortalama satış fiyatı
- Son satış fiyatı

### D) İnternet pazar araştırması
Her ürün için pazar fiyatı araştırması yapılacak.

Kaynak tipi:

- Google arama sonuçları
- Ürün sağlayıcı siteleri
- Pazaryerleri
- Rakip medikal siteleri
- Fiyat karşılaştırma sonuçları

Not: İnternet fiyatları canlı ve değişken olduğu için tarih/saat ile saklanacak.

---

## 2. Üründe görünecek fiyat alanları

Ürün kartında şu alanlar olacak:

| Alan | Anlam |
|---|---|
| Son alış fiyatı | BizimHesap alıştan gelen son gerçek alış |
| Son tedarikçi fiyatı | Telegram fiyat listelerinden gelen son liste fiyatı |
| Önceki tedarikçi fiyatı | Bir önceki listedeki fiyat |
| Fiyat değişimi | Son liste / önceki liste farkı |
| Ortalama alış fiyatı | Son 3 veya son 12 ay ortalaması |
| İnternet piyasa fiyatı | Web araştırmasından gelen ortalama/min/max |
| Mevcut satış fiyatı | BizimHesap satıştan gelen son satış |
| Önerilen satış fiyatı | Sistem hesaplar |
| Minimum satış fiyatı | Zarar etmeme fiyatı |
| Hedef satış fiyatı | Hedef marja göre fiyat |
| Risk | fiyat düşük / yüksek / stok yavaş / maliyet arttı |

---

## 3. Önerilen satış fiyatı formülü

Temel mantık:

```text
Taban maliyet = max(son alış fiyatı, son tedarikçi fiyatı, ortalama alış fiyatı)
```

Sonra:

```text
Minimum satış fiyatı = taban maliyet + ürün gider payı + POS/Moka komisyonu + navlun payı
```

Hedef fiyat:

```text
Hedef satış fiyatı = minimum satış fiyatı / (1 - hedef kâr marjı)
```

Pazar kontrolü:

```text
Eğer hedef satış fiyatı internet piyasa ortalamasından çok yüksekse:
  pazar uyarısı ver

Eğer mevcut satış fiyatı minimum satış fiyatının altındaysa:
  zarar riski ver

Eğer son tedarikçi fiyatı son alıştan çok yüksekse:
  maliyet artış uyarısı ver
```

---

## 4. Fiyat öneri seviyeleri

Sistem tek fiyat yerine 3 fiyat gösterecek:

| Fiyat | Kullanım |
|---|---|
| Minimum fiyat | Zarar etmeme fiyatı |
| Önerilen fiyat | Normal satış fiyatı |
| Agresif fiyat | Pazar fiyatına yakın rekabetçi fiyat |

---

## 5. Telegram akışı

Kullanıcı fiyat listesi atınca:

```text
Telegram dosya geldi
→ ham dosya kaydedildi
→ ürünler çıkarıldı
→ ürün eşleştirme yapıldı
→ emin olunanlar otomatik eşleşti
→ emin olunmayanlar onaya düştü
→ son tedarikçi fiyatı güncellendi
→ ürün kartında fiyat zekası güncellendi
```

Telegram komutları:

```text
/fiyat ürün adı
/liste_yukle
/fiyat_onay
/pazar ürün adı
/onerilen_fiyat ürün adı
```

---

## 6. Onay merkezi

Emin olunmayan ürün eşleşmeleri onaya düşecek.

Örnek:

```text
Tedarikçi listesi: Coverdry Külot Large
AperiON ürünü: Coverdry Külot L
Güven: 86
Öneri: eşleştirilsin mi?
```

Aksiyonlar:

- Eşleştir
- Yeni ürün aç
- Reddet
- Düzenle

---

## 7. İnternet pazar araştırması

Pazar araştırması manuel/yarı otomatik çalışacak.

Aşamalar:

1. Ürün adı normalize edilir.
2. Marka, beden, paket/adet, model ayrılır.
3. Web arama yapılır.
4. Bulunan fiyatlar ham olarak saklanır.
5. Uç değerler dışlanır.
6. Min / max / ortalama / medyan hesaplanır.
7. Tarih/saat ile ürün kartına yazılır.

Önemli:
İnternet araştırması güncel veri gerektirir. Her araştırma tarih/saat ile saklanmalı, eski sonuçlar otomatik kesin kabul edilmemeli.

---

## 8. Ana ürün kartı görünümü

Ürün kartında fiyat zekası alanı:

```text
Son Alış: 350 TL | Tedarikçi: X Medikal | Tarih: 15.05.2026
Son Tedarikçi Liste: 380 TL | Kaynak: Telegram PDF | Tarih: 16.05.2026
Piyasa: 420 - 520 TL | Ortalama: 465 TL | Araştırma: bugün
Mevcut Satış: 500 TL
Minimum Fiyat: 430 TL
Önerilen Fiyat: 520 TL
Durum: Satış fiyatı uygun / maliyet artışı izlenmeli
```

---

## 9. Uygulama sırası

1. SQL tabloları: supplier_price_lists, supplier_price_items, product_price_intelligence, market_price_research
2. Telegram fiyat listesi alma planı
3. Ürün eşleştirme helper
4. Fiyat öneri hesap motoru
5. Ürün kartına fiyat zekası bölümü
6. Web pazar araştırması modülü
7. Telegram komutları: /fiyat, /pazar, /onerilen_fiyat
8. Onay merkezi bağlantısı
