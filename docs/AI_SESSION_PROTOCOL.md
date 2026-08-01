# AperiON iSTasyon – AI Oturum / Geliştirme Protokolü

Bu dosya `CODEX_MASTER_PROMPT_APERION.md` (temel/en tam), `CODEX_HANDOFF_TELEGRAM_FIRST.md`,
`CODEX_PROMPT_TELEGRAM_PRIMARY_CHANNEL.md` (Telegram iş akışı bölümüne
katlandı) ve `CHATGPT_CONTINUITY_PROTOCOL.md`'nin devir-teslim mesaj
şablonunun 2026-07-31 tarihli birleşimidir. Kaynak dosyalar `docs/archive/`
altındadır. Yeni oturum başlatma sırası için önce `docs/START_HERE.md`'yi
okuyun — bu dosya, bir iş oturumuna (ChatGPT/Codex fark etmeksizin) *nasıl*
çalışılacağını, START_HERE ise *hangi sırayla ne okunacağını* tanımlar.

Bu dosya AperiON için tek ve birleşik ana geliştirme talimatıdır. Ayrı
promptlar yalnızca teknik ek olarak kabul edilir. Her AI oturumu bu dosyayı
baştan sona okuyacak, mevcut çalışan yapıyı koruyacak ve işleri küçük, test
edilebilir adımlarla tamamlayacaktır.

## 1. Projenin rolü

Repo: `ercanalayli/iSTasyon`. Canlı kokpit:
`https://aperion-istasyon.pages.dev/` (kanonik zincir `docs/ARCHITECTURE.md`
bölüm 1'de — **not:** kaynak dokümanda burada eski `aperion-home-v3.html`
adresi yazıyordu, bu artık geçerli değil, gerçek canlı hedef
`aperion-ust-akil.html`'dir).

AperiON bir muhasebe ekranı değildir. Kullanıcının ŞAHSİ hayatı ile ALAYLI
Medikal şirketinin finans, belge, varlık, yükümlülük, operasyon ve mevzuat
bilgisini tek merkezde yöneten CFO/COO kokpiti ve üst akıldır.

Sistem şu sorulara her an cevap verebilmelidir: Bugün ne kritik? Bu ay
hangi ödemeler var? Hangileri ödendi, hangileri açıkta? Hangi fatura,
ekstre, tahakkuk veya belge gelmedi? Hangi banka, kredi kartı veya KMH
riskli? Hangi belge nerede ve hangi karta bağlı? Şahsi ve şirket toplam
varlıkları, borçları ve net değerleri nedir? Hangi resmi yükümlülük veya
mevzuat değişikliği kullanıcıyı etkiliyor?

## 2. ŞAHSİ / ALAYLI ayrımı

Her kayıt zorunlu olarak şu sınıflardan birine girer: `ALAYLI`, `SAHSI`,
`BELIRSIZ`. Belirsiz kayıt kullanıcıya yalnızca eksik sınıflandırma
sorularak tamamlanır; aynı bilgi tekrar sorulmaz.

Şahsi bir gider şirket hesabından ödendiyse kayıt silinmez veya şirket
giderine dönüştürülmez: gider sahibi ŞAHSİ, ödeme kaynağı ALAYLI banka/kart,
muhasebe sonucu ortak cari/şahsi harcama kontrolü olarak tutulur.

Ayrıntılı kart, veri ve gider standartları için `docs/DATA_MODEL_AND_STANDARDS.md`
ve `docs/OPERATIONS_RULES.md`.

## 3. Ödeme Merkezi (Today's Critical Payments and Deadlines)

Ana ekran adı: `Today's Critical Payments and Deadlines`. Bu ekran
kartlardan üretilir ve her zaman **mutlak tarih** gösterir.

Yanlış: "Her ayın 5'i", "Ay sonu", "En geç 25", "Fatura geldiğinde".
Doğru: "5 Temmuz 2026", "25 Temmuz 2026", "31 Temmuz 2026", faturanın
gerçek son ödeme tarihi.

Her satır: tarih, kalan gün, ŞAHSİ/ALAYLI, ödeme kartı, tutar, durum,
otomatik ödeme, ödeme hesabı, kanıt, aç butonu.

Durumlar: Belge Bekleniyor, Tahakkuk Bekleniyor, Ödeme Hazır, Onay
Bekliyor, Ödeme Yaklaşıyor, Bugün, Kısmen Ödendi, Ödendi, Bankadan
Doğrulandı, Gecikti.

Kronolojik sıralama zorunludur: geçmiş vadeler en üstte kırmızı, bugün
olanlar sonra, ardından en yakın gelecek tarih.

## 4. Aylık vergi ve SGK takip motoru

Her ayın başında ALAYLI için ana görev açılır: `ALAYLI Vergi ve SGK —
YYYY/AA`. Beklenen belgeler: aylık ödeme listesi, KDV beyannamesi ve
tahakkuku, Muhtasar ve Prim Hizmet Beyannamesi ve tahakkuku, SGK
tahakkukları, Geçici Vergi (ilgili dönemde), Kurumlar Vergisi (yıllık
dönemde), GEKAP (ilgili dönemde), damga vergileri ve diğer tahakkuklar.

Gmail'den belge gelene kadar görev açık kalır; belge kısmen geldiyse
yalnızca eksik belge gösterilir.

Durum zinciri: `Belge Bekleniyor → Eksik Belge Var → Belgeler Tamam → Ön
Kontrol → Ödeme Bekleniyor → Kısmen Ödendi → Ödemeler Tamam → Bankadan
Doğrulandı → Tamamlandı`.

Alarm: 7 gün kala bilgi, 3 gün kala uyarı, 1 gün kala kritik, vade geçerse
gecikme alarmı. Beyanname veya tahakkuk tek başına görevi kapatmaz; banka
hareketi ya da dekontla ödeme doğrulanmadan işlem tamamlanmaz.

## 5. Varlık kartları, değerleme ve mevzuat takibi

Her motosiklet, otomobil, gayrimenkul ve önemli demirbaş ayrı varlık
kartıdır (alan listeleri `docs/DATA_MODEL_AND_STANDARDS.md`). Mevzuat
bilgisi güncel kaynaklardan kontrol edilir; değişiklik kullanıcıya etkisiyle
birlikte ilgili karta bağlanır. Eski bilgiye dayanarak kesin hüküm verilmez.

ŞAHSİ ve ALAYLI ayrı bilançolar üretilir. Her varlık kartında:
`acquisition_value, current_market_value, valuation_date, valuation_method,
valuation_sources, confidence_score, manual_override, value_history`.

Değerleme sıklığı: banka/nakit günlük veya veri geldikçe; döviz/altın/menkul
kıymet güncel piyasa verisiyle; araç/motosiklet aylık piyasa ortalaması;
gayrimenkul aylık/üç aylık piyasa ortalaması; stok maliyet ve tahmini net
satış değeri; demirbaş amortisman ve ikinci el değeri.

Aylık rapor — **ŞAHSİ**: toplam varlık, toplam borç, net servet, likit
varlık, 30 günlük yükümlülük, aylık değer değişimi. — **ALAYLI**: toplam
varlık, toplam borç, öz değer, nakit ve nakit benzeri, cari alacak/borç,
stok, finansal borç, vergi/SGK borcu, 30 günlük ödeme ihtiyacı, likidite ve
borçluluk göstergeleri.

Her değerin kaynağı ve güven skoru gösterilir; kaynaksız tahmini değer
kesin rakam gibi sunulmaz.

## 6. Telegram — ana iletişim kanalı

Telegram, AperiON'un ana iletişim ve kontrol kanalıdır. Kokpit ana görünüm,
Telegram aktif iletişim katmanıdır. Telegram üzerinden: hızlı not, ödeme
bildirimi, fatura/belge gönderimi, görev, alarm, onay, belge isteme, ödeme
sonucu teyidi, günlük kritik özet çalışır.

Kullanıcıya hazır olmadan test yaptırılmaz. `/api/telegram-preflight`
`ok=true` ve `ready_for_user_test=true` vermeden test istenmez.

### 6.1 Telegram-first çalışma alanı sınırı (Codex tarafı)

Sadece şu alanlarda çalışılır: `functions/telegram/`, `telegram/`,
`tools/ensure_telegram_webhook.cjs`,
`.github/workflows/telegram-watchdog.yml`, Telegram quick capture için
gerekli Supabase migration dosyaları. **Şu dosyalara dokunulmaz:**
`aperion-home-v3.html`, `giderler.html`, mevcut finans dashboard dosyaları
(ChatGPT tarafının sorumluluğu — bkz. `docs/ARCHITECTURE.md` bölüm 3.2 kod
sahipliği ayrımı).

Hedef: Telegram'a yazılan düz metin şu türlerden birine ayrılsın:
`quick_note, payment_note, invoice_note, task_note, approval_command,
unknown`. Her mesaj tek kez kaydedilsin (mükerrer anahtar chat id +
message id).

Zorunlu akış: gelen Telegram update doğrulanır → düz metin parse edilir →
ALAYLI/ŞAHSİ/BELİRSİZ sınıfı belirlenir → Supabase quick capture kaydı
oluşturulur → kullanıcıya kısa teyit döner → finansal işlemse kullanıcı
onayı olmadan BizimHesap kaydı yapılmaz → hata olursa sessizce kaybolmaz,
log ve sağlık durumuna yazılır.

Hazır kabul şartı — preflight endpoint şunu doğrulamadan kullanıcıya test
yaptırılmaz: webhook endpoint erişilebilir, bot kimliği doğrulanmış,
veritabanı bağlantısı çalışıyor, quick capture tablosu erişilebilir,
webhook doğru adrese bağlı, `ready_for_user_test: true`.

Watchdog: webhook adresini kontrol eder, kopuksa yeniden bağlar, Telegram
tarafındaki son hatayı raporlar, endpoint sağlık kontrolünü yapar,
başarısızsa workflow kırmızı olur.

P0 testleri (en az): `/start` komutu cevap verir; düz not kaydı oluşur;
ödeme notu parse edilir; aynı message id ikinci kez kaydedilmez; veritabanı
erişilemezse anlamlı hata döner; eksik ortam ayarında preflight `false`
döner; hazır ortamda preflight `true` döner.

### 6.2 Zorunlu environment / secret kontrolü

Aşağıdaki değerler kod içine yazılmayacak: `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_WEBHOOK_SECRET_TOKEN`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`. Kontrol yerleri: GitHub Actions repository
secrets; Cloudflare Pages environment variables; gerekirse production/
preview ayrımı.

### 6.3 Telegram giriş tipleri, parse alanları, teyit ve onay standardı

Bkz. `docs/OPERATIONS_RULES.md` bölüm 4.7 (tek doğruluk kaynağı — burada
tekrar edilmez).

### 6.4 Codex tamamlanma raporu (Telegram işi için)

```
Değiştirilen dosyalar:
Eklenen testler:
Secret/env eksikleri:
Preflight sonucu:
Webhook sonucu:
Kullanıcı testine hazır mı:
Kalan riskler:
```

### 6.5 Yasaklar (Telegram)

Tokenı source code veya public repo içine yazmak; hazır olmadan kullanıcıya
`/start` testi yaptırmak; ŞAHSİ girdiyi ALAYLI'ye otomatik yazmak; sadece
tutar gösteren eksik onay mesajı; kullanıcı onayı olmadan finansal kayıt;
aynı Telegram mesajını iki kez kaydetmek.

## 7. Güvenlik ve onay (değişmez zincir)

```
Kanıt → Kullanıcı Onayı → Queue → Dry-run → Canlı Kayıt → Geri Doğrulama
→ Kokpit/Telegram Teyidi
```

Şifre, PIN, CVV, SMS kodu, internet bankacılığı parolası hiçbir zaman
saklanmaz. Hassas veriler özel depoda ve yetki kontrollü tutulur — dört
seviye: Genel, Hassas, Gizli, Sisteme alınmayacak çok gizli. Finansal kayıt
kullanıcı açık onayı olmadan BizimHesap'a yazılmaz (ayrıntı:
`docs/OPERATIONS_RULES.md`).

## 8. BizimHesap ilişkisi (özet)

BizimHesap mevcut finans kayıt kaynağıdır. AperiON kartları ve hareketleri
BizimHesap ile eşleştirir ancak körlemesine yeniden kayıt oluşturmaz. POS
tahsilatının ertesi gün bankaya yatması gelir değil transferdir; Moka
tahsilatı ile bankaya yatış ayrı hareketlerdir (tam kural:
`docs/OPERATIONS_RULES.md`).

Aktif kasa kartları: ALAYLI TL Kasası, POS Kredi Kartı Kasası, Moka Sonova
POS Kasası, TL Kasası, Kira Depozito Kasası. Aktif ortak hesabı yalnızca
Ercan Alaylı'dır. Veresiye hesapları kullanılmıyor.

## 9. Denetim izi

Her kritik işlemde saklanır: kaynak, yükleyen, oluşturan, değiştiren,
onaylayan, tarih-saat, önceki değer, yeni değer, belge, kart, ödeme
doğrulaması.

## 10. Çalışma biçimi kuralları

Önce okunacak dosyalar: `docs/START_HERE.md` (okuma sırasını verir),
`docs/CURRENT_STATUS.md`, sonra ilgili modül dosyaları (bkz.
START_HERE'deki liste).

Kurallar: çalışan yapıyı bozma; aynı dosyada paralel çalışma yapma; küçük
commitler; her commit sonrası test; gerçek test çalışmadan başarılı deme;
kullanıcıya gereksiz teknik iş yükleme; hazır olmayan sistemi test
ettirme.

### Uygulama sırası

- **P0:** master kart veritabanı; belge arşivi ve kart-belge ilişkisi;
  ödeme merkezi ve mutlak tarih motoru; aylık vergi/SGK belge bekleme
  motoru; banka hareketiyle ödendi doğrulaması; Telegram belge/ödeme/onay
  akışı.
- **P1:** varlık kartları; varlık değerleme geçmişi; ŞAHSİ ve ALAYLI
  bilanço/net değer; resmi yükümlülük ve mevzuat takibi.
- **P2:** tedarikçi/müşteri/ürün/cari kartlarının genişletilmesi; gelişmiş
  risk ve tahmin motoru.

### Tamamlanma kriterleri

İş ancak şu koşullarda tamamdır: kartlar kalıcı depoda; belgeler güvenli
arşivde; doğal dille belge erişimi çalışıyor; ödeme listesi mutlak
tarihlerle kronolojik; belge/tahakkuk gelmezse görev açık; ödeme banka
hareketiyle doğrulanmadan kapanmıyor; ŞAHSİ/ALAYLI ayrımı doğru; Telegram
hazır ve kullanıcıya teyit veriyor; mükerrer kontrolü var; denetim izi var;
kamuya açık alanda hassas veri yok; ŞAHSİ ve ALAYLI bilanço ayrı
üretilebiliyor; varlık değerlerinin kaynak ve güven skoru var.

## 11. İş sonu raporu (her oturumun sonunda)

Tek rapor ver:

```
Yapılanlar:
Değişen dosyalar:
Testler ve sonuçları:
Canlı bağlantılar:
Kalanlar:
Riskler:
Kullanıcının yapması gereken tek zorunlu işlem:
```

Yoğun çalışma sonunda mutlaka güncellenecek dosyalar: `docs/CURRENT_STATUS.md`,
`docs/CHANGELOG.md`.

## 12. Sohbet şişerse / yeni oturuma geçiş şablonu

*(kaynak: `CHATGPT_CONTINUITY_PROTOCOL.md`)* Sohbet şiştiğinde iş
kaybolmaz; canlı durum ve kararlar repo içindeki dosyalara yazılır. Yeni
sohbet açılabilir — buna teknik anlamda her zaman Git branch açmak gerekmez,
ama "branch açmak" gibi davranılır.

Yeni sohbete yapıştırılacak devir-teslim mesajı (bkz. `docs/START_HERE.md`
ile aynı fikir, burada kısa hatırlatma olarak tutulmuştur):

```text
AperiON iSTasyon buradan devam.
Önce repo içindeki docs/START_HERE.md dosyasını oku.
START_HERE içindeki zorunlu okuma listesini sırayla oku.
Sonra bana sadece şu başlıklarla özet ver:
1. Yapılanlar
2. Kalanlar
3. Riskler
4. Sıradaki Adım
5. Okuduğun dosyalar
Eksik okuduğun dosya varsa işlem başlatma, önce bildir.
```

Günlük çalışma akışı: kullanıcı banka ekran görüntüsü/mail/dosya/emir
gönderir → AI veriyi sınıflandırır → gerekirse repo kurallarını günceller →
kayıt gerekiyorsa queue/onay/dry-run zincirini ister → canlı kayıt yapmadan
önce kullanıcıya açık risk ve kayıt listesini gösterir → yapılanları
`docs/CHANGELOG.md` ve `docs/CURRENT_STATUS.md`'ye işler.

Bu dosya AperiON için tek ana AI oturum/geliştirme protokolüdür.
