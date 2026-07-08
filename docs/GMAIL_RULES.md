# AperiON iSTasyon – Gmail Kuralları

Gmail, AperiON iSTasyon'un ana veri kaynaklarından biridir. Gmail'den gelen finans ve operasyon mailleri otomatik okunur, sınıflandırılır ve Operasyon Merkezi'nde sinyal olarak gösterilir.

## Ana ilke

Gmail'den gelen kayıtlar doğrudan işlenmez.

Önce:

1. Mail okunur.
2. Sınıflandırılır.
3. Ekler tespit edilir.
4. Kanıt oluşturulur.
5. Mükerrer kontrol yapılır.
6. Operasyon Merkezi'ne sinyal düşer.
7. Gerekirse onaya gider.

## Sınıflar

- ALAYLI
- ŞAHSİ
- BELİRSİZ

## Takip edilecek mail türleri

- Banka ekstresi
- Vadesiz hesap hareketi
- Kredi kartı ekstresi
- FAST / EFT / dekont
- Vergi bildirimi
- SGK bildirimi
- Moka United hareketi
- BizimHesap günlük finans bilgisi
- BizimHesap gelen e-Fatura bildirimi
- Tedarikçi faturası
- e-Arşiv / e-Fatura XML / HTML
- ÜTS durum değişikliği
- Kritik operasyon mailleri
- Şahsi abonelik ve ödeme uyarıları

## Her mail sinyalinde zorunlu alanlar

- Kaynak: Gmail
- Gönderen
- Alıcı
- Konu
- Tarih / saat
- Okunma durumu
- Ek adı
- Ek türü
- Sınıf
- Risk
- Önerilen aksiyon
- Kanıt özeti

## Risk mantığı

Yeşil:

- Bilgilendirme
- Düşük riskli şahsi harcama
- Günlük ekstre, acil aksiyon yoksa

Sarı:

- Banka ekstresi
- FAST/EFT ama detay eksik
- Kredi kartı bildirimi
- e-Fatura kontrolü

Turuncu:

- Günlük finans özeti önemli bakiye içeriyorsa
- ÜTS durum değişikliği
- Mutabakat gerektiren hareket

Kırmızı:

- Vergi/SGK ödeme veya tahsilat sorunu
- Vade/son ödeme riski
- Kritik tedarikçi faturası
- Ödeme yöntemi sorunu
- İşlem başarısızlığı

## Yasak davranışlar

- Kaynağı belli olmayan görev üretmek
- Eski otomasyon kalemini yeniymiş gibi göstermek
- “MT Fatura Bildirimi Bekliyor” gibi kanıtsız kayıt yazmak
- Mail türünü belirtmeden kritik listeye almak
- Kredi kartı ekstresi ile vadesiz hesap ekstresini karıştırmak

## Doğru örnek

Kaynak: Gmail
Banka: VakıfBank
Belge: Vadesiz hesap ekstresi
Ek: 00158007352192509.xlsx
Tarih: 08.07.2026 03:21
Sınıf: ALAYLI
Risk: Sarı
Durum: İncelenecek
İşlenecek yer: BizimHesap banka hareketleri

## Yanlış örnek

“Vakıfbank geldi.”

Bu ifade eksiktir ve kullanılmamalıdır.

## OAuth / güvenlik

Gmail refresh token, client secret, API key veya benzeri gizli bilgiler kodda, frontend'de veya promptlarda açık yazılmayacaktır.

Bu bilgiler yalnızca GitHub Secrets / güvenli ortam değişkenleri üzerinden kullanılacaktır.
