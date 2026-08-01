# AperiON iSTasyon – UI ve Dashboard Blueprint

Bu dosya `DASHBOARD_BLUEPRINT.md`'nin (temel/superset) `UI_STANDARDS.md` ile
2026-07-31 tarihli birleşimidir. Kaynak dosyalar `docs/archive/` altındadır.

## Net durum

Repo içinde `aperion-home-v3.html` bir kabuk ekranı sunuyordu, ama
**canlı ana ekran bu değil**: doğrulanmış canlı zincir `_redirects` →
`aperion.html` → **`aperion-ust-akil.html`**'dir (bkz. `docs/ARCHITECTURE.md`
bölüm 1). Bu blueprint'in kart/alan gereksinimleri kanonik ekrana
(`aperion-ust-akil.html`) uygulanmalıdır; `aperion-home-v3.html` ve diğer
`aperion-home*.html` varyantları terk edilmiş adaylardır.

Bilinen eksikler (kaynak dosyalarda tespit edildiği haliyle, yeniden
doğrulanmalı):

- Logo altında eski/yanlış `ErpaltH · iSTasyon` ifadesi geçebiliyordu.
- Standart başlık `AperiON iSTasyon – Operasyon Merkezi` olmalı.
- Banka/Moka alanı gerçek birleşik status dosyasını okumayabiliyordu.
- Şahsi finans, kredi kartları, faturalar ve abonelikler ayrı kart
  standardıyla görünmeyebiliyordu.
- Kanıt/onay/durum zinciri dashboard üzerinde yeterince net olmayabiliyordu.
- Kök dizindeki `index.html` (canlı değil) hâlâ `<title>AperiON -
  ErpaltH</title>` taşıyor — temizlenmesi gereken kalıntı.

## Ana ürün tanımı

AperiON iSTasyon dashboard bir muhasebe programı değildir. Dashboard
şudur: kokpit, onay merkezi, risk merkezi, durum panosu, kanıt ekranına
geçiş kapısı.

Asıl iş motorları: ChatGPT/Codex, GitHub Actions, Supabase queue,
BizimHesap worker, Gmail/banka/Moka parserları (bkz.
`docs/ARCHITECTURE.md`).

## Ana ekran başlığı

```
AperiON iSTasyon – Operasyon Merkezi
```

Alt başlık: `Bugün ne kritik?`

## Ana kartlar (dashboard ilk ekran)

1. Kritik Durum
2. Bankalar
3. BizimHesap İşleme
4. Gmail Sinyalleri
5. Moka / POS
6. Kredi Kartları
7. Faturalar / Abonelikler
8. Şahsi Finans
9. Satış / Stok
10. Riskler
11. Tamamlananlar
12. Sistem Sağlığı

Her kartta minimum alanlar: kart başlığı, sınıf (ALAYLI/ŞAHSİ/GENEL),
durum (iyi/uyarı/kritik/bekliyor), sayı veya tutar, son kontrol zamanı, en
yüksek risk, aç butonu, kanıt var/yok.

## Bankalar kartı

Kaynak dosyalar: `data/aperion_bank_approval_status.json`,
`data/aperion_bank_approval_unified_status.json`.

Gösterilecekler: pilot banka (İş Bankası), safe mode, canlı BizimHesap save
çalıştı mı, onay bekleyen kayıt sayısı, ready queue sayısı, eksik kanıt
dosyası var mı, POS/Moka transfer adayı var mı, KMH ana para kapama var mı,
son rapor zamanı.

Örnek görünüm:

```
Bankalar
Pilot: İş Bankası
Safe mode: Açık
BizimHesap kayıt: Kapalı
Onay bekleyen: 25
Ready queue: 0
Kanıt eksik: Var
Risk: Turuncu
```

## BizimHesap İşleme kartı

Gösterilecekler: işlenebilir queue var mı, dry-run son durumu, son canlı
kayıt tarihi, son doğrulama sonucu, failed/processed kayıt sayısı, tek
kayıt canlı deneme durumu.

Canlı kayıt için zincir dashboard'da görünmelidir:

```
Kanıt → Onay → Queue → Dry-run → Kayıt → Doğrulama
```

Eksik adım kırmızı/turuncu gösterilir.

## Gmail Sinyalleri kartı

Yeni kritik mail sayısı, banka ekstresi maili, e-Fatura maili, vergi/SGK
maili, Moka/BizimHesap maili, şahsi ödeme/abonelik maili, sınıflanamayan
mail sayısı. Kaynağı belirsiz mail kartı oluşturulmaz.

## Moka / POS kartı

Moka bekleyen tahsilatlar, bankaya yatacak tutar, bankaya yatan ama
BizimHesap transferi bekleyen tutar, POS batch yatan, POS batch komisyonu,
Moka banka transferi, mutabakat farkı.

Kural: POS banka yatışı tahsilat değildir, transferdir. Moka banka yatışı
tahsilat değildir, Moka ara hesaptan bankaya transferdir.

## Kredi Kartları kartı

Kaynak standardı: `docs/DATA_MODEL_AND_STANDARDS.md` bölüm 5. Şirket
kartları, şahsi kartlar, toplam/kullanılabilir limit, güncel dönem borcu,
son ödeme tarihi yaklaşanlar, otomatik ödeme durumu, gecikme riski,
şirket/şahsi karışma riski.

## Faturalar / Abonelikler kartı

Bekleyen faturalar, son ödeme tarihi yaklaşanlar, otomatik ödemedeki
faturalar, başarısız ödeme riski, abone bilgisi eksik olanlar, kanıtı eksik
olanlar. Her fatura/abonelik için: kurum, abone no/adı, hizmet adresi
kısa, son ödeme tarihi, tutar, ödeme yöntemi, durum.

## Şahsi Finans kartı

Şahsi banka bakiyeleri, şahsi KMH kullanımı, şahsi kredi kartları, şahsi
yaklaşan ödemeler, şahsi/şirket karışma riski. Şahsi kayıtlar ALAYLI
BizimHesap'a otomatik yazılmaz.

## Riskler kartı

- Kırmızı: bugün/yarın vade, ödeme başarısız, KMH limit bitmiş, canlı
  kayıt hatası.
- Turuncu: kanıt eksik, cari eşleşmesi bekliyor, yüksek tutarlı işlem.
- Sarı: onay bekleyen, sınıflama eksik, yaklaşan vade.
- Yeşil: tamamlandı/doğrulandı.

## Sistem Sağlığı kartı

Son GitHub Actions durumu, son Gmail kontrol zamanı, son banka approval
status zamanı, son BizimHesap queue worker zamanı, smoke test sonucu,
eksik secret/credential uyarısı.

## Ana navigasyon

Sol menü / mobil alt menü: Operasyon Merkezi, Bankalar, BizimHesap, Gmail,
Moka/POS, Kredi Kartları, Faturalar, Şahsi Finans, Satış/Stok, Riskler,
Sistem Sağlığı, Ayarlar/Kurallar.

## Kayıt kartı standardı (genel, tüm modüllerde)

Her kayıt kartında: başlık, kaynak, belge türü, şirket/sınıf, risk, durum,
tarih/saat, tutar, kanıt özeti, aksiyon butonu.

## Onay ekranı

Onay ekranı küçük bir muhasebe fişi gibi olmalıdır. Zorunlu bölümler:
kaynak, kanıt, önerilen işlem, düzeltilebilir alanlar, Onayla, Reddet,
işlem geçmişi.

## Mobil öncelik

Mobilde kartlar sade ve net olmalıdır. Kullanıcı 30 saniyede şunları
anlamalıdır: bugün ne kritik? ne bekliyor? ne tamamlandı? hangi kayıt
onayımı istiyor? hangi kaynakta sorun var?

## Rakam standardı

Rakamlar tam yazılır. Doğru: `1.200.000 TL`. Yanlış: `1.2M`, `1,2 mn`.

## Değişiklik görünürlüğü

Her yeni özellik veya güncelleme görünür olmalıdır: "Güncellendi" etiketi,
tarih, saat, değişen alan vurgusu.

## Yasaklar

- `Demo`, `ErpaltH`, `İstanbul iEFT` ifadeleri canlı dashboard'da görünmez.
- Mailden onaya düşürmek (butonla manuel), belirsiz görev başlıkları,
  kaynaksız kritik bildirimler yasaktır.
- Demo veri gerçek gibi gösterilmez.
- Kaynağı belirsiz kritik kayıt oluşturulmaz.
- Onaysız finansal kayıt "işlendi" görünmez.
- Şahsi hesap/kart ALAYLI şirket hesabı gibi gösterilmez.

## Dashboard hazır kabul kriterleri

1. Başlık doğru: `AperiON iSTasyon – Operasyon Merkezi`.
2. ErpaltH/Demo gibi eski ifadeler canlıda yok.
3. Banka kartı birleşik status dosyasını okuyor.
4. BizimHesap kartı queue/dry-run/processed durumunu gösteriyor.
5. POS/Moka/KMH sınıfları doğru görünüyor.
6. Şahsi finans şirketten ayrı görünüyor.
7. Kredi kartları ve faturalar standart veri alanlarıyla görünüyor.
8. Her kritik kartta son kontrol zamanı var.
9. Kanıt yoksa kayıt işlenebilir görünmüyor.
10. Mobilde 30 saniyede bugünkü kritik durum anlaşılıyor.

## Geliştirme önceliği

1. Başlık/isim temizliği (kanonik ekranda, `aperion-ust-akil.html`).
2. Banka status kartı.
3. BizimHesap queue kartı.
4. Kredi kartları ve faturalar için placeholder değil gerçek standart
   alanlı kartlar.
5. Şahsi finans kartı.
6. Sistem sağlığı kartı.
