# AperiON Risk Alert Dedup Supabase Runbook v52

Bu runbook, v52 tekrar alarm engelini Supabase üzerinde kurmak ve kontrol etmek için kısa uygulama rehberidir.

## Amaç

Aynı riskin cooldown süresi dolmadan tekrar tekrar Telegram'a gönderilmesini engellemek.

## Sıra

Supabase Dashboard > SQL Editor içinde şu dosyaları sırayla çalıştır:

```text
1. finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql
2. finance/AperiON_Risk_Alert_Dedup_Health_Check_v52.sql
```

## Kurulum dosyası

Çalıştırılacak dosya:

```text
finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql
```

Kurulan ana yapılar:

```text
risk_alert_sent_log
risk_alert_can_send_v52
risk_alert_mark_sent_v52
aperion_risk_alert_dedup_status_v52_view
```

## Health check dosyası

Çalıştırılacak dosya:

```text
finance/AperiON_Risk_Alert_Dedup_Health_Check_v52.sql
```

Beklenen sonuç:

```text
risk_alert_sent_log table = OK
aperion_risk_alert_dedup_status_v52_view view = OK
risk_alert_can_send_v52 = OK
risk_alert_mark_sent_v52 = OK
can_send_readonly_check = true veya false
```

`can_send_readonly_check` değerinin `true` veya `false` dönmesi normaldir. Önemli olan hata vermemesidir.

## Güvenlik notu

- Health check varsayılan olarak read-only çalışır.
- En alttaki manuel write test yorum satırındadır.
- Manuel write test canlıda gerekmedikçe açılmaz.
- `risk_alert_sent_log` audit/log tablosudur; rollback sırasında silinmez.

## Hızlı durum sorgusu

```sql
select *
from aperion_risk_alert_dedup_status_v52_view
where company = 'ALAYLI'
order by last_sent_at desc;
```

## Sorun giderme

### MISSING sonucu çıkarsa

Önce ana kurulum dosyasını tekrar çalıştır:

```text
finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql
```

Sonra health check dosyasını tekrar çalıştır:

```text
finance/AperiON_Risk_Alert_Dedup_Health_Check_v52.sql
```

### RPC hata verirse

Kontrol edilecekler:

```text
risk_alert_can_send_v52
risk_alert_mark_sent_v52
```

Bu fonksiyonlar yoksa ana kurulum SQL'i tekrar çalıştırılır.

### Aynı risk tekrar gitmiyorsa

Bu beklenen davranıştır. Cooldown aktif demektir.

Kontrol:

```sql
select company, risk_key, title, sent_at, cooldown_until, in_cooldown, sent_count
from aperion_risk_alert_dedup_status_v52_view
where company = 'ALAYLI'
order by last_sent_at desc;
```

## Sonraki adım

Supabase kontrolü temizse yerelde çalıştır:

```bash
npm run verify:finance-v52
npm test
```

Sonra go-live checklist tamamlanır:

```text
telegram/AperiON_Risk_Alert_Dedup_GoLive_Checklist_v52.md
```
