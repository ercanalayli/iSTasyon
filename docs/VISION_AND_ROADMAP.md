# AperiON iSTasyon – Vizyon ve Yol Haritası

> **2026-08-02 güncelleme:** Ercan'ın ChatGPT geçmişinden derlediği çok daha
> kapsamlı, 50 bölümlük tam özellik envanteri artık `docs/APERION_MASTER_VIZYON.md`
> dosyasında — bu belge proje boyunca ana referans, değiştirilmeden korunur.
> Bu dosya (VISION_AND_ROADMAP) onun **karşısında kanıtla doğrulanmış güncel
> durumu** tutmaya devam ediyor; ikisi çelişirse MASTER_VIZYON "istenen",
> buradaki "kanıtlanmış mevcut durum" kabul edilir.

Bu dosya `VISION.md` + `ROADMAP.md`'nin, hâlâ açık olan maddeler için de
`APERION_ERP_UST_AKIL_KAPSAM.md`, `APERION_CFO_MODUL_PLANI.md`,
`APERION_ANALIZ_RAPOR_GEREKSINIMLERI.md`, `APERION_ISTEKLER_VE_GORSELLER.md`
ve `YAPILACAKLAR.md`'nin 2026-07-31 tarihli birleşimidir. Zaten teslim
edilmiş (shipped) maddeler burada tekrarlanmaz — bunlar için
`docs/CHANGELOG.md` ve `docs/CURRENT_STATUS.md`'ye bakın. Kaynak dosyalar
`docs/archive/` altındadır.

## 1. Vizyon

AperiON iSTasyon, ALAYLI Medikal başta olmak üzere Ercan Alaylı'nın şirket
ve şahsi finans/operasyon süreçlerini tek merkezden yöneten üst akıl
sistemidir.

Amaç bir görev listesi, basit dashboard veya klasik muhasebe programı
yapmak değildir. Amaç; Gmail, banka ekstreleri, BizimHesap, Moka/POS,
e-Fatura, ÜTS, satış/masraf raporları, kredi kartı/KMH/kredi takibi,
bilanço ve Telegram onay süreçlerini tek kanıtlı operasyon merkezinde
birleştirmektir.

**Ana ilke:** Otomatik oku → otomatik sınıflandır → risk ver → mükerrer
temizle → kanıt göster → kullanıcı onayı al → işle → tekrar doğrula → logla.

Aynı zincir farklı kaynaklarda şöyle de ifade edilir: AperiON görür →
AperiON anlar → AperiON kontrol eder → AperiON önerir → Kullanıcı onaylar →
AperiON işler → AperiON raporlar.

### Doğru proje adı (banlı isim listesi — verbatim korunmuştur)

Her yerde doğru ad: **AperiON iSTasyon**.

**Kullanılmayacak adlar:**

- ErpaltH
- İstanbul iEFT
- Sohbete göre değişen başlıklar
- Demo merkezli isimler

### Aktif kapsam

Şu anda aktif ana şirket: **ALAYLI Medikal**. Diğer şirketler ve modüller
mimaride desteklenebilir, fakat canlı otomasyon ve finansal kayıt önceliği
ALAYLI Medikal'dedir. (Bilinen diğer firma isimleri, çoklu firma
izolasyonu bağlamında geçmişte anıldı: `alayli, woodlet, elit, odyoform,
alkam, yenicespor` — bunlardan sadece `alayli` aktif ve önceliklidir.)

### Ürün hedefi

Mobilde açıldığında profesyonel görünen, 30 saniyede bugünün kritik finans
ve operasyon durumunu anlatan tek merkez: **AperiON iSTasyon – Operasyon
Merkezi**. Bu merkezde her bilgi kaynağı, kanıtı, riski, durumu ve
yapılacak aksiyonuyla görünmelidir.

### CFO / hayat asistanı tanımı (genişletilmiş vizyon)

AperiON kullanıcının işletmesi ve kişisel hayatı için: üst akıl, ikinci
beyin, CFO gibi düşünen finans direktörü modu, veri orkestra merkezi, onay
ve karar sistemi, güvenli otomasyon altyapısı olarak çalışmalıdır. Sistem
sadece banka hareketi işleyen bir bot değildir; BizimHesap, Gmail,
Telegram, Drive/Excel/PDF, manuel kartlar ve harici kaynaklardan gelen
veriyi okuyup işletme için CFO/CEO gibi yorumlayan üst akıl sistemidir.

**Mutlak kurallar (tekrar, vurgu için):** Onaysız kesin BizimHesap kaydı
yok. Demo veri canlı karar gibi gösterilmez. Firma verisi karıştırılmaz.
Her kaydın kaynak, kanıt, güven puanı ve sonuç izi olur. Para hareketi,
satış, alış, stok ve cari aynı üst akıl ekranından izlenir.

## 2. Yol haritası — orijinal sprint planı ve fiili durum

Aşağıdaki sprintler `ROADMAP.md`'den alınmıştır; her birinin yanına
2026-07-31 itibarıyla fiili durum eklendi (kaynak: `docs/CHANGELOG.md`,
`docs/CURRENT_STATUS.md`).

- **Sprint 0 – Mimari Sabitleme**: `/docs` klasörü kuruldu, vizyon/mimari/
  veri modeli/ana kurallar yazıldı. **Durum: yapıldı, 2026-07-31'de tekrar
  konsolide edildi (56→11 dosya).**
- **Sprint 1 – İş Bankası Mutabakatı**: onay kuyruğu, ID 33-35 kontrolü,
  dry-run/canlı kayıt zinciri. **Durum: kısmen — ID 33-35 onaylandı ama
  BizimHesap'a henüz işlenmedi (bkz. `docs/OPERATIONS_RULES.md` §1.2).**
- **Sprint 2 – Operasyon Merkezi Ana Ekranı**: kritik/bankalar/Gmail/
  e-Fatura/Moka/kredi kartı/satış-stok/riskler kartları. **Durum: kısmen —
  `aperion-ust-akil.html` gelir tablosu/bilanço yüzeyi olarak şekillendi
  (v96 Komuta Masası, v111-v123 gelir tablosu matrisi), ama tüm kartlar
  (kredi kartı, fatura/abonelik, şahsi finans) gerçek veri kaynağına
  bağlanmadı.**
- **Sprint 3 – Gmail Sinyal Motoru**: banka ekstresi, FAST/EFT/dekont,
  e-Fatura, vergi/SGK, Moka, BizimHesap, ÜTS sınıflandırması. **Durum: kısmen
  — mail ekstre pipeline'ı kısmen çalışıyor, test kapısı tam kapanmadı
  (bkz. `docs/OPERATIONS_RULES.md` §3.9).**
- **Sprint 4 – Diğer Bankalara Yayılım** (VakıfBank → Yapı Kredi → Akbank →
  Halkbank sırasıyla): **Durum: açık — İş Bankası pilotu tamamlanmadan
  başlanmayacak kuralı hâlâ geçerli; VakıfBank tarafında bazı POS/Batch
  akışları zaten canlı test edildi (v100-v107) ama bu resmi "Sprint 4"
  geçişi olarak işaretlenmedi.**
- **Sprint 5 – Satış/Masraf/Stok Analizi**: ürün satış analizi, cari
  performans, kategori satışları, kâr analizi, stok bağlantısı. **Durum:
  büyük ölçüde yapıldı** — Hasta Bezi FIFO/kâr motoru (v91-v95, v126-v127),
  gelir tablosu kategori kırılımı, ürün/kategori dinamik raporları
  (`YAPILACAKLAR.md`'nin "Yapılanlar" listesi bunu doğruluyor).
- **Sprint 6 – ALAYLI Genel Bilanço**: varlıklar, borçlar, çekler, SGK
  alacağı, Moka alacağı, kredi kartları, KMH, krediler, ortak ayrılığı.
  **Durum: kısmen — bilanço/likidite özeti ana ekranda var (D-009, D-012,
  D-016/D-026), ama çek/senet, varlık kartları ve tam ortak ayrılığı henüz
  yok.**
- **Sprint 7 – Şahsi Finans Otomasyonu**: şahsi banka/kredi kartı/KMH/
  abonelik/ödeme riskleri, ALAYLI'dan ayrı. **Durum: kural seviyesinde
  yapıldı** (`docs/OPERATIONS_RULES.md` §7), **otomasyon seviyesinde
  açık** (Apsiyon read-only entegrasyonu var — D-010, D-021, D-024, D-025 —
  ama tam bir "şahsi finans dashboard'u" yok).

## 3. Hâlâ açık olan istekler (planlama dokümanlarından, teyitli)

Aşağıdaki maddeler `APERION_ERP_UST_AKIL_KAPSAM.md`, `APERION_CFO_MODUL_PLANI.md`,
`APERION_ANALIZ_RAPOR_GEREKSINIMLERI.md`, `APERION_ISTEKLER_VE_GORSELLER.md`
ve `YAPILACAKLAR.md`'den derlenmiştir; her biri kaynak dokümanların kendi
"kalan/kısmen" bölümleriyle veya `docs/CHANGELOG.md` ile çapraz kontrol
edilip hâlâ bitmemiş olduğu teyit edilenlerdir.

### 3.1 CFO Modu (Finans Direktörü ekranı) — büyük ölçüde açık

Kaynak: `APERION_CFO_MODUL_PLANI.md`. Gelir tablosu/bilanço temel
görünümü şu an var, ama aşağıdaki CFO başlıkları henüz canlı veri/aksiyona
bağlı değil:

- Stratejik Finansal Yönetim: hedef/bütçe, sapma analizi, en riskli 5 cari,
  en çok nakit tüketen 5 gider, en karlı/en zararlı ürün grupları.
- İşletme Sermayesi Analizi: banka toplamı + kasa + POS/Moka bekleyen +
  tahsil edilecek cari + ödenecek tedarikçi + stokta bağlı para tek ekranda.
- Sermaye Yatırımı ve Proje Değerlendirme: yeni ürün grubu kârlılık
  simülasyonu, stok alım kararı, kampanya/fiyat değişimi etkisi, geri dönüş
  süresi.
- Sermaye Maliyeti, Birleşme ve Devir Analizi (ileri seviye, ertelenmiş).
- Finansal Zorluk ve Yeniden Yapılandırma: nakit sıkışma uyarısı, geciken
  tahsilat/ödeme, kritik stok+düşük kârlılık birleşik risk ekranı.
- Risk Yönetimi: cari risk skoru, banka hareketi mükerrer kontrolü (kısmen
  var), firma izolasyonu (var), veri güveni, onaysız kayıt kilidi (var).

CFO modunun ilk üretim hedefi zaten belirlenmişti: önce Banka Canlı/Onay
Merkezi bitirilecek (bu kısmen bitti), sonra CFO ana ekranına 3 satır
eklenecek: bugün finansal durum, bugün karar bekleyenler, bugün risk ve
fırsatlar — **bu 3 satır henüz eklenmedi.**

### 3.2 Analiz ve rapor gereksinimleri — kısmen açık

Kaynak: `APERION_ANALIZ_RAPOR_GEREKSINIMLERI.md`. Şu analiz başlıkları
büyük ölçüde satış/hasta bezi motorunda karşılandı: satış analizi,
kategori analizi, ürün analizi. Hâlâ açık olanlar:

- **Müşteri/Cari Analizi**: riskli cariler, uzun süredir alış yapmayan
  müşteriler, tahsilat bekleyen müşteriler ekranı tam değil.
- **Veri Güvenilirliği paneli**: "Son BizimHesap Klon senkron zamanı",
  "Doğrulandı/Kontrol Gerekli/Uyuşmazlık" etiketi tam otomatik değil.
- **Uyarı ve Alarm Sistemi**: "veri 1 saatten eskiyse uyarı", "dün satış 0
  ise kontrol uyarısı" gibi otomatik alarm kuralları kısmen var (bank/
  ödeme tarafında), satış/veri tazelik tarafında tam değil.

### 3.3 Kullanıcı istekleri ve tasarım referansları — açık kalanlar

Kaynak: `APERION_ISTEKLER_VE_GORSELLER.md` (2026-07-03 tarihli, kendi "Kalan
/ Kritik" bölümü zaten şunları listeliyordu — 2026-07-31 itibarıyla hâlâ
açık kabul edilir çünkü ne `docs/CHANGELOG.md` ne `docs/CURRENT_STATUS.md`
bunları "bitti" olarak işaretlemiş):

- Onay Merkezi'nin tam production güven seviyesi.
- Tek tık BizimHesap kaydın UI'da kusursuz kanıtlanması.
- Banka/kasa/cari/BizimHesap birebir eşgüdüm.
- Profesyonel ana ekran tasarımı (kök dizinde ~57 HTML dosyası var, çoğu
  muhtemelen ölü aday — bkz. `docs/CURRENT_STATUS.md` yapılacaklar #2).
- Hasta bezi karar ekranının ana ürüne tam entegrasyonu (kısmen oldu, v93-95
  ve v126-127 ile büyük ilerleme var, ama "ana ürüne tam entegre" iddiası
  hâlâ açık).
- Ürün kartı ve cari kartı tam dinamik hale getirme.
- Telegram/görsel evrak akışı production (hâlâ açık, bkz.
  `docs/AI_SESSION_PROTOCOL.md` §6).
- Kişisel ikinci beyin finans modülü (kural seviyesinde var, otomasyon
  seviyesinde açık).
- Fiyat listesi + internet piyasa botu (hiç başlanmadı).
- Tüm modüller için firma izolasyonu ve veri güveni son testi.
- Satılan malın maliyeti kâr katsayıları (kaynak dokümanda verilen tam
  liste — hâlâ geçerli referans değerler, kod tarafında kullanılıyor):
  Hasta bezi 1,35 · Distribütör ve toptan hasta bezi 1,16 · Ortopedi
  tekstil 1,8 · Medikal sonda 1,35 · Ortopedi yürümeye yardımcı 1,7 ·
  Medikal sarf 1,5 · Kolostomi 1,20 · Kiralık 0 maliyet · Medikal solunum
  1,6 · Medikal ıslak mendil/vücut temizleme 1,6 · Medikal elektronik 1,6 ·
  Medikal karyola 1,5 · Medikal tekerlekli sandalye 1,5 · Medikal akülü 1,5.
  Kural: kategoriye girmeyen ürün olursa sistem kâr oranını sorar.
- Veri hafızası / cache / ağır sorgu sorunu: iş belleği/cache katmanı,
  snapshot, arka planda yenileme. **Kısmen yapıldı** (gelir tablosu için 5
  dk sıcak cache + 1 saat kalıcı cache eklendiği `YAPILACAKLAR.md`'nin
  yapılanlar listesinde geçiyor), diğer ağır sorgular sırada.

### 3.4 ERP üst akıl kapsamı — hâlâ açık motorlar

Kaynak: `APERION_ERP_UST_AKIL_KAPSAM.md`. Altı "karar motoru" tanımlanmıştı:
CFO Finans Motoru (kısmen var), CEO Satış Motoru (büyük ölçüde var), Alış/
Gider Motoru (kısmen var), Stok/FIFO Motoru (var — Hasta Bezi), Anomali
Motoru (kısmen var — mükerrer kontrol var, genel anomali skorlaması yok),
**Hayat Asistanı Motoru (büyük ölçüde açık — kişisel faturalar, okul, araç,
sağlık, aile, kredi kartı, takvim tek merkezde henüz değil)**.

### 3.5 `YAPILACAKLAR.md`'den hâlâ açık öncelik listesi (orijinal numaralandırma korunmuştur)

1. Banka hareketleri sistemini canlı repo ve komutlarla stabil hale
   getirmek.
2. Banka onay ekranını telefondan kullanılabilir hale getirmek.
3. Onaylanan banka hareketini BizimHesap'a önce form dolduracak, sonra
   kontrollü kaydedecek hale getirmek.
4. Bilinmeyen banka hareketlerini soran ve öğrenme kuralı oluşturan akışı
   tamamlamak.
5. Banka ekstresi yükleme/parçalama ekranını AperiON içine almak.
6. Ürün eşleştirmelerini Supabase'e taşımak; tarayıcıya bağlı kalmasını
   bitirmek.
7. BizimHesap ürün/kategori güncelleme botunu kurmak.
8. Gider raporlarını genişletmek.
9. 2024, 2025, 2026 ve geçmiş yıl karşılaştırmalı yönetim raporunu
   genişletmek.
10. Bildirim ayarlarında hangi raporun hangi telefona gideceğini seçilebilir
    yapmak.
11. Açılışta çalışan görevi yönetici izinli kurulumla eklemek.
12. Telegram not/hatırlatma SQL'ini Supabase'de çalıştırıp zamanlayıcıyı
    aktif etmek.
13. Ürün sipariş yönetimini tasarlamak: talep, stok kontrol, tedarikçi,
    durum, teslim.

BizimHesap'tan öğrenilecek akışlar (referans, hâlâ geçerli): giriş ve firma
seçimi; Nakit Yönetimi > Hesaplar > banka hesabı seçimi; bankaya para giriş
formu; hesaplar arası transfer formu; Nakit Yönetimi > Masraflar > Yeni
Masraf Gir formu; masraf kalemi Mali Giderler > Banka Masrafı; müşteriler >
cari arama > cari kartı; cari kartından Tahsilat/Ödeme formu; kasa/banka
hesap seçimi; tutar/tarih/açıklama/ödeme durumu alanları; kaydetme sonrası
başarı/hata işaretleri.

## 4. Öncelik sırası (özet, güncel)

1. Veri güveni (bkz. `docs/OPERATIONS_RULES.md` §9 açık RLS bulguları).
2. Finans Komuta Merkezi / CFO ana ekranı.
3. Banka onay kuyruğu (İş Bankası pilotu tamamlanana kadar diğer bankalara
   geçilmez).
4. BizimHesap tek tık kayıt.
5. Firma izolasyonu.
6. Günlük kullanılabilir sürüm.
7. Profesyonel ana ekran tasarımı.
8. Gelir tablosu ve nakit/tahakkuk/planlanan karar ekranı (büyük ölçüde
   yapıldı, bakım/genişletme aşamasında).
9. Ürün, stok, satış ve kârlılık zekası (Hasta Bezi ile büyük ölçüde
   yapıldı, diğer kategorilere yayılmadı).
10. Telegram / mail / görsel evrak akışı.
11. Kişisel ikinci beyin finans modülü.
12. CFO modu: finansal tablo, bütçe, işletme sermayesi, risk ve stratejik
    karar ekranı.

Güncel canlı durum ve bugünün somut yapılacaklar listesi için her zaman
`docs/CURRENT_STATUS.md`'ye bakın — bu dosya (VISION_AND_ROADMAP) stratejik
yönü, CURRENT_STATUS ise güncel anlık durumu tutar.
