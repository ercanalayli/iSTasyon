# AperiON iSTasyon v52 Release Notes

## Sürüm

```text
AperiON v52
Risk Alert Dedup
```

## Amaç

Aynı kritik risk alarmının Telegram tarafında tekrar tekrar gönderilmesini engellemek.

## Ana özellikler

- Cooldown kontrollü Telegram risk alarmı
- Deterministic risk key sistemi
- Alarm gönderim logu
- SQL RPC kontrol katmanı
- Health check SQL sistemi
- Supabase runbook
- Rollback rehberi
- Go-live checklist
- Manifest doğrulama entegrasyonu
- CI/workflow entegrasyonu

## Yeni dosyalar

```text
finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql
finance/AperiON_Risk_Alert_Dedup_Health_Check_v52.sql
finance/AperiON_Risk_Alert_Dedup_Supabase_Runbook_v52.md
telegram/aperion_critical_risk_alert_v52.js
telegram/aperion_critical_risk_alert_v52_test_runner.js
telegram/AperiON_Risk_Alert_Dedup_Scheduler_v52.md
telegram/AperiON_Risk_Alert_Dedup_Rollback_v52.md
telegram/AperiON_Risk_Alert_Dedup_GoLive_Checklist_v52.md
tools/verify_risk_alert_dedup_v52.js
```

## Yeni komutlar

```bash
npm run telegram:critical-risk-v52
npm run telegram:critical-risk-v52:test
npm run verify:risk-alert-dedup-v52
npm run verify:finance-v52
```

## Çalıştırma sırası

### Supabase

```text
finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql
finance/AperiON_Risk_Alert_Dedup_Health_Check_v52.sql
```

### Lokal doğrulama

```bash
npm run verify:finance-v52
npm test
```

### Scheduler geçişi

Eski:

```bash
npm run telegram:critical-risk-v51
```

Yeni:

```bash
npm run telegram:critical-risk-v52
```

## Güvenlik notları

```text
Main branch değiştirilmedi
Deploy yapılmadı
Dashboard/UI dosyalarına dokunulmadı
v51 korunuyor
Rollback sadece scheduler seviyesinde
risk_alert_sent_log silinmez
Health check varsayılan olarak read-only
company/risk_key boş geçilemez
```

## Önerilen ENV

```env
RISK_ALERT_COOLDOWN_MINUTES=360
```

## Beklenen sonuç

```text
Aynı kritik risk kısa süre içinde tekrar Telegram'a düşmez.
Yeni kritik riskler normal şekilde iletilmeye devam eder.
```
