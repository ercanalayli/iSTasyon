# AperiON iSTasyon – Finans Veri Standartları

Bu dosya kredi kartları, faturalar, abonelikler, giderler ve otomatik ödemeler için AperiON iSTasyon veri standardını tanımlar.

Amaç: Şirket ve şahsi finans tarafında her kart, her fatura ve her gider aynı formatta takip edilsin; kaynak, kanıt, ödeme, BizimHesap hedefi, risk ve onay durumu karışmasın.

## 1. Evrensel kayıt alanları

Her finansal kayıtta mümkün olduğunca şu alanlar bulunur:

- Kayıt ID
- Kaynak: Gmail / banka ekranı / banka ekstresi / BizimHesap / manuel / Telegram / PDF / XML / Excel
- Sınıf: ALAYLI / ŞAHSİ / BELİRSİZ
- Sahip: şirket, kişi veya ortak
- Belge türü: kredi kartı ekstresi, fatura, banka hareketi, otomatik ödeme, POS, Moka, abonelik, sözleşme
- Belge tarihi
- İşlem tarihi
- Vade / son ödeme tarihi
- Tutar
- Para birimi
- KDV / vergi bilgisi
- Karşı taraf / tedarikçi / kurum
- Açıklama
- Ham veri / kanıt
- Ek dosya adı
- Risk seviyesi
- Durum
- İşlenecek yer: BizimHesap / şahsi finans / sadece arşiv / onay bekliyor
- Mükerrer anahtarı
- Oluşturulma tarihi
- Son güncelleme tarihi

## 2. Güvenlik standardı

AperiON içinde saklanmayacak bilgiler:

- Tam kredi kartı numarası
- CVV / CVC
- Kart şifresi
- İnternet/mobil bankacılık şifresi
- SMS/OTP kodu
- Tam IBAN veya hesap numarası, kullanıcı açıkça istemedikçe
- Gizli API key / service role key / token

Saklanabilecek güvenli bilgiler:

- Kart son 4 hane
- Banka adı
- Kart adı
- Maskeli hesap/kart bilgisi
- Limit, dönem borcu, son ödeme tarihi
- Abone numarası
- Sözleşme numarası
- Kurum adı
- Adres bilgisi, kullanıcı iş takibi için gerekli görüyorsa

## 3. Kredi kartı ana kart standardı

Her kredi kartı için ana kart dosyasında şu alanlar tutulur:

### Kimlik

- Kart kayıt ID
- Sınıf: ALAYLI / ŞAHSİ / BELİRSİZ
- Sahip kişi / şirket
- Banka
- Kart adı
- Kart tipi: bireysel / business / ek kart / sanal kart / banka kartı
- Kart markası/ağı: Troy / Visa / Mastercard / Amex / bilinmiyor
- Son 4 hane
- Ana kart mı / ek kart mı
- Ek kart sahibi
- Kart durumu: aktif / kapalı / bloke / yenileme bekliyor

### Finansal bilgiler

- Toplam limit
- Kullanılabilir limit
- Dönem içi toplam
- Güncel borç
- Ekstre borcu
- Asgari ödeme
- Gelecek dönem taksitleri
- Taksitli borç toplamı
- Nakit avans limiti
- Kullanılabilir nakit avans limiti
- Para birimi

### Ekstre ve ödeme

- Ekstre kesim günü
- Son ödeme günü
- Son ödeme tarihi
- Otomatik ödeme var mı
- Otomatik ödeme hesabı
- Ödeme tipi: tamamı / asgari / manuel / otomatik
- Ödenen tutar
- Kalan borç
- Gecikme durumu
- Gecikme günü

### Muhasebe / sınıflandırma

- Varsayılan kullanım: şahsi / şirket / karışık
- BizimHesap bağlantısı var mı
- Şirket harcaması ise gider kategorisi
- Şahsi harcama ise şahsi finans kategorisi
- Ortak cari bağlantısı var mı
- Vergi/KDV takibi var mı
- E-fatura/fiş kanıtı zorunlu mu

### Risk ve kontrol

- Limit kullanım oranı
- Son ödeme yaklaşımı
- Gecikme riski
- Dönem içi anormal artış
- Şahsi/şirket karışma riski
- Otomatik ödeme başarısızlığı riski

## 4. Kredi kartı hareket standardı

Her kart hareketinde şu alanlar tutulur:

- Kart kayıt ID
- Banka
- Kart son 4 hane
- İşlem tarihi
- Provizyon tarihi
- Ekstre tarihi
- Üye işyeri / merchant
- MCC / sektör kodu varsa
- Açıklama
- Tutar
- Para birimi
- Taksit sayısı
- Taksit no
- Toplam taksitli işlem tutarı
- KDV bilgisi
- Fiş/fatura var mı
- E-fatura/e-arşiv bağlantısı
- Sınıf: şahsi / şirket / belirsiz
- Gider kategorisi
- Proje / masraf merkezi
- Cari / tedarikçi
- BizimHesap işlenecek mi
- Onay durumu
- Kanıt dosyası

## 5. Fatura / abonelik ana kayıt standardı

Su, elektrik, doğalgaz, internet, telefon, kira, aidat, yazılım aboneliği gibi düzenli giderlerde ana abonelik kartı açılır.

### Kimlik

- Abonelik kayıt ID
- Sınıf: ALAYLI / ŞAHSİ / BELİRSİZ
- Kurum / tedarikçi adı
- Fatura türü: su / elektrik / doğalgaz / internet / telefon / kira / aidat / yazılım / sigorta / vergi / diğer
- Abone adı
- Abone numarası
- Sözleşme hesap numarası
- Tesisat numarası
- Sayaç numarası
- Müşteri numarası
- Hizmet adresi
- Fatura adresi
- Vergi no / TC kimlik, gerekiyorsa maskeli
- Sözleşme başlangıç tarihi
- Sözleşme bitiş tarihi
- Tarife / paket / plan
- Aktif/pasif durumu

### Ödeme

- Ödeme yöntemi: otomatik ödeme / manuel / kredi kartı / banka hesabı / talimat / nakit
- Otomatik ödeme bankası
- Bağlı banka hesabı
- Bağlı kredi kartı
- Son ödeme günü / vade günü
- Ortalama aylık tutar
- Gecikme riski
- Ödeme başarılı mı
- Ödeme referansı

### Muhasebe

- BizimHesap cari adı
- Gider kategorisi
- KDV oranı
- Tevkifat var mı
- Masraf merkezi
- Şirket/şahsi ayrımı
- Fatura şirket adına mı şahıs adına mı
- Belge zorunluluğu

## 6. Fatura dönem kaydı standardı

Her gelen fatura dönemsel kayıt olarak tutulur:

- Abonelik kayıt ID
- Fatura numarası
- ETTN / UUID, varsa
- Fatura tarihi
- Dönem başlangıcı
- Dönem bitişi
- Son ödeme tarihi
- Önceki okuma
- Son okuma
- Tüketim miktarı
- Birim
- Net tutar
- KDV tutarı
- Diğer vergi/bedel
- Gecikme zammı
- Toplam tutar
- Ödenen tutar
- Kalan tutar
- Ödeme tarihi
- Ödeme yapılan banka/kart
- Otomatik ödeme talimatı ID
- PDF/XML/HTML kanıt dosyası
- BizimHesap kayıt durumu
- Onay durumu

## 7. Gider standardı

Her gider kaydı şu alanlara sahip olmalıdır:

- Gider kayıt ID
- Sınıf: ALAYLI / ŞAHSİ / BELİRSİZ
- Gider tarihi
- Belge tarihi
- Tedarikçi / kurum / kişi
- Gider türü
- Gider kategorisi
- Alt kategori
- Açıklama
- Net tutar
- KDV
- Toplam tutar
- Ödeme yöntemi
- Ödeme hesabı/kartı
- Fatura/fiş/dekont var mı
- Belge numarası
- Cari bağlantısı
- Masraf merkezi
- Şirketle ilişkisi
- Şahsi/şirket karışma riski
- BizimHesap işlenecek mi
- Onay durumu
- Kanıt dosyası

## 8. Su faturası örnek standardı

Bir su faturası için standart alanlar:

- Kurum: ilgili belediye/su idaresi
- Fatura türü: Su
- Sınıf: ALAYLI veya ŞAHSİ
- Abone adı
- Abone numarası
- Sözleşme numarası
- Tesisat numarası
- Sayaç numarası
- Hizmet adresi
- Fatura adresi
- Dönem
- Fatura tarihi
- Son ödeme tarihi
- Önceki sayaç endeksi
- Son sayaç endeksi
- Tüketim m³
- Su bedeli
- Atık su bedeli
- ÇTV / vergi / diğer bedeller
- KDV
- Toplam tutar
- Otomatik ödeme var mı
- Bağlı banka/kart: örn. VakıfBank
- Ödeme tarihi
- Dekont/kanıt
- BizimHesap gider kategorisi
- Durum: bekliyor / ödendi / gecikti / işlenecek / işlendi

## 9. Otomatik ödeme talimatı standardı

Her otomatik ödeme için ayrı talimat kaydı tutulur:

- Talimat kayıt ID
- Kurum
- Fatura türü
- Abone numarası
- Abone adı
- Sınıf: ALAYLI / ŞAHSİ
- Bağlı banka
- Bağlı hesap/kart
- Talimat başlangıç tarihi
- Talimat bitiş tarihi, varsa
- Talimat durumu: aktif / iptal / başarısız / askıda
- Son başarılı ödeme tarihi
- Son başarısız ödeme tarihi
- Başarısızlık nedeni
- Yedek ödeme yöntemi
- Risk seviyesi

## 10. Durum standardı

- new
- waiting_document
- waiting_user_review
- pending_approval
- approved
- rejected
- scheduled
- paid
- posted_to_bizimhesap
- verified
- overdue
- failed
- archived

## 11. Şirket/şahsi ayrımı

Varsayılan kural:

- Şahsi kart/hesap hareketleri ALAYLI BizimHesap'a otomatik yazılmaz.
- Şirket hesabı/kartı olmayan her kayıt önce ŞAHSİ veya BELİRSİZ kabul edilir.
- Şirketle ilişkisi kullanıcı tarafından belirtilirse onaylı incelemeye düşer.

## 12. AperiON ekranlarında gösterilecek minimum bilgi

### Kredi kartı kart listesi

- Banka
- Kart adı
- Son 4 hane
- Sınıf
- Kullanılabilir limit
- Güncel borç / dönem içi toplam
- Ekstre kesim tarihi
- Son ödeme tarihi
- Otomatik ödeme durumu
- Risk

### Fatura/abonelik listesi

- Kurum
- Fatura türü
- Abone adı
- Abone no
- Hizmet adresi kısa
- Son ödeme tarihi
- Son fatura tutarı
- Ödeme yöntemi
- Durum
- Risk

### Gider listesi

- Tarih
- Tedarikçi
- Kategori
- Tutar
- Ödeme yöntemi
- Belge var/yok
- Şirket/şahsi
- BizimHesap durumu
- Onay durumu

## 13. Mükerrer kontrol anahtarları

Kredi kartı hareketi:

- banka + kart son4 + işlem tarihi + tutar + açıklama + provizyon/işlem referansı

Fatura:

- kurum + abone no + dönem + fatura no + tutar

Gider:

- tedarikçi + tarih + tutar + belge no + ödeme yöntemi

Otomatik ödeme:

- kurum + abone no + son ödeme tarihi + tutar + ödeme bankası

## 14. Kanıt standardı

Her kaydın mümkünse en az bir kanıtı olmalıdır:

- PDF fatura
- XML/e-Fatura
- HTML/e-Arşiv
- Banka ekran görüntüsü
- Banka ekstre satırı
- Kredi kartı ekstresi
- Dekont
- BizimHesap kayıt ekranı
- Telegram onay logu

Kanıt yoksa canlı kayıt yapılmaz; sadece taslak/inceleme olabilir.
