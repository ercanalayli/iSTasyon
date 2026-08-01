# AperiON iSTasyon – Codex Handoff / Telegram-First Operating Model

## Ana karar

AperiON artık bir CFO/COO kokpitidir. Kullanıcıyla günlük iletişim kanalı Telegram olacaktır. Dashboard karar, durum, risk ve kanıt ekranıdır; Telegram ise giriş, teyit, alarm ve kontrollü onay kanalıdır.

## Kullanıcı beklentisi

- Kullanıcı teknik test yapmayacak.
- Hazır olmayan bot kullanıcıya test ettirilmeyecek.
- Telegram'a yazılan tek cümle hızlı not, ödeme, fatura, görev veya onay olarak işlenebilmeli.
- Bot her kabul edilen girdiye kısa ama açık teyit dönmeli.
- Finansal kayıt kullanıcı onayı olmadan BizimHesap'a yazılmamalı.
- ŞAHSİ ve ALAYLI kesin ayrılmalı.

## Kod sahipliği

### ChatGPT tarafı

- `aperion-home-v3.html`
- Dashboard veri kartları
- Gider, kart, abonelik ve banka görünürlük dosyaları
- Genel kural ve iş akışı dokümanları

### Codex tarafı

- `functions/telegram/`
- `telegram/`
- `tools/ensure_telegram_webhook.cjs`
- `.github/workflows/telegram-watchdog.yml`
- Supabase quick capture migrationları
- Cloudflare Telegram endpoint entegrasyonu

Aynı dosya üzerinde eş zamanlı çalışma yapılmamalıdır.

## P0 hedefi

Telegram hattı tamamlanmadan yeni özellik geliştirmesi ikinci plandadır.

Hazır kabul kriteri:

```text
GET /api/telegram-preflight
ok=true
ready_for_user_test=true
```

Ardından gerçek test:

```text
/start
```

Beklenen cevap:

```text
AperiON Telegram canlı.
Mesajınızı not, ödeme, fatura, görev veya onay olarak gönderebilirsiniz.
```

## Zorunlu environment / secret kontrolü

Aşağıdaki değerler kod içine yazılmayacak:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET_TOKEN
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Kontrol yerleri:

1. GitHub Actions repository secrets
2. Cloudflare Pages environment variables
3. Gerekirse production ve preview ayrımı

## Telegram giriş tipleri

Bot gelen düz metni şu sınıflardan birine ayırmalıdır:

```text
quick_note
payment_note
invoice_note
task_note
approval_command
unknown
```

Örnekler:

```text
Sena Medikal 10 Temmuz 100000 TL ödenecek
Uludağ elektrik faturası geldi
Yarın Mert'i ara
İş Bankası 12500 TL transferi onayla
```

## Zorunlu parsed alanlar

```text
company_class: ALAYLI | SAHSI | BELIRSIZ
entry_type
counterparty
amount
currency
payment_method
bank_name
account_ref
card_last4
due_date
transaction_date
source_message_id
source_chat_id
raw_text
confidence
approval_required
```

## Teyit mesajı standardı

Her kayıt sonrası Telegram kısa teyit dönmelidir:

```text
ALINDI – APERION
Tür: Ödeme
Sınıf: ALAYLI
Karşı taraf: Sena Medikal
Tutar: 100.000 TL
Vade: 10.07.2026
Durum: Takip ve onay kuyruğuna alındı
```

Belirsiz alan varsa sadece eksik alan sorulur.

## Finansal onay standardı

Banka veya kart işlemi için Telegram mesajında en az şunlar görünmelidir:

```text
Banka
Tarih ve saat
Tutar
Açıklama
Karşı taraf
Kaynak hesap
Hedef hesap
Referans
Bakiye
Ekstre kanıtı
Risk
Önerilen işlem tipi
```

Butonlar:

```text
ONAYLA
REDDET
DÜZELT
KANITI AÇ
```

Onay sonrası butonlar kaldırılmalı veya pasifleştirilmelidir.

## Kayıt zinciri

```text
Telegram mesajı
→ Parse
→ ŞAHSİ / ALAYLI sınıflandırması
→ Supabase quick capture
→ Dashboard kritik kartı
→ Gerekirse kullanıcı onayı
→ Queue
→ Dry-run
→ BizimHesap canlı kayıt
→ Geri doğrulama
→ Telegram teyidi
```

## Supabase beklenen tablolar

```text
quick_captures
telegram_messages
approval_queue
payment_promises
master_data_cards
```

Her Telegram mesajı için mükerrer kontrol anahtarı:

```text
telegram:{chat_id}:{message_id}
```

## Sağlık ve watchdog

Watchdog şu kontrolleri yapmalıdır:

```text
Bot token mevcut mu?
Cloudflare endpoint erişilebilir mi?
Telegram webhook doğru URL'ye bağlı mı?
Pending update veya last_error var mı?
Preflight ready mi?
```

Hata varsa kullanıcıya test yaptırılmaz; dashboard Sistem Sağlığı kartına hata düşer.

## Dashboard bağlantısı

AperiON kokpitinde Telegram kartı şu alanları göstermelidir:

```text
Webhook: bağlı / kopuk
Preflight: hazır / eksik
Son mesaj zamanı
Son başarılı kayıt
Bekleyen onay sayısı
Son hata
```

## Codex tamamlanma raporu

Codex iş sonunda şu formatta rapor vermelidir:

```text
Değiştirilen dosyalar:
Eklenen testler:
Secret/env eksikleri:
Preflight sonucu:
Webhook sonucu:
Kullanıcı testine hazır mı:
Kalan riskler:
```

## Yasaklar

- Tokenı source code veya public repo içine yazmak
- Hazır olmadan kullanıcıya `/start` testi yaptırmak
- ŞAHSİ girdiyi ALAYLI'ye otomatik yazmak
- Sadece tutar gösteren eksik onay mesajı
- Kullanıcı onayı olmadan finansal kayıt
- Aynı Telegram mesajını iki kez kaydetmek
