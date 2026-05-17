# AperiON Morning Finance Digest Scheduler v50

Amaç: Her sabah Telegram'a otomatik AperiON finans özeti göndermek.

Çalışacak komut:

```bash
npm run telegram:morning-digest-v50
```

## 1) Gerekli .env değişkenleri

Proje kök klasöründe `.env` dosyasında şu alanlar olmalı:

```env
TELEGRAM_BOT_TOKEN=BURAYA_TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID=BURAYA_CHAT_ID
SUPABASE_URL=BURAYA_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=BURAYA_SUPABASE_SERVICE_ROLE_KEY
COMPANY=ALAYLI
```

Güvenlik kuralı:

```text
.env dosyası GitHub'a gönderilmeyecek.
TELEGRAM_BOT_TOKEN ve SUPABASE_SERVICE_ROLE_KEY kesinlikle repoya yazılmayacak.
```

## 2) Manuel test

Önce format testini çalıştır:

```bash
npm run telegram:morning-digest-v50:test
```

Sonra gerçek Telegram gönderimini test et:

```bash
npm run telegram:morning-digest-v50
```

## 3) Windows Görev Zamanlayıcı kurulumu

PowerShell'i yönetici olarak aç.

Proje klasörünü kendi PC yoluna göre düzenle:

```powershell
$ProjectPath = "C:\Users\HP\Desktop\ErpaltH\iSTasyon"
$NodePath = "node"
$TaskName = "AperiON Sabah Finans Özeti"
$Time = "08:30"

$Action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c cd /d `"$ProjectPath`" && npm run telegram:morning-digest-v50 >> logs\morning_digest.log 2>>&1"
$Trigger = New-ScheduledTaskTrigger -Daily -At $Time
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "AperiON her sabah Telegram finans özeti gönderir" -Force
```

Log klasörü yoksa önce oluştur:

```powershell
mkdir logs
```

Görevi manuel çalıştırmak için:

```powershell
Start-ScheduledTask -TaskName "AperiON Sabah Finans Özeti"
```

Görev durumunu görmek için:

```powershell
Get-ScheduledTask -TaskName "AperiON Sabah Finans Özeti"
```

## 4) Linux / VPS cron örneği

Her sabah 08:30 çalıştırmak için:

```bash
crontab -e
```

Şunu ekle:

```cron
30 8 * * * cd /home/aperion/iSTasyon && npm run telegram:morning-digest-v50 >> logs/morning_digest.log 2>&1
```

## 5) Beklenen Telegram özeti

```text
AperiON Sabah Finans Özeti / ALAYLI

Bugün
Tahsil
Ödeme
Net

Bu Hafta
Tahsil
Ödeme
Net

Risk
Toplam
Kritik
Yüksek
Uyarı

Bugünkü İlk Kayıtlar
Geciken İlk Kayıtlar
İlk Riskler
```

## 6) Kontrol listesi

- [ ] Supabase SQL dosyaları çalıştırıldı.
- [ ] finance_calendar_summary_view veri döndürüyor.
- [ ] aperion_risk_summary_v49_view veri döndürüyor.
- [ ] TELEGRAM_CHAT_ID doğru.
- [ ] `npm run telegram:morning-digest-v50:test` başarılı.
- [ ] `npm run telegram:morning-digest-v50` Telegram'a mesaj gönderiyor.
- [ ] Windows Scheduler / cron aktif.
- [ ] logs/morning_digest.log oluşuyor.

## 7) Çalışması için gerekli SQL sırası

```text
1) finance/AperiON_Sales_Flow_Today_SQL_v46.sql
2) finance/AperiON_Finance_Calendar_Live_SQL_v47.sql
3) finance/AperiON_Finance_Calendar_Seed_v47.sql
4) finance/AperiON_Finance_Calendar_Actions_SQL_v48.sql
5) finance/AperiON_Finance_Risk_Engine_SQL_v49.sql
```
