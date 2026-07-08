# AperiON iSTasyon – Çalışma Modeli

Bu dosya AperiON iSTasyon'un ürün/mimari çalışma modelini tanımlar.

## Ana karar

AperiON iSTasyon her işi kendi içinde yapan dev bir muhasebe/ERP programı olarak şişirilmeyecektir.

Doğru model:

**ChatGPT / Codex / otomasyonlar = üst akıl ve işlem motoru**

**AperiON iSTasyon = kokpit / dashboard / onay ve kontrol paneli**

## Roller

### 1. ChatGPT

Görevleri:

- Üst akıl
- Karar destek
- Sistem tasarımı
- Kuralları netleştirme
- Kullanıcıdan gelen ekran görüntüsü, metin, dosya ve açıklamaları yorumlama
- Codex/GitHub görev talimatı üretme
- Günlük operasyon raporu çıkarma
- Hataları ve çelişkileri yakalama

ChatGPT kalıcı veritabanı değildir. Kalıcı kararlar `/docs` dosyalarına, operasyon kayıtları Supabase/kuyruklara yazılmalıdır.

### 2. Codex / GitHub geliştirme katmanı

Görevleri:

- Kod yazma
- Repo düzenleme
- Workflow kurma
- Test ekleme
- Parser/worker geliştirme
- Dashboard ve otomasyon dosyalarını güncelleme

Codex yoksa ChatGPT repo üzerinde güvenli değişiklikler yapabilir; ancak finansal canlı işlemde kanıt/onay/doğrulama zinciri bozulmaz.

### 3. GitHub Actions / Worker katmanı

Görevleri:

- Gmail okuma
- Banka ekstrelerini işleme
- BizimHesap queue worker çalıştırma
- Telegram bildirimleri
- Smoke test / health check
- Periyodik kontrol

Bu katman otomasyon motorudur.

### 4. Supabase / veri katmanı

Görevleri:

- Kalıcı kayıt
- Queue
- Onay durumu
- Audit log
- Mükerrer kontrol
- Operasyon merkezi verisi

Chat geçmişi veya ekran görüntüsü tek başına kalıcı kayıt kabul edilmez.

### 5. AperiON iSTasyon dashboard

Görevleri:

- Tek ekranda bugünkü durumu göstermek
- Banka/Gmail/BizimHesap/Moka/ÜTS/satış sinyallerini göstermek
- Onay bekleyenleri göstermek
- Riskleri göstermek
- Kanıt ekranına yönlendirmek
- İşlenen/tamamlanan kayıtları göstermek

AperiON dashboard, işlemin kendisini gizli şekilde yapmayacak; işlem motorlarının durumunu açıkça gösterecektir.

### 6. Telegram

Görevleri:

- Hızlı onay
- Kritik uyarı
- Onaylandı/reddedildi/işlendi durum güncellemesi

## Veri akışı

Kaynak veri → Parser/worker → Supabase queue → ChatGPT/Codex kuralı → AperiON dashboard → Telegram/onay → BizimHesap worker → doğrulama → audit log → dashboard güncelleme

## Ne neden böyle?

Bu modelin avantajı:

- AperiON dashboard hafif ve anlaşılır kalır.
- Üst akıl ChatGPT/Codex tarafında esnek kalır.
- Kalıcı kayıt Supabase/GitHub dokümanlarında tutulur.
- Finansal işlem otomasyonları test ve workflow üzerinden yönetilir.
- Kullanıcı tek yerden görür ama sistemin arkasında ayrı güvenlik katmanları çalışır.

## Kritik sınırlar

- ChatGPT tek başına muhasebe kayıt sistemi değildir.
- Codex tek başına operasyon merkezi değildir.
- AperiON sadece süs dashboard değildir; kanıt, onay ve durum gösteren gerçek kokpittir.
- BizimHesap'a kayıt yalnızca onaylı queue üzerinden yapılır.
- Canlı kayıt sonrası doğrulama olmadan işlem tamamlandı sayılmaz.

## Ürün tanımı

AperiON iSTasyon bir “işletme işletim sistemi”dir.

Ancak görsel yüzü dashboard; beyni ChatGPT/Codex/kurallar; hafızası Supabase/GitHub docs; kas gücü GitHub Actions/worker otomasyonlarıdır.
