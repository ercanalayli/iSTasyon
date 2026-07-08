# AperiON iSTasyon – Dashboard Blueprint

Bu dosya AperiON iSTasyon dashboard/kokpit ekranının nasıl kurgulanacağını tanımlar.

## Net durum

Mevcut repo içinde `aperion-home-v3.html` dosyası vardır ve bir kabuk ekranı sunar. Ancak bu ekran hâlâ tam AperiON Operasyon Merkezi standardında değildir.

Eksikler:

- Logo altında hâlâ eski/yanlış `ErpaltH · iSTasyon` ifadesi vardır.
- Ana başlık `AperiON Ana Ekran` olarak duruyor; standart başlık `AperiON iSTasyon – Operasyon Merkezi` olmalıdır.
- Banka/Moka alanı gerçek birleşik status dosyasını okumuyor.
- Şahsi finans, kredi kartları, faturalar ve abonelikler ayrı kart standardıyla görünmüyor.
- Kanıt/onay/durum zinciri dashboard üzerinde yeterince net değildir.

## Ana ürün tanımı

AperiON iSTasyon dashboard bir muhasebe programı değildir.

Dashboard şudur:

- Kokpit
- Onay merkezi
- Risk merkezi
- Durum panosu
- Kanıt ekranına geçiş kapısı

Asıl iş motorları:

- ChatGPT / Codex
- GitHub Actions
- Supabase queue
- BizimHesap worker
- Gmail / banka / Moka parserları

## Ana ekran başlığı

Standart başlık:

```text
AperiON iSTasyon – Operasyon Merkezi
```

Alt başlık:

```text
Bugün ne kritik?
```

## Ana kartlar

Dashboard ilk ekranda şu kartları göstermelidir:

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

## Her kartta minimum alanlar

- Kart başlığı
- Sınıf: ALAYLI / ŞAHSİ / GENEL
- Durum: iyi / uyarı / kritik / bekliyor
- Sayı veya tutar
- Son kontrol zamanı
- En yüksek risk
- Aç butonu
- Kanıt var/yok

## Bankalar kartı

Kaynak dosyalar:

- `data/aperion_bank_approval_status.json`
- `data/aperion_bank_approval_unified_status.json`

Gösterilecekler:

- Pilot banka: İş Bankası
- Safe mode
- Canlı BizimHesap save çalıştı mı
- Onay bekleyen kayıt sayısı
- Ready queue sayısı
- Eksik kanıt dosyası var mı
- POS transfer adayı var mı
- Moka transfer adayı var mı
- KMH ana para kapama var mı
- Son rapor zamanı

Gösterim örneği:

```text
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

Gösterilecekler:

- İşlenebilir queue var mı
- Dry-run son durumu
- Son canlı kayıt tarihi
- Son doğrulama sonucu
- Failed kayıt sayısı
- Processed kayıt sayısı
- Tek kayıt canlı deneme durumu

Canlı kayıt için zincir dashboardda görünmelidir:

```text
Kanıt → Onay → Queue → Dry-run → Kayıt → Doğrulama
```

Eksik adım kırmızı/turuncu gösterilir.

## Gmail Sinyalleri kartı

Gösterilecekler:

- Yeni kritik mail sayısı
- Banka ekstresi maili
- e-Fatura maili
- Vergi/SGK maili
- Moka/BizimHesap maili
- Şahsi ödeme/abonelik maili
- Sınıflanamayan mail sayısı

Kaynağı belirsiz mail kartı oluşturulmaz.

## Moka / POS kartı

Gösterilecekler:

- Moka bekleyen tahsilatlar
- Bankaya yatacak tutar
- Bankaya yatan ama BizimHesap transferi bekleyen tutar
- POS batch yatan
- POS batch komisyonu
- Moka banka transferi
- Mutabakat farkı

Kural:

- POS banka yatışı tahsilat değildir; transferdir.
- Moka banka yatışı tahsilat değildir; Moka ara hesaptan bankaya transferdir.

## Kredi Kartları kartı

Kaynak standardı: `docs/FINANCIAL_DATA_STANDARDS.md`

Gösterilecekler:

- Şirket kartları
- Şahsi kartlar
- Toplam limit
- Kullanılabilir limit
- Güncel dönem borcu
- Son ödeme tarihi yaklaşanlar
- Otomatik ödeme durumu
- Gecikme riski
- Şirket/şahsi karışma riski

## Faturalar / Abonelikler kartı

Gösterilecekler:

- Bekleyen faturalar
- Son ödeme tarihi yaklaşanlar
- Otomatik ödemedeki faturalar
- Başarısız ödeme riski
- Abone bilgisi eksik olanlar
- Kanıtı eksik olanlar

Her fatura/abonelik için:

- Kurum
- Abone no
- Abone adı
- Hizmet adresi kısa
- Son ödeme tarihi
- Tutar
- Ödeme yöntemi
- Durum

## Şahsi Finans kartı

Gösterilecekler:

- Şahsi banka bakiyeleri
- Şahsi KMH kullanımı
- Şahsi kredi kartları
- Şahsi yaklaşan ödemeler
- Şahsi/şirket karışma riski

Şahsi kayıtlar ALAYLI BizimHesap’a otomatik yazılmaz.

## Riskler kartı

Risk türleri:

- Kırmızı: bugün/yarın vade, ödeme başarısız, KMH limit bitmiş, canlı kayıt hatası
- Turuncu: kanıt eksik, cari eşleşmesi bekliyor, yüksek tutarlı işlem
- Sarı: onay bekleyen, sınıflama eksik, yaklaşan vade
- Yeşil: tamamlandı/doğrulandı

## Sistem Sağlığı kartı

Gösterilecekler:

- Son GitHub Actions durumu
- Son Gmail kontrol zamanı
- Son banka approval status zamanı
- Son BizimHesap queue worker zamanı
- Smoke test sonucu
- Eksik secret/credential uyarısı

## Ana navigasyon

Sol menü veya mobil alt menü:

- Operasyon Merkezi
- Bankalar
- BizimHesap
- Gmail
- Moka / POS
- Kredi Kartları
- Faturalar
- Şahsi Finans
- Satış / Stok
- Riskler
- Sistem Sağlığı
- Ayarlar / Kurallar

## Yasaklar

- `ErpaltH` ifadesi canlı dashboardda görünmeyecek.
- Demo veri gerçek gibi gösterilmeyecek.
- Kaynağı belirsiz kritik kayıt oluşturulmayacak.
- Onaysız finansal kayıt “işlendi” görünmeyecek.
- Şahsi hesap/kart ALAYLI şirket hesabı gibi gösterilmeyecek.

## Dashboard hazır kabul kriterleri

Dashboard hazır sayılması için:

1. Başlık doğru: AperiON iSTasyon – Operasyon Merkezi.
2. ErpaltH/Demo gibi eski ifadeler canlıda yok.
3. Banka kartı birleşik status dosyasını okuyor.
4. BizimHesap kartı queue/dry-run/processed durumunu gösteriyor.
5. POS/Moka/KMH sınıfları doğru görünüyor.
6. Şahsi finans şirketten ayrı görünüyor.
7. Kredi kartları ve faturalar standart veri alanlarıyla görünüyor.
8. Her kritik kartta son kontrol zamanı var.
9. Kanıt yoksa kayıt işlenebilir görünmüyor.
10. Mobilde 30 saniyede bugünkü kritik durum anlaşılıyor.

## İlk geliştirme hedefi

`aperion-home-v3.html` dosyası yeni Operasyon Merkezi standardına göre revize edilecek.

Öncelik:

1. Başlık/isim temizliği.
2. Banka status kartı.
3. BizimHesap queue kartı.
4. Kredi kartları ve faturalar için placeholder değil gerçek standart alanlı kartlar.
5. Şahsi finans kartı.
6. Sistem sağlığı kartı.
