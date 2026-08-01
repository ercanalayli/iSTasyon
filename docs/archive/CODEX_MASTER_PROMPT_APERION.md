# CODEX MASTER PROMPT — AperiON iSTasyon

Bu dosya AperiON için tek ve birleşik ana geliştirme talimatıdır. Ayrı promptlar yalnızca teknik ek olarak kabul edilir. Codex bu dosyayı baştan sona okuyacak, mevcut çalışan yapıyı koruyacak ve işleri küçük, test edilebilir commitlerle tamamlayacaktır.

## 1. Projenin rolü

Repo: `ercanalayli/iSTasyon`

Canlı kokpit: `https://aperion-istasyon.pages.dev/aperion-home-v3.html`

AperiON bir muhasebe ekranı değildir. Kullanıcının ŞAHSİ hayatı ile ALAYLI Medikal şirketinin finans, belge, varlık, yükümlülük, operasyon ve mevzuat bilgisini tek merkezde yöneten CFO / COO kokpiti ve üst akıldır.

Sistem şu sorulara her an cevap verebilmelidir:

- Bugün ne kritik?
- Bu ay hangi ödemeler var?
- Hangileri ödendi, hangileri açıkta?
- Hangi fatura, ekstre, tahakkuk veya belge gelmedi?
- Hangi banka, kredi kartı veya KMH riskli?
- Hangi belge nerede ve hangi karta bağlı?
- Şahsi ve şirket toplam varlıkları, borçları ve net değerleri nedir?
- Hangi resmi yükümlülük veya mevzuat değişikliği kullanıcıyı etkiliyor?

## 2. Temel mimari

AperiON beş katmanlı çalışır:

1. Master Kartlar
2. Hareketler ve Belgeler
3. Kurallar ve Takvim Motoru
4. Kokpit ve Telegram
5. Üst Akıl / Risk / Tahmin

Kokpit veri tutmaz. Kokpit yalnızca kartları, hareketleri, belgeleri ve kuralları okuyarak sonuç üretir.

## 3. ŞAHSİ / ALAYLI ayrımı

Her kayıt zorunlu olarak şu sınıflardan birine girer:

- `ALAYLI`
- `SAHSI`
- `BELIRSIZ`

Belirsiz kayıt kullanıcıya yalnızca eksik sınıflandırma sorularak tamamlanır. Aynı bilgi tekrar sorulmaz.

Şahsi bir gider şirket hesabından ödendiyse kayıt silinmez veya şirket giderine dönüştürülmez. Şu şekilde tutulur:

- gider sahibi: ŞAHSİ
- ödeme kaynağı: ALAYLI banka / kart
- muhasebe sonucu: ortak cari / şahsi harcama kontrolü

## 4. Master kart sistemi

Her yeni belge, ekran görüntüsü, fatura, ekstre, dekont, ruhsat, poliçe, sözleşme veya kullanıcı notu önce mevcut karta bağlanır. Uygun kart yoksa yeni kart açılır.

Ana kart tipleri:

- Banka Hesabı
- KMH / Ek Hesap
- Kredi Kartı
- Sanal Kart
- Kredi / Finansman
- Otomatik Ödeme Talimatı
- Abonelik
- Fatura
- Kira Sözleşmesi
- Aidat / Ortak Gider
- Personel
- Vergi
- SGK
- Resmi Kurum
- POS
- Moka / Tahsilat Sistemi
- Kasa
- Tedarikçi
- Müşteri
- Cari
- Ürün
- Sipariş
- Satın Alma
- Araç / Motosiklet
- Gayrimenkul
- Sigorta
- Ruhsat / Lisans
- Sözleşme
- Görev / Taahhüt
- Risk
- Belge

Her kartta ortak alanlar:

- card_id
- card_type
- owner_class
- status
- title
- source_type
- source_refs
- created_at
- updated_at
- last_seen_at
- completeness_percent
- missing_fields
- risk_level
- notes

Kartlar tekrar oluşturulmaz; güncellenir.

## 5. Banka, kredi kartı ve KMH kartları

Her banka hesabında en az:

- banka
- hesap sahibi
- ŞAHSİ / ALAYLI
- hesap türü
- maskeli IBAN / hesap no
- bakiye
- kullanılabilir bakiye
- KMH limiti
- KMH kullanımı
- bağlı kredi kartları
- bağlı otomatik ödemeler
- son güncelleme zamanı

Her kredi kartında en az:

- banka
- kart sahibi
- ŞAHSİ / ALAYLI
- kart adı
- son 4 hane
- toplam limit
- kullanılabilir limit
- güncel borç
- ekstre borcu
- asgari ödeme
- hesap kesim günü
- son ödeme günü
- bağlı ödeme hesabı
- bağlı otomatik ödemeler
- güncel ekstre belgesi

Genel kural: kredi kartı ödemesi varsayılan olarak aynı bankadaki vadesiz hesaptan yapılır. Kullanıcı açıkça farklı kaynak söylerse kart ilişkisi güncellenir.

Son ödeme tarihine 3 gün kaldığında güncel ekstre yoksa açık uyarı üret:

`TEB Bonus Card **1233 için son ödeme tarihine 3 gün kaldı. Güncel hesap özetini göndermedin; borç ve asgari ödeme doğrulanamıyor.`

Otomatik ödeme talimatı bulunması `ödendi` anlamına gelmez. Banka veya kart hareketiyle doğrulanmadan ödeme kapanmaz.

## 6. Sabit ve değişken gider kartları

Giderler en az şu gruplarda tutulur:

- sabit aylık
- sabit haftalık
- dönemsel
- kartlı / yüklemeli
- kullanıma bağlı değişken
- finansal yükümlülük
- resmi yükümlülük

### Bilinen ALAYLI ana sabit yükümlülükler

- Personel maaşları: her ayın 5'i, toplam 195.000 TL
- VakıfBank şirket kredisi: her ayın 15'i, 103.672,89 TL
- Şirket interneti: son ödeme tarihi faturadan okunur
- Türk Telekom kurumsal GSM: son ödeme tarihi faturadan okunur
- Sabit telefon: son ödeme tarihi faturadan okunur
- Üç işyeri kirası: en geç her ayın 25'i, toplam 130.000 TL
  - 75.000 TL VakıfBank şirket
  - 55.000 TL nakit
- SGK: tahakkuktaki gerçek son ödeme tarihi
- Apartman aidatı: aylık, makbuz bazlı
- Ortak yakıt / doğalgaz katkısı: aylık, makbuz bazlı ve aidattan ayrı satır
- Cengiz Gıda yemek: haftalık, makbuz bazlı
- BizimHesap: yıllık üyelik
- Şirket suyu: kartlı / yüklemeli, düzenli fatura beklenmez

### Bilinen ŞAHSİ ana yükümlülükler

- VakıfBank Ercan kredisi: her ayın 30'u, 19.578,21 TL
- Batıkent elektrik: faturadaki gerçek son ödeme tarihi, otomatik ödeme
- Batıkent su: faturadaki gerçek son ödeme tarihi, otomatik ödeme
- Batıkent doğalgaz: faturadaki gerçek son ödeme tarihi, otomatik ödeme
- Batıkent aidatı: her ayın 16'sı

## 7. Ödeme Merkezi

Ana ekran adı:

`Today's Critical Payments and Deadlines`

Bu ekran kartlardan üretilir ve her zaman mutlak tarih gösterir.

Yanlış:

- Her ayın 5'i
- Ay sonu
- En geç 25
- Fatura geldiğinde

Doğru:

- 5 Temmuz 2026
- 25 Temmuz 2026
- 31 Temmuz 2026
- faturanın gerçek son ödeme tarihi

Her satır:

- tarih
- kalan gün
- ŞAHSİ / ALAYLI
- ödeme kartı
- tutar
- durum
- otomatik ödeme
- ödeme hesabı
- kanıt
- aç butonu

Durumlar:

- Belge Bekleniyor
- Tahakkuk Bekleniyor
- Ödeme Hazır
- Onay Bekliyor
- Ödeme Yaklaşıyor
- Bugün
- Kısmen Ödendi
- Ödendi
- Bankadan Doğrulandı
- Gecikti

Kronolojik sıralama zorunludur. Geçmiş vadeler en üstte kırmızı, bugün olanlar sonra, ardından en yakın gelecek tarih gelir.

## 8. Aylık vergi ve SGK takip motoru

Her ayın başında ALAYLI için ana görev aç:

`ALAYLI Vergi ve SGK — YYYY/AA`

Beklenen belgeler:

- aylık ödeme listesi
- KDV beyannamesi ve tahakkuku
- Muhtasar ve Prim Hizmet Beyannamesi ve tahakkuku
- SGK tahakkukları
- Geçici Vergi ilgili dönemde
- Kurumlar Vergisi yıllık dönemde
- GEKAP ilgili dönemde
- Damga Vergileri ve diğer tahakkuklar

Gmail'den belge gelene kadar görev açık kalır. Belge kısmen geldiyse yalnızca eksik belge gösterilir.

Durum zinciri:

`Belge Bekleniyor → Eksik Belge Var → Belgeler Tamam → Ön Kontrol → Ödeme Bekleniyor → Kısmen Ödendi → Ödemeler Tamam → Bankadan Doğrulandı → Tamamlandı`

Alarm:

- 7 gün kala bilgi
- 3 gün kala uyarı
- 1 gün kala kritik
- vade geçerse gecikme alarmı

Beyanname veya tahakkuk tek başına görevi kapatmaz. Banka hareketi ya da dekontla ödeme doğrulanmadan işlem tamamlanmaz.

## 9. Belge Arşivi ve Anında Getirme

Tüm belgeler güvenli özel depoda kalıcı arşivlenir:

- ruhsat
- sigorta poliçesi
- fatura
- dekont
- banka ekstresi
- kredi kartı ekstresi
- tahakkuk
- beyanname
- sözleşme
- makbuz
- tapu
- resmi yazı
- lisans / ruhsat

Her belge:

- document_id
- owner_class
- document_type
- title
- related_card_refs
- issue_date
- period
- expiry_date
- file_hash
- storage_path
- source
- version
- uploaded_at
- visibility
- extracted_fields
- audit_log

alanlarını taşır.

Aynı dosya hash ile mükerrer yüklenmez. Yeni sürüm eski belgeyi silmez; versiyonlanır.

Doğal dil erişimi zorunlu:

- `Motosikletimin ruhsatını göster.`
- `16 BHJ 937 trafik poliçesini aç.`
- `Haziran 2026 SGK tahakkukunu getir.`
- `Batıkent su faturamı göster.`

Sistem en güncel doğru belgeyi hemen açmalı; kullanıcı klasör aramamalıdır.

Public GitHub'a gerçek belge, tam kart numarası, tam IBAN, TCKN, SGK sicili, şifre veya özel veri yazılmayacaktır.

## 10. Varlık Kartları ve mevzuat takibi

Her motosiklet, otomobil, gayrimenkul ve önemli demirbaş ayrı varlık kartıdır.

Araç / motosiklet kartında:

- plaka
- marka / model
- model yılı
- ruhsat sahibi
- şasi ve motor no maskeli
- ilk tescil
- muayene
- trafik sigortası
- kasko
- MTV
- HGS
- bakım
- lastik
- akü
- ceza
- belge bağlantıları

Gayrimenkul kartında:

- tapu / kira durumu
- malik / kiracı
- adres özeti
- DASK
- konut sigortası
- emlak vergisi
- çevre temizlik vergisi
- aidat
- kira
- elektrik / su / doğalgaz / internet
- belge bağlantıları

Mevzuat bilgisi güncel kaynaklardan kontrol edilir. Değişiklik kullanıcıya etkisiyle birlikte ilgili karta bağlanır. Eski bilgiye dayanarak kesin hüküm verilmez.

## 11. Varlık Değerleme ve Net Değer Motoru

ŞAHSİ ve ALAYLI ayrı bilançolar üretilecek.

Her varlık kartında:

- acquisition_value
- current_market_value
- valuation_date
- valuation_method
- valuation_sources
- confidence_score
- manual_override
- value_history

Değerleme sıklığı:

- banka / nakit: günlük veya veri geldikçe
- döviz / altın / menkul kıymet: güncel piyasa verisi
- araç / motosiklet: aylık piyasa ortalaması
- gayrimenkul: aylık veya üç aylık piyasa ortalaması
- stok: maliyet ve tahmini net satış değeri
- demirbaş: amortisman ve ikinci el değeri

Her ay rapor:

### ŞAHSİ

- toplam varlık
- toplam borç
- net servet
- likit varlık
- 30 günlük yükümlülük
- aylık değer değişimi

### ALAYLI

- toplam varlık
- toplam borç
- öz değer
- nakit ve nakit benzeri
- cari alacak / borç
- stok
- finansal borç
- vergi / SGK borcu
- 30 günlük ödeme ihtiyacı
- likidite ve borçluluk göstergeleri

Her değerin kaynağı ve güven skoru gösterilir. Kaynaksız tahmini değer kesin rakam gibi sunulmaz.

## 12. Telegram ana iletişim kanalı

Telegram, AperiON'un ana iletişim ve kontrol kanalıdır. Kokpit ana görünüm, Telegram aktif iletişim katmanıdır.

Telegram üzerinden:

- hızlı not
- ödeme bildirimi
- fatura / belge gönderimi
- görev
- alarm
- onay
- belge isteme
- ödeme sonucu teyidi
- günlük kritik özet

çalışır.

Kullanıcıya hazır olmadan test yaptırılmaz. `/api/telegram-preflight` şu sonucu vermeden test istenmez:

- `ok=true`
- `ready_for_user_test=true`

## 13. Güvenlik ve onay

Değişmez zincir:

`Kanıt → Kullanıcı Onayı → Queue → Dry-run → Canlı Kayıt → Geri Doğrulama → Kokpit/Telegram Teyidi`

Şifre, PIN, CVV, SMS kodu, internet bankacılığı parolası hiçbir zaman saklanmaz.

Hassas veriler özel depoda ve yetki kontrollü tutulur. Dört seviye:

- Genel
- Hassas
- Gizli
- Sisteme alınmayacak çok gizli

Finansal kayıt kullanıcı açık onayı olmadan BizimHesap'a yazılmaz.

## 14. BizimHesap ilişkisi

BizimHesap mevcut finans kayıt kaynağıdır. AperiON kartları ve hareketleri BizimHesap ile eşleştirir ancak körlemesine yeniden kayıt oluşturmaz.

POS tahsilatının ertesi gün bankaya yatması gelir değil transferdir.

Moka tahsilatı ile bankaya yatış ayrı hareketlerdir.

Aktif kasa kartları:

- ALAYLI TL Kasası
- POS Kredi Kartı Kasası
- Moka Sonova POS Kasası
- TL Kasası
- Kira Depozito Kasası

Aktif ortak hesabı yalnızca Ercan Alaylı'dır. Veresiye hesapları kullanılmıyor.

## 15. Canlı veri ve kokpit

Ana dosya: `aperion-home-v3.html`

Ana alanlar:

- Today's Critical Payments and Deadlines
- Bankalar ve KMH
- Kredi Kartları
- Vergi ve SGK
- Faturalar / Abonelikler
- Belge Arşivi
- Varlıklar ve Net Değer
- Moka / POS
- Kasalar
- Giderler
- Şahsi Finans
- ALAYLI Finans
- Onay Merkezi
- Riskler
- Telegram Sağlığı
- Gmail Sinyalleri
- Sistem Sağlığı

Dashboard sabit metin değil JSON veya Supabase view okur. Veri yoksa sahte değer göstermez; `veri bekleniyor` yazar.

## 16. Denetim izi

Her kritik işlemde:

- kaynak
- yükleyen
- oluşturan
- değiştiren
- onaylayan
- tarih-saat
- önceki değer
- yeni değer
- belge
- kart
- ödeme doğrulaması

saklanır.

## 17. Codex çalışma biçimi

Önce okunacak dosyalar:

- `docs/START_HERE.md`
- `docs/SESSION_STATE.md`
- `docs/NEXT_ACTION.md`
- `docs/EXECUTION_QUEUE.md`
- `docs/MASTER_DATA_CARD_SCHEMA.md`
- `docs/EXPENSE_CLASSIFICATION_RULES.md`
- `docs/DOCUMENT_ARCHIVE_AND_RETRIEVAL_PROMPT.md`
- `docs/CODEX_HANDOFF_TELEGRAM_FIRST.md`
- `docs/CODEX_PROMPT_TELEGRAM_PRIMARY_CHANNEL.md`
- `aperion-home-v3.html`

Kurallar:

- çalışan yapıyı bozma
- aynı dosyada paralel çalışma yapma
- küçük commitler
- her commit sonrası test
- gerçek test çalışmadan başarılı deme
- kullanıcıya gereksiz teknik iş yükleme
- hazır olmayan sistemi test ettirme

## 18. Uygulama sırası

P0:

1. Master kart veritabanı
2. Belge arşivi ve kart-belge ilişkisi
3. Ödeme merkezi ve mutlak tarih motoru
4. Aylık vergi / SGK belge bekleme motoru
5. Banka hareketiyle ödendi doğrulaması
6. Telegram belge / ödeme / onay akışı

P1:

7. Varlık kartları
8. Varlık değerleme geçmişi
9. ŞAHSİ ve ALAYLI bilanço / net değer
10. Resmi yükümlülük ve mevzuat takibi

P2:

11. Tedarikçi, müşteri, ürün ve cari kartlarının genişletilmesi
12. Gelişmiş risk ve tahmin motoru

## 19. Tamamlanma kriterleri

İş ancak şu koşullarda tamamdır:

- kartlar kalıcı depoda
- belgeler güvenli arşivde
- doğal dille belge erişimi çalışıyor
- ödeme listesi mutlak tarihlerle kronolojik
- belge / tahakkuk gelmezse görev açık
- ödeme banka hareketiyle doğrulanmadan kapanmıyor
- ŞAHSİ / ALAYLI ayrımı doğru
- Telegram hazır ve kullanıcıya teyit veriyor
- mükerrer kontrolü var
- denetim izi var
- kamuya açık alanda hassas veri yok
- ŞAHSİ ve ALAYLI bilanço ayrı üretilebiliyor
- varlık değerlerinin kaynak ve güven skoru var

## 20. İş sonu raporu

Tek rapor ver:

- Yapılanlar
- Değişen dosyalar
- Testler ve sonuçları
- Canlı bağlantılar
- Kalanlar
- Riskler
- Kullanıcının yapması gereken tek zorunlu işlem

Bu dosya AperiON için tek ana Codex promptudur.