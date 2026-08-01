# AperiON iSTasyon – Hızlı Not / Hızlı Emir Yakalama Sistemi

Bu dosya, kullanıcının yoldayken tek cümleyle ödeme, tahsilat, fatura, cari not, görev ve hatırlatma girebilmesi için kullanılacak hızlı yakalama mimarisini tanımlar.

## Problem

ChatGPT uygulamasına girip proje seçmek, doğru sohbeti bulmak, uzun mesaj yazmak ve otomasyon limitlerine takılmak günlük operasyon için uygun değildir.

Kullanıcı şu şekilde tek cümle söyleyebilmelidir:

```text
Sena Medikal 10 Temmuz 100 bin ödeme havale
```

Sistem bunu otomatik olarak ödeme notu, ödeme yöntemi, alarm, dashboard kaydı ve takip kalemine dönüştürmelidir.

## Ana karar

Hızlı yakalama için tek giriş mantığı kurulacak:

```text
Kullanıcı tek cümle yazar/söyler → Quick Capture API → Supabase quick_notes → Parser → ödeme/görev/fatura/cari not → alarm + dashboard + takip
```

## Giriş kanalları

### 1. Telegram Bot

En güvenilir hızlı giriş kanalıdır.

Kullanım:

```text
@ercanalayli_bot içine direkt yaz:
Sena Medikal 10 Temmuz 100 bin ödeme havale
```

Gereken teknik bağlantı:

- Telegram Bot webhook
- Cloudflare Worker veya Pages Function endpoint
- Supabase quick_notes tablosu
- Botun geri cevap göndermesi

Beklenen bot cevabı:

```text
Aldım.
Cari: Sena Medikal
Tarih: 10 Temmuz 2026
Tutar: 100.000 TL
Ödeme yöntemi: Havale/EFT/FAST
Tip: ödeme
Durum: kritik ödeme bekliyor
Alarm: eklendi
Dashboard: kritik ödemelere düştü
```

Not: BotFather ekranında botun görünmesi tek başına yeterli değildir. Webhook bağlanmadıkça Telegram'a yazılan mesaj AperiON sistemine düşmez.

### 2. iPhone Kestirme / Siri

Yoldayken en hızlı sesli giriş kanalıdır.

Kullanım:

```text
Hey Siri, AperiON not al
Sena Medikal 10 Temmuz 100 bin ödeme kredi kartı
```

Gereken teknik bağlantı:

- Kestirme: Metni dikte et / sor
- URL içeriklerini al: Quick Capture API endpointine POST
- JSON gövdesi: text, source, device, created_at
- Sonucu göster: sistemin döndürdüğü kısa cevap

Kestirme adı önerisi:

```text
AperiON Not Al
```

### 3. WhatsApp Helper

WhatsApp Helper, hızlı kişisel not için birinci tercih değildir.

Ana kullanım alanı:

- WhatsApp Business mesajlarından sipariş/dekont/fatura/belge yakalama
- Gelen müşteri/tedarikçi mesajlarını sınıflandırma
- Görsel/dekont/fatura ile operasyon kaydı oluşturma

WhatsApp Helper daha karmaşıktır çünkü WhatsApp Web veya Cloud API bağlantısı gerekir. Bu yüzden ilk hızlı not sistemi Telegram veya iPhone Kestirme ile kurulmalıdır.

### 4. AperiON Dashboard hızlı not ekranı

Dashboard içinde `Hızlı Not` alanı olacak.

Kullanım:

```text
Sena Medikal 10 Temmuz 100 bin ödeme çek
```

Bu alan masaüstü kullanım içindir; yolda birinci tercih değildir.

## Parser sınıfları

Quick Capture gelen metni şu sınıflardan birine ayırır:

- ödeme sözü
- ödeme hatırlatması
- tahsilat beklentisi
- cari not
- fatura bildirimi
- abonelik/fatura ödeme
- banka kontrolü
- şahsi not
- şirket notu
- risk/uyarı
- yapılacak iş

## Ödeme yakalama standardı

Örnek metin:

```text
Sena Medikal 10 Temmuz 100 bin ödeme havale
```

Çıkarılacak alanlar:

- counterparty: Sena Medikal
- due_date: 2026-07-10
- amount: 100000
- currency: TRY
- payment_method: bank_transfer
- type: payment_promise
- class: ALAYLI
- priority: critical
- status: pending_payment
- reminders: 1 gün önce, ödeme sabahı, ödeme öncesi
- evidence_required: ödeme sonrası dekont

## Ödeme yöntemi standardı

Ödeme notlarında ödeme yöntemi ayrı alan olarak tutulacaktır.

Desteklenen yöntemler:

```text
cash              → Nakit / elden
bank_transfer     → Havale / EFT / FAST / banka transferi
check             → Çek
promissory_note   → Senet
credit_card       → Kredi kartı
unknown           → Belirsiz / sonradan sorulacak
```

Örnek hızlı notlar:

```text
Sena Medikal 10 Temmuz 100 bin ödeme havale
Sena Medikal 10 Temmuz 100 bin ödeme nakit
Sena Medikal 10 Temmuz 100 bin ödeme çek
Sena Medikal 10 Temmuz 100 bin ödeme senet
Sena Medikal 10 Temmuz 100 bin ödeme kredi kartı
```

Ödeme yöntemi belirtilmemişse kayıt yine alınır; fakat `payment_method = unknown` veya boş kalır ve onayda kullanıcıdan yöntem istenir.

## Alarm stratejisi

Her ödeme için ayrı ChatGPT automation açılmayacak.

Sebep: aktif görev limiti olabilir.

Kullanılacak alarm kaynakları:

- Google Calendar event
- Telegram bot reminder
- AperiON günlük ödeme özeti
- AperiON haftalık ödeme planı
- Dashboard kritik ödemeler kartı

## Veri tabanı önerisi

Supabase tabloları:

```text
quick_notes
payment_promises
reminder_events
audit_log
```

### quick_notes alanları

- id
- created_at
- source: telegram / ios_shortcut / dashboard / whatsapp / chatgpt
- raw_text
- parsed_type
- company_class
- counterparty
- amount
- currency
- due_date
- payment_method
- status
- confidence
- needs_review
- created_by

### payment_promises alanları

- id
- quick_note_id
- counterparty
- amount
- currency
- due_date
- payment_method
- bank_account
- approval_status
- paid_status
- evidence_status
- proof_file

## Minimum MVP

İlk yapılacak sürüm:

1. Cloudflare endpoint: `/api/quick-note` veya `/telegram/webhook`
2. Supabase tablo: `quick_notes`
3. Telegram webhook: `@ercanalayli_bot`
4. iPhone Kestirme POST desteği
5. Dashboard `Kritik Ödemeler` kartı
6. Google Calendar event oluşturma veya mevcut günlük/haftalık ödeme özetine ekleme

## Kabul kriteri

Kullanıcı şunu yazınca:

```text
Sena Medikal 10 Temmuz 100 bin ödeme kredi kartı
```

Sistem 5 saniye içinde şu cevabı vermelidir:

```text
Aldım. Sena Medikal için 10 Temmuz 2026 100.000 TL ödeme notu açıldı. Ödeme yöntemi kredi kartı olarak işaretlendi. Kritik ödeme listesine ve hatırlatmalara eklendi.
```

Dashboardda aynı kayıt görünmelidir.
