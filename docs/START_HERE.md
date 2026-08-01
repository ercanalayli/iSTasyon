# AperiON iSTasyon – START HERE

Bu dosya, yeni bir AI oturumu (ChatGPT, Codex veya başka bir araç fark
etmeksizin) için **tek** başlangıç kapısıdır. Daha önce bu rolü üstlenen üç
ayrı rakip dosya vardı — `START_HERE.md`, `CHATGPT_CONTINUITY_PROTOCOL.md`,
`CODEX_MASTER_PROMPT_APERION.md` — bunlar 2026-07-31'de bu tek dosyada
birleştirildi. Diğer ikisinin içeriği artık `docs/AI_SESSION_PROTOCOL.md`
içindedir; kendileri `docs/archive/` altındadır.

Amaç: yeni bir sohbet/oturum açıldığında hiçbir kritik bilgi eksik
kalmasın, hiçbir şey hafızadan "muhtemelen böyledir" diye varsayılmasın.

## Yeni sohbete yapıştırılacak tek mesaj

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

## Zorunlu okuma sırası — `docs/` içindeki 11 aktif dosya

`docs/` klasöründeki **tüm** aktif dokümantasyon artık şu 11 dosyadır (56
eski dosya 2026-07-31'de bunlara konsolide edildi, orijinaller
`docs/archive/` altında duruyor — bkz. `docs/archive/README.md`):

1. `docs/START_HERE.md` — bu dosya.
2. `docs/CURRENT_STATUS.md` — **her zaman ilk okunacak canlı durum dosyası.**
   Bu dosya kısa/güncel tutulur ve her oturum sonunda güncellenir.
3. `docs/VISION_AND_ROADMAP.md` — vizyon, banlı isim listesi, yol haritası,
   hâlâ açık istekler.
4. `docs/ARCHITECTURE.md` — mimari (8 motor), çalışma modeli/roller, yayın
   (deployment) modeli, her-zaman-hazır asistan modeli, branch stratejisi,
   kanonik canlı adres.
5. `docs/DATA_MODEL_AND_STANDARDS.md` — veri modeli, kart şeması, finans
   veri standartları, belge arşivi, BizimHesap B2B API notları.
6. `docs/OPERATIONS_RULES.md` — **güvenlik-kritik.** Banka, BizimHesap,
   Gmail, Telegram, otomasyon, gider sınıflandırma, şahsi finans kuralları
   ve bilinen hesaplar. Finansal/operasyonel bir karar vermeden önce mutlaka
   okunmalı.
7. `docs/UI_AND_DASHBOARD.md` — UI standartları ve dashboard blueprint.
8. `docs/QUICK_CAPTURE_AND_NOTIFICATIONS.md` — hızlı not yakalama, API
   sözleşmesi, bildirim/teyit modeli (henüz tam canlı değil bir özellik).
9. `docs/AI_SESSION_PROTOCOL.md` — AI oturumu nasıl çalışır, Telegram-first
   iş akışı, kod sahipliği ayrımı, iş sonu rapor formatı.
10. `docs/CHANGELOG.md` — tüm proje geçmişi (en güncel üstte).
11. `docs/DECISIONS.md` — tüm kararlar (D-001'den D-027'ye, numaralandırma
    çakışması 2026-07-31'de düzeltildi).

İlgili işe göre ek okuma sırası yoktur — yukarıdaki 11 dosya kendi
başlıkları altında ilgili tüm konuyu kapsar. Hangi işe hangi dosyanın
baktığından emin değilseniz: kural/güvenlik sorusu → `OPERATIONS_RULES.md`;
mimari/deploy sorusu → `ARCHITECTURE.md`; veri şeması sorusu →
`DATA_MODEL_AND_STANDARDS.md`; ekran/tasarım sorusu → `UI_AND_DASHBOARD.md`.

## Okuma kontrolü

Yeni oturum ilk cevapta mutlaka şunu yazmalıdır:

```text
Okunan dosyalar:
- docs/START_HERE.md
- docs/CURRENT_STATUS.md
- docs/OPERATIONS_RULES.md
...
Eksik dosyalar:
- yok / veya liste
```

Eksik dosya varsa işlem başlatılmaz.

## Aktif çalışma modeli (özet — tam açıklama `docs/ARCHITECTURE.md`'de)

- ChatGPT / Codex: üst akıl ve işlem yöneticisi
- GitHub repo: kalıcı kural ve kod hafızası
- Supabase: queue, onay, audit log ve operasyon verisi
- GitHub Actions / worker: otomasyon motoru
- Telegram: hızlı onay ve kritik alarm
- BizimHesap: resmi kayıt hedefi
- AperiON iSTasyon: dashboard/kokpit/onay merkezi

## En kritik güncel kararlar (özet — tam liste `docs/DECISIONS.md`'de)

- AperiON iSTasyon dashboard/kokpit olacak; her şeyi kendi içinde yapan dev
  program olmayacak.
- Sohbet geçici beyin alanıdır; kalıcı hafıza repo dosyaları, Supabase ve
  BizimHesap kayıtlarıdır.
- Doğru proje adı: **AperiON iSTasyon**.
- İş Bankası banka mutabakatı pilot iş olarak kalacak; tamamlanmadan diğer
  bankalara geçilmeyecek.
- POS/Moka banka yatışı tahsilat değil transferdir.
- KMH-ANAPARA BORCU TAHSİLATI gider değil KMH ana para kapamadır.
- Kullanıcı onayı olmadan BizimHesap'a finansal kayıt yazılmaz.
- Kanonik canlı adres: `https://aperion-istasyon.pages.dev/` →
  `aperion-ust-akil.html` (GitHub Pages sadece yedektir).

## Canlı finansal kayıt kilidi (değişmez zincir)

```text
Kanıt → Kullanıcı onayı → Supabase queue → Dry-run → Tek kayıt canlı deneme
→ Kaydetme → BizimHesap geri doğrulama → Queue processed → Dashboard/Telegram güncelleme
```

Bu zincirden biri eksikse canlı kayıt yapılmaz. Tam kural seti:
`docs/OPERATIONS_RULES.md` §0.

## Her oturum sonunda zorunlu güncelleme

Yoğun çalışma sonunda mutlaka güncellenecek dosyalar:

- `docs/CURRENT_STATUS.md`
- `docs/CHANGELOG.md`
- Gerekirse `docs/DECISIONS.md` (yeni karar varsa, bir sonraki boş D-numarası
  ile — en son kullanılan numara için `docs/DECISIONS.md`'nin sonuna bakın).

Böylece yeni sohbet eksiksiz devam eder.

## Minimum cevap standardı

Her iş sonunda cevap şu formatta verilmelidir:

```text
Yapılanlar:
Kalanlar:
Riskler:
Sıradaki Adım:
Repo'ya Yazılanlar:
```

## Eksik kalmaması için ana kural

Yeni sohbet hafızadan konuşmayacak. Önce `docs/START_HERE.md` ve
`docs/CURRENT_STATUS.md`'yi, ardından ilgili modül dosyalarını okuyacak.
Okuduğunu listeleyecek. Eksik varsa işlem başlatmayacak.

**"Tek bir AperiON" kuralı:** Bu repo, dokümantasyon veya klasör sprawl'ı
büyütmeye çalışan hiçbir değişiklik kabul edilmez. Yeni bir doküman
oluşturmadan önce her zaman önce bu 11 dosyadan birine eklenip
eklenemeyeceği değerlendirilmelidir. "Bir dosya daha" asla çözüm değildir.
