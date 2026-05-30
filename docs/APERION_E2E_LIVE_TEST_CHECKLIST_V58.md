# AperiON v58 — Uçtan Uca Canlı Test Kontrol Listesi

## Amaç

Bu testin amacı şu zincirin gerçek veriyle çalıştığını kanıtlamaktır:

```text
alaylimedikal@gmail.com
→ Gmail eki
→ Google Drive arşivi
→ Document Metadata
→ Belge Merkezi
→ Finans Onay Kuyruğu
→ Finans Onay Merkezi
→ Telegram /onaylar
```

## Hesap Kuralı

```text
Mail hesabı: alaylimedikal@gmail.com
Drive hesabı: ercanalayli@gmail.com
```

Drive klasörü `ercanalayli@gmail.com` hesabında oluşturulacak ve `alaylimedikal@gmail.com` hesabına düzenleme yetkisi verilecek.

## Ön Şartlar

- `finance/AperiON_Document_Metadata_SQL_v58.sql` Supabase üzerinde çalıştırıldı.
- `finance/AperiON_Finance_Approval_Queue_SQL_v58.sql` Supabase üzerinde çalıştırıldı.
- `automation/google_apps_script_gmail_to_drive_metadata_v58.js` Apps Script projesine eklendi.
- Apps Script gerekli property değerleriyle yapılandırıldı.
- Telegram bot v58 çalışıyor.

## Apps Script Properties

Aşağıdaki property değerleri Apps Script tarafında tanımlanmalıdır:

```text
APERION_SUPABASE_URL
APERION_SUPABASE_SERVICE_ROLE_KEY
APERION_DRIVE_ROOT_FOLDER_ID
APERION_GMAIL_QUERY
```

Önerilen Gmail sorgusu:

```text
to:alaylimedikal@gmail.com has:attachment newer_than:30d -label:APERION_PROCESSED
```

## Test Dosyası

İlk canlı test için küçük bir PDF kullanılmalıdır.

Örnek dosya adı:

```text
TEST_BANKA_EKSTRESI_V58.pdf
```

Örnek mail konusu:

```text
AperiON v58 Canlı Test - Banka Ekstresi
```

## Test Adımları

### 1. Mail Gönder

`alaylimedikal@gmail.com` hesabına ekli PDF içeren test maili gönder.

Beklenen:

```text
Mail alaylimedikal@gmail.com gelen kutusuna düşer.
```

### 2. Apps Script Manuel Çalıştır

Apps Script içinde şu fonksiyon manuel çalıştırılır:

```text
aperionProcessGmailToDriveV58
```

Beklenen:

```text
Mail APERION_PROCESSED etiketi alır.
Hata varsa APERION_ERROR etiketi alır.
```

### 3. Drive Kontrolü

`ercanalayli@gmail.com` Drive hesabında şu klasör yolu kontrol edilir:

```text
AperiON Gelen Belgeler / finance / YYYY-MM
```

Beklenen:

```text
TEST_BANKA_EKSTRESI_V58.pdf dosyası görünür.
```

### 4. Supabase Metadata Kontrolü

Aşağıdaki view kontrol edilir:

```sql
select * from aperion_document_inbox_v58_view order by created_at desc limit 10;
```

Beklenen:

```text
Dosya adı görünür.
module = finance
source = gmail
status = new veya review
```

### 5. Belge Merkezi Kontrolü

AperiON içinde şu ekran açılır:

```text
belge-merkezi-v58.html
```

Beklenen:

```text
Test PDF dosyası listede görünür.
Drive’da aç bağlantısı çalışır.
```

### 6. Finans Kuyruğuna Al

Supabase veya Finans Onay Merkezi butonu ile şu fonksiyon çalıştırılır:

```sql
select enqueue_new_finance_documents_v58();
```

Beklenen:

```text
En az 1 kayıt kuyruğa alınır.
```

### 7. Finans Onay Merkezi Kontrolü

AperiON içinde şu ekran açılır:

```text
finans-onay-merkezi-v58.html
```

Beklenen:

```text
Test belgesi pending durumunda görünür.
queue_type bank_statement veya document_review olur.
suggested_action parse veya review olur.
```

### 8. Telegram Kontrolü

Telegram’da şu komutlar denenir:

```text
/belgeler
/onaylar
/ekstreler
```

Beklenen:

```text
/belgeler test dosyasını veya belge sayısını döndürür.
/onaylar bekleyen finans onaylarını döndürür.
/ekstreler banka/kart ekstresi varsa listeler.
```

## Hata Ayıklama

### Mail işlenmedi

Kontrol et:

```text
APERION_GMAIL_QUERY doğru mu?
Mailde ek var mı?
Mail daha önce APERION_PROCESSED etiketi aldı mı?
```

### Drive’a dosya düşmedi

Kontrol et:

```text
APERION_DRIVE_ROOT_FOLDER_ID doğru mu?
Drive klasörü alaylimedikal@gmail.com ile paylaşıldı mı?
```

### Supabase metadata oluşmadı

Kontrol et:

```text
create_document_metadata_v58 fonksiyonu Supabase’de var mı?
Apps Script property değerleri doğru mu?
```

### Finans kuyruğuna düşmedi

Kontrol et:

```text
Belge module = finance mi?
enqueue_new_finance_documents_v58 çalıştırıldı mı?
```

### Telegram cevap vermedi

Kontrol et:

```text
telegram/aperion_telegram_command_bot_v58.cjs çalışıyor mu?
TELEGRAM_BOT_TOKEN tanımlı mı?
SUPABASE bağlantısı doğru mu?
```

## Başarı Kriteri

Test başarılı sayılırsa şu cümle doğru olmalıdır:

```text
Bir PDF mail eki alındı, Drive’a arşivlendi, AperiON Belge Merkezi’nde göründü, Finans Onay Kuyruğu’na düştü ve Telegram’dan sorgulanabildi.
```
