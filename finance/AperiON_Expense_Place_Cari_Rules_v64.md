# AperiON v64 - Gider Yeri ve Cari Kuralları

## Eksik tamamlandı

Banka hareketi gider ise sadece `gider` demek yeterli değildir.

Her gider hareketinde sistem şu iki alanı mutlaka önermelidir:

1. `gider_yeri` / `masraf_merkezi`
2. `cari` / `karşı_taraf`

## Zorunlu alanlar

Gider yönlü bir hareket kesin kayda geçmeden önce şu alanlar dolmalıdır:

- `bank_row_key`
- `bank_account_code`
- `movement_direction = cikis`
- `movement_type`
- `gider_yeri_id`
- `gider_yeri_adi`
- `counterparty_name`
- `counterparty_cari_id` veya `counterparty_cari_status`
- `confidence_score`
- `suggestion_reason`
- `approval_status = approved`

Cari bulunamazsa kayıt kesin kayda geçmez.

Durum `needs_review` kalır.

## Gider yeri örnekleri

- Banka Masrafları
- POS Komisyon Giderleri
- Vergi / SGK Ödemeleri
- Kredi Ödemeleri
- Tedarikçi Ödemeleri
- Araç / HGS / OGS Giderleri
- Kira / Sabit Ödemeler
- Personel / Maaş
- Moka United Eşleşme
- Virman / Bankalar Arası Aktarım
- Diğer / İnceleme Gerekli

## Cari kuralı

Banka hesabı cari değildir.

Örnek:

`Yapı Kredi Şirket` sadece banka hesabıdır.

Cari veya karşı taraf ayrıca önerilir.

## Sınıflandırma örnekleri

### HGS / OGS

Açıklamada `HGS`, `OGS`, `OTOYOL`, `KÖPRÜ` varsa:

- Hareket tipi: `gider`
- Gider yeri: `Araç / HGS / OGS Giderleri`
- Cari: açıklamada geçen kurum yoksa `Yapı Kredi HGS Talimatı` önerilir
- Güven puanı: 90

### Banka masrafı

Açıklamada `BSMV`, `EFT ÜCRETİ`, `FAST ÜCRETİ`, `ÜYE İŞYERİ ÜCRETİ` varsa:

- Hareket tipi: `banka_masrafi`
- Gider yeri: `Banka Masrafları`
- Cari: `Yapı Kredi Bankası`
- Güven puanı: 95

### SGK / Vergi

Açıklamada `SGK`, `GİB`, `VERGİ`, `TAHAKKUK` varsa:

- Hareket tipi: `vergi_sgk`
- Gider yeri: `Vergi / SGK Ödemeleri`
- Cari: `SGK` veya `Gelir İdaresi Başkanlığı`
- Güven puanı: 95

### Giden EFT / FAST

Açıklamada `GİDEN EFT`, `GİDEN FAST` varsa:

- Hareket tipi: `odeme` veya `virman`
- Gider yeri: sistem karşı tarafa göre önerir
- Cari: açıklamadaki karşı taraf adı
- Cari kart eşleşirse güven 90
- Cari kart bulunamazsa `needs_review`, güven 65

### Virman

Açıklamada `virman`, kendi şirket adı veya başka banka adı varsa:

- Hareket tipi: `virman`
- Gider yeri: `Virman / Bankalar Arası Aktarım`
- Cari: karşı banka veya iç hesap
- Kesin kayıt için karşı hesap seçilmelidir
- Güven puanı: 75

## Onay kartında görünmesi gerekenler

Her gider kartında şu bilgiler gözükmelidir:

- Banka satır ID
- Tarih ve saat
- Tutar
- Açıklama
- Banka hesabı
- Önerilen gider yeri
- Önerilen cari
- Önerilen hareket tipi
- Güven puanı
- Öneri sebebi
- Durum

## Ekran davranışı

Kart butonları:

- `Öneriyi Onayla`
- `Gider Yerini Değiştir`
- `Cariyi Değiştir`
- `Beklet`
- `Reddet`

## Patron kuralı

Kullanıcı gider yeri ve cariyi elle aramak zorunda kalmayacak.

AperiON önce öneri yapacak.

Kullanıcı sadece son kararı verecek.
