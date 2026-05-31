# AperiON v63 - Finans Onay Merkezi Akıllı Sınıflandırma Kuralları

## Ana karar

AperiON bundan sonra banka hareketlerini sadece listeleyen bir ekran olmayacak.

AperiON CFO gibi düşünecek:

- Hareketi anlayacak.
- Karşı tarafı tahmin edecek.
- Cari önerisi yapacak.
- Gelir / gider / virman / POS / SGK / banka masrafı ayrımını yapacak.
- Güven puanı verecek.
- Emin değilse kesin kayda geçirmeyecek.
- Kullanıcı sadece son kararı verecek.

## Kesin kural

Onay olmadan ledger kaydı oluşmaz.

Her kayıt önce pending havuza düşer.

## Yapı Kredi şirket hesabı

Yapı Kredi şirket hesabı cari değildir.

Banka hesabıdır:

`YAPI_KREDI_SIRKET`

Karşı taraf ayrı belirlenir.

## Yapı Kredi işlem ID standardı

Banka satırındaki tarih ve saat ana gruptur.

Örnek:

`26/05/2026 09:27:53`

Grup ID:

`26052026092753`

Aynı saniyede birden fazla satır varsa sıra numarası eklenir:

- `26052026092753-01`
- `26052026092753-02`
- `26052026092753-03`

Bu ID mükerrer kontrolün ana anahtarıdır.

## Onay kartında görünecek alanlar

Her banka hareketi kartında şunlar görünmelidir:

- Banka satır ID
- Tarih ve saat
- Tutar
- Açıklama
- Banka hesabı
- Önerilen hareket tipi
- Önerilen cari
- Önerilen gelir / gider merkezi
- Güven puanı
- Öneri sebebi
- Durum

## Zorunlu alanlar

Kesin kayda geçmeden önce şu alanlar dolu olmalıdır:

- `bank_row_key`
- `bank_account_code`
- `movement_direction`
- `movement_type`
- `center_type`
- `center_name`
- `approval_status = approved`

Cari gerekiyorsa ve cari bulunamadıysa kayıt `needs_review` kalır.

## Otomatik sınıflandırma

### Banka masrafı

Açıklamada `BSMV`, `EFT ÜCRETİ`, `FAST ÜCRETİ`, `ÜYE İŞYERİ ÜCRETİ` varsa:

- Tip: `banka_masrafi`
- Merkez: `Banka Masrafları`
- Güven: 95

### Gelen EFT / FAST

Açıklamada `GELEN EFT` veya `GELEN FAST` varsa:

- Tip: `tahsilat`
- Karşı taraf açıklamadan çıkarılır
- Cari bulunursa güven 90
- Cari bulunamazsa `needs_review`, güven 65

### Giden EFT / FAST

Açıklamada `GİDEN EFT` veya `GİDEN FAST` varsa:

- Tip: `odeme` veya `virman`
- Karşı taraf açıklamadan çıkarılır
- Kendi şirket / banka adı varsa virman adayıdır
- Güven 70-90

### POS / Peşin satış

Açıklamada `POS`, `PEŞİNSATIŞ`, `ÜYE İŞYERİ` varsa:

- Tip: `pos`
- Merkez: `POS Tahsilatları`
- Kesinti satırları POS komisyonu / banka masrafı olarak önerilir
- Güven 85

### SGK / Vergi

Açıklamada `SGK`, `GİB`, `VERGİ`, `TAHAKKUK` varsa:

- Tip: `vergi_sgk`
- Merkez: `Vergi / SGK Ödemeleri`
- Güven 95

### Moka United

Açıklamada `MOKA`, `UNITED`, `POS AKTARIM` varsa:

- Tip: `moka_tahsilat_aktarimi`
- Merkez: `Moka United`
- Moka hesabıyla eşleşmeden kesin kayıt yapılmaz
- Güven 85

## Onay butonları

Her kartta şu aksiyonlar olmalıdır:

- `Öneriyi Onayla`
- `Düzelt ve Onayla`
- `Eşleşmeyi Beklet`
- `Reddet`

## Çalışma felsefesi

AperiON muhasebe personeli gibi beklemeyecek.

AperiON CFO gibi öneri yapacak.

Kullanıcı sadece son kararı verecek.
