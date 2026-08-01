# AperiON iSTasyon – Mimari, Çalışma Modeli ve Yayın

Bu dosya `ARCHITECTURE.md`, `OPERATING_MODEL.md`, `DEPLOYMENT_MODEL.md`,
`ALWAYS_ON_ASSISTANT_MODEL.md` ve `CHATGPT_CONTINUITY_PROTOCOL.md`'nin branch
stratejisi bölümünün 2026-07-31 tarihli birleşimidir. Kaynak dosyaların
tamamı `docs/archive/` altındadır.

## 1. Canlı adres (kesin, 2026-07-31 doğrulandı)

**Kanonik adres: `https://aperion-istasyon.pages.dev/`**

Doğrulanmış yönlendirme zinciri: `_redirects` → `/aperion.html` (302) →
`aperion.html` meta-refresh → **`aperion-ust-akil.html`** (gerçek, canlı ana
ekran).

- GitHub Pages (`ercanalayli.github.io/iSTasyon`) sadece yedek/preview
  amaçlıdır; canlı finansal karar için kullanılmaz (bkz. `docs/DECISIONS.md`
  D-018).
- `aperion-home.html`, `aperion-home-v2.html`, `aperion-home-v3.html` terk
  edilmiş adaylardır; canlı değildir. Eski dokümanlarda bu dosyalardan biri
  "ana ekran" olarak geçiyorsa artık **geçerli değildir** — bu, önceki
  `DEPLOYMENT_MODEL.md`'deki "Cloudflare Pages henüz canlı değil / GitHub
  Pages hızlı başlangıç" çerçevesinin düzeltilmiş halidir. Cloudflare Pages
  fiilen canlıdır ve kanonik hedeftir; GitHub Pages artık sadece yedektir.

`index.html` (repo kökünde, canlı değil) hâlâ `<title>AperiON - ErpaltH</title>`
taşıyor ve production kaynağının GitHub Pages/Netlify olduğunu iddia eden bayat
bir yorum içeriyor — ikisi de D-018 ile çelişiyor. Canlı dosya olmadığı için
öncelik düşük ama UI/dashboard temizliği sırasında düzeltilmelidir.

## 2. Sekiz ana motor

AperiON iSTasyon 8 ana motor üzerine kuruludur.

### 2.1 Veri Toplama Motoru

Kaynaklardan ham veriyi toplar. Karar vermez, kayıt işlemez.

Kaynaklar: Gmail, banka ekstreleri, BizimHesap, Moka / POS, e-Fatura /
e-Arşiv, ÜTS, satış raporları, masraf raporları, Telegram, GitHub Actions,
manuel kullanıcı girişi.

### 2.2 Kimliklendirme Motoru

Her kaydın ne olduğunu belirler: banka ekstresi, vadesiz hesap hareketi,
kredi kartı ekstresi, FAST/EFT/dekont, POS banka aktarımı, e-Fatura,
vergi/SGK, Moka hareketi, şahsi abonelik, operasyon uyarısı.

### 2.3 Bilgi Zenginleştirme Motoru

Kayıt karar verilebilir hale getirilir. Zorunlu kanıt alanları: kaynak,
belge adı, gönderen, tarih/saat, banka/hesap, tutar, açıklama, karşı taraf,
referans/hash, bakiye, ham ekstre satırı, PDF sayfa no veya dosya satırı.

### 2.4 Karar Motoru

Kayıt için önerilen aksiyonu belirler: zaten işlenmiş, eksik, şüpheli,
mükerrer, onay bekliyor, transfer, tahsilat, tedarikçi ödemesi, gider,
sadece arşiv.

### 2.5 Onay Motoru

Kullanıcıya kanıtlı karar ekranı sunar. Kullanıcı onayı olmadan riskli veya
finansal kayıt BizimHesap'a yazılmaz.

### 2.6 İşleme Motoru

Sadece onaylanmış kayıtları hedef sisteme işler. Hedefler: BizimHesap,
AperiON kayıtları, arşiv, Telegram bildirimleri.

### 2.7 Doğrulama Motoru

İşlemden sonra hedef sistemi tekrar okur. Kontroller: kayıt gerçekten oluştu
mu, tutar doğru mu, tarih doğru mu, hesap doğru mu, bakiye/mutabakat uyumlu
mu.

### 2.8 Üst Akıl / Operasyon Merkezi

Tüm sinyalleri tek ekranda gösterir: bugün kritik, bankalar, Gmail,
e-Fatura, Moka/POS, kredi kartı/KMH/kredi, satış/stok, risk ve gecikenler,
tamamlananlar.

### Yasak mimari davranışlar

- Kaynağı belli olmayan kritik görev üretmek.
- Demo veriyi gerçek gibi göstermek.
- Gmail'den geleni kullanıcı butonuyla manuel onaya düşürtmek (otomatik
  sinyal üretmeli, buton zorunluluğu olmamalı).
- Finansal kaydı kanıtsız onaya göndermek.
- Kullanıcı onayı olmadan BizimHesap'a kayıt atmak.
- Aynı banka hareketini ikinci kez işlemek.

## 3. Çalışma modeli (roller)

AperiON iSTasyon her işi kendi içinde yapan dev bir muhasebe/ERP programı
**olarak şişirilmeyecektir**.

Doğru model:

**ChatGPT / Codex / otomasyonlar = üst akıl ve işlem motoru**
**AperiON iSTasyon = kokpit / dashboard / onay ve kontrol paneli**

### 3.1 ChatGPT

Görevleri: üst akıl, karar destek, sistem tasarımı, kuralları netleştirme,
kullanıcıdan gelen ekran görüntüsü/metin/dosya/açıklama yorumlama,
Codex/GitHub görev talimatı üretme, günlük operasyon raporu, hata/çelişki
yakalama.

ChatGPT kalıcı veritabanı değildir. Kalıcı kararlar `/docs` dosyalarına,
operasyon kayıtları Supabase/kuyruklara yazılmalıdır.

### 3.2 Codex / GitHub geliştirme katmanı

Görevleri: kod yazma, repo düzenleme, workflow kurma, test ekleme,
parser/worker geliştirme, dashboard ve otomasyon dosyalarını güncelleme.

Codex yoksa ChatGPT repo üzerinde güvenli değişiklikler yapabilir; ancak
finansal canlı işlemde kanıt/onay/doğrulama zinciri bozulmaz.

**Kod sahipliği ayrımı (Telegram iş akışı için):**

- ChatGPT tarafı: `aperion-home-v3.html` / dashboard veri kartları, gider,
  kart, abonelik ve banka görünürlük dosyaları, genel kural ve iş akışı
  dokümanları.
- Codex tarafı: `functions/telegram/`, `telegram/`,
  `tools/ensure_telegram_webhook.cjs`,
  `.github/workflows/telegram-watchdog.yml`, Supabase quick capture
  migrationları, Cloudflare Telegram endpoint entegrasyonu.

Aynı dosya üzerinde eş zamanlı çalışma yapılmamalıdır.

### 3.3 GitHub Actions / Worker katmanı

Görevleri: Gmail okuma, banka ekstrelerini işleme, BizimHesap queue worker
çalıştırma, Telegram bildirimleri, smoke test/health check, periyodik
kontrol. Bu katman otomasyon motorudur.

### 3.4 Supabase / veri katmanı

Görevleri: kalıcı kayıt, queue, onay durumu, audit log, mükerrer kontrol,
operasyon merkezi verisi. Chat geçmişi veya ekran görüntüsü tek başına
kalıcı kayıt kabul edilmez.

### 3.5 AperiON iSTasyon dashboard

Görevleri: tek ekranda bugünkü durumu göstermek, banka/Gmail/BizimHesap/
Moka/ÜTS/satış sinyallerini göstermek, onay bekleyenleri göstermek,
riskleri göstermek, kanıt ekranına yönlendirmek, işlenen/tamamlanan
kayıtları göstermek.

AperiON dashboard işlemin kendisini gizli şekilde yapmaz; işlem
motorlarının durumunu açıkça gösterir.

### 3.6 Telegram

Görevleri: hızlı onay, kritik uyarı, onaylandı/reddedildi/işlendi durum
güncellemesi.

### Veri akışı

```
Kaynak veri → Parser/worker → Supabase queue → ChatGPT/Codex kuralı
→ AperiON dashboard → Telegram/onay → BizimHesap worker → doğrulama
→ audit log → dashboard güncelleme
```

### Kritik sınırlar

- ChatGPT tek başına muhasebe kayıt sistemi değildir.
- Codex tek başına operasyon merkezi değildir.
- AperiON sadece süs dashboard değildir; kanıt, onay ve durum gösteren
  gerçek kokpittir.
- BizimHesap'a kayıt yalnızca onaylı queue üzerinden yapılır.
- Canlı kayıt sonrası doğrulama olmadan işlem tamamlandı sayılmaz.

### Ürün tanımı

AperiON iSTasyon bir "işletme işletim sistemi"dir. Görsel yüzü dashboard;
beyni ChatGPT/Codex/kurallar; hafızası Supabase/GitHub docs; kas gücü
GitHub Actions/worker otomasyonlarıdır.

## 4. Yayın modeli (deployment)

### 4.1 Hibrit yapı (fiili, 2026-07-31)

- **Cloudflare Pages**: ana kokpit, kanonik canlı hedef —
  `https://aperion-istasyon.pages.dev/`.
- GitHub repo: kod ve doküman kaynağı (`ercanalayli/iSTasyon`, `main`
  branch).
- GitHub Pages: yedek/ön izleme linki, production kararı için kullanılmaz.
- Supabase: queue, onay, audit log ve operasyon kayıtları.
- GitHub Actions / worker: Gmail, banka, Moka, BizimHesap ve periyodik
  otomasyonlar.
- Telegram: hızlı onay ve uyarılar.
- ChatGPT / Codex: üst akıl, karar, kod ve kural güncelleme.
- BizimHesap: resmi kayıt hedefi.

### 4.2 Cloudflare Pages neden hedef

- Mobil ve masaüstü erişim için daha iyi yayın katmanı.
- Özel domain yönetimi.
- Statik dashboard + serverless fonksiyonları aynı platformda büyütme
  imkanı.
- Cloudflare Access ile kokpit giriş ekranı/kimlik kontrolü eklenebilir.
- Worker/Pages Functions ile hassas API çağrıları tarayıcıya gizli anahtar
  koymadan yapılabilir.

### 4.3 Sınırlar

Cloudflare Pages de tek başına muhasebe sistemi değildir. Gizli oturum
bilgileri, yetkili anahtarlar, tam hesap/kart bilgileri ve ayrıntılı kişisel
finans verileri public dashboard içine yazılmayacaktır. Dashboard yalnızca
maskeli ve karar vermeye yetecek özetleri gösterir. Canlı finansal kayıtlar
tarayıcıdan doğrudan yapılmaz; kayıtlar onaylı queue üzerinden worker
tarafından işlenir.

### 4.4 Deploy güvencesi

Deploy workflow'u repository-scoped Cloudflare credential'ları gerektirir ve
sadece `main`'den deploy eder (bkz. `docs/DECISIONS.md` D-018). Eksik secret
sessizce "deploy edilmiş gibi" davranmaz; gate açıkça başarısız olur.

## 5. Her zaman hazır asistan modeli

Kullanıcı webhook, env, token, deploy, "bot canlı mı" gibi teknik durumları
takip etmeyecek. Bu durumlar sistem sağlığı konusudur ve AperiON tarafından
otomatik izlenir.

### 5.1 Beklenen davranış örneği

Kullanıcı sadece şunu yazar:

```
Sena Medikal 10 Temmuz 100 bin ödeme kredi kartı
```

Sistem: mesajı alır → ödeme notu açar → ödeme yöntemini okur → kritik ödeme
listesine ekler → hatırlatma/alarm üretir → dashboard'da gösterir →
gerekirse Telegram'dan kısa cevap döner. 5 saniye içinde kayıt açmalı veya
hata varsa net sebep bildirmelidir. **Sessiz kalmak kabul edilemez.**

### 5.2 Her zaman hazır olması gereken katmanlar

1. **Giriş kanalı**: Telegram bot, iPhone Kestirme/Siri, dashboard hızlı not
   ekranı, ileride WhatsApp Helper.
2. **Karşılama katmanı**: Cloudflare Pages Function/Worker —
   `/telegram/webhook` veya `/api/quick-note`.
3. **Hafıza ve kuyruk**: Supabase `quick_notes`, `payment_promises`, audit
   log.
4. **Sağlık kontrolü**: Telegram webhook, Cloudflare endpoint, Supabase
   bağlantı health check; son başarılı hızlı not zamanı; son hata mesajı.
5. **Alarm ve görünürlük**: dashboard kritik ödemeler kartı, Telegram geri
   bildirim, Google Calendar / günlük ve haftalık ödeme özeti.

### 5.3 Her zaman canlılık stratejisi

Sistem tek bir bota veya tek bir otomasyona bağlı kalmaz:

```
Telegram Bot → Cloudflare Function → Supabase
Siri/Kestirme → Cloudflare Function → Supabase
Dashboard Hızlı Not → Cloudflare Function → Supabase
```

Bir kanal geçici sorun yaşarsa diğer kanal kullanılabilir. Kullanıcıdan her
seferinde `/start` yazması veya webhook kontrolü beklenmez; bunlar otomatik
kontrol edilir ve dashboard'da sağlık durumu olarak gösterilir (örn.
`Telegram Quick Capture: CANLI` / `HATA` + sebep + yedek giriş kanalı).

### 5.4 Teknik yapılacaklar (bu modelin tamamlanması için)

1. Cloudflare Telegram webhook env değişkenleri tamamlanacak.
2. Supabase quick capture tabloları çalıştırılacak.
3. Telegram webhook beklenen adrese bağlanacak.
4. `tools/check_telegram_health.cjs` düzenli çalışacak.
5. Dashboard sistem sağlığı kartı `telegram_health_status.json` veya
   Supabase health view okuyacak.
6. Siri/iPhone Kestirme aynı quick-note endpointine bağlanacak.
7. Hata olduğunda dashboard veya Kestirme yedek giriş olarak çalışacak.

## 6. Branch stratejisi

### 6.1 Doğrudan `main` üzerinde yapılabilecekler

- `/docs` kararları
- Changelog
- Kural dosyaları
- Test/verifier ekleri
- Read-only rapor scriptleri

### 6.2 Ayrı branch ile yapılması gerekenler (canlı işleyişi etkileyen kod)

- BizimHesap kayıt worker değişikliği
- Supabase SQL değişikliği
- GitHub Actions canlı save davranışı
- Telegram onay akışı
- Banka parser değişiklikleri

Branch isim standardı:

```
aperion/<modul>-<kisa-is>-YYYYMMDD
```

Örnekler:

```
aperion/bank-kmh-moka-rules-20260708
aperion/bizimhesap-posting-guard-20260708
aperion/dashboard-bank-status-20260708
```

Not: ChatGPT connector doğrudan branch oluşturamazsa güvenli dokümantasyon
main'e yazılır; canlı riskli kod için Codex/yerel Git/PR tercih edilir.
