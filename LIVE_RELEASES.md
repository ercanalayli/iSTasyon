# AperiON Canlı Sürüm ve Geri Dönüş Haritası

Bu dosya canlı kullanımda küçük küçük ilerlemek ve beğenilmeyen değişikliği hızlı geri almak için tutulur.

## Aktif canlı kullanım kuralı

- Küçük değişiklikler doğrudan `main` hattına uygulanır.
- Her önemli canlı değişiklikten önce geri dönüş noktası alınır.
- Eski sistem silinmez.
- Ana adres her zaman `_redirects` dosyasıyla kontrol edilir.
- Kullanıcı beğenmezse ana adres bir önceki çalışan ekrana alınır.

## Canlı ana adres

```text
https://aperion-istasyon.pages.dev/
```

## Kök yönlendirme dosyası

```text
_redirects
```

Şu anki aktif kök hedef:

```text
/ /aperion-home.html 200
```

## Geri dönüş noktaları

### v1 — AperiON Ana Ekran kabuğu

- Branch: `backup/live-aperion-home-v1`
- Commit: `e6942c865f3131a8476fd3b7ff70b10649e26252`
- Ana hedef: `/aperion-home.html`
- İçerik: Sol menülü AperiON ana ekranı + finans kokpiti iframe.

Geri dönmek için `_redirects`:

```text
/ /aperion-home.html 200
```

### v0 — Finans kokpiti tek ekran

- Ana hedef: `/finans-v54.html`
- İçerik: Sade canlı finans kokpiti.

Geri dönmek için `_redirects`:

```text
/ /finans-v54.html 200
```

### Eski ERP paneli

- Ana hedef: `/index.html`
- İçerik: Önceki AperiON / iSTasyon paneli.

Geri dönmek için `_redirects`:

```text
/ /index.html 200
```

## Komut mantığı

Kullanıcı şunlardan birini söylerse:

```text
Bir önceki sürüme dön
Eski panele dön
Finans kokpitine dön
AperiON ana ekrana dön
```

Yapılacak işlem sadece `_redirects` dosyasını güncellemektir. Böylece dosyalar silinmez, geri dönüş hızlı olur.

## Kontrol botu

Canlı ana ekran kontrol dosyası:

```text
tools/verify_aperion_live_home_fetch.cjs
```

Workflow:

```text
.github/workflows/aperion-live-home-check.yml
```

Bu bot ana adreste AperiON kabuğu görünüyor mu diye kontrol eder.
