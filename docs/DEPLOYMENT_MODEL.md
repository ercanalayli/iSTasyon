# AperiON iSTasyon – Yayınlama Modeli

## Ana karar

AperiON iSTasyon kokpiti şu aşamada GitHub Pages üzerinde yayınlanan statik bir dashboard olarak çalışacaktır.

Bu karar dashboard için geçerlidir; kayıt, otomasyon ve veri işleme katmanı ayrı çalışır.

## Hibrit yapı

- GitHub Pages: kokpit, özet ekranlar, yönlendirme ve güvenli özetler
- Supabase: queue, onay, audit log ve operasyon kayıtları
- GitHub Actions / worker: Gmail, banka, Moka, BizimHesap ve periyodik otomasyonlar
- Telegram: hızlı onay ve uyarılar
- ChatGPT / Codex: üst akıl, karar, kod ve kural güncelleme
- BizimHesap: resmi kayıt hedefi

## Neden bu model?

- Hızlı yayına alınır.
- Mobil ve masaüstünde linkle açılır.
- Dashboard hafif kalır.
- Ekran katmanı ile canlı işlem motoru ayrılır.
- Hatalı bir ekran güncellemesi doğrudan finansal kayıt oluşturmaz.
- Commit geçmişi ile değişiklik izlenir.

## Sınırlar

GitHub Pages yalnızca kokpit katmanıdır.

Gizli oturum bilgileri, yetkili anahtarlar, tam hesap/kart bilgileri ve ayrıntılı kişisel finans verileri public dashboard içine yazılmayacaktır.

Dashboard yalnızca maskeli ve karar vermeye yetecek özetleri gösterir.

Canlı finansal kayıtlar tarayıcıdan doğrudan yapılmaz. Kayıtlar onaylı queue üzerinden worker tarafından işlenir.

## Uzun vadeli seçenek

Hassas veri için giriş ekranı ve kullanıcı bazlı yetki gerekiyorsa GitHub Pages yanında korumalı backend katmanı gerekir.

Önerilen uzun vadeli yapı:

- GitHub Pages veya benzeri statik arayüz
- Supabase Auth / RLS
- Edge Function veya Worker katmanı
- Audit log
- Onay queue
- BizimHesap worker doğrulaması

## Sonuç

Şu aşamada en sağlam başlangıç yolu GitHub Pages kokpit + Supabase queue + GitHub Actions worker + Telegram onay + BizimHesap hedef sistem modelidir.
