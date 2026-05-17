# AperiON Critical Risk Alert Scheduler v51

Amaç: Kritik/yüksek risk oluştuğunda Telegram'a ayrı alarm göndermek.

Bu sistem sabah finans özetinden farklıdır.

- Sabah özeti: genel günlük rapor
- Kritik risk alarmı: acil uyarı / push mantığı

Çalışacak komut:

```bash
npm run telegram:critical-risk-v51
```

Test komutu:

```bash
npm run telegram:critical-risk-v51:test
```

## 1) Gerekli .env değişkenleri

```env
TELEGRAM_BOT_TOKEN=BURAYA_TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID=BURAYA_CHAT_ID
SUPABASE_URL=BURAYA_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=BURAYA_SUPABASE_SERVICE_ROLE_KEY
COMPANY=ALAYLI
RISK_ALERT_LEVEL=high
```

## 2) Alarm eşiği

```text
RISK_ALERT_LEVEL=critical  -> sadece kritik risk varsa alarm gönderir
RISK_ALERT_LEVEL=high      -> kritik + yüksek risk varsa alarm gönderir
RISK_ALERT_LEVEL=warning   -> kritik + yüksek + uyarı risk varsa alarm gönderir
```

Önerilen başlangıç:

```env
RISK_ALERT_LEVEL=high
```

Çünkü her uyarı için alarm gönderirsek Telegram şişer. Kritik ve yüksek riskler yeterli.

## 3) Manuel test

Önce format testini çalıştır:

```bash
npm run telegram:critical-risk-v51:test
```

Sonra gerçek alarm kontrolünü çalıştır:

```bash
npm run telegram:critical-risk-v51
```

Risk yoksa beklenen çıktı:

```text
RESULT: OK - no critical/high risk alert to send.
```

Risk varsa beklenen çıktı:

```text
RESULT: OK - critical risk alert sent.
```

## 4) Windows Görev Zamanlayıcı - Saat başı kontrol

PowerShell'i yönetici olarak aç.

Proje yolunu kendi bilgisayarına göre düzenle:

```powershell
$ProjectPath = "C:\Users\HP\Desktop\ErpaltH\iSTasyon"
$TaskName = "AperiON Kritik Risk Alarmı"

mkdir "$ProjectPath\logs" -ErrorAction SilentlyContinue

$Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c cd /d `"$ProjectPath`" && npm run telegram:critical-risk-v51 >> logs\critical_risk_alert.log 2>>&1"
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddHours(9) -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 3650)
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "AperiON kritik/yüksek risk oluşunca Telegram alarm kontrolü yapar" -Force
```

Manuel çalıştırmak için:

```powershell
Start-ScheduledTask -TaskName "AperiON Kritik Risk Alarmı"
```

Durum kontrolü:

```powershell
Get-ScheduledTask -TaskName "AperiON Kritik Risk Alarmı"
```

Log kontrolü:

```powershell
Get-Content "C:\Users\HP\Desktop\ErpaltH\iSTasyon\logs\critical_risk_alert.log" -Tail 50
```

## 5) Linux / VPS cron - Saat başı kontrol

```bash
crontab -e
```

Şunu ekle:

```cron
0 * * * * cd /home/aperion/iSTasyon && npm run telegram:critical-risk-v51 >> logs/critical_risk_alert.log 2>&1
```

## 6) Fazla alarm riskine karşı not

Bu v51 sürümünde alarm gönderimi read-only mantıktadır ve risk varsa çalıştırıldığı her seferde mesaj gönderebilir.

Sonraki sürümde önerilen geliştirme:

```text
risk_alert_sent_log tablosu
aynı risk için tekrar alarm engeli
snooze / 1 saat sustur
onaylandı / görüldü butonu
```

## 7) Çalışması için gerekli SQL sırası

```text
1) finance/AperiON_Sales_Flow_Today_SQL_v46.sql
2) finance/AperiON_Finance_Calendar_Live_SQL_v47.sql
3) finance/AperiON_Finance_Calendar_Seed_v47.sql
4) finance/AperiON_Finance_Calendar_Actions_SQL_v48.sql
5) finance/AperiON_Finance_Risk_Engine_SQL_v49.sql
```

## 8) Kontrol listesi

- [ ] `npm run telegram:critical-risk-v51:test` başarılı.
- [ ] `npm run telegram:critical-risk-v51` manuel çalışıyor.
- [ ] `RISK_ALERT_LEVEL=high` ayarlı.
- [ ] `aperion_risk_feed_v49_view` veri döndürüyor.
- [ ] Windows Scheduler / cron aktif.
- [ ] `logs/critical_risk_alert.log` oluşuyor.
- [ ] Fazla alarm oluşursa v52 tekrar alarm engeli kurulacak.
