# AperiON Finans Komuta Merkezi - Değişiklik Manifesti

Bu manifest, AperiON / ErpaltH iSTasyon reposunda finans modülleri için yapılan dosya bazlı değişiklikleri somut olarak izlemek için tutulur.

Yeni öncelik:

```text
Ana modül: Finans Komuta Merkezi
Çekirdekler: Yapılacaklar · Ödenecekler · Tahsil Edilecekler
Ek yapı: Telegram alarm altyapısı + v52 tekrar alarm engeli
Yeni yön: v53 Dinamik Gelir Tablosu + Dinamik Bilanço merkezi
Kullanım ilkesi: v53 Zero Keyboard / minimum klavye etkileşimi
```

Repo:

```text
ercanalayli/iSTasyon
```

## v53 - Dinamik Finansal Tablolar Merkezi

| Dosya | Amaç | Durum |
|---|---|---|
| `finance/AperiON_Main_Financial_Statements_v53.md` | Ana ekranda canlı Dinamik Gelir Tablosu + Dinamik Bilanço mimarisi, işlem etkisi modeli, KPI kartları, mutabakat uyarıları ve v53 geliştirme yönü | Eklendi |
| `finance/AperiON_Zero_Keyboard_Interaction_v53.md` | Klavye kullanımını minimuma indiren konuşarak, seçerek, butonla ve belge/görsel yükleyerek işlem yapma ilkesi | Eklendi |

v53 ana prensipleri:

```text
- Gelir Tablosu ve Bilanço ana ekranda yan yana çalışacak.
- Her satış/gider/tahsilat/ödeme hareketi tabloları otomatik güncelleyecek.
- Klavye ile iletişim en aza indirilecek.
- Kullanıcı mümkün olduğunca konuşarak, seçerek, butona basarak ve belge/fotoğraf yükleyerek işlem yapacak.
- Uzun form yerine akıllı kısa akış ve hazır seçenekler kullanılacak.
- Sayılar tam gösterilecek, K/M kısaltması kullanılmayacak.
- Mobilde alt alta responsive yapı kullanılacak.
- Her finansal kalem drilldown/drawer açabilecek.
- Veri güven skoru ve son güncelleme zamanı gösterilecek.
- Mutabakat ve denklik kontrolleri zorunlu olacak.
- Eski modüller silinmeyecek.
```

## v52 - Risk Alarm Tekrar Engeli

| Dosya | Amaç | Durum |
|---|---|---|
| `finance/AperiON_Risk_Alert_Dedup_SQL_v52.sql` | Telegram kritik risk alarmı için gönderildi logu, cooldown kontrolü, RPC katmanı, `company` / `risk_key` trim + zorunlu alan validasyonu | Eklendi / Güçlendirildi |
| `finance/AperiON_Risk_Alert_Dedup_Health_Check_v52.sql` | v52 kurulum sonrası tablo/RPC/view/read-only kontrol SQL'i | Eklendi |
| `finance/AperiON_Risk_Alert_Dedup_Supabase_Runbook_v52.md` | Supabase SQL Editor üzerinde v52 kurulum, health check, hızlı sorgu ve sorun giderme rehberi | Eklendi |
| `finance/AperiON_v52_RELEASE_NOTES.md` | v52 amaç, dosya listesi, komutlar, çalışma sırası, güvenlik notları ve beklenen sonuç özeti | Eklendi |
| `telegram/aperion_critical_risk_alert_v52.js` | v49 risk feed'i okuyup aynı riski cooldown içinde tekrar göndermeyen Telegram alarm modülü | Eklendi |
| `telegram/aperion_critical_risk_alert_v52_test_runner.js` | v52 risk key, cooldown skip ve loglama testleri | Eklendi |
| `telegram/AperiON_Risk_Alert_Dedup_Scheduler_v52.md` | Windows Task Scheduler / manuel kullanım ve v51'den v52'ye geçiş rehberi | Eklendi |
| `telegram/AperiON_Risk_Alert_Dedup_Rollback_v52.md` | v52 sorununda dosya silmeden sadece scheduler komutunu v51'e alma rehberi | Eklendi |
| `telegram/AperiON_Risk_Alert_Dedup_GoLive_Checklist_v52.md` | SQL, ENV, test, CI, canlı deneme, scheduler ve rollback için tek sayfalık canlıya alma checklist'i | Eklendi |
| `tools/verify_risk_alert_dedup_v52.js` | v52 dosya, SQL, SQL validasyon sertleştirme, RPC, komut ve bot kontrol script'i | Eklendi / Güçlendirildi |
| `scripts/verify_finance_manifest.cjs` | v52/v53 dosyaları, workflow tetikleyicileri, env örnekleri, health check SQL'i, rollback/go-live rehberleri, release notes, zero-keyboard ve finansal tablo yönü manifest doğrulamasına eklendi | Güncellendi |
| `.github/workflows/finance-full-check.yml` | v52 test + verify adımları ve `finance/**`, `telegram/**`, `tools/**` tetikleyicileri eklendi | Güncellendi |
| `.env.example` | Telegram bot, chat id, company, risk seviyesi ve v52 cooldown örnekleri eklendi | Güncellendi |
| `FINANCE_SETUP.md` | v52 SQL sırası, health check, ENV, test, CI, scheduler geçişi ve rollback rehberi kurulum rehberine eklendi | Güncellendi |
| `NEXT_ACTIONS_FINANCE.md` | v52 SQL sırası, health check, ENV, test ve canlı scheduler geçişi yazıldı | Güncellendi |
| `package.json` | `telegram:critical-risk-v52`, `telegram:critical-risk-v52:test`, `verify:risk-alert-dedup-v52`, `verify:finance-v52` komutları eklendi | Güncellendi |

## Korunan kurallar

```text
- Mevcut v51 dosyaları korunur.
- Dashboard/UI dosyalarına izinsiz dokunulmaz.
- Main branch doğrudan değiştirilmez.
- Deploy onaysız yapılmaz.
- Önceki özellikler silinmez.
- v52 sadece risk alarm logu yazar; finans ana kayıtlarını değiştirmez.
- v53 mevcut sistemi silmeden ana ekranı canlı Gelir Tablosu + Bilanço merkezine dönüştürür.
- Klavye kullanımı azaltılır; kullanıcıya gereksiz yazı yazdırılmaz.
```
