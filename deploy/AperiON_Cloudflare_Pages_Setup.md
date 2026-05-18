# AperiON Cloudflare Pages Kurulum Rehberi

## Amaç

AperiON iSTasyon projesini Cloudflare Pages üzerinde ayrı ve kontrollü şekilde yayınlamak.

## Kritik güvenlik kuralı

```text
yenicespor-finans silinmeyecek.
yenicespor-finans AperiON değildir.
AperiON için ayrı Cloudflare Pages projesi açılacak.
```

## Önerilen Cloudflare proje adı

```text
aperion-istasyon
```

Alternatif:

```text
aperion-erpalth-istasyon
```

## Kaynak repo

```text
GitHub: ercanalayli/iSTasyon
```

## Production branch

Önerilen:

```text
main
```

Not:

```text
Draft PR branch doğrudan production yapılmayacak.
Önce PR testleri bitecek, sonra main'e merge kararı verilecek.
```

## Build ayarları

AperiON tek dosya / static HTML yapısına yakın çalıştığı için önerilen ilk kurulum:

```text
Framework preset: None / Static HTML
Build command: boş bırak
Build output directory: /
Root directory: boş bırak veya repo root
```

Cloudflare UI farklı gösterirse:

```text
Build command istemiyorsa boş geç.
Output directory zorunluysa / veya . denenir.
```

## İlk yayın kontrolü

Kurulumdan sonra Cloudflare şu tarz bir URL verir:

```text
https://aperion-istasyon.pages.dev
```

Kontrol edilecek sayfalar:

```text
/
/index.html
/finans-komuta-merkezi.html
/finance-command-center-live.html
/preview/aperion_v53_financial_center_preview.html
```

## Yayın sonrası yapılacaklar

- Ana sayfa açılıyor mu?
- Finans Komuta Merkezi linki var mı?
- v53 preview açılıyor mu?
- Gelir Tablosu + Bilanço preview düzgün görünüyor mu?
- Mobil görünüm bozuluyor mu?
- Eski GitHub Pages yayını çalışmaya devam ediyor mu?

## Korunan kurallar

```text
Önceki özellikler silinmez.
Yenicespor Cloudflare projesine dokunulmaz.
Main branch izinsiz değiştirilmez.
Deploy kararı kullanıcı onayıyla verilir.
K/M kısaltma kullanılmaz.
Açık tema korunur.
```

## Cloudflare ekranda takip edilecek yol

```text
Cloudflare Dashboard
Workers & Pages
Create application
Pages
Connect to Git
GitHub seç
ercanalayli/iSTasyon reposunu seç
Project name: aperion-istasyon
Production branch: main
Build ayarlarını gir
Save and Deploy
```

## Not

Eğer GitHub repo listede görünmezse:

```text
GitHub bağlantı yetkisi genişletilecek.
Cloudflare GitHub App içinde ercanalayli/iSTasyon repo izni verilecek.
```
