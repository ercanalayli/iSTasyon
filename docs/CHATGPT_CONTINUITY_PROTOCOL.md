# AperiON iSTasyon – ChatGPT Süreklilik Protokolü

Bu dosya, sohbet şiştiğinde veya yeni sohbete geçildiğinde AperiON iSTasyon işlerinin kopmaması için kullanılacak çalışma protokolüdür.

## Ana karar

ChatGPT/Codex bu sistemin üst akıl ve işlem yöneticisi olarak kullanılabilir. AperiON iSTasyon ise kokpit/dashboard/onay ekranı olarak çalışır.

Sohbet şiştiğinde iş kaybolmayacak; canlı durum ve kararlar repo içindeki dosyalara yazılacak.

## Sohbet şişerse ne yapılacak?

Yeni sohbet açılabilir. Buna “branch açmak” gibi davranılır ama teknik anlamda her zaman Git branch açılması gerekmez.

Yeni sohbet açıldığında ilk mesaj şu olmalıdır:

```text
AperiON iSTasyon buradan devam.
Önce repo içindeki şu dosyaları oku:
- docs/SESSION_STATE.md
- docs/NEXT_ACTION.md
- docs/OPERATING_MODEL.md
- docs/BANK_RULES.md
- docs/BIZIMHESAP_RULES.md
- docs/CHANGELOG.md
Sonra bana Yapılanlar / Kalanlar / Riskler / Sıradaki Adım olarak özet ver.
```

## Her oturum sonunda güncellenecek dosyalar

Her yoğun çalışma sonunda şu iki dosya güncellenmelidir:

- `docs/SESSION_STATE.md`
- `docs/NEXT_ACTION.md`

Bu iki dosya yeni sohbetin başlangıç hafızasıdır.

## Teknik branch stratejisi

### 1. Dokümantasyon ve güvenli kural değişiklikleri

Bunlar doğrudan `main` üzerinde yapılabilir:

- `/docs` kararları
- Changelog
- Kural dosyaları
- Test/verifier ekleri
- Read-only rapor scriptleri

### 2. Canlı işleyişi etkileyen kod değişiklikleri

Bunlar mümkünse ayrı branch ile yapılmalıdır:

- BizimHesap kayıt worker değişikliği
- Supabase SQL değişikliği
- GitHub Actions canlı save davranışı
- Telegram onay akışı
- Banka parser değişiklikleri

Branch isim standardı:

```text
aperion/<modul>-<kisa-is>-YYYYMMDD
```

Örnek:

```text
aperion/bank-kmh-moka-rules-20260708
aperion/bizimhesap-posting-guard-20260708
aperion/dashboard-bank-status-20260708
```

Not: ChatGPT connector doğrudan branch oluşturamazsa güvenli dokümantasyon main’e yazılır; canlı riskli kod için Codex/yerel Git/PR tercih edilir.

## İş paketi standardı

Her iş paketi şu formatla tutulur:

```text
Amaç:
Kapsam:
Dokunulacak dosyalar:
Canlı risk var mı:
Test:
Kabul kriteri:
Geri alma planı:
```

## Finansal canlı işlem kuralı

Canlı finansal kayıt için zorunlu zincir:

```text
Kanıt → Onay → Queue → Dry-run → Canlı kayıt → Geri doğrulama → Log → Dashboard güncelleme
```

Bu zincirden biri eksikse BizimHesap’a kayıt atılmaz.

## Günlük çalışma akışı

Kullanıcı banka ekran görüntüsü, mail, dosya veya emir gönderir.

ChatGPT:

1. Veriyi sınıflandırır.
2. Gerekirse repo kurallarını günceller.
3. Kayıt gerekiyorsa queue/onay/dry-run zincirini ister.
4. Canlı kayıt yapmadan önce kullanıcıya açık risk ve kayıt listesini gösterir.
5. Yapılanları `CHANGELOG.md` ve `SESSION_STATE.md` dosyasına işler.

## Yeni sohbette ilk kontrol

Yeni sohbette önce şunlar okunur:

1. `docs/SESSION_STATE.md`
2. `docs/NEXT_ACTION.md`
3. `docs/OPERATING_MODEL.md`
4. İlgili modül kural dosyası
5. `docs/CHANGELOG.md`

Bunlar okunmadan yeni işlem başlatılmaz.

## Kısa tanım

Sohbet geçici beyin alanıdır.
Repo dosyaları kalıcı hafızadır.
Supabase kuyruk ve kayıt hafızasıdır.
AperiON dashboard görünen kokpittir.
BizimHesap resmi kayıt hedefidir.
