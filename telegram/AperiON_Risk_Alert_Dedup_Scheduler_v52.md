# AperiON Risk Alert Dedup Scheduler v52

Bu dosya, v52 tekrar alarm engeli aktif edildikten sonra kritik risk alarmının nasıl çalıştırılacağını anlatır.

## Amaç

v51 kritik risk alarmı aynı risk devam ettiği sürece her çalışmada Telegram mesajı gönderebiliyordu. v52 ile aynı risk için `risk_key` üretilir ve `risk_alert_sent_log` tablosundaki cooldown süresi dolmadan aynı risk tekrar gönderilmez.

## Ön koşul

Supabase SQL Editor içinde şu dosya çalıştırılmış olmalı:

```txt
finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql
```

Kurulan ana yapılar:

```txt
risk_alert_sent_log
risk_alert_can_send_v52
risk_alert_mark_sent_v52
aperion_risk_alert_dedup_status_v52_view
```

## ENV değişkenleri

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
COMPANY=ALAYLI
RISK_ALERT_LEVEL=high
RISK_ALERT_COOLDOWN_MINUTES=360
```

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

2. Aynı risk tekrar gitmiyorsa:
   - Bu normaldir. Cooldown çalışıyor demektir.
   - Kontrol için `aperion_risk_alert_dedup_status_v52_view` view'ına bak.

3. Testler geçiyor ama canlı çalışmıyorsa:
   - ENV değişkenlerini kontrol et.
   - Supabase service role key doğru mu kontrol et.
   - Telegram bot token ve chat id doğru mu kontrol et.
