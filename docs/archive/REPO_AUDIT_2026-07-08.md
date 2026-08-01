# AperiON iSTasyon – Repo Audit Raporu

Tarih: 2026-07-08

Amaç: Codex limiti olmadan buradan devam ederken repo içindeki mevcut durumu, riskleri ve sıradaki güvenli işi yazılı hale getirmek.

## 1. Yeni tek doğruluk kaynağı oluşturuldu

`/docs` klasörü altında şu dosyalar oluşturuldu:

- `VISION.md`
- `ARCHITECTURE.md`
- `DATABASE.md`
- `BANK_RULES.md`
- `GMAIL_RULES.md`
- `BIZIMHESAP_RULES.md`
- `TELEGRAM_RULES.md`
- `AUTOMATION_RULES.md`
- `UI_STANDARDS.md`
- `ROADMAP.md`
- `CHANGELOG.md`

Bu dosyalar bundan sonra AperiON iSTasyon için mimari kararların ana referansı kabul edilecektir.

## 2. İsim / başlık taraması

### ErpaltH

Repo içinde `ErpaltH` ifadesi çok sayıda dosyada bulunuyor.

Örnek dosyalar:

- `BIZIMHESAP_KLONU_CANLI_ISLEYIS.md`
- `bizimhesap_sifre_guncelle.ps1`
- `finans-takvimi.html`
- `portaller.html`
- `finans-komuta-merkezi.html`
- `FINANCE_SETUP.md`
- `finance_approval_actions.js`
- `APERION_FINANS_INTEGRATION_NOTES.md`
- `bizimhesap_finance_pipeline.js`
- `aperion-home.html`
- `aperion-home-v2.html`
- `aperion-home-v3.html`

Karar: Bu ifade canlı kullanıcının gördüğü başlık ve ana ürün metinlerinde temizlenmeli. Ancak dosya yolu/legacy script adı olarak geçiyorsa kod kırmamak için önce raporlanmalı, sonra kontrollü değiştirilmeli.

### İstanbul iEFT

`İstanbul iEFT` ifadesi aramada bulunmadı.

### Mailden onaya düşür

Tam ifade olarak bulunmadı. Fakat ürün davranışı olarak yasaklandı: Gmail'den gelen hareketler butonla manuel onaya düşürülmeyecek, otomatik sinyal oluşturacak.

### Demo

`Demo` ifadesi çok sayıda dosyada var.

Örnek dosyalar:

- `supabase_finans_demo_seed.sql`
- `FINANCE_SETUP.md`
- `QA_CHECKLIST.md`
- `DECISIONS.md`
- `NEXT_ACTIONS_FINANCE.md`
- `APERION_FINANCE_CHANGELOG.md`
- `finans-takvimi.html`
- `finans-komuta-merkezi.html`
- `finance-command-center-live.html`
- `finance-command-center.html`
- `finans-onay-merkezi-final.html`

Karar: Demo veriler geliştirme/test için kalabilir; ancak canlı ekranda gerçek veri gibi görünemez. Canlıda veri yoksa “veri kaynağı bağlı değil” veya “kaynak bekleniyor” yazılmalıdır.

## 3. Banka onay / BizimHesap durumu

Repo’da banka onay hattı için şu dosyalar bulundu:

- `banka_onay_bildir.js`
- `tools/build_bank_approval_status_v76.cjs`
- `tools/approve_bank_candidate_v70.cjs`
- `tools/select_bank_approval_candidate_v69.cjs`
- `tools/verify_bank_candidate_approval_guard_v70.cjs`
- `tools/check_bank_candidate_queue_proof_v71.cjs`
- `tools/preview_pending_bank_to_bizimhesap_plan.cjs`
- `data/aperion_bank_approval_status.json`
- `.github/workflows/bank-approval-status.yml`

`data/aperion_bank_approval_status.json` mevcut snapshot'ında:

- `safe_mode: true`
- `live_rpc_called: false`
- `live_bizimhesap_save_called: false`
- `preview_count: 25`
- `candidate_count: 6`
- `low_risk_count: 3`
- `review_count: 19`
- `ready_queue_count: 0`
- `proof_queue_status: queue_yok`

Bu, şu an canlı BizimHesap kaydı yapılmadığını doğrular.

## 4. Mevcut seçili aday ile kullanıcının son konuşmadaki İş Bankası ID 33-35 bilgisi çakışıyor

Repo snapshot'ında seçili aday:

- Banka: Turkiye Is Bankasi
- Tarih: 2026-07-05
- Tutar: 2.026,00 TL
- Tip: POS tahsilati
- Hedef: BizimHesap banka tahsilati
- Pending id: `0cd1e230-2254-4908-a9a0-15a3d8678e38`

Kullanıcının son sohbet notunda ise:

- İş Bankası son 30 gün ID 26-50 kuyruğa alındı.
- ID 26-32 detaylı formatla Telegram'a gönderildi.
- ID 33-35 kullanıcı tarafından onaylandı.
- BizimHesap'a işlenen kayıt: 0.

Karar: Bu iki durum karıştırılmayacak. Önce repo/sistem içindeki gerçek onay durumu okunmalı. Sadece kanıtlanmış onaylı kayıtlar BizimHesap'a işlenebilir.

## 5. Güvenlik / key taraması

`sb_publishable` ifadesi birçok dosyada bulundu.

Önemli ayrım:

- Supabase publishable/anon key frontend’de bulunabilir.
- Service role key, Gmail refresh token, BizimHesap şifresi, Telegram bot token gibi yetkili gizli değerler frontend’e veya dokümana yazılamaz.

Karar: Bir sonraki güvenlik turunda özellikle şunlar aranmalı:

- `service_role`
- `GOOGLE_REFRESH_TOKEN`
- `GMAIL_CLIENT_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `BIZIMHESAP`
- `password`
- `cookie`
- `authorization`

## 6. Bir sonraki güvenli iş

Kodla canlı kayıt atmadan önce yapılacaklar:

1. Onay durum dosyaları ve Supabase snapshotları okunacak.
2. ID 33-35 için gerçekten onay var mı kanıtlanacak.
3. Kanıt yoksa BizimHesap'a işlem yapılmayacak.
4. Kanıt varsa önce dry-run/preview çalışacak.
5. İşlenecek kayıtların önerilen BizimHesap hedefi raporlanacak.
6. Kullanıcı açık onay verirse yalnızca o kayıtlar işlenecek.
7. İşlem sonrası tekrar BizimHesap okunup doğrulama yapılacak.

## 7. Sıradaki teknik hedef

**AperiON iSTasyon Banka Onay Durum Birleştirici** hazırlanmalı.

Bu araç:

- `data/aperion_bank_approval_status.json`
- onay kuyruğu dosyaları
- Telegram onay durumları
- BizimHesap queue dry-run çıktısı

verilerini tek raporda birleştirmeli ve şunu söylemelidir:

- Onaylı ama işlenmemiş kayıtlar
- Bekleyen kayıtlar
- Reddedilen kayıtlar
- İşlenmiş ve doğrulanmış kayıtlar
- Kanıtı eksik kayıtlar

Bu rapor çıkmadan toplu BizimHesap kaydı yapılmayacaktır.
