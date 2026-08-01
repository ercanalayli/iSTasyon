# AperiON iSTasyon - Güncel Durum (31 Temmuz 2026)

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
