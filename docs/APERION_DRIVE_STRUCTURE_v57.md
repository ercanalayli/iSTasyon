# AperiON v57 — Google Drive Klasör Standardı

Bu standart, ek otomasyon aboneliği kullanmadan ilerlemek için hazırlanmıştır.

## Kullanılacak Gmail hesabı

Banka ekstreleri ve hesap hareketi mailleri şu hesaba gelecektir:

```text
alaylimedikal@gmail.com
```

Google Apps Script ilk aşamada bu Gmail hesabında kurulacaktır.

## Drive alanı notu

AperiON dosya arşivi için mevcut Google Drive altyapısı kullanılacaktır. Ek n8n / Make aboneliği alınmayacaktır.

## Ana klasör

```text
AperiON
```

## Önerilen klasör ağacı

```text
AperiON
├── 01 Banka Ekstreleri
│   ├── 2026
│   │   ├── 01 Ocak
│   │   ├── 02 Şubat
│   │   ├── 03 Mart
│   │   ├── 04 Nisan
│   │   ├── 05 Mayıs
│   │   ├── 06 Haziran
│   │   ├── 07 Temmuz
│   │   ├── 08 Ağustos
│   │   ├── 09 Eylül
│   │   ├── 10 Ekim
│   │   ├── 11 Kasım
│   │   └── 12 Aralık
│
├── 02 Moka POS
│   ├── Tahsilatlar
│   ├── Bekleyen Taksitler
│   └── Mutabakat
│
├── 03 Faturalar
│   ├── Alış
│   └── Satış
│
├── 04 Gider Belgeleri
│
├── 05 BizimHesap Export
│   ├── Cari
│   ├── Stok
│   ├── Satış
│   └── Tahsilat
│
├── 06 Onay Bekleyen
│
├── 07 İşlenen Arşiv
│
└── 99 Hata Kontrol
```

## Apps Script başlangıç klasörü

İlk sürümde Apps Script, banka eklerini şu klasöre kaydeder:

```text
AperiON/01 Banka Ekstreleri/{YIL}/{AY}
```

Örnek:

```text
AperiON/01 Banka Ekstreleri/2026/05 Mayıs
```

## Dosya adlandırma standardı

Dosyalar şu mantıkla adlandırılmalıdır:

```text
YYYY-MM-DD_HH-mm -- GONDEREN -- MAIL_KONUSU -- ORIJINAL_DOSYA_ADI
```

Örnek:

```text
2026-05-29_09-15 -- banka@example.com -- Hesap Hareketleri -- hesap_ekstresi.pdf
```

## Durum mantığı

Drive klasörü sadece arşiv değildir. AperiON şu durumları ayrıca Supabase tarafında takip eder:

```text
new
queued
parsed
control_waiting
approval_waiting
processed
failed
duplicate
```

## Güvenlik notu

Drive’a gelen dosya yalnızca ham veri girişidir.

- BizimHesap’a otomatik kayıt göndermez.
- AperiON’da kesin finans kaydı oluşturmaz.
- Önce parser, sonra öneri, sonra onay gerekir.

## Yapılacak bağlantılar

1. Google Apps Script klasör ağacını otomatik oluşturacak.
2. Apps Script dosyaları ilgili yıl/ay klasörüne kaydedecek.
3. Apps Script mümkünse dosya metadata bilgisini AperiON Supabase tablosuna gönderecek.
4. Gönderilemezse AperiON manuel/yarı otomatik dosya taramasıyla kaydı oluşturacak.
5. Parser ham dosyayı banka hareketlerine çevirecek.
6. Onay Merkezi hareketleri kullanıcı onayına sunacak.
