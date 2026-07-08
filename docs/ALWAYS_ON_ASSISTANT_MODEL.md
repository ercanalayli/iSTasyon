# AperiON iSTasyon – Her Zaman Hazır Asistan Modeli

Bu dosya, kullanıcının teknik ayrıntılarla uğraşmadan Telegram, Siri/Kestirme, dashboard veya başka bir kanaldan tek cümleyle işlem başlatabilmesi için her zaman hazır çalışma modelini tanımlar.

## Ana karar

Kullanıcı webhook, env, token, deploy, bot canlı mı gibi teknik durumları takip etmeyecek.

Bu durumlar sistem sağlığı konusudur ve AperiON tarafından otomatik izlenecektir.

## Kullanıcının beklediği davranış

Kullanıcı yalnızca şunu yapar:

```text
Sena Medikal 10 Temmuz 100 bin ödeme kredi kartı
```

Sistem şunu yapar:

- Mesajı alır.
- Ödeme notu açar.
- Ödeme yöntemini okur.
- Kritik ödeme listesine ekler.
- Hatırlatma/alarm üretir.
- Dashboardda gösterir.
- Gerekirse Telegram’dan kısa cevap döner.

## Her zaman hazır olması gereken katmanlar

### 1. Giriş kanalı

- Telegram bot
- iPhone Kestirme / Siri
- Dashboard hızlı not ekranı
- İleride WhatsApp Helper

### 2. Karşılama katmanı

- Cloudflare Pages Function veya Worker
- Endpoint örneği: `/telegram/webhook` veya `/api/quick-note`

### 3. Hafıza ve kuyruk

- Supabase `quick_notes`
- Supabase `payment_promises`
- Audit log

### 4. Sağlık kontrolü

- Telegram webhook health check
- Cloudflare endpoint health check
- Supabase bağlantı health check
- Son başarılı hızlı not zamanı
- Son hata mesajı

### 5. Alarm ve görünürlük

- Dashboard kritik ödemeler kartı
- Telegram geri bildirim
- Google Calendar veya günlük ödeme özeti
- Haftalık ödeme planı

## Her zaman canlılık stratejisi

Sistem tamamen tek bir bota veya tek bir otomasyona bağlı kalmayacaktır.

Gereken yapı:

```text
Telegram Bot → Cloudflare Function → Supabase
Siri/Kestirme → Cloudflare Function → Supabase
Dashboard Hızlı Not → Cloudflare Function → Supabase
```

Böylece bir kanal geçici sorun yaşarsa diğer kanal kullanılabilir.

## Kullanıcının test yapması yasaktır

Kullanıcıdan her seferinde `/start` yazması, botu test etmesi veya webhook kontrol etmesi beklenmez.

Bunlar otomatik kontrol edilecek ve dashboardda şöyle görünecektir:

```text
Telegram Quick Capture: CANLI
Son başarılı not: 17:42
Webhook: doğru
Cloudflare: sağlıklı
Supabase: sağlıklı
```

veya:

```text
Telegram Quick Capture: HATA
Sebep: webhook beklenen adrese bağlı değil
Son hata: ...
Yedek giriş: dashboard hızlı not / Siri kestirme
```

## Gerçekçi sınır

Hiçbir sistem yüzde yüz kesintisiz garanti edilmez.

Ama AperiON hedefi şudur:

- Kullanıcı teknik ayrıntı görmez.
- Sistem kendi kendini izler.
- Hata varsa kullanıcıya sebebiyle bildirir.
- Yedek giriş kanalı sunar.
- Not kaybolmaz.

## Kabul kriteri

Kullanıcı Telegram’a veya Siri’ye şu cümleyi verdiğinde:

```text
Sena Medikal 10 Temmuz 100 bin ödeme kredi kartı
```

Sistem 5 saniye içinde kayıt açmalı veya hata varsa kullanıcıya net sebep bildirmelidir.

Sessiz kalmak kabul edilemez.

## Teknik yapılacaklar

1. Cloudflare Telegram webhook env değişkenleri tamamlanacak.
2. Supabase quick capture tabloları çalıştırılacak.
3. Telegram webhook beklenen adrese bağlanacak.
4. `tools/check_telegram_health.cjs` düzenli çalışacak.
5. Dashboard sistem sağlığı kartı `telegram_health_status.json` veya Supabase health view okuyacak.
6. Siri/iPhone Kestirme aynı quick-note endpointine bağlanacak.
7. Hata olduğunda Telegram yerine dashboard veya Kestirme yedek giriş olarak çalışacak.
