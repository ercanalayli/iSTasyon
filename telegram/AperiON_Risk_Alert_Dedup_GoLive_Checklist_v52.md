# AperiON Risk Alert Dedup Go-Live Checklist v52

Bu checklist, v52 tekrar alarm engelini canlıya almadan önce ve aldıktan sonra hızlı kontrol için hazırlanmıştır.

## 1. Kod / PR kontrolü

- [ ] PR draft durumunda incelendi.
- [ ] Main branch'e doğrudan commit atılmadı.
- [ ] Dashboard/UI dosyalarına dokunulmadı.
- [ ] v51 dosyası korundu.
- [ ] v52 dosyaları eklendi.
- [ ] Rollback rehberi mevcut.

## 2. Supabase SQL kurulumu

Sırasıyla çalıştır:

```text
1. finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql
2. finance/AperiON_Risk_Alert_Dedup_Health_Check_v52.sql
```

Beklenen health check sonucu:

```text
risk_alert_sent_log table = OK
aperion_risk_alert_dedup_status_v52_view view = OK
risk_alert_can_send_v52 = OK
risk_alert_mark_sent_v52 = OK
can_send_readonly_check = true veya false
```

## 3. ENV kontrolü

`.env` içinde şunlar var mı?

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

- [ ] Gerçek token/key GitHub'a yazılmadı.
- [ ] `.env.example` sadece örnek değer içeriyor.
- [ ] Service role key sadece yerel bot/scheduler tarafında kullanılıyor.

## 4. Lokal test

Çalıştır:

```bash
npm run telegram:critical-risk-v52:test
npm run verify:risk-alert-dedup-v52
npm test
```

Beklenen:

```text
RESULT: OK - Critical risk alert dedup v52 is ready.
RESULT: OK - Risk alert dedup v52 verification passed.
```

## 5. GitHub Actions kontrolü

GitHub > Actions içinde çalıştır:

```text
AperiON Finance Full Check
```

Beklenen:

- [ ] Finance smoke test geçti.
- [ ] Finance manifest geçti.
- [ ] v52 Telegram test geçti.
- [ ] v52 verify geçti.

## 6. Canlı tek sefer deneme

Çalıştır:

```bash
npm run telegram:critical-risk-v52
```

Beklenen sonuçlardan biri:

```text
RESULT: OK - critical risk alert v52 sent...
```

veya:

```text
RESULT: OK - no new risk alert to send...
```

## 7. Scheduler geçişi

Eski komut:

```bash
npm run telegram:critical-risk-v51
```

Yeni komut:

```bash
npm run telegram:critical-risk-v52
```

Önerilen ayar:

```text
Çalışma sıklığı: Saatte 1
Cooldown: 360 dakika
```

## 8. Canlı sonrası kontrol

Supabase SQL Editor:

```sql
select *
from aperion_risk_alert_dedup_status_v52_view
where company = 'ALAYLI'
order by last_sent_at desc;
```

Kontrol:

- [ ] Gönderilen risk logları görünüyor.
- [ ] Cooldown içindeki riskler tekrar gönderilmiyor.
- [ ] Telegram mesajı başarılı gidiyor.
- [ ] Hata varsa logdan sebep okunabiliyor.

## 9. Rollback planı

Sorun olursa şu rehbere bak:

```text
telegram/AperiON_Risk_Alert_Dedup_Rollback_v52.md
```

Geçici geri dönüş:

```bash
npm run telegram:critical-risk-v51
```

Rollback sırasında:

- [ ] v52 dosyaları silinmez.
- [ ] `risk_alert_sent_log` silinmez.
- [ ] Dashboard/UI değişmez.
- [ ] Finans ana kayıtları etkilenmez.

## 10. Final onay

- [ ] SQL tamam.
- [ ] ENV tamam.
- [ ] Lokal test tamam.
- [ ] GitHub Actions tamam.
- [ ] Canlı tek sefer deneme tamam.
- [ ] Scheduler v52'ye çevrildi.
- [ ] Rollback planı hazır.

Durum:

```text
v52 canlıya alınabilir / alınamaz
```
