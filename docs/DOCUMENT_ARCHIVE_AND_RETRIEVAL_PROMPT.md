# AperiON Belge Arşivi ve Anında Erişim — Codex Geliştirme Promptu

## Amaç

AperiON’a gelen her belge, görsel, PDF, ekran görüntüsü, ruhsat, poliçe, fatura, dekont, tahakkuk, sözleşme, banka ekstresi ve diğer evrak güvenli biçimde arşivlenecek; ilgili ana karta bağlanacak; kullanıcı doğal dille istediğinde saniyeler içinde bulunup gösterilecek.

Örnek kullanıcı isteği:

- “Motosikletimin ruhsat görüntüsünü göster.”
- “TVS Jupiter trafik sigortası poliçesini aç.”
- “Batıkent su otomatik ödeme talimatını getir.”
- “Haziran 2026 SGK tahakkukunu göster.”
- “İşyeri internet faturasının aslını aç.”

Sistem yalnızca özet vermeyecek; orijinal belgeyi de erişilebilir biçimde gösterecek.

## Temel mimari

1. Master kartlar
2. Belge kayıtları
3. Belge–kart ilişkileri
4. Güvenli dosya deposu
5. Arama ve anında erişim servisi
6. Sürümleme ve denetim izi
7. Yetkilendirme ve hassas veri koruması

## Veri modeli

### document_records

Alanlar:

- id
- owner_scope: PERSONAL | ALAYLI | UNCERTAIN
- company_id
- document_type
- document_subtype
- title
- original_filename
- mime_type
- file_size
- storage_provider
- storage_bucket
- storage_path
- checksum_sha256
- source_channel: CHATGPT | GMAIL | TELEGRAM | MANUAL_UPLOAD | BANK_EMAIL | OTHER
- source_message_id
- source_email_id
- source_sender
- document_date
- issue_date
- due_date
- period_year
- period_month
- amount
- currency
- issuer_name
- counterparty_name
- plate_no
- policy_no
- subscriber_no
- account_last4
- card_last4
- tax_type
- tax_period
- status
- extraction_status
- duplicate_status
- confidence_score
- is_sensitive
- created_at
- updated_at
- archived_at

### document_links

Bir belge birden fazla karta bağlanabilir.

Alanlar:

- id
- document_id
- card_type
- card_id
- relation_type
- is_primary
- created_at

Örnek:

TVS Jupiter ruhsatı:

- card_type: ASSET
- card_id: motosiklet kartı
- relation_type: REGISTRATION_DOCUMENT

Ray Sigorta poliçesi:

- card_type: ASSET
- card_id: motosiklet kartı
- relation_type: INSURANCE_POLICY

Aynı poliçe ayrıca sigorta kartına da bağlanabilir.

## Belge yaşam döngüsü

Her yeni belge için zorunlu akış:

1. Kaynak veri alındı
2. Dosya güvenli depoya yazıldı
3. SHA-256 checksum üretildi
4. Mükerrer belge kontrolü yapıldı
5. ŞAHSİ / ALAYLI / BELİRSİZ sınıflandırıldı
6. Belge türü tanındı
7. Temel alanlar çıkarıldı
8. İlgili master kart bulundu veya kart adayı oluşturuldu
9. Belge karta bağlandı
10. Ön kontrol yapıldı
11. Kullanıcı onayı gerekiyorsa Onay Merkezi’ne gönderildi
12. Kayıt tamamlandı
13. Denetim izi yazıldı
14. Arama indeksine eklendi

Belge fiziksel olarak kaybolmamalı, üzerine yazılmamalı ve sessizce silinmemeli.

## Dosya depolama

Gerçek belgeler public GitHub deposuna yazılmayacak.

Zorunlu kurallar:

- Belgeler private object storage içinde tutulacak.
- Supabase Storage private bucket veya eşdeğer özel nesne deposu kullanılacak.
- Her dosya için kısa süreli signed URL üretilecek.
- Signed URL kalıcı olmayacak.
- Tam T.C., VKN, IBAN, şasi no, motor no, poliçe no ve benzeri hassas bilgiler public loglarda yer almayacak.
- Veritabanında hassas alanlar gerektiğinde şifreli tutulacak.
- Belgenin orijinal dosyası değiştirilemez olarak saklanacak.
- Düzenlenmiş veya kırpılmış kopya ayrı sürüm olarak saklanacak.

Önerilen bucket yapısı:

- personal-documents
- alayli-documents
- uncertain-documents
- document-previews

Önerilen klasör yapısı:

`/{scope}/{year}/{month}/{card_type}/{card_id}/{document_id}/{original_filename}`

## Anında erişim

Kullanıcı doğal dille belge istediğinde sistem şu sırayı izlemeli:

1. Kullanıcının isteğindeki varlığı veya kartı çözümle.
2. İlgili master kartı bul.
3. Belge türünü çözümle.
4. document_links üzerinden bağlı belgeleri getir.
5. En güncel ve geçerli belgeyi seç.
6. Gerekirse kullanıcıya birden fazla belgeyi tarih sırasıyla göster.
7. Orijinal dosya için signed URL üret.
8. Belge önizlemesini ve temel metadatasını birlikte göster.

Örnek:

Kullanıcı: “Motosikletimin ruhsat görüntüsünü istiyorum.”

Beklenen davranış:

- Aktif şahsi motosiklet kartını bul.
- relation_type = REGISTRATION_DOCUMENT olan belgeyi getir.
- En güncel ruhsatı seç.
- Belgeyi doğrudan önizle.
- Başlık: “TVS Jupiter 125 — Ruhsat”
- Alt bilgi: plaka, belge tarihi, yüklenme tarihi.

Kullanıcı tekrar belge yüklemek zorunda kalmamalı.

## Arama yetenekleri

Arama şu alanlarda çalışmalı:

- belge adı
- belge türü
- şirket/şahıs
- plaka
- kurum
- abone no
- poliçe no
- fatura dönemi
- vergi türü
- son ödeme tarihi
- tutar
- kart adı
- doğal dil açıklaması

Örnek aramalar:

- “16 BHJ 937 ruhsat”
- “Ray Sigorta Temmuz 2026”
- “Batıkent su talimatı”
- “2026 Mayıs KDV tahakkuku”
- “ALAYLI internet faturası”

## Belge önizleme

Desteklenecek formatlar:

- PDF
- JPG
- JPEG
- PNG
- WEBP
- XLS/XLSX
- DOC/DOCX
- EML

PDF ve görseller için küçük önizleme üretilecek. Orijinal dosya ayrıca korunacak.

## Mükerrer kontrolü

Mükerrer kontrolü yalnız dosya adına göre yapılmayacak.

Kontroller:

- SHA-256 checksum
- dosya boyutu
- belge türü
- kurum
- dönem
- tutar
- poliçe/fatura/tahakkuk numarası
- kart ilişkisi

Aynı belge tekrar gelirse:

- yeni kayıt açma
- mevcut kayda yeni kaynak ilişkisi ekle
- kullanıcıya “Bu belge daha önce arşivlenmiş” bilgisini göster

## Sürümleme

Aynı belgenin yeni versiyonu gelirse:

- eski belge silinmez
- yeni belge yeni version_no ile kaydedilir
- previous_document_id alanı ile zincir kurulur
- active_version işaretlenir

## Denetim izi

Her işlem loglanacak:

- belgeyi kim yükledi
- hangi kanaldan geldi
- ne zaman geldi
- hangi karta bağlandı
- kim görüntüledi
- kim indirdi
- kim yeniden sınıflandırdı
- kim sildi veya arşivledi
- hangi sürüm aktif

## Silme ve saklama politikası

- Varsayılan: silme yok, arşivleme var.
- Hassas belge silme işlemi çift onay gerektirir.
- Silme soft-delete olarak başlar.
- Kalıcı silme ayrı yetki ve denetim izi gerektirir.
- Yasal saklama süresi olan belgeler için retention policy uygulanır.

## Dashboard

Yeni ana modül:

### Belge Merkezi

Kartlar:

- Son yüklenen belgeler
- Eksik belge bekleyen kartlar
- Süresi dolacak belgeler
- Mükerrer şüphesi olanlar
- Sınıflandırılamayan belgeler
- ŞAHSİ belgeler
- ALAYLI belgeler
- Son görüntülenenler

### Varlık kartı belge alanı

Her varlık kartında sekmeler:

- Belgeler
- Ruhsat
- Sigorta
- Muayene
- Vergi/harç
- Bakım
- Fotoğraflar
- Geçmiş sürümler

## İlk uygulanacak gerçek örnekler

### TVS Jupiter 125 motosiklet

Bağlanacak belgeler:

1. Ruhsat görüntüsü
2. Ray Sigorta zorunlu trafik poliçesi

Beklenen doğal dil erişimleri:

- “Motosiklet ruhsatını getir.”
- “TVS sigorta poliçesini göster.”
- “16 BHJ 937 belgelerini aç.”

### ALAYLI Vergi ve SGK

Bağlanacak belgeler:

- Aylık ödeme listeleri
- KDV beyannameleri
- KDV tahakkukları
- Muhtasar ve Prim Hizmet Beyannameleri
- SGK tahakkukları
- Geçici Vergi
- Kurumlar Vergisi
- GEKAP

Beklenen doğal dil erişimleri:

- “2026 Haziran vergi ödeme listesini getir.”
- “Mayıs 2026 SGK tahakkukunu aç.”
- “2025 kurumlar vergisi beyannamesini göster.”

## Gmail entegrasyonu

- Mali müşavirden gelen vergi/SGK ekleri otomatik arşivlenecek.
- Fatura ve banka ekstreleri otomatik sınıflandırılacak.
- E-posta gövdesi kaynak metadata olarak saklanacak.
- Ek gelmediyse aylık görev açık kalacak.
- Belge geldiyse ilgili karta bağlanacak.
- Belge geldi diye görev kapanmayacak; ödeme banka hareketiyle doğrulanana kadar açık kalacak.

## Kabul kriterleri

1. Kullanıcı daha önce yüklediği motosiklet ruhsatını doğal dille istediğinde sistem belgeyi 3 saniye içinde bulmalı.
2. Belge yeniden yüklenmeden gösterilebilmeli.
3. Orijinal dosya korunmalı.
4. Public GitHub’da hassas belge bulunmamalı.
5. ŞAHSİ ve ALAYLI belgeleri birbirinden ayrılmalı.
6. Aynı belge iki kez arşivlenmemeli.
7. Her belge en az bir karta bağlanmalı veya “eşleştirme bekliyor” durumunda kalmalı.
8. Belge görüntüleme ve indirme işlemleri denetim izine yazılmalı.
9. Kullanıcı “belgelerimi göster” dediğinde kart bazlı ve tarih sıralı sonuç almalı.
10. Belge silme çift onay gerektirmeli.

## Geliştirme önceliği

P0.1 — document_records ve document_links tabloları

P0.2 — private storage bucket ve signed URL

P0.3 — mevcut yüklemelerin belge kaydına alınması

P0.4 — motosiklet ruhsatı ve trafik poliçesiyle uçtan uca test

P0.5 — doğal dil belge arama API’si

P0.6 — Belge Merkezi ekranı

P0.7 — Gmail eklerinin otomatik arşivlenmesi

P0.8 — denetim izi, sürümleme, soft delete

## Son kural

AperiON hiçbir belgeyi yalnızca sohbet mesajı olarak görmeyecek.

Her belge:

- kalıcı kayıt,
- güvenli dosya,
- kart ilişkisi,
- aranabilir metadata,
- denetim izi,
- gerektiğinde anında erişim

ile yönetilecek.