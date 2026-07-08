# AperiON iSTasyon – Otomasyon Kuralları

AperiON otomasyonları kontrollü çalışır. Amaç kullanıcıyı yormadan işleri ilerletmek, fakat finansal riski kullanıcı onayı olmadan sisteme yazmamaktır.

## Otomasyon seviyeleri

### Seviye 1 – Sadece bildir

Düşük riskli olaylar:

- Günlük hesap ekstresi geldi
- BizimHesap günlük özet geldi
- Şahsi düşük riskli fatura geldi
- Operasyonel bilgi maili geldi

Sistem yalnızca bildirir ve Operasyon Merkezi'nde gösterir.

### Seviye 2 – Onaya gönder

Orta/yüksek riskli olaylar:

- Banka hareketi
- FAST / EFT / dekont
- e-Fatura
- Tedarikçi faturası
- POS banka aktarımı
- Kredi kartı/KMH işlemleri
- Cari eşleşmesi gerektiren kayıt

Kullanıcı onayı olmadan işlem yapılmaz.

### Seviye 3 – Otomatik işle

Sadece çok güvenli ve tekrar eden kurallar için ileride açılabilir.

Başlangıçta kapalı kabul edilir.

## Finansal kayıt kuralı

Finansal kayıtlar için varsayılan davranış:

**Onay olmadan BizimHesap'a yazma.**

## Mükerrer koruma

Aynı belge veya işlem tekrar gönderilebilir. Sistem daha önce işlenenleri süzer ve sadece işlenmeyenleri onaya getirir.

## Kanıt kuralı

Her otomasyon kararı kanıt içermelidir:

- Kaynak
- Belge
- Tarih/saat
- Tutar
- Açıklama
- Ham veri
- Referans/hash

Kanıt yoksa kayıt otomatik işlenmez.

## Günlük Operasyon Merkezi

Sabah tek rapor / tek ekran mantığı:

- Kritik ödemeler
- Gmail
- Bankalar
- e-Fatura
- Moka / POS
- Sipariş / satış
- Riskler
- GitHub / sistem durumları

Bu bilgiler ayrı ayrı dağınık başlıklarda değil, AperiON iSTasyon Operasyon Merkezi altında gösterilecektir.

## Yasak otomasyonlar

- Kaynağı belirsiz görevi kritik listeye almak
- Eski görevleri yeniymiş gibi göstermek
- Kanıtsız “bekliyor” üretmek
- Kullanıcı onayı olmadan finansal kayıt yazmak
- Gizli anahtarları frontend veya prompta yazmak
