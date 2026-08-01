# AperiON iSTasyon – Hızlı Yakalama ve Bildirim Modeli

Bu dosya `QUICK_CAPTURE_SYSTEM.md`, `QUICK_NOTE_API_CONTRACT.md` ve
`NOTIFICATION_CONFIRMATION_MODEL.md`'nin 2026-07-31 tarihli birleşimidir
(mimari / API sözleşmesi / teyit davranışı olarak üç bölüm). Kaynak
dosyalar `docs/archive/` altındadır.

**Durum notu:** Bu özellik `docs/CURRENT_STATUS.md`'ye göre henüz tam
canlı değil (Telegram Quick Capture ve `/api/quick-note` uçtan uca
doğrulanmamış). Bu dosya hedef tasarımı tanımlar, mevcut canlı durumu değil.

## Bölüm 1 — Mimari (Quick Capture System)

### Problem

ChatGPT uygulamasına girip proje seçmek, doğru sohbeti bulmak, uzun mesaj
yazmak ve otomasyon limitlerine takılmak günlük operasyon için uygun
değildir. Kullanıcı tek cümle söyleyebilmelidir:

```
Sena Medikal 10 Temmuz 100 bin ödeme havale
```

Sistem bunu otomatik olarak ödeme notu, ödeme yöntemi, alarm, dashboard
kaydı ve takip kalemine dönüştürmelidir.

### Ana karar

```
Kullanıcı tek cümle yazar/söyler → Quick Capture API → Supabase quick_notes
→ Parser → ödeme/görev/fatura/cari not → alarm + dashboard + takip
```

### Giriş kanalları

1. **Telegram Bot** (`@ercanalayli_bot`) — en güvenilir hızlı giriş kanalı.
   Gereken bağlantı: Telegram Bot webhook, Cloudflare Worker/Pages
   Function endpoint, Supabase `quick_notes` tablosu, botun geri cevap
   göndermesi. Not: BotFather ekranında botun görünmesi tek başına yeterli
   değildir — webhook bağlanmadıkça mesaj sisteme düşmez.
2. **iPhone Kestirme / Siri** — yoldayken en hızlı sesli giriş kanalı.
   Kestirme adı önerisi: "AperiON Not Al". Akış: metni dikte et/sor → URL
   içeriklerini al (Quick Capture API'ye POST, JSON: `text, source, device,
   created_at`) → sonucu göster.
3. **WhatsApp Helper** — birinci tercih değil. Ana kullanım alanı: WhatsApp
   Business mesajlarından sipariş/dekont/fatura/belge yakalama, gelen
   müşteri/tedarikçi mesajlarını sınıflandırma. WhatsApp Web/Cloud API
   bağlantısı gerektirdiği için daha karmaşıktır; ilk hızlı not sistemi
   Telegram veya iPhone Kestirme ile kurulmalıdır.
4. **AperiON Dashboard hızlı not ekranı** — masaüstü kullanım için, yolda
   birinci tercih değil.

### Parser sınıfları

Ödeme sözü, ödeme hatırlatması, tahsilat beklentisi, cari not, fatura
bildirimi, abonelik/fatura ödeme, banka kontrolü, şahsi not, şirket notu,
risk/uyarı, yapılacak iş.

### Ödeme yakalama standardı

Örnek: `Sena Medikal 10 Temmuz 100 bin ödeme havale` →

```
counterparty: Sena Medikal
due_date: 2026-07-10
amount: 100000
currency: TRY
payment_method: bank_transfer
type: payment_promise
class: ALAYLI
priority: critical
status: pending_payment
reminders: 1 gün önce, ödeme sabahı, ödeme öncesi
evidence_required: ödeme sonrası dekont
```

Ödeme yöntemi değerleri: `cash` (Nakit/elden), `bank_transfer` (Havale/EFT/
FAST), `check` (Çek), `promissory_note` (Senet), `credit_card` (Kredi
kartı), `unknown` (Belirsiz/sonradan sorulacak). Ödeme yöntemi
belirtilmemişse kayıt yine alınır; `payment_method = unknown` kalır ve
onayda kullanıcıdan yöntem istenir.

### Alarm stratejisi

Her ödeme için ayrı ChatGPT automation açılmaz (aktif görev limiti riski).
Kullanılacak alarm kaynakları: Google Calendar event, Telegram bot
reminder, AperiON günlük/haftalık ödeme özeti, dashboard kritik ödemeler
kartı.

### Veri tabanı önerisi

Supabase tabloları: `quick_notes`, `payment_promises`, `reminder_events`,
`audit_log`.

`quick_notes` alanları: `id, created_at, source (telegram/ios_shortcut/
dashboard/whatsapp/chatgpt), raw_text, parsed_type, company_class,
counterparty, amount, currency, due_date, payment_method, status,
confidence, needs_review, created_by`.

`payment_promises` alanları: `id, quick_note_id, counterparty, amount,
currency, due_date, payment_method, bank_account, approval_status,
paid_status, evidence_status, proof_file`.

### Minimum MVP

1. Cloudflare endpoint: `/api/quick-note` veya `/telegram/webhook`.
2. Supabase tablo: `quick_notes`.
3. Telegram webhook: `@ercanalayli_bot`.
4. iPhone Kestirme POST desteği.
5. Dashboard "Kritik Ödemeler" kartı.
6. Google Calendar event oluşturma veya günlük/haftalık ödeme özetine
   ekleme.

## Bölüm 2 — API Sözleşmesi (Quick Note API Contract)

### Ana karar

Hızlı not sistemi public ve korumasız bir endpoint olarak açılmaz. Sebep:
ödeme notları finansal/operasyonel olarak kritiktir; yanlış veya yetkisiz
kayıt açılmamalı; şahsi/şirket ayrımı korunmalı; audit log tutulmalıdır.

### Endpoint hedefleri

**1. Telegram webhook** — `POST /telegram/webhook`. Telegram bot mesajlarını
alır, Telegram secret token ile doğrular, mesajı quick capture parserına
yollar, Supabase `quick_notes` ve gerekirse `payment_promises` kayıtlarını
oluşturur, Telegram'a teyit mesajı döner.

**2. Genel hızlı not API** — `POST /api/quick-note`. iPhone Kestirme/Siri,
AperiON dashboard hızlı not formu ve ileride başka güvenli girişler için.
Güvenlik: Cloudflare Access, özel token veya kullanıcı doğrulaması
zorunludur; korumasız public POST kabul edilmez.

### İstek formatı

```json
{
  "text": "Sena Medikal 10 Temmuz 100 bin ödeme kredi kartı",
  "source": "telegram | ios_shortcut | dashboard | whatsapp | chatgpt",
  "created_by": "ercan",
  "device": "iphone"
}
```

### Parser çıktısı

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

### Başarılı / hata cevap standardı

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

Sistem sessiz kalmaz — hata durumunda:

```json
{
  "ok": false,
  "saved_to_aperion": false,
  "error": "missing_auth | missing_text | parser_failed | storage_failed | calendar_failed",
  "user_message": "Not alınamadı. Sebep: yetki doğrulaması eksik."
}
```

### Kayıt sırası

1. Ham metin alınır.
2. Kaynak ve yetki doğrulanır.
3. `quick_notes` içine ham kayıt açılır.
4. Parser alanları çıkarır.
5. Ödeme ise `payment_promises` kaydı açılır.
6. Calendar/alarm oluşturma denenir.
7. Telegram/Siri/Dashboard kanalına teyit döner.
8. Hata varsa audit log oluşur.

### Kabul kriteri

Kullanıcı "Sena Medikal 10 Temmuz 100 bin ödeme kredi kartı" girdiğinde,
sistem 5 saniye içinde şu teyidi vermelidir:

```
Kaydedildi. Sena Medikal için 10 Temmuz 2026 100.000 TL ödeme notu açıldı.
Ödeme yöntemi kredi kartı. AperiON kritik ödeme listesine eklendi.
```

### Uygulama notu

Genel hızlı not API canlıya alınmadan önce: Supabase tabloları
oluşturulmalı, Cloudflare env değişkenleri girilmeli, yetki doğrulaması
tamamlanmalı, preflight endpoint yeşil olmalı, dashboard sağlık kartı bu
endpointleri göstermeli.

## Bölüm 3 — Bildirim ve Teyit Davranışı (Notification Confirmation Model)

### Ana karar

Kullanıcı bir işlem gönderdiğinde sistem sessiz kalmaz. Her kritik işlem
için üç kayıt teyidi ayrı ayrı izlenir:

1. AperiON kaydı oluşturuldu mu?
2. Takvim/alarm kaydı oluşturuldu mu?
3. Bildirim kullanıcı telefonuna gönderildi mi?

### Beklenen teyit örneği

```
✅ AperiON kaydı açıldı
Cari: Sena Medikal
Tutar: 100.000 TL
Tarih: 10 Temmuz 2026
Yöntem: Kredi kartı

✅ Takvim alarmı eklendi
Hatırlatma: 1 gün önce / ödeme sabahı / ödeme öncesi

📌 Durum: Kritik ödeme bekliyor
Kanıt: ödeme sonrası dekont/fiş bekleniyor
```

### Bildirim kanalları

1. **Telegram cevap bildirimi** — ilk ve ana teyit kanalı; anlık, mesaj
   geçmişi kalır, dekont/fotoğraf aynı kanaldan gönderilebilir.
2. **iPhone / Google Calendar bildirimi** — telefonun kendi alarm
   sistemi çalışır, ChatGPT automation limitine takılmaz, 1 gün önce/3 saat
   önce/30 dakika önce gibi uyarılar verilebilir.
3. **AperiON Dashboard teyidi** — işlem "Kritik Ödemeler", "Hızlı Notlar"
   veya ilgili modül altında görünür: kayıt ID, cari/konu, tutar, tarih,
   ödeme yöntemi, takvim durumu, bildirim durumu, kanıt durumu, son
   güncelleme zamanı.
4. **Günlük / haftalık ödeme özeti** — kritik ödeme otomatik eklenir.

### Durum alanları

```
capture_status      → captured / failed
aperion_status      → saved / failed / pending
calendar_status     → scheduled / failed / not_required
notification_status → sent / failed / pending
proof_status        → waiting_proof / received / not_required
```

### Sessiz kalmak yasaktır

Kabul edilmeyen durum: "Kullanıcı mesaj attı, cevap yok." Doğru davranış
örneği:

```
❌ İşlem tam kaydedilemedi.
AperiON kaydı: başarılı
Takvim: başarısız
Sebep: Google Calendar bağlantısı yok
Yedek: günlük ödeme özetine eklendi
```

### İşlem garantisi mantığı

Tek bir kanal başarısız olursa işlem kaybolmaz. Öncelik sırası: raw mesaj
`quick_notes` içine yazılır → parser sınıflandırır → uygunsa
`payment_promises`/ilgili tabloya yazar → takvim/alarm oluşturmaya çalışır
→ Telegram/diğer bildirim kanalına sonuç döner → hata varsa audit log ve
dashboard uyarısı oluşturur.

### Takvim bildirimi standardı

Varsayılan hatırlatmalar: 1 gün önce, ödeme günü sabahı, ödeme saatinden 30
dakika önce. Saat belirtilmediyse varsayılan ödeme takip saati 09:00 kabul
edilir.

### Ödeme yöntemi ve kanıt ilişkisi

Nakit → kasa notu/makbuz/teslim kanıtı. Havale/EFT/FAST → banka dekontu.
Çek → çek fotoğrafı, çek no, vade, banka. Senet → senet fotoğrafı, vade,
borçlu/alacaklı. Kredi kartı → slip/ekstre/fiş veya ödeme ekranı.

### Kabul kriteri

Kullanıcı hızlı not gönderdiğinde 5 saniye içinde en az bir telefon
bildirimi gelmelidir:

```
✅ Kaydedildi
✅ Takvime eklendi
✅ AperiON kritik ödeme listesinde
```

Başarısız durumda:

```
⚠️ Not alındı ama takvim eklenemedi.
Sebep: Calendar bağlantısı yok.
AperiON kritik ödeme listesinde bekliyor.
```
