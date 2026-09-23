# AperiON iSTasyon - Güncel Durum (14 Eylül 2026)

## Proje sohbetleri ortak hafızası (14 Eylül 2026)

- Mevcut D1 oturum hafızası, `memory_sources`, `memory_facts`, `memory_fact_sources`, `memory_decisions`, `memory_conflicts` ve `memory_sync_state` ile kaynak/tarih/hash/supersede/dedupe izli kanonik proje hafızasına genişletildi.
- Repo belgeleri ve state kanıtları adaptörlü gerçek ingest hattına bağlandı. İlk çalışma: 11 kaynak, 9 senkron kaynak, 725 fact, 28 karar, 2 dedupe, 0 açık çelişki.
- `functions/api/project-memory.js` kimlik doğrulamalı read-only entity/fact, karar geçmişi, conflict, provenance, sync-state ve birleşik context sorguları sağlar.
- ChatGPT proje sohbet geçmişi için bu ortamda desteklenen programatik API/connector yoktur; durum `BLOCKED_PLATFORM_ACCESS` olarak açıkça tutulur. Özel uygulama depoları kazınmaz, PDF/kopyala-yapıştır ana mimari yapılmaz.
- Yerel ve canlı D1 migration/ingest doğrulandı. `7403` sorunu şifreli Wrangler OAuth oturumu yenilenip hesap/veritabanı UUID eşleşmesi `SELECT 1` ile doğrulanarak çözüldü.
- Canlı `aperion-control-plane` read-only sonucu: 11 source, 725 fact, 28 decision, 0 conflict, 2 bilinçli platform blokajı ve 0 secret-benzeri fact.
- Kanıt: `state/project-conversation-memory-verification.json`. Finansal write: `0`; secret ifşası: `0`.

## Finans hafızası ve vade motoru (14 Eylül 2026)

- Mevcut Telegram/Gmail belge hattı, `evidence_inbox` ve `personal_finance_events` korunarak kalıcı `finance_obligations` hafızasıyla genişletildi.
- Kredi kartı, vergi, SGK, kira, kredi, elektrik/su, abonelik/telekom ve tedarikçi faturalarından tutar/vade/kurum/kapsam çıkarılıyor; FAST/EFT/dekont güvenli ödeme eşleştirmesinde kullanılıyor.
- Eksik vade, kurum veya kapsam uydurulmuyor; kayıt `needs_review` kalıyor. Mevcut alias kuralları kişi eşleşmesinde öneri olarak kullanılıyor.
- Europe/Istanbul takvimine göre normal, 7 gün yaklaşan, 3 gün yüksek, 1 gün/bugün kritik ve gecikmiş riskleri hesaplanıyor. Aynı günlük risk uyarısı benzersiz anahtarla tekrar üretilmiyor.
- Yalnız yüksek güvenli ödeme eşleşmesi `paid` üretiyor; belirsiz eşleşme otomatik kapanmıyor. `paid → archived` geçişi ayrı ve doğrulanmış bir durum geçişidir.
- Finans vade özeti kimlik doğrulamalı read-only endpoint ve morning brief içinde bugün/3 gün/7 gün/geciken/kapanan/kapsam ayrımıyla sunuluyor.
- Migration: `migrations/0021_finance_obligation_memory.sql`. Kanıt: `state/finance-memory-verification.json`. Gerçek finansal write: `0`; secret ifşası: `0`.
- Cloudflare Pages dağıtımı başarılı. GitHub catch-up canlı `v157`/D1 şema health kontrolünü zorunlu yapar; yetkili pending-belge işlemesi ayrı adımdır ve tekil belge ayrıştırma hatası dağıtımı bozmaz.

## Hermes VPS / Windows worker doğrulaması (14 Eylül 2026)

- Hermes command bridge canlı: `https://aperion-command-bridge.yenicespor-finans.workers.dev/health` HTTP 200 ve `{ "ok": true }` döndürdü.
- Telegram webhook doğrudan Telegram API üzerinden doğrulandı: Hermes command bridge webhook'una bağlı, bekleyen güncelleme `0`, aktif teslimat hatası yok.
- Windows Hermes/BizimHesap dinleyicisi ONLINE: PID kilidi canlı; `AperiON_BizimHesap_Listener_Watchdog` etkin, 5 dakikada bir çalışıyor ve son sonucu `0`.
- BizimHesap READ-ONLY uçtan uca kanıtı: `bizimhesap_cari_bakiye_sync` işi `bot_commands` kimliği `1739` ile tamamlandı; 5.600 satır tarandı, bakiyesi olan 164 cari bulundu ve 164 özet satırı güncellendi.
- Eski Pages preflight adresi bu Windows makinesinin DNS'inde hatalı/erişilemez çözülüyor; kanonik Hermes Worker ve Telegram webhook sağlıklı olduğundan komut köprüsünü engellemiyor. DNS/preflight sapması açık teknik borçtur.
- Bu doğrulamada finansal kayıt yazımı `0`, secret ifşası `0`.
- Kanıtlar: `state/hermes-vps-health.json`, `state/windows-worker-health.json`, `state/hermes-readonly-verification.json`.

## Canlı adres (kesin)
- Canonical: `https://aperion-istasyon.pages.dev/` → `aperion.html` → **`aperion-ust-akil.html`** (gerçek ana ekran, `_redirects` + meta-refresh zinciriyle doğrulandı)
- GitHub Pages (`ercanalayli.github.io/iSTasyon`) sadece yedek/preview, canlı karar için kullanılmaz (bkz. DECISIONS.md D-018)
- `aperion-home.html` / `aperion-home-v3.html` / `aperion-home-v2.html` terk edilmiş adaylar, canlı değil

## Repo/klasör durumu (31 Temmuz büyük toparlama)
- Kanonik çalışma klasörü: `C:\AperiON\iSTasyon` (diğer 6 kopya — ErpaltH, ErpaltH_live_main, ErpaltH_syncfix, ErpaltH_data, 2x GitHub kopyası — incelendi, benzersiz iş kurtarıldı, arşivlenmeye hazır ama silme kullanıcı onayı bekliyor)
- ErpaltH'deki 4 birleştirilmemiş commit kurtarıldı: kişisel finans asistanı + risk uyarı tekrar engelleme (finance/, telegram/ altına eklendi)
- ErpaltH_live_main'deki İş Bankası XLS ekstre parser iyileştirmesi kanonik tools/reconcile_historical_bank_statements_v106.cjs'e uygulandı
- ErpaltH_syncfix'teki paylaşılan tarayıcı oturum modülü (bizimhesap_browser.js, bizimhesap_oturum_kur.js) eklendi ama henüz hiçbir bota bağlanmadı (ayrı entegrasyon işi gerekiyor)
- ALKAM Mali Yönetim (farklı GitHub hesabı, alkammaliyonetim) kapsam dışı bırakıldı, sonraya ertelendi

## Güvenlik (31 Temmuz, canlı Supabase'de doğrulandı ve düzeltildi)
- 30 Temmuz'daki düzeltme TAM kapanmamıştı: ingest_mail_bank_movements, mark_bizimhesap_queue_processed, finance_calendar_log_action, kullanici_firma_idler, on_maliyet_upload, rls_auto_enable hâlâ anon çalıştırabiliyordu (ikisi PUBLIC rolü üzerinden) — hepsi REVOKE edildi, doğrulandı
- YENİ bulgu: bank_transactions tablosunda anon herkes okuyabiliyor, giriş yapan herkes sınırsız yazabiliyor — kullanıcı ile birlikte tasarlanacak, henüz dokunulmadı

## Doküman durumu
- docs/ (38) + kök (17) = 56 markdown dosyası bulundu, tam denetim yapıldı, 11 aktif dosya + arşive konsolidasyon planı hazır (henüz uygulanmadı)
- docs/BANK_RULES.md'ye eksik Moka/KMH/Batch sınıflandırma kuralları eklendi (3 haftadır bekliyordu)
- İş Bankası ID 33-35: onaylanmış ama BizimHesap'a işlenmemiş (0 kayıt) — kaybolmamış, sadece işlem bekliyor

## Yapılacaklar (öncelik sırası)
1. 56→11 doküman birleştirmesini fiilen uygula (plan hazır, hafızada `project_docs_audit_2026-07-31`)
2. Ana ekran (aperion-ust-akil.html) "2055 hissi" ile yeniden tasarlanacak — kök dizinde ~57 HTML dosyası var, çoğu muhtemelen ölü aday
3. bank_transactions RLS politikasını kullanıcıyla birlikte tasarla (anon okuma / authenticated sınırsız yazma sorunu)
4. İş Bankası ID 33-35 kaydını gerçekten BizimHesap'a işle
5. bizimhesap_browser.js/oturum_kur.js modülünü gerçek bot scriptlerine entegre et (ErpaltH_syncfix'ten kurtarıldı ama bağlanmadı)
6. 6 eski klasörü (ErpaltH vb.) kullanıcı onayıyla arşivle/sil
7. telegram_siparis_bot.cjs için TELEGRAM_SIPARIS_CHAT_ID ortam değişkeni eklenmeli
8. İlkbahar Eczanesi siparişi kapatılmalı (fatura/sevk tarihi)
9. Kardağ'ın vadesi geçen alacağı incelenmedi
10. ErpaltH docs'unda hâlâ geçen yasaklı "ErpaltH" adı (index.html title dahil) temizlenecek

## Kural
Bu dosyayı her oturum sonunda güncelle. Yeni bir sohbet/oturum başlarken önce bu dosya okunmalı, hiçbir şey "muhtemelen yapılmıştır" diye varsayılmamalı.

## 2026-09-23 - ChatGPT komut yüzeyi kararı

- Windows PC Executor, watchdog ve tek listener sağlıklı olsa bile ChatGPT Project/Çalışma sohbeti bu yerel executor'ı kendiliğinden çağıramaz.
- Kanonik telefon komut yüzeyi, mevcut ApeirON ChatGPT Action OpenAPI bağlantısının yüklü olduğu ApeirON özel GPT'sidir. Project/Çalışma sohbeti rutin finans komutları için operasyon yüzeyi sayılmayacak.
- Production Action şeması: `https://aperion-command-bridge.yenicespor-finans.workers.dev/openapi.json`.
- Action tarafında prepare + consequential approve akışı mevcut; Windows worker yalnız onaylı finans görevini lease eder.
- Work/Cloud Browser yalnız araştırma veya son çare browser fallback olarak kalır; PC Executor'a doğrudan bağlıymış gibi raporlanmayacak.
- Uzun vadeli hedef, aynı command bridge'i ChatGPT Plugin/App yüzeyine taşımaktır; mevcut Custom GPT Action kısa vadeli üretim köprüsüdür.
