# AperiON iSTasyon – Quick Note API Sözleşmesi

Bu dosya Telegram, iPhone Kestirme/Siri ve Dashboard Hızlı Not ekranının aynı hızlı yakalama sistemine nasıl yazacağını tanımlar.

## Ana karar

Hızlı not sistemi public ve korumasız bir endpoint olarak açılmayacaktır.

Sebep:

- Ödeme notları finansal ve operasyonel olarak kritiktir.
- Yanlış veya yetkisiz kayıt açılmamalıdır.
- Şahsi/şirket ayrımı korunmalıdır.
- Audit log tutulmalıdır.

## Endpoint hedefleri

### 1. Telegram webhook

```text
POST /telegram/webhook
```

Kullanım:

- Telegram bot mesajlarını alır.
- Telegram secret token ile doğrular.
- Mesajı quick capture parserına yollar.
- Supabase `quick_notes` ve gerekirse `payment_promises` kayıtlarını oluşturur.
- Telegram’a teyit mesajı döner.

### 2. Genel hızlı not API

```text
POST /api/quick-note
```

Kullanım:

- iPhone Kestirme / Siri
- AperiON dashboard hızlı not formu
- İleride başka güvenli girişler

Güvenlik:

- Cloudflare Access, özel token veya kullanıcı doğrulaması zorunludur.
- Korumasız public POST kabul edilmez.

## İstek formatı

```json
{
  "text": "Sena Medikal 10 Temmuz 100 bin ödeme kredi kartı",
  "source": "telegram | ios_shortcut | dashboard | whatsapp | chatgpt",
  "created_by": "ercan",
  "device": "iphone"
}
```

## Parser çıktısı

```json
{
  "parsed_type": "payment_promise",
  "company_class": "ALAYLI",
  "counterparty": "Sena Medikal",
  "amount": 100000,
  "currency": "TRY",
  "due_date": "2026-07-10",
  "payment_method": "credit_card",
  "priority": "critical",
  "status": "pending_payment",
  "confidence": 100,
  "needs_review": false,
  "alarm_requested": true
}
```

## Ödeme yöntemi değerleri

```text
cash              → Nakit / elden
bank_transfer     → Havale / EFT / FAST / banka transferi
check             → Çek
promissory_note   → Senet
credit_card       → Kredi kartı
unknown           → Belirsiz
```

## Başarılı cevap standardı

```json
{
  "ok": true,
  "saved_to_aperion": true,
  "calendar_status": "scheduled | pending | failed | not_connected",
  "notification_status": "sent | pending | failed",
  "note_id": "...",
  "payment_promise_id": "...",
  "user_message": "Kaydedildi. Sena Medikal için 10 Temmuz 2026 100.000 TL ödeme notu açıldı. Ödeme yöntemi kredi kartı."
}
```

## Hata cevap standardı

Sistem sessiz kalmaz.

```json
{
  "ok": false,
  "saved_to_aperion": false,
  "error": "missing_auth | missing_text | parser_failed | storage_failed | calendar_failed",
  "user_message": "Not alınamadı. Sebep: yetki doğrulaması eksik."
}
```

## Kayıt sırası

1. Ham metin alınır.
2. Kaynak ve yetki doğrulanır.
3. `quick_notes` içine ham kayıt açılır.
4. Parser alanları çıkarır.
5. Ödeme ise `payment_promises` kaydı açılır.
6. Calendar/alarm oluşturma denenir.
7. Telegram/Siri/Dashboard kanalına teyit döner.
8. Hata varsa audit log oluşur.

## Kabul kriteri

Kullanıcı şu cümleyi girdiğinde:

```text
Sena Medikal 10 Temmuz 100 bin ödeme kredi kartı
```

Sistem 5 saniye içinde şu teyidi vermelidir:

```text
Kaydedildi. Sena Medikal için 10 Temmuz 2026 100.000 TL ödeme notu açıldı. Ödeme yöntemi kredi kartı. AperiON kritik ödeme listesine eklendi.
```

## Uygulama notu

Genel hızlı not API canlıya alınmadan önce:

- Supabase tabloları oluşturulmalı.
- Cloudflare env değişkenleri girilmeli.
- Yetki doğrulaması tamamlanmalı.
- Preflight endpoint yeşil olmalı.
- Dashboard sağlık kartı bu endpointleri göstermeli.
