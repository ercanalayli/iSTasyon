# AperiON Risk Alert Dedup Rollback v52

Bu rehber, v52 kritik risk alarm tekrar engeli canlıya alındıktan sonra beklenmeyen bir sorun olursa güvenli şekilde v51'e dönmek için hazırlanmıştır.

## Kural

Rollback sadece scheduler / çalıştırma komutu seviyesinde yapılır.

v52 dosyaları silinmez:

```text
finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql
finance/AperiON_Risk_Alert_Dedup_Health_Check_v52.sql
telegram/aperion_critical_risk_alert_v52.js
telegram/aperion_critical_risk_alert_v52_test_runner.js
telegram/AperiON_Risk_Alert_Dedup_Scheduler_v52.md
tools/verify_risk_alert_dedup_v52.js
```

## Ne zaman rollback yapılır?

- Telegram'a hiç mesaj gitmiyorsa ve ENV doğru görünüyorsa.
- Supabase RPC çağrılarında hata varsa.
- Health check içinde `MISSING` sonucu çıkıyorsa.
- Scheduler v52 komutunu çalıştırıyor ama logda beklenmeyen hata varsa.
- Kritik alarmın hemen çalışması gerekiyorsa ve v52 test edilecek zaman yoksa.

## Hızlı geri dönüş

Canlı scheduler komutu şuysa:

```bash
npm run telegram:critical-risk-v52
```

geçici olarak şuna alınır:

```bash
npm run telegram:critical-risk-v51
```

## Windows Task Scheduler geri dönüş örneği

Arguments alanında v52 varsa:

```txt
-NoProfile -ExecutionPolicy Bypass -Command "cd C:\\Users\\HP\\Desktop\\ErpaltH; npm run telegram:critical-risk-v52"
```

geçici olarak v51 yapılır:

```txt
-NoProfile -ExecutionPolicy Bypass -Command "cd C:\\Users\\HP\\Desktop\\ErpaltH; npm run telegram:critical-risk-v51"
```

## Veritabanı temizlenmez

Rollback sırasında şu tablo temizlenmez veya silinmez:

```text
risk_alert_sent_log
```

Sebep:

- Bu tablo geçmiş alarm gönderim kaydıdır.
- Silinirse audit izi kaybolur.
- v52 tekrar aktif edildiğinde cooldown geçmişi korunmuş olur.

## v52'yi tekrar denemeden önce kontrol

Supabase SQL Editor içinde çalıştır:

```text
finance/AperiON_Risk_Alert_Dedup_Health_Check_v52.sql
```

Yerelde çalıştır:

```bash
npm run telegram:critical-risk-v52:test
npm run verify:risk-alert-dedup-v52
npm test
```

## Güvenli tekrar geçiş

Testler temizse scheduler komutu tekrar v52 yapılır:

```bash
npm run telegram:critical-risk-v52
```

## Notlar

- Rollback deploy değildir.
- Rollback dosya silme değildir.
- Rollback main branch'i değiştirmez.
- Rollback sadece canlı zamanlayıcı komutunu v51'e almak demektir.
- Dashboard/UI etkilenmez.
- Finans ana kayıtları etkilenmez.
