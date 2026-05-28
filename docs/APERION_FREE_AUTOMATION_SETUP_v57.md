# AperiON v57 — Tamamen Ücretsiz Otomasyon Kurulumu

Bu plan, n8n Cloud / Make gibi ücretli otomasyon servisleri kullanmadan ilerlemek için hazırlanmıştır.

## Hedef

Kullanıcı yalnızca GPT ücretini ödesin. AperiON’un ilk otomasyon katmanı şu ücretsiz yapı ile çalışsın:

```text
Gmail
→ Google Apps Script
→ Google Drive
→ AperiON / Supabase Free
→ GitHub Pages dashboard
→ Telegram bot
→ gerekirse açık kalan ofis PC
```

## Kullanılacak Gmail hesabı

Banka ekstreleri ve hesap hareketi mailleri şu hesaba gelecektir:

```text
alaylimedikal@gmail.com
```

Google Apps Script ilk aşamada bu hesapta kurulacaktır.

## Neden bu yol?

- Make / n8n Cloud aboneliği gerektirmez.
- Gmail ve Drive zaten kullanılıyor.
- Google Apps Script ile mail ekleri Drive’a ücretsiz aktarılır.
- AperiON dosyaları Drive klasöründen veya manuel yükleme üzerinden işleyebilir.
- İlk MVP için yeterlidir.

## Ücretsiz mimari

### 1. Gmail

Banka ekstreleri ve hesap hareketi mailleri `alaylimedikal@gmail.com` hesabına gelir.

Önerilen etiketler:

- `APERION-BANKA`
- `APERION-ISLENDI`
- `APERION-HATA`

### 2. Google Apps Script

Dosya:

- `automation/google_apps_script_gmail_to_drive_v57.js`

Görevleri:

- Gmail’de banka ekstresi / hesap hareketi / Moka / POS maillerini arar.
- Ekleri Google Drive klasörüne kaydeder.
- İşlenen maile `APERION-ISLENDI` etiketi koyar.
- Hata olursa `APERION-HATA` etiketi koyar.

### 3. Google Drive

Varsayılan klasör yapısı:

- `AperiON/01 Banka Ekstreleri/{YIL}/{AY}`

Örnek:

```text
AperiON/01 Banka Ekstreleri/2026/05 Mayıs
```

Buraya gelen dosyalar AperiON’un ham veri giriş kapısı olur.

### 4. AperiON

AperiON dosyaları şu akışa alır:

```text
Drive dosyası / manuel yükleme
→ ham veri
→ parser
→ hareket önerisi
→ cari eşleştirme önerisi
→ onay bekliyor
→ onaylandı
→ AperiON kayıt
→ BizimHesap dry-run kuyruğu
```

### 5. Supabase Free

İlk MVP için yeterlidir. Kota aşılırsa daha sonra karar verilir.

### 6. GitHub Pages

Dashboard yayın alanıdır.

### 7. Telegram

Bildirim ve günlük rapor alanıdır.

## Kurulum adımları

### Adım 1 — Google Apps Script oluştur

1. `alaylimedikal@gmail.com` hesabıyla Google Drive’a gir.
2. Yeni > Diğer > Google Apps Script aç.
3. Proje adını koy:

```text
AperiON Banka Ekstre Aktarımı
```

4. `automation/google_apps_script_gmail_to_drive_v57.js` içeriğini Apps Script editörüne yapıştır.
5. Kaydet.

### Adım 2 — İlk klasör testi

Apps Script içinde şu fonksiyonu çalıştır:

```text
aperionEnsureStandardFolders
```

Google Drive’da şu ana klasör oluşmalı:

```text
AperiON
```

### Adım 3 — İlk manuel ekstre testi

Apps Script içinde şu fonksiyonu çalıştır:

```text
aperionRunBankStatementIntake
```

İlk çalıştırmada Google izin ekranı gelir. Gmail ve Drive erişim izni verilir.

### Adım 4 — Drive klasörünü kontrol et

Google Drive’da şu yapı oluşmalı:

```text
AperiON/01 Banka Ekstreleri/{YIL}/{AY}
```

Banka ekstresi ekleri ilgili yıl/ay klasörüne kaydedilmeli.

### Adım 5 — Saatlik tetikleyici kur

Apps Script içinde şu fonksiyonu bir kez çalıştır:

```text
aperionInstallHourlyTrigger
```

Bundan sonra script her saat Gmail’i kontrol eder.

### Adım 6 — Gerekirse tetikleyicileri kaldır

```text
aperionRemoveTriggers
```

## Güvenlik kuralları

- Bu script yalnızca Gmail eklerini Drive’a taşır.
- BizimHesap’a kayıt göndermez.
- AperiON kesin finans kaydı oluşturmaz.
- Banka hareketi eşleştirme yapmaz.
- Onay Merkezi’ne gidecek ham dosya girişini hazırlar.

## İlk MVP’de yapılmayacaklar

- Tam otomatik BizimHesap kaydı yok.
- Tam otomatik cari eşleştirme yok.
- Kontrolsüz finans kaydı yok.
- Banka hesabına giriş botu yok.

## Hızlandırılmış ücretsiz MVP sırası

1. Gmail → Drive ekstre aktarımı.
2. Drive dosya listesi / manuel yükleme.
3. Banka parser.
4. Onay Merkezi.
5. Moka/POS 40 gün taksit planı.
6. Günlük Telegram finans raporu.
7. BizimHesap dry-run kayıt fişi.

## Yapılanlar

- Ücretsiz mimari seçildi.
- Apps Script taslağı eklendi.
- n8n / Make bağımlılığı kaldırıldı.
- Gmail hesabı `alaylimedikal@gmail.com` olarak netleştirildi.

## Kalanlar

- Apps Script gerçek Google hesabında kurulacak.
- Drive’dan AperiON’a dosya listesi bağlantısı yapılacak.
- Banka parser gerçek dosyayla test edilecek.
- Onay Merkezi’ne ham dosya/hareket akışı bağlanacak.
