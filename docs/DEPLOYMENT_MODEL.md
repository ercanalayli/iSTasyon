# AperiON iSTasyon – Yayınlama Modeli

## Ana karar

AperiON iSTasyon için iki aşamalı yayın modeli kullanılacaktır.

### Aşama 1 – Hızlı başlangıç

Kokpit GitHub Pages üzerinde yayınlanır.

Amaç:

- Hızlı görmek
- Linkle telefondan ve bilgisayardan açmak
- Tasarım ve veri kartlarını test etmek
- Repo ile otomatik güncellenen statik kokpit elde etmek

### Aşama 2 – Hedef yayın katmanı

Kalıcı ve daha sağlam erişim katmanı Cloudflare Pages olacaktır.

Amaç:

- Telefondan, bilgisayardan ve internet olan her yerden hızlı erişim
- Özel alan adı ile temiz kullanım
- Daha iyi CDN ve performans
- Cloudflare Access ile giriş/koruma seçeneği
- Pages Functions / Worker ile güvenli backend katmanına geçiş imkanı

## Hibrit yapı

- Cloudflare Pages: ana kokpit, özel domain, güvenli erişim katmanı
- GitHub repo: kod ve doküman kaynağı
- GitHub Pages: hızlı yedek/ön izleme linki
- Supabase: queue, onay, audit log ve operasyon kayıtları
- GitHub Actions / worker: Gmail, banka, Moka, BizimHesap ve periyodik otomasyonlar
- Telegram: hızlı onay ve uyarılar
- ChatGPT / Codex: üst akıl, karar, kod ve kural güncelleme
- BizimHesap: resmi kayıt hedefi

## Neden Cloudflare hedef?

- Mobil ve masaüstü erişim için daha iyi yayın katmanı sunar.
- Özel domain yönetimi daha uygundur.
- Statik dashboard ile gerektiğinde serverless fonksiyonları aynı platformda büyütme imkanı verir.
- Cloudflare Access ile kokpit giriş ekranı/kimlik kontrolü eklenebilir.
- Worker/Pages Functions ile hassas API çağrıları tarayıcıya gizli anahtar koymadan yapılabilir.

## Sınırlar

Cloudflare Pages de tek başına muhasebe sistemi değildir.

Gizli oturum bilgileri, yetkili anahtarlar, tam hesap/kart bilgileri ve ayrıntılı kişisel finans verileri public dashboard içine yazılmayacaktır.

Dashboard yalnızca maskeli ve karar vermeye yetecek özetleri gösterir.

Canlı finansal kayıtlar tarayıcıdan doğrudan yapılmaz. Kayıtlar onaylı queue üzerinden worker tarafından işlenir.

## Önerilen nihai yapı

- `aperion.alaylimedikal.com` veya benzeri özel domain
- Cloudflare Pages ana kokpit
- GitHub repo otomatik deploy kaynağı
- Supabase Auth / RLS veya Cloudflare Access ile koruma
- Supabase queue ve audit log
- GitHub Actions / worker otomasyonları
- Telegram onay
- BizimHesap kayıt/doğrulama workerı

## Şu anki pratik kullanım

Bugün GitHub Pages linki kullanılabilir:

```text
https://ercanalayli.github.io/iSTasyon/aperion.html
```

Kalıcı hedef Cloudflare Pages olacaktır.

## Sonuç

En sağlam yol:

```text
Cloudflare Pages kokpit + Supabase queue/audit + GitHub Actions worker + Telegram onay + BizimHesap hedef sistem + ChatGPT/Codex üst akıl
```

GitHub Pages hızlı başlangıç ve yedek ön izleme olarak kalır.
