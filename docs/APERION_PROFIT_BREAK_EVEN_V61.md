# AperiON v61 Profit and Break-even Intelligence

## Amaç

AperiON satışları sadece ciro olarak göstermeyecek.

Her satış için dinamik olarak şu sorular cevaplanacak:

- Satış başabaş noktasına ne kadar yaklaştırdı?
- Satılan malın maliyetinden sonra ne kadar brüt kâr bıraktı?
- Tahmini genel giderlerden sonra ne kadar net katkı bıraktı?
- Bu satış gerçekten para kazandırdı mı, sadece ciro mu yaptı?

## Ana kavramlar

### 1. Satış Tutarı

Faturadaki veya satış kaydındaki toplam satış bedeli.

```text
sales_amount
```

### 2. Satılan Malın Maliyeti

Ürünün gerçek alış maliyeti varsa gerçek maliyet kullanılacak.
Gerçek maliyet yoksa ortalama maliyet veya tahmini maliyet kullanılacak.

```text
cogs_amount
```

### 3. Brüt Kâr

```text
brut_kar = sales_amount - cogs_amount
```

### 4. Brüt Kâr Oranı

```text
brut_kar_orani = brut_kar / sales_amount
```

### 5. Tahmini Genel Gider Payı

Her satışa dönemsel giderlerden pay verilecek.
Bu oran yönetim panelinden ayarlanabilir olacak.

Örnek yöntemler:

- Ciro oranına göre gider payı
- Ürün kategorisine göre gider payı
- Sabit varsayılan gider oranı
- Dönem gerçekleşen giderlerine göre otomatik oran

```text
gider_payi = sales_amount * estimated_expense_rate
```

### 6. Net Katkı Kârı

```text
net_katki_kari = sales_amount - cogs_amount - gider_payi
```

veya

```text
net_katki_kari = brut_kar - gider_payi
```

### 7. Başabaş Noktası

Dönem içindeki sabit giderler / katkı marjı mantığı ile hesaplanacak.

```text
basabas_hedefi = fixed_expenses / contribution_margin_rate
```

### 8. Başabaşa Yaklaşma

```text
basabas_ilerleme = toplam_net_katki / basabas_hedefi
```

veya satış bazında:

```text
satisin_basabasa_katkisi = net_katki_kari / basabas_hedefi
```

## Ana ekranda gösterim

CEO Cockpit içinde yeni bölüm:

```text
Başabaş ve Kâr Zekâsı
```

Gösterilecek metrikler:

- Başabaş hedefi
- Başabaşa kalan tutar
- Başabaş ilerleme yüzdesi
- Bugünkü satışların başabaşa katkısı
- Brüt kâr
- Genel gider sonrası net katkı
- Eksik maliyetli satış sayısı

## Satış detayında gösterim

Her satış satırında:

```text
Satış tutarı
Satılan mal maliyeti
Brüt kâr
Brüt kâr oranı
Tahmini gider payı
Gider sonrası net katkı
Başabaşa katkı
Maliyet güveni
```

## Maliyet güveni

Her satışın yanında maliyet güven skoru olacak.

```text
Gerçek maliyet
Ortalama maliyet
Tahmini maliyet
Maliyet eksik
```

Kural:

- Gerçek maliyet varsa yeşil
- Ortalama maliyet varsa sarı
- Tahmini maliyet varsa turuncu
- Maliyet yoksa kırmızı

## CEO cümlesine etkisi

CEO durum cümlesi artık sadece satış/gider/kâr bakmayacak.
Başabaş ilerlemesini de okuyacak.

Örnek cümleler:

```text
Bugünkü satışlar başabaş hedefinin %34'ünü karşıladı. Net katkı pozitif.
```

```text
Ciro var ama gider sonrası katkı zayıf. Başabaş için hâlâ 420.000 TL gerekiyor.
```

```text
Satış güçlü ancak eksik maliyetli ürünler gerçek kârı gölgeliyor.
```

```text
Başabaş aşıldı. Bundan sonraki net katkı kârı büyütüyor.
```

## Veri kaynakları

Gerekli veri kaynakları:

- Satış/fatura satırları
- Ürün maliyetleri
- Alış faturaları
- Kategori bazlı maliyetler
- Dönemsel giderler
- Sabit giderler
- Tahmini gider oranları
- Eksik maliyet kayıtları

## Onay ve güvenlik

Bu hesaplama gösterim/analiz amaçlıdır.
Kesin muhasebe kaydı oluşturmaz.
Kesin kayıtlar Onay Merkezi sonrası oluşur.

## Dashboard adapter gereksinimi

AperionDashboardData içinde yeni fonksiyonlar:

```text
getBreakEvenSummary(period)
getSaleProfitRows(period)
getProfitConfidence(period)
```

## UI gereksinimi

Dashboard tarafında:

```text
Başabaş ve Kâr Zekâsı kartı
```

Detail tarafında satış detayına yeni sekmeler:

```text
Satış Kârı
Başabaş Katkısı
Eksik Maliyet
```

## Yapılanlar

- Her satış için brüt kâr, gider sonrası net katkı ve başabaşa katkı kuralı tanımlandı.
- CEO Cockpit için başabaş ilerleme mantığı eklendi.
- Eksik maliyetin kâr analizini bozacağı netleştirildi.

## Kalanlar

- Data adapter fonksiyonları
- Dashboard başabaş kartı
- Sales detail satış kârı sekmesi
- Supabase RPC/view tasarımı
- Eksik maliyet uyarı listesi
