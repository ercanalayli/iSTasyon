# AperiON Risk Alert Dedup Scheduler v52

Bu dosya, v52 tekrar alarm engeli aktif edildikten sonra kritik risk alarmının nasıl çalıştırılacağını anlatır.

## Amaç

v51 kritik risk alarmı aynı risk devam ettiği sürece her çalışmada Telegram mesajı gönderebiliyordu. v52 ile aynı risk için `risk_key` üretilir ve `risk_alert_sent_log` tablosundaki cooldown süresi dolmadan aynı risk tekrar gönderilmez.

## Ön koşul

Supabase SQL Editor içinde şu dosyalar sırayla çalıştırılmış olmalı:

```txt
1. finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql
2. finance/AperiON_Risk_Alert_Dedup_Health_Check_v52.sql
```

Kurulan ana yapılar:

```txt
risk_alert_sent_log
risk_alert_can_send_v52
risk_alert_mark_sent_v52
aperion_risk_alert_dedup_status_v52_view
```

Health check beklenen kontroller:

```txt
risk_alert_sent_log table = OK
aperion_risk_alert_dedup_status_v52_view view = OK
risk_alert_can_send_v52 = OK
risk_alert_mark_sent_v52 = OK
can_send_readonly_check = true/false dönüşü
```

Not: Health check varsayılan olarak read-only çalışır. Dosyanın en altındaki manuel yazma testi yorum satırındadır; canlıda gerekmedikçe açılmamalıdır.

## ENV değişkenleri

`.env.example` dosyasındaki örneğe göre `.env` içine şunlar girilmeli:

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
COMPANY=ALAYLI
RISK_ALERT_LEVEL=high
RISK_ALERT_COOLDOWN_MINUTES=360
```

Güvenlik:

- Gerçek token/key GitHub'a yazılmaz.
- `SUPABASE_SERVICE_ROLE_KEY` sadece yerel bot/scheduler tarafında kullanılır.
- Web ekranında service role key kullanılmaz.

## Manuel test

```bash
npm run telegram:critical-risk-v52:test
npm run verify:risk-alert-dedup-v52
npm test
```

## Canlı tek sefer çalıştırma

```bash
npm run telegram:critical-risk-v52
```

Beklenen sonuçlar:

```txt
RESULT: OK - critical risk alert v52 sent...
```

veya cooldown nedeniyle yeni mesaj yoksa:

```txt
RESULT: OK - no new risk alert to send...
```

## Windows Task Scheduler örneği

Program:

```txt
powershell.exe
```

Arguments:

```txt
-NoProfile -ExecutionPolicy Bypass -Command "cd C:\\Users\\HP\\Desktop\\ErpaltH; npm run telegram:critical-risk-v52"
```

Önerilen çalışma sıklığı:

```txt
Saatte 1
```

Cooldown önerisi:

```txt
RISK_ALERT_COOLDOWN_MINUTES=360
```

Bu ayarla aynı risk 6 saat içinde tekrar Telegram'a gitmez.

## v51'den v52'ye geçiş

Eski görev şu komutu kullanıyorsa:

```bash
npm run telegram:critical-risk-v51
```

Testlerden sonra şu komuta çevrilir:

```bash
npm run telegram:critical-risk-v52
```

v51 dosyası silinmez. Geri dönüş gerekirse scheduler komutu tekrar v51'e alınabilir.

## Önemli notlar

- v52 sadece başarılı Telegram gönderiminden sonra log yazar.
- Telegram gönderimi başarısız olursa risk loglanmaz; bir sonraki çalışmada tekrar denenebilir.
- Mevcut v51 dosyası korunur ama canlı kullanımda scheduler komutu v52'ye çevrilmelidir.
- Dashboard ve risk feed v49 yapısı değiştirilmez.
- Deploy işlemi bu dosya ile yapılmaz; sadece yerel zamanlama rehberidir.

## Kontrol SQL'i

```sql
select *
from aperion_risk_alert_dedup_status_v52_view
where company = 'ALAYLI'
order by last_sent_at desc;
```

## Hızlı sorun giderme

1. Hiç mesaj gitmiyorsa:
   - `aperion_risk_feed_v49_view` içinde risk var mı kontrol et.
   - `RISK_ALERT_LEVEL` çok yüksek olabilir. `critical` yerine `high` deneyebilirsin.
   - `.env` içinde `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` var mı kontrol et.

2. Aynı risk tekrar gitmiyorsa:
   - Bu normaldir. Cooldown çalışıyor demektir.
   - Kontrol için `aperion_risk_alert_dedup_status_v52_view` view'ına bak.
   - Acil test için geçici olarak `RISK_ALERT_COOLDOWN_MINUTES=5` denenebilir.

3. Testler geçiyor ama canlı çalışmıyorsa:
   - ENV değişkenlerini kontrol et.
   - Supabase service role key doğru mu kontrol et.
   - Telegram bot token ve chat id doğru mu kontrol et.
   - `finance/AperiON_Risk_Alert_Dedup_Health_Check_v52.sql` sonucunda MISSING var mı kontrol et.
