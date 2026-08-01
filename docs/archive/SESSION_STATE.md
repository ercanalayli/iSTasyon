# AperiON iSTasyon – Güncel Oturum Durumu

Tarih: 2026-07-08

## Aktif çalışma modeli

AperiON iSTasyon artık her şeyi kendi içinde yapan dev program olarak değil, kokpit/dashboard/onay merkezi olarak kurgulanacaktır.

Çalışma modeli:

- ChatGPT / Codex: üst akıl ve işlem yöneticisi
- GitHub repo: kalıcı kural ve kod hafızası
- Supabase: queue, onay, audit log ve operasyon verisi
- GitHub Actions / worker: otomasyon motoru
- Telegram: hızlı onay ve kritik alarm
- BizimHesap: resmi kayıt hedefi
- AperiON iSTasyon: dashboard/kokpit

## Bugünkü ana kararlar

- Doğru proje adı: AperiON iSTasyon.
- İş Bankası banka mutabakatı pilot iş olarak kalacak.
- Banka ekran görüntüleri günlük kanıt katmanı olarak kullanılacak.
- Excel/PDF ekstre resmi mutabakat kaynağı olacak.
- POS banka yatışları tahsilat değil transferdir.
- MokaUnited banka yatışları tahsilat değil Moka ara hesaptan bankaya transferdir.
- KMH-ANAPARA BORCU TAHSİLATI gider değil KMH ana para kapama / banka-KMH virmanıdır.
- Batch komisyonu banka/POS komisyon gideridir.
- Gelen FAST hareketleri cari eşleşmesi gerektiriyorsa onaya düşer.

## Repo’ya eklenen temel dosyalar

- `docs/VISION.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/BANK_RULES.md`
- `docs/GMAIL_RULES.md`
- `docs/BIZIMHESAP_RULES.md`
- `docs/TELEGRAM_RULES.md`
- `docs/AUTOMATION_RULES.md`
- `docs/UI_STANDARDS.md`
- `docs/ROADMAP.md`
- `docs/CHANGELOG.md`
- `docs/REPO_AUDIT_2026-07-08.md`
- `docs/OPERATING_MODEL.md`
- `docs/CHATGPT_CONTINUITY_PROTOCOL.md`

## Kod tarafında yapılan önemli düzeltmeler

- `tools/bank_posting_plan.cjs`
  - POS banka yatışları transfer yoluna alındı.
  - MokaUnited banka yatışları Moka banka transferi olarak sınıflandırıldı.
  - KMH ana para tahsilatı KMH ana para kapama olarak sınıflandırıldı.
  - POS/Moka/KMH hareketlerinde `source_account` ve `target_account` alanları üretilecek.

- `tools/select_bank_approval_candidate_v69.cjs`
  - Pilot banka önceliği eklendi.
  - İş Bankası pilot aday varsa başka bankadan aday ilk sıraya alınmayacak.

- `tools/merge_bank_approval_status_v82.cjs`
  - Birleşik banka onay durum raporu eklendi.

- `tools/verify_bank_candidate_pilot_scope_v83.cjs`
  - Pilot banka seçim testi eklendi.

- `finance_smoke_test.cjs`
  - POS transfer testi güncellendi.
  - Moka transfer ve KMH ana para kapama testleri eklendi.

- `.github/workflows/bank-approval-status.yml`
  - Birleşik banka durum raporu üretimi bağlandı.
  - Pilot banka ortam değişkeni `BANK_APPROVAL_PILOT_BANK=IS BANKASI` olarak eklendi.
  - Pilot kapsam testi workflow’a eklendi.

## Görselden okunan banka örnekleri

### Yapı Kredi

- ALAYLI MEDİKAL vadesiz/aktif hesap.
- Güncel bakiye: -114.770,22 TL.
- Esnek hesap limiti: 115.000,00 TL.
- Kullanılabilir bakiye: 229,78 TL.
- Risk: KMH limiti bitmeye yakın.

Görünen hareketler:

- 06/07/2026 04:12 POS +433,18 TL → POS banka transferi.
- 06/07/2026 20:26 KMH-ANAPARA BORCU TAHSİLATI -433,18 TL → KMH ana para kapama.
- 02/07/2026 09:47 MokaUnited-Sanal Pos Ödemesi +2.740,00 TL → Moka banka transferi.
- 02/07/2026 20:20 KMH-ANAPARA BORCU TAHSİLATI -2.740,00 TL → KMH ana para kapama.

### VakıfBank

- Vadesiz TL hesap.
- Bakiye: 87.971,34 TL.
- Kullanılabilir bakiye: 117.971,34 TL.

Görünen hareketler:

- 08 Temmuz 07:47 Batch Yatan +26.485,00 TL → POS banka transferi.
- 08 Temmuz 07:47 Batch Komisyonu -475,95 TL → Banka/POS komisyon gideri.
- 07 Temmuz 16:40 Gelen FAST Anlık Ödeme UMUTELİ... +20.100,00 TL → Cari tahsilat adayı / onay gerekli.
- 07 Temmuz 10:34 Gelen FAST Anlık Ödeme YÜKSEL DEMİREL - SONDA ÜCRETİ +8.712,00 TL → Cari tahsilat adayı / onay gerekli.

## Güvenlik durumu

- Sohbetten canlı BizimHesap kaydı atılmadı.
- Supabase RPC canlı çalıştırılmadı.
- Telegram’a yeni onay gönderilmedi.
- GitHub workflow manuel tetiklenemedi.
- Canlı kayıt için hâlâ zincir zorunlu: kanıt → onay → queue → dry-run → kayıt → doğrulama.

## Kalan açık işler

- `docs/BANK_RULES.md` dosyasına Moka ve KMH kuralları açıkça eklenmeli.
- `docs/NEXT_ACTION.md` güncellenmeli.
- BizimHesap queue worker’ın transfer formunda source/target hesap alanlarını gerçekten nasıl doldurduğu canlı/dry-run ile doğrulanmalı.
- İş Bankası ID 33-35 onay durumu gerçek sistem kanıtıyla doğrulanmalı.
- Operasyon Merkezi banka kartı birleşik status raporunu göstermeli.
