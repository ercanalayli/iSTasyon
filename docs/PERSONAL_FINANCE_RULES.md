# AperiON iSTasyon – Şahsi Finans Kuralları

Bu dosya Ercan Alaylı şahsi banka, kredi kartı, KMH, abonelik ve şahsi transfer takip kurallarını tanımlar.

## Ana ayrım

Şahsi hesap hareketleri ALAYLI şirket banka mutabakatına karıştırılmaz.

Şahsi hesaplar şu sınıfta takip edilir:

- company/class: ŞAHSİ
- owner: Ercan Alaylı
- target: Şahsi finans / şahsi nakit akışı / şahsi borç takibi

## Kişisel veri kuralı

Şahsi banka ekran görüntülerindeki tam IBAN, hesap numarası, müşteri no ve benzeri hassas bilgiler repo dosyalarına açık yazılmaz.

Repo’da yalnızca banka adı, hesap türü, bakiye/risk sınıfı, kart son 4 hanesi ve işlem sınıflandırma kuralı tutulur.

## VakıfBank Ercan Alaylı şahsi hesap örneği

Kullanıcı tarafından VakıfBank Ercan Alaylı şahsi hesabı olarak bildirilen görselden çıkarılan durum:

- Banka: VakıfBank
- Sınıf: ŞAHSİ
- Hesap türü: Vadesiz TL / KMH bağlantılı olabilir
- Bakiye: eksi bakiye görülüyor
- Kullanılabilir bakiye pozitif görünüyor

Bu hesap şirket kaydı değildir.

## VakıfBank Ercan Alaylı şahsi kredi kartları

Kullanıcı tarafından VakıfBank Ercan Alaylı kredi kartları olarak bildirilen görselden çıkarılan kart listesi:

- Platinum Kredi Kartı **6598
  - Kullanılabilir limit: 250.000,00 TL
  - Dönem içi toplam: 0,00 TL
- Anında Platinum Troy **6595
  - Kullanılabilir limit: 250.000,00 TL
  - Dönem içi toplam: 0,00 TL
- Business Kredi Kartı **6041
  - Kullanılabilir limit: 50.000,00 TL
  - Dönem içi toplam: 0,00 TL
- Pro Card **4640
  - Ek kart / Ercan Alaylı
  - Kullanılabilir limit: 50.000,00 TL

Bu kartlar kullanıcı tarafından Ercan Alaylı şahsi kredi kartları olarak bildirildiği için varsayılan sınıf **ŞAHSİ** olacaktır.

“Business Kredi Kartı” ibaresi tek başına ALAYLI şirket kartı kabul edilmez. Şirketle ilişkisi kullanıcı tarafından açıkça belirtilmedikçe ALAYLI şirket BizimHesap kayıtlarına bağlanmaz.

## Şahsi işlem sınıflandırmaları

### Gelen FAST – Ercan Alaylı’dan / kendi hesapları arası

Açıklamada Ercan Alaylı adı geçiyorsa ve kullanıcı şahsi hesap olduğunu bildiriyorsa varsayılan sınıf:

- İşlem tipi: Şahsi hesaplar arası transfer adayı
- Risk: Düşük / Orta
- BizimHesap şirket kaydı: Hayır
- Durum: Şahsi finans takibi

Şirketle ilişkisi kullanıcı tarafından açıkça belirtilmedikçe ALAYLI cari/tahsilat sayılmaz.

### Masraf Tanım

- İşlem tipi: Şahsi banka masrafı
- BizimHesap şirket kaydı: Hayır
- Şahsi finans gideri olarak takip edilir.

### Ek Hesap Faiz Tahakkuku

- İşlem tipi: Şahsi KMH faiz gideri
- Ana para kapama değildir.
- Finansman gideri olarak şahsi finans tarafında takip edilir.
- ALAYLI şirket gideri sayılmaz.

### Taksitli Tahsilat

Bu açıklama tek başına belirsizdir.

Varsayılan:

- İşlem tipi: Şahsi borç/kredi/kart tahsilatı adayı
- Durum: İnceleme gerekli
- BizimHesap şirket kaydı: Hayır

Detay açıklama veya ekstre olmadan otomatik sınıflandırılmaz.

## Şahsi kredi kartı kuralları

Şahsi kredi kartı hareketleri ALAYLI şirket gideri kabul edilmez.

Varsayılan sınıflar:

- Kredi kartı dönem içi harcama: Şahsi kredi kartı harcaması
- Kredi kartı borç ödemesi: Şahsi banka → şahsi kredi kartı borç kapama
- Kart aidatı / faiz / ücret: Şahsi finansman/banka gideri
- Şirket harcaması olduğu kullanıcı tarafından belirtilirse: Onaylı ortak cari / şirket gideri incelemesi

Şahsi kredi kartından yapılan bir harcama şirketle ilgiliyse kullanıcı ayrıca belirtmelidir. Kanıt olmadan ALAYLI BizimHesap gideri yapılmaz.

## Şirket/şahsi karışma kuralı

Şahsi hesaptan ALAYLI şirket hesabına para girerse veya ALAYLI şirket hesabından şahsi hesaba para çıkarsa, işlem otomatik tahsilat/gider yapılmaz.

Önce şu sınıflardan biri kullanıcı tarafından seçilmelidir:

- Ortak cari / sermaye destek
- Şirketten şahsa ödeme
- Şahıstan şirkete borç/avans
- Yanlış transfer
- Şahsi hareket, şirketle ilgisiz

## Onay kuralı

Şahsi hesap hareketleri şirket BizimHesap kayıtlarına otomatik yazılmaz.

Ancak kullanıcı açıkça “bu şirketle ilgili” derse ve kanıt varsa, ilgili ALAYLI cari/ortak hesap kuralına göre onaya düşer.
