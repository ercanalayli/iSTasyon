# AperiON iSTasyon – Operasyon Kuralları (tek doğruluk kaynağı)

Bu dosya, finansal ve operasyonel otomasyonun **tüm** kurallarının tek
doğruluk kaynağıdır. Kaynaklar: `BANK_RULES.md`, `BIZIMHESAP_RULES.md`,
`GMAIL_RULES.md`, `TELEGRAM_RULES.md`, `AUTOMATION_RULES.md`,
`EXPENSE_CLASSIFICATION_RULES.md`, `PERSONAL_FINANCE_RULES.md`,
`APERION_MAIL_EKSTRE_OTOMASYON_PLANI_v1.md`,
`APERION_MAIL_AUTOMATION_FINAL_ROUTE_v1.md`, `MAIL_EKSTRE_TEST_KAPISI_v1.md`,
`ALAYLI_AUTOPAY_INVENTORY.md`, `ALAYLI_GARANTI_ACCOUNT.md`. Tüm kaynaklar
`docs/archive/` altındadır.

**BU DOSYA GÜVENLİK-KRİTİKTİR.** Gerçek finansal kurallar ve gerçek
(maskelenmiş) hesap verisi içerir. Bir kural veya rakam hakkında emin
değilseniz, sessizce tahmin etmek yerine kullanıcıya sorun.

## 0. Ortak kanıt zinciri (tüm modüller için tek kural, tekrar edilmez)

Her modülün kendi bölümünde tekrar tekrar yazdığı zincir tek ve değişmezdir:

```
Kanıt → Kullanıcı Onayı → Supabase Queue → Dry-run → Canlı Kayıt (tek kayıt denemesi)
→ BizimHesap'tan Geri Doğrulama → Queue processed → Dashboard/Telegram Güncelleme
```

**Bu zincirden biri eksikse BizimHesap'a canlı kayıt yapılmaz.** Aşağıdaki
her bölüm (banka, BizimHesap, Gmail, Telegram, otomasyon, gider, şahsi
finans) bu zinciri varsayar; ayrıca tekrar yazmaz, sadece kendine özgü
istisna/ek kuralları belirtir.

## 1. Banka kuralları

Banka ekstreleri, POS hareketleri, KMH/kredi kartı ve BizimHesap mutabakat
kurallarının tek doğruluk kaynağı bu bölümdür.

### 1.1 Genel akış

1. Banka ekstresi Gmail, dosya veya manuel yükleme ile alınır.
2. Ekstre satır satır okunur.
3. BizimHesap ilgili banka hesabı okunur.
4. Kayıtlar ayrılır: zaten işlenmiş / eksik / muhtemel eşleşen / şüpheli /
   yanlış hesap-tür / mükerrer.
5. Eksikler kanıtlı şekilde onaya gönderilir.
6. Kullanıcı onayı olmadan BizimHesap'a kayıt atılmaz.
7. Onaylanan kayıtlar işlenir.
8. İşlem sonrası BizimHesap tekrar okunur ve doğrulama yapılır.

### 1.2 İş Bankası pilot durumu

İş Bankası pilot banka olarak kabul edilmiştir; **İş Bankası tamamlanmadan
diğer bankalara geçilmemelidir**.

Bilinen durum (2026-07-08 itibarıyla, henüz yeniden doğrulanmadı):

- Son 1 yıl ekstresi okundu: 648 hareket.
- BizimHesap'ta görülen: 189 hareket.
- Net eşleşen: 173. Muhtemel eşleşen: 2. Eksik görünen: 473.
- Onay kuyruğuna hazır: 469.
- Son 30 gün için ID 26-50 arası 25 hareket kuyruğa alındı.
- ID 26-32 detaylı formatla Telegram'a gönderildi.
- **ID 33-35 kullanıcı tarafından onaylandı ama BizimHesap'a kayıt atılan
  işlem: 0** — yani onay var, işleme henüz yapılmadı. Bu bir "kaybolan iş"
  değil, "işlenmeyi bekleyen onaylı iş"tir (bkz. `docs/CURRENT_STATUS.md`).

### 1.3 POS kuralı

POS kredi kartı ile tahsil edilen tutarların ertesi gün bankaya yatması
**tahsilat değildir**.

- İşlem tipi: transfer.
- Kaynak hesap: `POS POS POS KREDI KARTI`.
- Hedef hesap: paranın yattığı banka hesabı (örn. `*İŞ BANKASI`).

Güven 100/100 olsa bile kullanıcı onayı olmadan BizimHesap'a otomatik
yazılmaz.

### 1.4 Moka / KMH / Batch sınıflandırma kuralları

*(Bu bölüm 2026-07-08'de eklenmesi planlanmıştı ama 2026-07-31'e kadar hiç
işlenmemişti; kaynak `docs/DECISIONS.md` D-017 "Moka United POS
tahsilatının banka aktarımı" kararıyla birlikte 2026-07-31'de eklendi.)*

- **Moka United POS aktarımı:** Açıklamasında "Moka United" geçen ve şirket
  banka hesabına giren hareketler, `*MOCA SONOVA POS KREDI KARTI` kaynaklı
  POS tahsilat aktarımı olarak sınıflanır. Hedef, kaynak ekstredeki şirket
  banka hesabıdır (İş Bankası için `*IS BANKASI`). Bu hareketler Emanet
  hesabına veya cariye kaydedilmez — Moka United sadece kartlı tahsilatın
  aracısıdır; aynı paranın ikinci kez gelir/cari kaydı olarak oluşturulması
  mutabakatı bozar.
- **KMH ana para kapama:** "KMH-ANAPARA BORCU TAHSİLATI" açıklamalı
  hareketler KMH ana para kapama olarak sınıflanır, **gider değildir**.
- **Batch komisyonu:** "Batch Komisyonu" açıklamalı hareketler banka/POS
  komisyon gideri olarak sınıflanır.
- **Gelen FAST:** Cari tahsilat adayı olarak işaretlenir; cari netleşmeden
  otomatik kayıt atılmaz.

Görsel örnekler (Yapı Kredi, 2026-07-06): `POS +433,18 TL` →POS banka
transferi; aynı gün `KMH-ANAPARA BORCU TAHSİLATI -433,18 TL` → KMH ana para
kapama. `MokaUnited-Sanal Pos Ödemesi +2.740,00 TL` (02/07) → Moka banka
transferi; aynı gün `KMH-ANAPARA BORCU TAHSİLATI -2.740,00 TL` → KMH ana
para kapama.

VakıfBank (2026-07-08): `Batch Yatan +26.485,00 TL` → POS banka transferi;
`Batch Komisyonu -475,95 TL` → banka/POS komisyon gideri; `Gelen FAST Anlık
Ödeme UMUTELİ... +20.100,00 TL` ve `... YÜKSEL DEMİREL - SONDA ÜCRETİ
+8.712,00 TL` → cari tahsilat adayı / onay gerekli.

### 1.5 Kredi kartı hesap özeti / duyuru e-postası kuralı

*(bkz. `docs/DECISIONS.md` D-027, eski numarası D-017 idi)* Kredi kartı
hesap özeti, aylık ekstre bildirimi veya duyuru e-postası **tek başına
banka hareketi değildir**. Ekteki satırlar tekil işlem/referans ile
ayrışmadan BizimHesap'a kayıt önerisi, kuyruk kaydı veya otomatik işlem
üretilmez. Konu satırındaki dönem/yıl, kredi kartı ya da POS kelimeleri
gerçek para hareketiyle karışabilir; kesin kayıt yalnızca tarih, tutar,
hesap ve tekil hareket kanıtı bir arada olduğunda yapılır.

### 1.6 Kanıt zorunluluğu

Onay ekranında ve Telegram mesajında şu bilgiler mümkün olduğunca
gösterilmelidir: banka, hesap, ekstre tarihi/saati, kaynak dosya/mail eki,
işlem kanalı, referans/hash, tutar, bakiye, açıklama, uzun açıklama, karşı
taraf, kaynak hesap, hedef hesap, PDF sayfa no veya Excel satır no, ham
ekstre satırı, AperiON yorumu.

Sadece "POS Otomatik", "NET SATIŞ TUTARI" veya benzeri kısa açıklama ile
onay alınmaz.

### 1.7 Mükerrer kontrol

Aynı hareket ikinci defa işlenmez. Banka hareketleri için `bank_row_key`
zorunludur. Mükerrer kontrol alanları: banka, hesap, tarih, saat, tutar,
açıklama, referans, belge hash, satır no.

### 1.8 Cari boşsa

Cari/karşı taraf tespit edilemiyorsa boş bırakılmaz. Gösterilecek ifade:
**"Cari eşleşmesi bekliyor"**.

### 1.9 Telegram durumları (banka)

- Onaya gönderildi: `ONAY BEKLİYOR - APERION`
- Onaylandı: `ONAYLANDI - APERION`
- Reddedildi: `REDDEDİLDİ - APERION`
- BizimHesap'a işlendi: `BİZİMHESAP'A İŞLENDİ - APERION`

### 1.10 Banka bazlı parser notları

- Excel gelen İş Bankası / VakıfBank ekstreleri önceliklidir.
- PDF gelen Halkbank ekstreleri için güvenilir PDF parser gereklidir.
- Fotoğraf/OCR son çare olarak kullanılmalıdır.

## 2. BizimHesap kuralları

BizimHesap, AperiON iSTasyon için hedef kayıt ve doğrulama sistemlerinden
biridir. **BizimHesap'a kayıt sadece İşleme Motoru üzerinden atılır** —
hiçbir Gmail parser, banka parser veya Telegram scripti doğrudan
BizimHesap'a körlemesine kayıt yazamaz.

### 2.1 İşleme öncesi zorunlu kontroller

Her kayıt için: kaynak belge var mı, kanıt var mı, mükerrer kontrol yapıldı
mı, cari/karşı taraf belli mi, hesap belli mi, işlem tipi belli mi,
kullanıcı onayı gerekiyor mu, kullanıcı onayı alındı mı.

### 2.2 İşlem tipleri

Tahsilat, tedarikçi ödemesi, gider, hesaplar arası transfer, kredi kartı
ödemesi, KMH/kredi işlemi, POS banka aktarımı, düzeltme, sadece arşiv.

### 2.3 POS banka aktarımı

POS ile tahsil edilen tutarın ertesi gün bankaya yatması tahsilat olarak
işlenmez; hesaplar arası transferdir. Kaynak örneği: `POS POS POS KREDI
KARTI`. Hedef örneği: `*İŞ BANKASI`, `*VAKIFBANK` veya ilgili banka hesabı.

### 2.4 Cari boşsa

**"Cari eşleşmesi bekliyor"** — bu kayıt kullanıcının düzelt/onay ekranında
tamamlamasına bırakılır.

### 2.5 Kayıt notu (AperiON izi)

AperiON tarafından işlenen kayıtların açıklamasında veya notunda şu iz
bulunmalıdır: **`AperiON AUTO`**. Örnek: `AperiON AUTO / İş Bankası
mutabakat / kaynak: 2026-06 ekstresi`.

### 2.6 İşlem sonrası doğrulama

BizimHesap'a kayıt atıldıktan sonra sistem tekrar BizimHesap'ı okur.
Kontrol: kayıt oluştu mu, tutar/tarih/banka hesabı/açıklama doğru mu,
mükerrer kayıt oluşmadı mı. **Doğrulama yapılmadan kayıt "tamamlandı"
sayılmaz.**

### 2.7 Durumlar

`approved` (onaylandı, henüz işlenmedi) → `processing` (işleniyor) →
`posted` (kayıt atıldı) → `verified` (doğrulandı) / `failed` (atılamadı
veya doğrulanamadı).

### 2.8 Güvenlik

BizimHesap kullanıcı bilgileri, tokenlar, şifreler ve oturum bilgileri
frontend'e veya dokümanlara açık yazılmaz; güvenli ortam değişkenleri veya
yerel güvenli çalışma alanında tutulur.

## 3. Gmail kuralları

Gmail, AperiON'un ana veri kaynaklarından biridir. Gmail'den gelen finans/
operasyon mailleri otomatik okunur, sınıflandırılır ve Operasyon
Merkezi'nde sinyal olarak gösterilir. **Gmail'den gelen kayıtlar doğrudan
işlenmez**: mail okunur → sınıflandırılır → ekler tespit edilir → kanıt
oluşturulur → mükerrer kontrol → Operasyon Merkezi'ne sinyal → gerekirse
onaya gider.

### 3.1 Ana mail kutusu ayrımı (kritik — karıştırılmamalı)

- **Doğru/ana hesap:** `alaylimedikal@gmail.com` — banka ekstresi
  otomasyonunun hedefi budur.
- **Bu akışa dahil olmayan hesaplar:** `alkammaliyonetim@gmail.com`,
  `ercanalayli@gmail.com`.
- ChatGPT içindeki Gmail bağlantısı hangi hesaba bağlıysa sadece o hesabı
  görür; gerçek otomasyon için `alaylimedikal@gmail.com`'un OAuth
  bağlantısı sistem tarafında ayrıca kurulmalıdır.

### 3.2 Takip edilecek mail türleri

Banka ekstresi, vadesiz hesap hareketi, kredi kartı ekstresi, FAST/EFT/
dekont, vergi bildirimi, SGK bildirimi, Moka United hareketi, BizimHesap
günlük finans bilgisi, BizimHesap e-Fatura bildirimi, tedarikçi faturası,
e-Arşiv/e-Fatura XML/HTML, ÜTS durum değişikliği, kritik operasyon
mailleri, şahsi abonelik ve ödeme uyarıları.

### 3.3 Her mail sinyalinde zorunlu alanlar

Kaynak (Gmail), gönderen, alıcı, konu, tarih/saat, okunma durumu, ek adı/
türü, sınıf, risk, önerilen aksiyon, kanıt özeti.

### 3.4 Risk mantığı

- **Yeşil:** bilgilendirme, düşük riskli şahsi harcama, acil aksiyon
  gerektirmeyen günlük ekstre.
- **Sarı:** banka ekstresi, detay eksik FAST/EFT, kredi kartı bildirimi,
  e-Fatura kontrolü.
- **Turuncu:** önemli bakiye içeren günlük finans özeti, ÜTS durum
  değişikliği, mutabakat gerektiren hareket.
- **Kırmızı:** vergi/SGK ödeme veya tahsilat sorunu, vade/son ödeme riski,
  kritik tedarikçi faturası, ödeme yöntemi sorunu, işlem başarısızlığı.

### 3.5 Yasak davranışlar

Kaynağı belli olmayan görev üretmek; eski otomasyon kalemini yeniymiş gibi
göstermek; "MT Fatura Bildirimi Bekliyor" gibi kanıtsız kayıt yazmak; mail
türünü belirtmeden kritik listeye almak; kredi kartı ekstresi ile vadesiz
hesap ekstresini karıştırmak.

### 3.6 Doğru / yanlış örnek

Doğru: `Kaynak: Gmail / Banka: VakıfBank / Belge: Vadesiz hesap ekstresi /
Ek: 00158007352192509.xlsx / Tarih: 08.07.2026 03:21 / Sınıf: ALAYLI / Risk:
Sarı / Durum: İncelenecek / İşlenecek yer: BizimHesap banka hareketleri`.

Yanlış: `"Vakıfbank geldi."` — eksik, kullanılmamalı.

### 3.7 OAuth / güvenlik

Gmail refresh token, client secret, API key gibi gizli bilgiler kodda,
frontend'de veya promptlarda açık yazılmaz; sadece GitHub Secrets/güvenli
ortam değişkenleri üzerinden kullanılır.

### 3.8 Gmail arama sorgu şablonları (mail ekstre otomasyonu)

Genel: `has:attachment newer_than:7d`

Banka bazlı aramalar:

- **İş Bankası:** `("Türkiye İş Bankası" OR "Turkiye Is Bankasi" OR "İş
  Bankası" OR "Is Bankasi" OR "Hesap Hareket" OR "Hesap Ekstre")
  has:attachment`
- **Yapı Kredi:** `("Yapı Kredi" OR "Yapi Kredi" OR "Hesap_Hareketleri" OR
  "Hesap_Ozeti" OR "Hesap Özeti") has:attachment`
- **Vakıfbank:** `("Vakıfbank" OR "Vakifbank" OR "E-Ekstre" OR "Hesap
  Özeti") has:attachment`
- **Halkbank:** `("Halkbank" OR "T.HALK BANKASI" OR "Hesap Ekstresi")
  has:attachment`
- **Garanti BBVA:** `("Garanti BBVA" OR "E-İmzalı Hesap Hareket" OR "Hesap
  Hareket Dökümü") has:attachment`

Zamanlama (planlanan, henüz tam otomatikleşmedi): gündüz 08:00-20:00 arası
her 15 dakika, gece 20:00-08:00 arası saatte 1 kez, artı manuel "Şimdi
kontrol et" butonu. Not: `APERION_ISTEKLER_VE_GORSELLER.md`'de kullanıcı
ayrıca sabit kontrol saatlerini 08:05→10:00 ve 19:05→17:00 olarak talep
etmişti; fiili günlük banka özeti workflow'u bugün 10:00 ve 17:00 İstanbul
saatlerinde çalışıyor (bkz. `docs/CHANGELOG.md` 2026-07-13 "Günlük Banka
Karar Akışı").

Pending kayıt şeması (`pending_bank_movements` hedefi):

```json
{
  "company_id": "alayli", "source": "gmail_bank_statement",
  "mailbox": "alaylimedikal@gmail.com", "bank_name": "İş Bankası",
  "mail_id": "...", "mail_subject": "...", "mail_from": "...",
  "mail_date": "...", "attachment_name": "...", "statement_id": "...",
  "statement_period": "...", "transaction_date": "...",
  "transaction_time": "...", "description": "...", "amount_in": 0,
  "amount_out": 0, "balance_after": 0, "detected_type": "tahsilat",
  "suggested_counterparty": "...", "confidence_score": 0,
  "status": "pending", "duplicate_key": "...", "created_at": "..."
}
```

Mükerrer kontrol anahtarı: `BANKA|statement_id|tarih|saat|giris|cikis|bakiye|aciklama_key`.
Aynı anahtar varsa yeni pending kaydı açılmaz, log'a mükerrer deneme
yazılır, kullanıcıya "zaten işlenmiş" sinyali verilir.

BizimHesap işleme kuyruk statüleri: `ready_for_bizimhesap`, `processing`,
`processed`, `failed`, `needs_review`.

### 3.9 Mail ekstre otomasyonu — açık test kapısı (henüz kapanmadı)

*(kaynak: `MAIL_EKSTRE_TEST_KAPISI_v1.md`)* Bu akış tamamlanmadan yeni
banka, yeni modül veya yeni özellik eklenmemesi kuralı geçerliydi.
Aşağıdaki uçtan uca cümle doğru olmadan iş bitmiş sayılmaz:

> "Mail geldi, AperiON otomatik aldı, analiz etti, pending'e attı, ben tek
> tuşla onayladım, kayıt BizimHesap kuyruğuna düştü."

Açık kalan test maddeleri (2026-07-31 itibarıyla `docs/CURRENT_STATUS.md`
ile çapraz kontrol edilmeli — bazıları o tarihten sonra ilerlemiş
olabilir):

- Aşama 1 — Gmail bağlantısı: `alaylimedikal@gmail.com` OAuth bağlantısı,
  arama, `has:attachment` görünürlüğü, banka bazlı sorgular.
- Aşama 2 — Ekstre okuma: PDF indirme/metin çıkarma, banka tipi algılama,
  doğru parser seçimi.
- Aşama 3 — Pending kayıt: en az 1 hareket, `amount_in`/`amount_out`/tarih/
  açıklama doğruluğu, `duplicate_key` oluşumu, aynı mail ikinci geldiğinde
  mükerrer oluşmaması.
- Aşama 4 — Onay Merkezi: pending kayıtların listelenmesi, toplam giriş/
  çıkışın doğruluğu, Onayla/Reddet butonlarının çalışması.
- Aşama 5 — BizimHesap kuyruğu: onaylanan kaydın `bizimhesap_queue`'ya
  düşmesi, `amount_in` için `create_collection`, `amount_out` için
  `create_payment`, `status: ready_for_bizimhesap`.

Bu test kapısı kapanmadan (kaynak dokümanın orijinal kuralı): yeni banka
parserına geçilmez, dashboard süslenmez, Moka derinleştirilmez, cari
modülü büyütülmez, başka iş açılmaz.

## 4. Telegram kuralları

Telegram, AperiON'da onay ve alarm kanalıdır. Mesajlar kısa olmalı ama
karar vermek için yeterli kanıtı içermelidir. **Telegram sadece bildirim
değil, kontrollü onay merkezidir.**

### 4.1 Onay mesajında zorunlu bilgiler

AperiON yorumu, işlem tipi önerisi, risk seviyesi, banka, hesap, tarih,
saat, tutar, açıklama, uzun açıklama, karşı taraf, kaynak hesap, hedef
hesap, referans, bakiye, PDF sayfa no veya Excel satır no, ham ekstre
satırı, onay linki.

### 4.2 Durum mesajları

`ONAY BEKLİYOR - APERION` → `ONAYLANDI - APERION` / `REDDEDİLDİ - APERION`
→ `BİZİMHESAP'A İŞLENDİ - APERION`; hata: `İŞLENEMEDİ - APERION`.

### 4.3 Batch yönetimi

Çok sayıda banka hareketi varsa Telegram'a yüzlerce mesaj aynı anda
gönderilmez. Önerilen sıra: 10'arlı batch → onaylananları işle → sonra
yeni batch gönder.

### 4.4 Onaylandıktan sonra görünüm

1. Mesaj metnini durumla güncelle.
2. Onay butonlarını pasifleştir veya kaldır.
3. İşlenince ayrıca "BİZİMHESAP'A İŞLENDİ - APERION" durumuna çek.

### 4.5 Yasak davranışlar

Sadece "2.400 TL" gibi eksik bilgi göndermek; karşı tarafı göstermemek;
açıklamayı kırpmak; onaylandı mı işlenmiş mi belirsiz bırakmak; aynı kaydı
tekrar tekrar onaya göndermek.

### 4.6 Telegram otomasyon görevi

Onay durumları periyodik olarak güncellenmelidir. Mevcut not: "AperiON
Telegram onay durumunu güncelle" otomasyonu 5 dakikada bir onay
durumlarını güncellemek üzere kurgulanmıştır.

### 4.7 Telegram giriş sınıfları ve parse alanları (quick capture / Telegram-first iş akışı)

Bot gelen düz metni şu sınıflardan birine ayırır: `quick_note`,
`payment_note`, `invoice_note`, `task_note`, `approval_command`, `unknown`.

Örnekler: "Sena Medikal 10 Temmuz 100000 TL ödenecek", "Uludağ elektrik
faturası geldi", "Yarın Mert'i ara", "İş Bankası 12500 TL transferi
onayla".

Zorunlu parsed alanlar: `company_class (ALAYLI|SAHSI|BELIRSIZ), entry_type,
counterparty, amount, currency, payment_method, bank_name, account_ref,
card_last4, due_date, transaction_date, source_message_id, source_chat_id,
raw_text, confidence, approval_required`.

Teyit mesajı standardı:

```
ALINDI – APERION
Tür: Ödeme
Sınıf: ALAYLI
Karşı taraf: Sena Medikal
Tutar: 100.000 TL
Vade: 10.07.2026
Durum: Takip ve onay kuyruğuna alındı
```

Belirsiz alan varsa sadece eksik alan sorulur. Mükerrer kontrol anahtarı:
`telegram:{chat_id}:{message_id}`.

Yasaklar (Telegram-first workflow'a özel): tokenı source code veya public
repoya yazmak; hazır olmadan kullanıcıya `/start` testi yaptırmak; ŞAHSİ
girdiyi ALAYLI'ye otomatik yazmak; sadece tutar gösteren eksik onay mesajı;
kullanıcı onayı olmadan finansal kayıt; aynı Telegram mesajını iki kez
kaydetmek.

## 5. Otomasyon kuralları

AperiON otomasyonları kontrollü çalışır. Amaç kullanıcıyı yormadan işleri
ilerletmek, fakat finansal riski kullanıcı onayı olmadan sisteme
yazmamaktır.

### 5.1 Otomasyon seviyeleri

- **Seviye 1 – Sadece bildir** (düşük risk): günlük hesap ekstresi geldi,
  BizimHesap günlük özet geldi, şahsi düşük riskli fatura geldi,
  operasyonel bilgi maili geldi. Sistem yalnızca bildirir ve Operasyon
  Merkezi'nde gösterir.
- **Seviye 2 – Onaya gönder** (orta/yüksek risk): banka hareketi, FAST/EFT/
  dekont, e-Fatura, tedarikçi faturası, POS banka aktarımı, kredi kartı/KMH
  işlemleri, cari eşleşmesi gerektiren kayıt. Kullanıcı onayı olmadan işlem
  yapılmaz.
- **Seviye 3 – Otomatik işle**: sadece çok güvenli ve tekrar eden kurallar
  için ileride açılabilir. **Başlangıçta kapalıdır.** 2026-08-01 itibarıyla
  **dar kapsamlı iki istisna açıldı**, bkz. 5.1.1.

#### 5.1.1 Seviye 3 istisnaları (2026-08-01, kullanıcı onayıyla açıldı)

Sadece şu iki dar durum otomatik işlenebilir, başka hiçbir kayıt tipi bu
kapsama girmez:

1. **`config/aperion_finance_rules.json`'daki `movement_overrides`** —
   kullanıcının tek tek, kalıcı olarak onayladığı belirli işlem ID'leri
   (örn. doğrulanmış Moka United POS aktarımları). Yeni bir override
   eklemek yine kullanıcı onayı gerektirir; bu liste büyüdükçe otomatik
   işlenen kapsam da büyür ama her giriş ayrı ayrı onaylanmıştır.
2. **`bank_unmatched_incoming` (para kesin geldi, karşı taraf belirsiz)**
   — `tools/bank_posting_plan.cjs`'in `classifyBankMovement` fonksiyonu bu
   türü tespit ettiğinde: para **gerçek banka hesabında** kalır (bakiye
   doğru olsun), karşı taraf/karşı hesap olarak **"EMANET - BANKA
   HAREKETLERİ / SINIFLANDIRMA BEKLEYEN"** hesabı işaretlenir (para o
   hesaba taşınmaz, sadece "sınıflandırma bekliyor" etiketi olarak
   kullanılır — bkz. `config/aperion_finance_rules.json`
   `suspense_account`). Kayıt `APERION AUTO-EMANET` iziyle işlenir
   (`bizimhesap_banka_bot.js` → `aperionAciklama()`). Bu istisna
   `tools/queue_unmatched_bank_incoming_v104.cjs` üzerinden çalışır;
   script hâlâ `--commit --confirm BANKA_GIRISI_ONAYLIYORUM` bayrağıyla
   tetiklenir — **günlük toplu tetikleme otomasyonu (zamanlanmış görev)
   henüz kurulmadı**, bu adım ayrıca kullanıcı onayı gerektirir.

Bu iki istisna dışındaki HER ŞEY (cari tahsilat, tedarikçi ödemesi, kredi
kartı borcu, vergi/SGK, fatura ödemesi, sınıflandırılamayan hareketler)
Seviye 2'de kalır — tek tek kullanıcı onayı olmadan işlenmez.

### 5.2 Finansal kayıt kuralı

Varsayılan davranış: **Onay olmadan BizimHesap'a yazma.** İki dar istisna
için bkz. 5.1.1 — bu istisnalar bile parayı gerçek hesaptan başka bir yere
taşımaz, sadece kanıtlı ve iz bırakan şekilde (APERION AUTO-EMANET)
sınıflandırma bekleyen olarak işaretler.

### 5.3 Mükerrer koruma

Aynı belge veya işlem tekrar gönderilebilir; sistem daha önce işlenenleri
süzer ve sadece işlenmeyenleri onaya getirir.

### 5.4 Kanıt kuralı

Her otomasyon kararı kanıt içermelidir: kaynak, belge, tarih/saat, tutar,
açıklama, ham veri, referans/hash. Kanıt yoksa kayıt otomatik işlenmez.

### 5.5 Günlük Operasyon Merkezi

Sabah tek rapor/tek ekran mantığı: kritik ödemeler, Gmail, bankalar,
e-Fatura, Moka/POS, sipariş/satış, riskler, GitHub/sistem durumları. Bu
bilgiler ayrı ayrı dağınık başlıklarda değil, Operasyon Merkezi altında
gösterilir.

### 5.6 Yasak otomasyonlar

Kaynağı belirsiz görevi kritik listeye almak; eski görevleri yeniymiş gibi
göstermek; kanıtsız "bekliyor" üretmek; kullanıcı onayı olmadan finansal
kayıt yazmak; gizli anahtarları frontend veya prompta yazmak.

## 6. Gider sınıflandırma kuralları

### 6.1 Ana sınıflar

Personel maliyetleri, araç maliyetleri, işletme giderleri, finans
giderleri, ürün ve tedarikçi alımları, "inceleme gerekli".

- **İşletme giderleri:** kira, faturalar, iletişim, kargo, temizlik,
  kırtasiye, reklam, ofis/mağaza ihtiyaçları.
- **Araç maliyetleri:** yakıt, servis, tamir, sigorta, vergi, ceza,
  nakliye ve büyük araç alımları.
- **Finans giderleri:** banka ücretleri, kart ücretleri, komisyonlar,
  finansman giderleri, vergi ödemeleri, iade/kesinti kayıtları.
- **Ürün ve tedarikçi alımları:** ticari alımlar, tedarikçi ödemeleri, cari
  kapatma ödemeleri.
- **İnceleme gerekli:** açıklama belirsiz veya tutar/kaynak teyidi
  gerektiğinde kullanılır.

### 6.2 İş akışı

1. Belge/ekstre okunur.
2. Gider sınıflandırılır.
3. Ödeme kaynağı tespit edilir.
4. Ödendi/bekliyor işaretlenir.
5. Banka/kart/kasa hareketiyle eşleştirilir.
6. Mükerrer kontrol yapılır.
7. Çözülmemiş kayıtlar onaya gönderilir.

### 6.3 Karar

Yüklenen gider dosyası, gelecekteki sınıflandırma için öğrenme referansıdır.
Kullanıcıya her satır sorulmaz; sadece belirsiz, riskli veya yanlış
sınıflandırılmış kayıtlar sorulur.

## 7. Şahsi finans kuralları

Bu bölüm Ercan Alaylı şahsi banka, kredi kartı, KMH, abonelik ve şahsi
transfer takip kurallarını tanımlar.

### 7.1 Ana ayrım

Şahsi hesap hareketleri ALAYLI şirket banka mutabakatına karıştırılmaz.
Şahsi hesaplar şu sınıfta takip edilir: `company/class: ŞAHSİ`, `owner:
Ercan Alaylı`, `target: Şahsi finans / şahsi nakit akışı / şahsi borç
takibi`.

### 7.2 Kişisel veri kuralı

Şahsi banka ekran görüntülerindeki tam IBAN, hesap numarası, müşteri no ve
benzeri hassas bilgiler repo dosyalarına açık yazılmaz. Repo'da yalnızca
banka adı, hesap türü, bakiye/risk sınıfı, kart son 4 hanesi ve işlem
sınıflandırma kuralı tutulur.

### 7.3 VakıfBank Ercan Alaylı şahsi hesabı (maskeli örnek)

Banka: VakıfBank · Sınıf: ŞAHSİ · Hesap türü: Vadesiz TL / KMH bağlantılı
olabilir · Bakiye: eksi bakiye görülüyor · Kullanılabilir bakiye: pozitif
görünüyor. Bu hesap şirket kaydı değildir.

### 7.4 VakıfBank Ercan Alaylı şahsi kredi kartları (maskeli örnek)

- Platinum Kredi Kartı `**6598` — kullanılabilir limit 250.000,00 TL, dönem
  içi toplam 0,00 TL.
- Anında Platinum Troy `**6595` — kullanılabilir limit 250.000,00 TL, dönem
  içi toplam 0,00 TL.
- Business Kredi Kartı `**6041` — kullanılabilir limit 50.000,00 TL, dönem
  içi toplam 0,00 TL.
- Pro Card `**4640` (ek kart / Ercan Alaylı) — kullanılabilir limit
  50.000,00 TL.

Bu kartlar Ercan Alaylı şahsi kredi kartları olarak bildirildiği için
varsayılan sınıf **ŞAHSİ**'dir. "Business Kredi Kartı" ibaresi tek başına
ALAYLI şirket kartı kabul edilmez; şirketle ilişkisi kullanıcı tarafından
açıkça belirtilmedikçe ALAYLI şirket BizimHesap kayıtlarına bağlanmaz.

### 7.5 Şahsi işlem sınıflandırmaları

- **Gelen FAST – Ercan Alaylı'dan/kendi hesapları arası:** açıklamada Ercan
  Alaylı adı geçiyorsa ve kullanıcı şahsi hesap olduğunu bildiriyorsa
  varsayılan: işlem tipi "Şahsi hesaplar arası transfer adayı", risk
  düşük/orta, BizimHesap şirket kaydı hayır, durum "Şahsi finans takibi".
  Şirketle ilişkisi açıkça belirtilmedikçe ALAYLI cari/tahsilat sayılmaz.
- **Masraf Tanım:** şahsi banka masrafı, BizimHesap şirket kaydı hayır,
  şahsi finans gideri olarak takip edilir.
- **Ek Hesap Faiz Tahakkuku:** şahsi KMH faiz gideri, ana para kapama
  değildir, finansman gideri olarak şahsi tarafta takip edilir, ALAYLI
  şirket gideri sayılmaz.
- **Taksitli Tahsilat:** tek başına belirsiz. Varsayılan: "Şahsi borç/
  kredi/kart tahsilatı adayı", durum "İnceleme gerekli", BizimHesap şirket
  kaydı hayır. Detay açıklama veya ekstre olmadan otomatik sınıflandırılmaz.

### 7.6 Şahsi kredi kartı kuralları

Şahsi kredi kartı hareketleri ALAYLI şirket gideri kabul edilmez.
Varsayılan sınıflar: dönem içi harcama → şahsi kredi kartı harcaması; borç
ödemesi → şahsi banka → şahsi kredi kartı borç kapama; aidat/faiz/ücret →
şahsi finansman/banka gideri; şirket harcaması olduğu belirtilirse →
onaylı ortak cari / şirket gideri incelemesi. Kanıt olmadan ALAYLI
BizimHesap gideri yapılmaz.

### 7.7 Şirket/şahsi karışma kuralı

Şahsi hesaptan ALAYLI şirket hesabına para girerse veya tersi olursa,
işlem otomatik tahsilat/gider yapılmaz. Önce kullanıcı şu sınıflardan
birini seçmelidir: ortak cari/sermaye destek; şirketten şahsa ödeme;
şahıstan şirkete borç/avans; yanlış transfer; şahsi hareket (şirketle
ilgisiz).

### 7.8 Onay kuralı

Şahsi hesap hareketleri şirket BizimHesap kayıtlarına otomatik yazılmaz.
Kullanıcı açıkça "bu şirketle ilgili" derse ve kanıt varsa, ilgili ALAYLI
cari/ortak hesap kuralına göre onaya düşer.

## 8. Bilinen hesaplar — referans (son doğrulama 2026-07-08, güvenmeden önce yeniden doğrulayın)

*(Kaynaklar: `ALAYLI_AUTOPAY_INVENTORY.md`, `ALAYLI_GARANTI_ACCOUNT.md`.
Bu bölümdeki bakiye/tutar rakamları 2026-07-08 tarihli anlık görüntülerdir
— canlı kararlar için yeniden okunmalı, burada sadece envanter/yapı
referansı olarak tutulur.)*

**Güvenlik kuralı:** Public repo içinde tam hesap numarası, tam IBAN, bot
token, secret veya özel erişim bilgisi tutulmaz; burada yalnızca maskeli ve
operasyonel takip için gerekli özet bilgiler yer alır.

### 8.1 VakıfBank şirket hesabı

`Sınıf: ALAYLI · Banka: VakıfBank · Şube: Organize Sanayi Şube · Hesap
Tipi: Vadesiz TL · IBAN: TR18 ... 1925 09 · Hesap No: ...192509 · Durum:
Aktif · Kullanım: Şirket ödeme, otomatik ödeme, günlük nakit akışı.`

**Uludağ Elektrik otomatik ödeme talimatları** (VakıfBank şirket vadesiz
hesaptan, otomatik ödeme):

- Kulak — İşyeri No:9 — son fatura 2026/06, 799,00 TL, son ödeme 11.06.2026.
- Medikal 1 — İşyeri No:1 — son fatura 2026/06, 691,00 TL, son ödeme 11.06.2026.
- Medikal 2 — İşyeri No:2 — son fatura 2026/06, 565,00 TL, son ödeme 11.06.2026.

Aylık kontrol zinciri: fatura geldi mi? → son ödeme tarihi geçti mi? →
VakıfBank hesabında yeterli bakiye var mı? → otomatik ödeme banka
hareketinde göründü mü? → fatura kapandı mı? → dashboard/Telegram özetine
işlendi mi? Risk: banka bakiyesi düşükse ve vade yaklaşıyorsa dashboard'da
"Otomatik ödeme başarısız olabilir veya ek hesaptan çekebilir" uyarısı
gösterilir.

### 8.2 Garanti BBVA şirket hesabı

`Sınıf: ALAYLI · Banka: Garanti BBVA · Hesap Adı: alaylı medikal · Hesap
Sahibi: ALAYLI MEDİKAL ORTOPEDİ TAŞIMACILIK TİC. LTD. ŞTİ. · Şube: İnegöl
(maskeli) · IBAN: TR23 ... 2987 66 · Açılış: 23.02.2006 · Tür: Vadesiz TL ·
Bakiye: 74,37 TL · Kullanılabilir Bakiye: 14,56 TL · Blokeli: 59,81 TL ·
Durum: Aktif · Risk: kullanılabilir bakiye çok düşük; otomatik ödeme ve
tahsilat kontrolünde riskli.`

Takip kuralı: bakiye günlük izlenir; blokeli tutar ayrı gösterilir;
kullanılabilir bakiye kritik limitin altındaysa dashboard'da uyarı
üretilir; hesap hareketleri banka ekstresiyle doğrulanır.

## 9. Bilinen açık güvenlik / veri bulguları (2026-07-31, henüz kapanmamış)

- **`bank_transactions` RLS:** 2026-07-31 canlı Supabase denetiminde
  `bank_transactions` tablosunda `anon` rolü için `SELECT` politikası
  `qual: true` (giriş yapmadan herkes tüm banka hareketlerini okuyabiliyor)
  ve `authenticated` rolü için `INSERT/UPDATE` politikası `qual/with_check:
  true` (giriş yapan herhangi bir kullanıcı sınırsız satır yazabiliyor)
  bulundu. **Kullanıcı bunu bilerek şimdilik düzeltmeyi erteledi** ("birlikte
  tasarlayalım, henüz dokunma") — hangi ekran/rolün gerçekten anon okumaya
  ihtiyacı olduğu netleşmeden bu politikaya dokunulmamalıdır. Bir sonraki
  oturumda ele alınmalı.
- **`masraf_raw` RLS reddi (2026-07-13 denetimi, durumu 2026-07-31 itibarıyla
  yeniden doğrulanmadı):** Windows'taki saatlik BizimHesap klon görevi eski
  bir `ErpaltH` masaüstü kopyasını çalıştırıyordu; o kopyadaki masraf botu
  yalnızca `SUPABASE_KEY`/gömülü publishable anahtarı okuyordu, servis rol
  anahtarını okumuyordu — bu yüzden `masraf_raw` tablosuna yazma RLS
  tarafından reddediliyordu ve retry runner her saat `BAŞARISIZ` ile
  kapanıyordu. Güncel repo kopyasındaki masraf botu servis rol anahtarı
  önceliğini destekliyor, fakat Windows görevi bunu henüz çalıştırmıyordu.
  O denetimde ayrıca ayrı yönetici sahipli bir sabah kontrol görevi
  (`AperiON_Ofis_Sabah_0805_Klon_Kontrol`) devre dışı bırakılamamıştı
  ("Erişim engellendi"). **Bu satır işaretlidir çünkü CURRENT_STATUS.md'de
  2026-07-31 güncellemesinde bu masraf_raw/Windows görev sorunundan
  bahsedilmiyor — çözüldü mü yoksa unutuldu mu belirsiz, sonraki oturumda
  doğrulanmalı.**

## 10. Kanonik ana ekran ve isim kuralları (hatırlatma)

Doğru proje adı her yerde: **AperiON iSTasyon**. Kullanılmayacak adlar:
`ErpaltH`, `İstanbul iEFT`, sohbete göre değişen başlıklar, "Demo" merkezli
isimler (ayrıntı: `docs/VISION_AND_ROADMAP.md`, `docs/UI_AND_DASHBOARD.md`).
Kanonik canlı adres ve mimari için `docs/ARCHITECTURE.md`.
