# AperiON İkinci Beyin v58 — Hayat Komuta Merkezi

Bu doküman, AperiON’un şirket finansı dışındaki kişisel hayat yönetimi katmanını tanımlar.

## Ana vizyon

AperiON yalnızca iş/şirket finansını takip eden bir sistem olmayacak. Kullanıcının hayatındaki tüm ödeme, belge, poliçe, resmi iş, yapılacak görev ve hatırlatma akışlarını yöneten ikinci beyin olarak konumlanacak.

Bu modülün adı:

```text
AperiON İkinci Beyin
```

Alternatif ekran adı:

```text
Hayat Komuta Merkezi
```

## Neden ayrı modül?

Şirket finansı ile kişisel hayat yönetimi birbirine karıştırılmayacak.

```text
AperiON Finans
→ şirket nakit akışı, cari, banka, POS, Moka, kârlılık

AperiON İkinci Beyin
→ kişisel ödemeler, yenilemeler, belgeler, işler, hatırlatmalar
```

## Takip edilecek ana başlıklar

### 1. Araç takipleri

- Trafik sigortası
- Kasko
- Motorlu Taşıtlar Vergisi
- Araç muayene
- Egzoz emisyon
- Bakım tarihi
- Lastik değişimi
- HGS / OGS / geçiş borçları
- Ceza / trafik cezası
- Araç kredi/taksit bilgileri
- Poliçe belge bağlantıları

### 2. Ev ve yaşam ödemeleri

- Ev aidatı
- Su faturası
- Elektrik faturası
- Doğalgaz faturası
- İnternet faturası
- Telefon faturası
- Site / apartman özel giderleri
- Kira / emlak vergisi
- DASK
- Konut sigortası

### 3. Kişisel finans yükümlülükleri

- Kredi kartı ödemeleri
- Kredi taksitleri
- KMH / ek hesap
- Vergi borçları
- SGK / Bağ-Kur / prim ödemeleri
- Abonelikler
- Düzenli bağışlar
- Diğer düzenli ödemeler

### 4. Resmi ve süreli işler

- Pasaport
- Ehliyet
- Kimlik
- Vize
- Sağlık raporu
- Ruhsat
- Sözleşme yenileme
- E-imza / mali mühür / KEP / UETS gibi süreli araçlar

### 5. Sağlık ve aile takipleri

- Doktor randevuları
- İlaç hatırlatmaları
- Kontrol tarihleri
- Aile bireyleri için önemli tarihler
- Okul / sınav / kayıt işleri

### 6. Belge ve dosya merkezi

Her kayıt için belge bağlantısı tutulacak:

- Poliçe PDF
- Fatura PDF
- Dekont
- Ruhsat / belge görseli
- Sözleşme
- E-posta kaynağı
- Google Drive dosya bağlantısı

## Temel kayıt mantığı

Her ödeme veya iş için standart alanlar:

| Alan | Açıklama |
|---|---|
| Kayıt adı | Trafik sigortası, su faturası, aidat vb. |
| Tür | ödeme / görev / belge / yenileme / sağlık / resmi iş |
| Kategori | araç / ev / kişisel finans / resmi / sağlık / aile |
| Bağlı varlık | Peugeot 3008, Batıkent ev, Gölpark ev vb. |
| Son tarih | Ödeme veya yapılma son günü |
| Tutar | Biliniyorsa tutar |
| Para birimi | TL / EUR / USD |
| Periyot | tek seferlik / aylık / yıllık / 6 aylık / özel |
| Durum | bekliyor / ödendi / yapıldı / ertelendi / iptal / eksik belge |
| Öncelik | düşük / normal / yüksek / kritik |
| Hatırlatma | kaç gün önce uyarı verilecek |
| Belge linki | Drive veya dosya bağlantısı |
| Not | açıklama |
| Sorumlu | kullanıcı / aile / ofis / başka kişi |

## Durum akışı

```text
Yeni kayıt
→ bekliyor
→ hatırlatma yaklaştı
→ vadesi geldi
→ ödendi / yapıldı
→ belge eklendi
→ arşivlendi
```

Gecikirse:

```text
bekliyor
→ gecikti
→ kritik uyarı
```

## Telegram ve bildirim mantığı

Telegram botu şu komutları desteklemeli:

```text
/bugun
/hafta
/ay
/odemeler
/yapilacaklar
/gecikenler
/arac
/ev
/belge_eksik
```

Örnek çıktı:

```text
Bugün yapılacaklar:
1. Su faturası — 420 TL — son gün bugün
2. Araç MTV — 2. taksit — 3 gün kaldı
3. Ev aidatı — bekliyor
```

## Üst beyin prensibi

Bu modül yalnızca liste tutmayacak; yorumlayacak.

Örnek analizler:

- Bu ay toplam kişisel ödeme yükü nedir?
- Önümüzdeki 7 gün kritik ödeme var mı?
- Hangi belgelerin süresi yaklaşıyor?
- Hangi ödeme geçti ama yapılmadı?
- Araçla ilgili bu yıl hangi ödemeler var?
- Evlerle ilgili düzenli giderler ne durumda?
- Belgesi olmayan ödeme/görev var mı?

## Güvenlik kuralları

- Otomatik ödeme yapmaz.
- Bankadan para göndermez.
- Onaysız kayıt silmez.
- Kritik değişikliklerde onay ister.
- Hatırlatma ve takip yapar, ödeme/yapma kararını kullanıcıya bırakır.

## v58 MVP kapsamı

İlk sürümde yapılacaklar:

1. İkinci Beyin SQL taban tabloları
2. Hayat Komuta Merkezi preview ekranı
3. Ödeme/görev ekleme formu
4. Yaklaşanlar, gecikenler, bugün, bu hafta görünümleri
5. Telegram günlük özet formatı
6. Belge linki alanı
7. Araç ve ev varlıkları için bağlı kayıt mantığı

## Sonraki fazlar

- Gmail’den fatura/poliçe yakalama
- Google Drive belge arşivi
- Otomatik tekrar eden kayıt üretimi
- Aile bireyleri bazlı takip
- Sesli komut / Telegram’dan hızlı kayıt
- Harcama ve ödeme gerçekleşme analizi

## Yapılanlar

- AperiON İkinci Beyin vizyonu netleştirildi.
- Şirket finansından ayrı modül olarak konumlandı.
- Araç, ev, kişisel ödeme, resmi iş, belge ve sağlık başlıkları tanımlandı.
- Telegram komutları ve durum akışı belirlendi.

## Kalanlar

- SQL tabloları oluşturulacak.
- Preview ekran yapılacak.
- Telegram komut taslağı eklenecek.
- Google Drive belge klasör standardı eklenecek.
- Mevcut v57 finans modülleriyle bağlantı noktaları belirlenecek.
