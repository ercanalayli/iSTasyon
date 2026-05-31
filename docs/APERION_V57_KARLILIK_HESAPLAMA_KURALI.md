# AperiON v57 — Kârlılık Hesaplama Kuralı

Bu doküman, AperiON içinde kârlılığın iki ayrı yöntemle hesaplanacağını sabitler.

## Ana karar

AperiON’da kârlılık tek rakam olarak gösterilmeyecek. İki ayrı kârlılık hesabı birlikte izlenecek:

1. Ortalama kâr marjına göre tahmini kârlılık
2. Ürünlerin gerçek alış/satış kârına göre gerçek kârlılık

Bu iki hesap birbirine karıştırılmayacak.

---

## Kategori kaynağı için kritik kural

Kategoriler asla asistan tarafından tahmin edilmeyecek ve elle uydurulmayacak.

Kategori listesi yalnızca AperiON ürün/kategori ana kaynağından alınacak:

```text
Ürün kartları
Kategori ana listesi
BizimHesap/Stok export dosyaları
Kullanıcının onayladığı güncel kategori tablosu
```

Sistemde mevcut olmayan kategori isimleri kullanılmayacak.

Yanlış örnek:

```text
Asistanın kafadan kategori listesi çıkarması
```

Doğru yöntem:

```text
Önce gerçek kategori listesi çıkarılır
Sonra kullanıcıdan bu gerçek kategorilere ortalama kâr marjı istenir
```

---

## 1. Ortalama kâr marjına göre tahmini kârlılık

Bu yöntem, ürün bazında gerçek alış maliyeti eksik olduğunda veya hızlı yönetici ekranı gerektiğinde kullanılacaktır.

### Mantık

Satış tutarı üzerinden gerçek kategori listesinde tanımlı kategori, marka veya firma bazında onaylanmış ortalama kâr marjı uygulanır.

Örnek:

```text
Satış tutarı: 100.000 TL
Ortalama kâr marjı: %25
Tahmini brüt kâr: 25.000 TL
Tahmini maliyet: 75.000 TL
```

### Kullanılacağı yerler

- Yönetici ana sayfa hızlı kârlılık özeti
- Veri eksik olduğunda geçici kârlılık tahmini
- Kategori bazlı genel analiz
- Marka bazlı genel analiz
- Ürün alış fiyatı eksik olan satışlar

### Ekran etiketi

Bu yöntemle hesaplanan sonuçlar açıkça şu şekilde etiketlenecek:

```text
Tahmini Kârlılık
Ortalama Marja Göre
```

### Güvenlik kuralı

Bu hesap gerçek kâr gibi gösterilmeyecek. Mutlaka tahmini olduğu belirtilecek.

---

## 2. Ürünlerin gerçek kârına göre gerçek kârlılık

Bu yöntem, ürünün gerçek alış maliyeti veya maliyet kaydı varsa kullanılacaktır.

### Mantık

Her satış satırında gerçek satış fiyatı ile gerçek maliyet karşılaştırılır.

Formül:

```text
Gerçek Brüt Kâr = Net Satış Tutarı - Gerçek Ürün Maliyeti
Gerçek Kâr Oranı = Gerçek Brüt Kâr / Net Satış Tutarı
```

Örnek:

```text
Ürün satış tutarı: 10.000 TL
Ürün gerçek maliyeti: 7.200 TL
Gerçek brüt kâr: 2.800 TL
Gerçek kâr oranı: %28
```

### Kullanılacağı yerler

- Ürün kartı kârlılığı
- Fatura/satış satırı kârlılığı
- Stok maliyeti bilinen ürünler
- Gerçek satın alma fiyatı olan ürünler
- Onaylanmış alış fiyatı bulunan ürünler

### Ekran etiketi

Bu yöntemle hesaplanan sonuçlar açıkça şu şekilde etiketlenecek:

```text
Gerçek Kârlılık
Ürün Maliyetine Göre
```

---

## Kârlılık öncelik kuralı

Bir ürün/satış satırı için gerçek maliyet varsa gerçek kârlılık önceliklidir.

```text
Gerçek maliyet varsa → Gerçek Kârlılık
Gerçek maliyet yoksa → Ortalama Marja Göre Tahmini Kârlılık
```

Ama dashboard’da iki değer ayrı ayrı gösterilebilir:

```text
Tahmini kâr
Gerçek kâr
Veri güven seviyesi
```

---

## Ortalama marj isteme sırası

Kullanıcıdan kâr marjı istenirken asla varsayımsal kategori listesi sunulmayacak.

Doğru sıra:

1. AperiON’dan güncel kategori listesi alınır.
2. Her gerçek kategori için ortalama kâr marjı boş bırakılır.
3. Kullanıcı bu listeye yüzde girer.
4. Girilmeyen kategoriler için sistem kesin/tahmini kâr uydurmaz.
5. Gerekirse genel firma marjı ayrıca sorulur.

Örnek istenecek format:

```text
Kategori adı | Ortalama kâr marjı | Not
AperiON gerçek kategori 1 | %... | ...
AperiON gerçek kategori 2 | %... | ...
```

---

## Veri güven seviyesi

Kârlılık hesaplarında mutlaka veri güveni gösterilecek.

### Güven seviyesi önerisi

```text
Yüksek: Ürün gerçek maliyeti var
Orta: Gerçek kategori/marka ortalama marjı var
Düşük: Kullanıcının onayladığı genel firma marjı kullanıldı
Eksik: Satış, kategori veya maliyet verisi yetersiz
```

---

## Ekranlarda gösterim

Kârlılık ekranlarında şu ayrım net olacak:

| Alan | Açıklama |
|---|---|
| Tahmini Ciro Kârı | Ortalama marja göre hesap |
| Gerçek Ürün Kârı | Ürün maliyetine göre hesap |
| Kâr Farkı | Tahmini ve gerçek kâr arasındaki fark |
| Veri Güveni | Yüksek / Orta / Düşük / Eksik |
| Eksik Maliyetli Ürünler | Gerçek kâr hesaplanamayan ürünler |
| Marjı Eksik Kategoriler | Tahmini kâr hesaplanamayan gerçek kategoriler |

---

## Kritik uyarı

Ürün alış fiyatı veya maliyet kaydı yoksa sistem kesin kâr yazmayacak.

Kategori marjı da yoksa sistem tahmini kâr da yazmayacak.

Bunun yerine:

```text
Gerçek kâr hesaplanamadı
Kategori ortalama marjı eksik olduğu için tahmini kâr hesaplanamadı
```

şeklinde gösterecek.

---

## AperiON için uygulanacak modüller

Bu kural şu modüllere uygulanacak:

- Ana Sayfa Kontrol Paneli
- Satış Akışı
- Ürün Kârlılığı
- Cari Kartlar / müşteri kârlılığı
- Finans Merkezi
- Yönetici raporları
- Telegram günlük özetleri

---

## Yapılanlar

- Kârlılık iki yöntem olarak sabitlendi.
- Tahmini ve gerçek kâr ayrımı netleştirildi.
- Veri güven seviyesi zorunlu hale getirildi.
- Kategori isimlerinin asla tahmin edilmeyeceği eklendi.

## Kalanlar

- Gerçek kategori listesi AperiON ürün/stok ana kaynağından çıkarılacak.
- Kullanıcıdan gerçek kategori listesine göre ortalama marjlar alınacak.
- SQL/view tarafında tahmini ve gerçek kârlılık alanları ayrılacak.
- UI tarafında iki kârlılık ayrı kartlarda gösterilecek.
- Ürün maliyeti eksik olanlar ayrı kontrol listesine düşecek.
- Marjı eksik kategoriler ayrı kontrol listesine düşecek.
- Telegram raporunda tahmini/gerçek ayrımı yapılacak.
