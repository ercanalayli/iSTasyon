# AperiON iSTasyon – START HERE

Bu dosya yeni ChatGPT/Codex oturumlarında tek başlangıç kapısıdır.

Amaç: Yeni sohbet açıldığında hiçbir kritik bilgi eksik kalmasın.

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

## Zorunlu okuma sırası

Yeni oturum işlem başlatmadan önce şu dosyaları okumalıdır:

1. `docs/START_HERE.md`
2. `docs/SESSION_STATE.md`
3. `docs/NEXT_ACTION.md`
4. `docs/OPERATING_MODEL.md`
5. `docs/CHATGPT_CONTINUITY_PROTOCOL.md`
6. `docs/BANK_RULES.md`
7. `docs/BIZIMHESAP_RULES.md`
8. `docs/AUTOMATION_RULES.md`
9. `docs/TELEGRAM_RULES.md`
10. `docs/CHANGELOG.md`

İlgili işe göre ek okuma:

- Gmail işi: `docs/GMAIL_RULES.md`
- UI/dashboard işi: `docs/UI_STANDARDS.md`
- Veri modeli işi: `docs/DATABASE.md`
- Mimari karar işi: `docs/ARCHITECTURE.md`
- Yol haritası: `docs/ROADMAP.md`
- Repo risk kontrolü: `docs/REPO_AUDIT_2026-07-08.md`

## Okuma kontrolü

Yeni oturum ilk cevapta mutlaka şunu yazmalıdır:

```text
Okunan dosyalar:
- docs/START_HERE.md
- docs/SESSION_STATE.md
- docs/NEXT_ACTION.md
...
Eksik dosyalar:
- yok / veya liste
```

Eksik dosya varsa işlem başlatılmaz.

## Aktif çalışma modeli

- ChatGPT / Codex: üst akıl ve işlem yöneticisi
- GitHub repo: kalıcı kural ve kod hafızası
- Supabase: queue, onay, audit log ve operasyon verisi
- GitHub Actions / worker: otomasyon motoru
- Telegram: hızlı onay ve kritik alarm
- BizimHesap: resmi kayıt hedefi
- AperiON iSTasyon: dashboard/kokpit/onay merkezi

## En kritik güncel kararlar

- AperiON iSTasyon dashboard/kokpit olacak; her şeyi kendi içinde yapan dev program olmayacak.
- Sohbet geçici beyin alanıdır; kalıcı hafıza repo dosyaları, Supabase ve BizimHesap kayıtlarıdır.
- Doğru proje adı: AperiON iSTasyon.
- İş Bankası banka mutabakatı pilot iş olarak kalacak.
- POS banka yatışı tahsilat değil transferdir.
- MokaUnited banka yatışı tahsilat değil Moka ara hesaptan bankaya transferdir.
- KMH-ANAPARA BORCU TAHSİLATI gider değil KMH ana para kapama / banka-KMH virmanıdır.
- Batch komisyonu banka/POS komisyon gideridir.
- Gelen FAST hareketleri cari eşleşmesi gerektiriyorsa onaya düşer.
- Kullanıcı onayı olmadan BizimHesap'a finansal kayıt yazılmaz.

## Canlı finansal kayıt kilidi

BizimHesap'a canlı kayıt için zorunlu zincir:

```text
Kanıt → Kullanıcı onayı → Supabase queue → Dry-run → Tek kayıt canlı deneme → Kaydetme → BizimHesap geri doğrulama → Queue processed → Dashboard/Telegram güncelleme
```

Bu zincirden biri eksikse canlı kayıt yapılmaz.

## Her oturum sonunda zorunlu güncelleme

Yoğun çalışma sonunda mutlaka güncellenecek dosyalar:

- `docs/SESSION_STATE.md`
- `docs/NEXT_ACTION.md`
- `docs/CHANGELOG.md`

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

Yeni sohbet hafızadan konuşmayacak.
Önce `docs/START_HERE.md` ve zorunlu dosyaları okuyacak.
Okuduğunu listeleyecek.
Eksik varsa işlem başlatmayacak.
