# AperiON iSTasyon – Veri Modeli ve Standartlar

Bu dosya `DATABASE.md`, `MASTER_DATA_CARD_SCHEMA.md`, `FINANCIAL_DATA_STANDARDS.md`
ve `DOCUMENT_ARCHIVE_AND_RETRIEVAL_PROMPT.md`'nin 2026-07-31 tarihli
birleşimidir. Kaynak dosyaların tamamı `docs/archive/` altındadır.

## Konsolidasyon notu — alan adlandırma seçimi

Kaynak dosyalar aynı varlıkları (kart/fatura/gider) üç farklı adlandırma
kuralıyla tarif ediyordu: `DATABASE.md` genel `snake_case` tablo/alan adları
kullanıyordu (`records`, `bank_row_key`, `duplicate_key`...), `MASTER_DATA_CARD_SCHEMA.md`
kart bazlı `snake_case` alan grupları kullanıyordu (`card_id`, `owner_class`...),
`FINANCIAL_DATA_STANDARDS.md` ise çoğunlukla Türkçe açıklama listeleri
kullanıyordu ("Kayıt ID", "Sınıf: ALAYLI/ŞAHSİ/BELİRSİZ"...). Bu konsolidasyonda
**`snake_case` İngilizce alan adları** ana referans olarak seçildi (gerçek
Supabase şemasına en yakın olan bu ikisiydi); Türkçe liste, aynı alanların
insan-okur açıklaması olarak korunmuştur — iki taraf çelişmez, aynı alanı iki
dilde tarif eder. Bu **kasıtlı bir konsolidasyon kararıdır**, veri kaybı değil.

## 1. Genel akış

Tüm işler şu standart akışa bağlanır:

**Kaynak → Belge → Kayıt → Karar → Onay → İşlem → Doğrulama → Log**

## 2. Ana tablolar (`snake_case` referans şema)

### companies

Şirket/bağlam kayıtları. Örnekler: `ALAYLI`, `ŞAHSİ`, `BELİRSİZ`.

### accounts

Banka, POS, kasa, kredi kartı, KMH ve BizimHesap hesap eşleşmeleri.

Zorunlu alanlar: `company_id`, `account_name`, `account_type`, `bank_name`,
`bizimhesap_account_name`, `is_active`.

### sources

Veri kaynakları. Örnekler: Gmail, banka ekstresi, BizimHesap, Moka, Telegram,
manuel.

### documents

Mail eki, PDF, XLSX, XML, HTML, satış raporu gibi ham belge kayıtları.

Zorunlu alanlar: `source_id`, `company_id`, `document_type`, `title`,
`file_name`, `received_at`, `document_date`, `sender`, `hash`, `raw_ref`.

### records

Operasyon merkezine düşen her finans/operasyon kaydı.

Zorunlu alanlar: `document_id`, `source`, `company`, `record_type`, `title`,
`description`, `amount`, `currency`, `record_date`, `bank_name`,
`account_name`, `counterparty`, `risk_level`, `status`, `action_target`,
`evidence_json`, `duplicate_key`, `bank_row_key`, `created_at`, `updated_at`.

### approvals

Kullanıcı onay/reddetme kararları.

Zorunlu alanlar: `record_id`, `approval_status`, `approved_by`,
`approved_at`, `reject_reason`, `telegram_message_id`, `approval_url`.

### actions

Sistemin yaptığı her işlem. Örnekler: Telegram'a gönderildi, kullanıcı
onayladı, BizimHesap'a işlendi, tekrar kontrol edildi, reddedildi.

### ledger_links

AperiON kaydı ile BizimHesap veya başka hedef sistemdeki gerçek kayıt
arasındaki bağlantı.

Zorunlu alanlar: `record_id`, `target_system`, `target_account`,
`target_record_id`, `target_status`, `verified_at`.

### audit_log

Değişmez işlem günlüğü. Her kritik işlem buraya yazılır.

### automation_rules

Otomasyon kuralları. Örnek: `POS Batch → transfer`; aynı
banka+tarih+saat+tutar+açıklama → mükerrer; cari boşsa → "Cari eşleşmesi
bekliyor".

## 3. Durum / risk / mükerrer anahtar standardı

Durum standardı: `new`, `needs_review`, `pending_approval`, `approved`,
`rejected`, `processing`, `posted`, `verified`, `failed`, `duplicate`,
`archived`.

(Finans veri standardı tarafında ayrıca kullanılan genişletilmiş durumlar:
`waiting_document`, `waiting_user_review`, `scheduled`, `paid`,
`posted_to_bizimhesap`, `overdue`.)

Risk standardı: `green`, `yellow`, `orange`, `red`.

Mükerrer anahtarlar finansal kayıtlarda en az şu alanlardan türetilmelidir:
banka, hesap, tarih, saat, tutar, açıklama, karşı taraf, belge hash, satır
no. Banka hareketlerinde `bank_row_key` zorunludur.

Mükerrer kontrol anahtarları (özel türler):

- **Kredi kartı hareketi**: banka + kart son4 + işlem tarihi + tutar +
  açıklama + provizyon/işlem referansı.
- **Fatura**: kurum + abone no + dönem + fatura no + tutar.
- **Gider**: tedarikçi + tarih + tutar + belge no + ödeme yöntemi.
- **Otomatik ödeme**: kurum + abone no + son ödeme tarihi + tutar + ödeme
  bankası.

## 4. Kalıcı kart veri şeması

AperiON yalnızca belge saklamaz; şirket ve şahsi hayatla ilgili varlık,
yükümlülük, ilişki, sözleşme, ürün, müşteri, tedarikçi, gider, gelir ve
riskleri kart tabanlı olarak öğrenir.

Her yeni bilgi: (1) var olan kartla eşleştirilir, (2) yeni bilgi karta
eklenir, (3) eksik alanlar belirlenir, (4) kullanıcıya yalnızca eksik
alanlar sorulur, (5) kart tamamlanma oranı güncellenir, (6) risk/vade/
ödeme/tahsilat/operasyon takibine bağlanır.

**Güvenlik kararı:** Gerçek abone numarası, hesap numarası, kart numarası,
kimlik bilgisi, özel sözleşme bilgisi ve benzeri hassas veriler public
GitHub dosyalarına açık yazılmaz. Repo yalnızca şema, kural ve maskeli örnek
tutar; gerçek özel veri Supabase/private storage tarafında tutulur.

### 4.1 Ortak kart alanları

```
card_id
card_type
owner_class: ALAYLI | SAHSI | BELIRSIZ
status: active | passive | needs_review | cancelled
source_type: screenshot | pdf | email | manual_note | bank_statement | invoice | contract
source_summary
created_at
updated_at
last_seen_at
completeness_rate
evidence_required
evidence_refs
risk_level
next_action
notes
```

### 4.2 Kart aileleri

Aşağıdaki 26 kart ailesi tanımlıdır. Her biri ortak alanlara ek olarak
kendi alan grubunu taşır (tam alan listeleri kaynak dosyada korunmuştur,
burada özetlenmiştir — tam liste için git geçmişindeki
`docs/archive/MASTER_DATA_CARD_SCHEMA.md`'ye bakılabilir, alan isimleri
aşağıda eksiksiz tutulmuştur):

1. **Banka Hesabı**: `bank_name, branch, account_owner, account_type, currency, iban_masked, account_no_masked, balance, available_balance, blocked_amount, kmh_limit, kmh_used, usage_scope, linked_cards, linked_auto_payments, linked_pos_accounts, last_statement_date`
2. **Kredi Kartı**: `bank_name, card_name, card_owner, card_last4, network, card_type_detail, total_limit, available_limit, cash_advance_limit, current_debt, statement_debt, minimum_payment, statement_cut_date, due_date, auto_payment_source_ref, linked_expenses, linked_subscriptions, installment_balance, risk_note`
3. **Sanal Kredi Kartı**: `bank_name, virtual_card_name, card_last4, linked_main_card_ref, virtual_limit, available_limit, expiry_rule, usage_scope, merchant_restriction, active_status, last_transaction_date`
4. **Abonelik**: `subscription_group, institution, subscriber_name, subscriber_no_masked, contract_no_masked, service_address_summary, billing_frequency, billing_period, average_amount, amount_change_rule, last_amount, next_due_date, payment_status, auto_payment_status, payment_method_ref, mail_source, bizimhesap_category`
5. **Aidat**: `property_ref, site_or_building_name, independent_unit, management_name, management_contact, payment_frequency, amount, amount_change_rule, last_increase_date, payment_day, payment_method, payment_source_ref, receipt_required, last_payment_date, next_due_date`
6. **Otomatik Ödeme Talimatı**: `institution, bill_type, subscriber_no_masked, payment_source_type, payment_source_ref, start_date, end_date, auto_payment_status, last_payment_date, last_payment_amount, failed_payment_count, risk_note`
7. **Fatura**: `institution, invoice_no, invoice_date, due_date, amount_total, currency, payment_status, linked_subscription_ref, linked_auto_payment_ref, payment_source_ref, evidence_ref`
8. **Kira Sözleşmesi**: `property_ref, landlord_name, tenant_name, contract_start_date, contract_end_date, contract_duration, renewal_type, increase_month, increase_rule, monthly_total, cash_amount, bank_amount, payment_day, payment_method, payment_source_ref, contract_document_ref, deposit_amount, last_increase_date, next_increase_date, termination_notice_period`
9. **Gayrimenkul**: `property_code, property_type, address_summary, ownership_type, owner_name, usage_type, linked_rent_contracts, linked_aidat, linked_utilities, insurance_ref, tax_ref, market_value`
10. **Ürün**: `product_code, barcode, product_name, brand, category, subcategory, unit, package_quantity, purchase_vat_rate, sales_vat_rate, supplier_refs, purchase_price, sales_price, price_list_ref, fifo_cost, stock_quantity, minimum_stock, maximum_stock, expiry_tracking, lot_tracking, sales_rules, profit_rule`
11. **Tedarikçi**: `supplier_name, legal_title, tax_office, tax_no_masked, contact_person, phone, email, address_summary, product_groups, payment_terms, currency, current_balance, credit_limit, bank_info_ref, purchase_discount_rules, return_rules, risk_level, bizimhesap_ref`
12. **Müşteri**: `customer_name, legal_title, customer_type, contact_person, phone, email, address_summary, city, sales_region, product_preferences, price_list_ref, discount_rules, payment_terms, credit_limit, current_balance, collection_risk, last_order_date, last_collection_date, bizimhesap_ref`
13. **Cari**: `counterparty_ref, relationship_type, current_balance, balance_direction, payment_terms, open_invoices, open_orders, open_collections, open_payments, risk_level, last_reconciliation_date`
14. **Sipariş**: `order_no, customer_ref, order_date, product_lines, price_list_ref, discount_rule, vat_rule, shipping_status, invoice_status, collection_status, delivery_date, profitability`
15. **Satın Alma**: `purchase_no, supplier_ref, purchase_date, product_lines, invoice_no, payment_terms, payment_status, warehouse_entry_status, cost_allocation`
16. **Personel**: `employee_name, role, department, start_date, salary, payment_day, sgk_status, meal_benefit, bonus_rule, advance_balance, bank_account_ref, leave_balance, emergency_contact`
17. **Araç**: `plate, brand, model, model_year, ownership_type, owner_class, insurance_ref, casco_ref, inspection_date, exhaust_date, mtv_dates, hgs_ref, fuel_type, maintenance_plan, last_maintenance, next_maintenance, assigned_driver`
18. **Sigorta**: `insurance_type, insurance_company, policy_no_masked, insured_asset_ref, start_date, end_date, premium_amount, payment_plan, payment_source_ref, renewal_date, agent_contact`
19. **Vergi / Resmi Yükümlülük**: `obligation_type, institution, period, amount, due_date, payment_status, payment_source_ref, penalty_risk, document_ref`
20. **Gider**: `expense_type, expense_category, fixed_or_variable, frequency, expected_amount, actual_amount, payment_day, payment_method, payment_source_ref, linked_contract_ref, linked_supplier_ref, last_payment_date, next_due_date`
21. **Gelir**: `income_type, income_category, fixed_or_variable, frequency, expected_amount, actual_amount, collection_day, collection_method, collection_account_ref, linked_customer_ref, last_collection_date, next_expected_date`
22. **Kredi / Finansman**: `bank_name, credit_type, principal_amount, remaining_principal, interest_rate, installment_amount, installment_day, start_date, end_date, payment_account_ref, collateral_ref, risk_note`
23. **POS / Moka**: `provider, merchant_no_masked, bank_account_ref, commission_rate, settlement_rule, installment_rule, pending_amount, next_settlement_date, last_reconciliation_date`
24. **Sözleşme**: `contract_type, counterparty_ref, start_date, end_date, duration, renewal_rule, termination_notice, payment_terms, price_revision_rule, document_ref, responsible_person`
25. **Görev / Taahhüt**: `task_type, source_ref, responsible_person, due_date, priority, status, approval_required, completion_evidence`
26. **Risk**: `risk_type, linked_card_ref, risk_level, trigger_condition, current_value, threshold, recommended_action, owner, status`

### 4.3 Kart ilişkileri

```
Müşteri → Sipariş → Fatura → Tahsilat → Banka
Tedarikçi → Satın Alma → Fatura → Ödeme → Banka/Kart
Gayrimenkul → Kira → Aidat → Elektrik/Su/İnternet
Kredi Kartı → Ekstre → Bağlı Giderler → Ödeme Hesabı
Ürün → Tedarikçi → Alış → Stok → Satış → Kâr
Araç → Sigorta → MTV → Bakım → Yakıt
Personel → Maaş → SGK → Prim → Avans
```

### 4.4 Eksik alan ve tamamlama kuralı

```
%0–49   : Eksik
%50–79  : Kısmi
%80–99  : Neredeyse tamam
%100    : Tam
```

Eksik alan varsa bütün bilgiyi tekrar istemek yasaktır; sadece eksik
alanlar sorulur.

### 4.5 Cevap standardı

Her belge, ekran veya kullanıcı notu sonunda:

```
Tespit:
Sınıf:
Güncellenen Kart:
Eksik Alanlar:
Operasyonel Etki:
Kalıcı kayıt önerisi:
```

## 5. Finans veri standardı (kredi kartı / fatura / abonelik / gider)

### 5.1 Evrensel kayıt alanları

Kayıt ID, kaynak, sınıf (ALAYLI/ŞAHSİ/BELİRSİZ), sahip, belge türü, belge
tarihi, işlem tarihi, vade/son ödeme tarihi, tutar, para birimi, KDV/vergi
bilgisi, karşı taraf/tedarikçi/kurum, açıklama, ham veri/kanıt, ek dosya
adı, risk seviyesi, durum, işlenecek yer, mükerrer anahtarı, oluşturulma ve
son güncelleme tarihi.

### 5.2 Güvenlik standardı

**Saklanmayacak:** tam kredi kartı numarası, CVV/CVC, kart şifresi,
internet/mobil bankacılık şifresi, SMS/OTP kodu, tam IBAN veya hesap
numarası (kullanıcı açıkça istemedikçe), gizli API key/service role
key/token.

**Saklanabilecek:** kart son 4 hane, banka adı, kart adı, maskeli hesap/kart
bilgisi, limit, dönem borcu, son ödeme tarihi, abone numarası, sözleşme
numarası, kurum adı, adres bilgisi (iş takibi için gerekliyse).

### 5.3 Kredi kartı ana kart standardı

**Kimlik:** kart kayıt ID, sınıf, sahip kişi/şirket, banka, kart adı, kart
tipi (bireysel/business/ek kart/sanal kart/banka kartı), marka/ağ (Troy/
Visa/Mastercard/Amex/bilinmiyor), son 4 hane, ana/ek kart, ek kart sahibi,
kart durumu (aktif/kapalı/bloke/yenileme bekliyor).

**Finansal bilgiler:** toplam limit, kullanılabilir limit, dönem içi
toplam, güncel borç, ekstre borcu, asgari ödeme, gelecek dönem taksitleri,
taksitli borç toplamı, nakit avans limiti ve kullanılabilir nakit avans
limiti, para birimi.

**Ekstre ve ödeme:** ekstre kesim günü, son ödeme günü/tarihi, otomatik
ödeme var mı ve hangi hesaptan, ödeme tipi (tamamı/asgari/manuel/otomatik),
ödenen tutar, kalan borç, gecikme durumu/günü.

**Muhasebe/sınıflandırma:** varsayılan kullanım (şahsi/şirket/karışık),
BizimHesap bağlantısı, gider kategorisi, ortak cari bağlantısı, vergi/KDV
takibi, e-fatura/fiş kanıtı zorunluluğu.

**Risk ve kontrol:** limit kullanım oranı, son ödeme yaklaşımı, gecikme
riski, dönem içi anormal artış, şahsi/şirket karışma riski, otomatik ödeme
başarısızlığı riski.

### 5.4 Kredi kartı hareket standardı

Kart kayıt ID, banka, kart son 4 hane, işlem/provizyon/ekstre tarihi, üye
işyeri/merchant, MCC, açıklama, tutar, para birimi, taksit sayısı/no, toplam
taksitli işlem tutarı, KDV bilgisi, fiş/fatura var mı, e-fatura bağlantısı,
sınıf, gider kategorisi, proje/masraf merkezi, cari/tedarikçi, BizimHesap
işlenecek mi, onay durumu, kanıt dosyası.

### 5.5 Fatura / abonelik ana kayıt standardı

Su, elektrik, doğalgaz, internet, telefon, kira, aidat, yazılım aboneliği
gibi düzenli giderlerde ana abonelik kartı açılır.

**Kimlik:** abonelik kayıt ID, sınıf, kurum/tedarikçi adı, fatura türü,
abone adı/no, sözleşme hesap no, tesisat no, sayaç no, müşteri no, hizmet/
fatura adresi, vergi no/TC kimlik (maskeli, gerekiyorsa), sözleşme başlangıç/
bitiş, tarife/paket/plan, aktif/pasif durumu.

**Ödeme:** ödeme yöntemi, otomatik ödeme bankası, bağlı hesap/kart, son
ödeme günü, ortalama aylık tutar, gecikme riski, ödeme başarılı mı, ödeme
referansı.

**Muhasebe:** BizimHesap cari adı, gider kategorisi, KDV oranı, tevkifat
var mı, masraf merkezi, şirket/şahsi ayrımı, fatura kime kesilmiş, belge
zorunluluğu.

### 5.6 Fatura dönem kaydı standardı

Abonelik kayıt ID, fatura no, ETTN/UUID, fatura tarihi, dönem başlangıç/
bitiş, son ödeme tarihi, önceki/son okuma, tüketim miktarı/birim, net
tutar, KDV tutarı, diğer vergi/bedel, gecikme zammı, toplam/ödenen/kalan
tutar, ödeme tarihi ve banka/kart, otomatik ödeme talimatı ID, kanıt dosyası,
BizimHesap kayıt durumu, onay durumu.

### 5.7 Gider standardı

Gider kayıt ID, sınıf, gider/belge tarihi, tedarikçi/kurum/kişi, gider türü/
kategori/alt kategori, açıklama, net/KDV/toplam tutar, ödeme yöntemi/hesabı,
fatura/fiş/dekont var mı, belge no, cari bağlantısı, masraf merkezi,
şirketle ilişkisi, şahsi/şirket karışma riski, BizimHesap işlenecek mi, onay
durumu, kanıt dosyası.

### 5.8 Su faturası örnek standardı

Kurum, fatura türü (Su), sınıf, abone adı/no, sözleşme no, tesisat no,
sayaç no, hizmet/fatura adresi, dönem, fatura tarihi, son ödeme tarihi,
önceki/son sayaç endeksi, tüketim m³, su bedeli, atık su bedeli, ÇTV/vergi/
diğer bedeller, KDV, toplam tutar, otomatik ödeme var mı, bağlı banka/kart,
ödeme tarihi, dekont/kanıt, BizimHesap gider kategorisi, durum (bekliyor/
ödendi/gecikti/işlenecek/işlendi).

### 5.9 Otomatik ödeme talimatı standardı

Talimat kayıt ID, kurum, fatura türü, abone no/adı, sınıf, bağlı banka/
hesap/kart, talimat başlangıç/bitiş tarihi, talimat durumu (aktif/iptal/
başarısız/askıda), son başarılı/başarısız ödeme tarihi, başarısızlık
nedeni, yedek ödeme yöntemi, risk seviyesi.

### 5.10 Durum standardı (finans veri standardı tarafı)

`new`, `waiting_document`, `waiting_user_review`, `pending_approval`,
`approved`, `rejected`, `scheduled`, `paid`, `posted_to_bizimhesap`,
`verified`, `overdue`, `failed`, `archived`.

### 5.11 Şirket/şahsi ayrımı

- Şahsi kart/hesap hareketleri ALAYLI BizimHesap'a otomatik yazılmaz.
- Şirket hesabı/kartı olmayan her kayıt önce ŞAHSİ veya BELİRSİZ kabul
  edilir.
- Şirketle ilişkisi kullanıcı tarafından belirtilirse onaylı incelemeye
  düşer.

### 5.12 AperiON ekranlarında gösterilecek minimum bilgi

**Kredi kartı listesi:** banka, kart adı, son 4 hane, sınıf, kullanılabilir
limit, güncel borç/dönem içi toplam, ekstre kesim tarihi, son ödeme
tarihi, otomatik ödeme durumu, risk.

**Fatura/abonelik listesi:** kurum, fatura türü, abone adı/no, hizmet
adresi kısa, son ödeme tarihi, son fatura tutarı, ödeme yöntemi, durum,
risk.

**Gider listesi:** tarih, tedarikçi, kategori, tutar, ödeme yöntemi, belge
var/yok, şirket/şahsi, BizimHesap durumu, onay durumu.

### 5.13 Kanıt standardı

Her kaydın mümkünse en az bir kanıtı olmalıdır: PDF fatura, XML/e-Fatura,
HTML/e-Arşiv, banka ekran görüntüsü, banka ekstre satırı, kredi kartı
ekstresi, dekont, BizimHesap kayıt ekranı, Telegram onay logu. Kanıt yoksa
canlı kayıt yapılmaz; sadece taslak/inceleme olabilir.

## 6. Belge arşivi ve anında erişim

AperiON'a gelen her belge, görsel, PDF, ekran görüntüsü, ruhsat, poliçe,
fatura, dekont, tahakkuk, sözleşme, banka ekstresi ve diğer evrak güvenli
biçimde arşivlenir; ilgili ana karta bağlanır; kullanıcı doğal dille
istediğinde saniyeler içinde bulunup gösterilir.

Örnek istekler: "Motosikletimin ruhsat görüntüsünü göster.", "TVS Jupiter
trafik sigortası poliçesini aç.", "Haziran 2026 SGK tahakkukunu göster."

### 6.1 Temel mimari

1. Master kartlar
2. Belge kayıtları
3. Belge–kart ilişkileri
4. Güvenli dosya deposu
5. Arama ve anında erişim servisi
6. Sürümleme ve denetim izi
7. Yetkilendirme ve hassas veri koruması

### 6.2 `document_records` alanları

```
id, owner_scope (PERSONAL | ALAYLI | UNCERTAIN), company_id, document_type,
document_subtype, title, original_filename, mime_type, file_size,
storage_provider, storage_bucket, storage_path, checksum_sha256,
source_channel (CHATGPT | GMAIL | TELEGRAM | MANUAL_UPLOAD | BANK_EMAIL | OTHER),
source_message_id, source_email_id, source_sender, document_date,
issue_date, due_date, period_year, period_month, amount, currency,
issuer_name, counterparty_name, plate_no, policy_no, subscriber_no,
account_last4, card_last4, tax_type, tax_period, status, extraction_status,
duplicate_status, confidence_score, is_sensitive, created_at, updated_at,
archived_at
```

### 6.3 `document_links`

Bir belge birden fazla karta bağlanabilir: `id, document_id, card_type,
card_id, relation_type, is_primary, created_at`.

Örnek: TVS Jupiter ruhsatı → `card_type: ASSET`, motosiklet kartı,
`relation_type: REGISTRATION_DOCUMENT`. Aynı poliçe ayrıca sigorta kartına
da bağlanabilir (`relation_type: INSURANCE_POLICY`).

### 6.4 Belge yaşam döngüsü

Kaynak veri alındı → dosya güvenli depoya yazıldı → SHA-256 checksum →
mükerrer belge kontrolü → ŞAHSİ/ALAYLI/BELİRSİZ sınıflandırma → belge türü
tanındı → temel alanlar çıkarıldı → ilgili master kart bulundu/adayı
oluşturuldu → belge karta bağlandı → ön kontrol → gerekirse Onay
Merkezi'ne → kayıt tamamlandı → denetim izi yazıldı → arama indeksine
eklendi.

Belge fiziksel olarak kaybolmamalı, üzerine yazılmamalı ve sessizce
silinmemelidir.

### 6.5 Dosya depolama

Gerçek belgeler public GitHub deposuna yazılmaz. Zorunlu kurallar:

- Private object storage (Supabase Storage private bucket veya eşdeğeri).
- Her dosya için kısa süreli signed URL; kalıcı olmayacak.
- Tam T.C., VKN, IBAN, şasi no, motor no, poliçe no gibi hassas bilgiler
  public loglarda yer almaz.
- Veritabanında hassas alanlar gerektiğinde şifreli tutulur.
- Orijinal dosya değiştirilemez saklanır; düzenlenmiş/kırpılmış kopya ayrı
  sürüm olarak saklanır.

Önerilen bucket'lar: `personal-documents`, `alayli-documents`,
`uncertain-documents`, `document-previews`.

Önerilen klasör yapısı:
`/{scope}/{year}/{month}/{card_type}/{card_id}/{document_id}/{original_filename}`

### 6.6 Anında erişim akışı

Kullanıcının isteğindeki varlığı/kartı çözümle → ilgili master kartı bul →
belge türünü çözümle → `document_links` üzerinden bağlı belgeleri getir →
en güncel/geçerli belgeyi seç → gerekirse tarih sıralı çoklu belge göster →
signed URL üret → önizleme + temel metadata birlikte göster.

### 6.7 Arama yetenekleri

Belge adı, belge türü, şirket/şahıs, plaka, kurum, abone no, poliçe no,
fatura dönemi, vergi türü, son ödeme tarihi, tutar, kart adı, doğal dil
açıklaması.

### 6.8 Önizleme, mükerrer kontrolü, sürümleme

Desteklenen formatlar: PDF, JPG, JPEG, PNG, WEBP, XLS/XLSX, DOC/DOCX, EML.

Mükerrer kontrolü sadece dosya adına göre yapılmaz; kontroller: SHA-256
checksum, dosya boyutu, belge türü, kurum, dönem, tutar, poliçe/fatura/
tahakkuk numarası, kart ilişkisi. Aynı belge tekrar gelirse yeni kayıt
açılmaz, mevcut kayda yeni kaynak ilişkisi eklenir ve kullanıcıya "Bu belge
daha önce arşivlenmiş" bilgisi gösterilir.

Yeni versiyon gelirse eski belge silinmez; yeni belge yeni `version_no` ile
kaydedilir, `previous_document_id` ile zincir kurulur, `active_version`
işaretlenir.

### 6.9 Denetim izi ve silme politikası

Loglanacaklar: kim yükledi, hangi kanaldan, ne zaman, hangi karta bağlandı,
kim görüntüledi/indirdi/yeniden sınıflandırdı/sildi veya arşivledi, hangi
sürüm aktif.

Varsayılan: silme yok, arşivleme var. Hassas belge silme çift onay
gerektirir; silme soft-delete olarak başlar; kalıcı silme ayrı yetki ve
denetim izi gerektirir; yasal saklama süresi olan belgeler için retention
policy uygulanır.

### 6.10 Dashboard — Belge Merkezi

Kartlar: son yüklenen belgeler, eksik belge bekleyen kartlar, süresi
dolacak belgeler, mükerrer şüphesi olanlar, sınıflandırılamayan belgeler,
ŞAHSİ belgeler, ALAYLI belgeler, son görüntülenenler.

Her varlık kartında sekmeler: Belgeler, Ruhsat, Sigorta, Muayene, Vergi/
harç, Bakım, Fotoğraflar, Geçmiş sürümler.

### 6.11 Kabul kriterleri

1. Daha önce yüklenen belge doğal dille istendiğinde 3 saniye içinde
   bulunmalı.
2. Belge yeniden yüklenmeden gösterilebilmeli.
3. Orijinal dosya korunmalı.
4. Public GitHub'da hassas belge bulunmamalı.
5. ŞAHSİ ve ALAYLI belgeleri birbirinden ayrılmalı.
6. Aynı belge iki kez arşivlenmemeli.
7. Her belge en az bir karta bağlanmalı veya "eşleştirme bekliyor"
   durumunda kalmalı.
8. Belge görüntüleme/indirme işlemleri denetim izine yazılmalı.
9. "Belgelerimi göster" dediğinde kart bazlı ve tarih sıralı sonuç
   alınmalı.
10. Belge silme çift onay gerektirmeli.

### 6.12 Geliştirme önceliği

P0.1 `document_records`/`document_links` tabloları · P0.2 private storage +
signed URL · P0.3 mevcut yüklemelerin belge kaydına alınması · P0.4
motosiklet ruhsatı + trafik poliçesiyle uçtan uca test · P0.5 doğal dil
belge arama API'si · P0.6 Belge Merkezi ekranı · P0.7 Gmail eklerinin
otomatik arşivlenmesi · P0.8 denetim izi, sürümleme, soft delete.

## Ek A — BizimHesap B2B API notları (teknik referans)

Kaynak dokümanlar: `BizimHesap_B2B_API_New.pdf`, kullanıcı tarafından
2026-06-29 paylaşılan Entegrasyon API dokümanı metni.

### Var olan endpointler

- `POST /addinvoice`: alış/satış faturası ekler.
- `POST /cancelinvoice`: `AddInvoice` ile oluşan faturayı iptal eder.
- `GET /products`: ürün listesini getirir.
- `GET /warehouses`: depo listesini getirir.
- `GET /inventory/{depo-id}`: depo stok listesini getirir.
- `GET /customers`: cari/müşteri listesini getirir.
- `GET /abstract/{musteri-id}`: cari ekstresini getirir.
- `POST /addcustomer`: cari ekler.
- `POST /addproduct`: ürün/hizmet ekler.

### AperiON kararı

- Fatura, cari ve ürün detayı için B2B API tercih edilecek.
- Ürün, depo, stok ve cari okumaları için B2B API, Puppeteer rapor
  botlarının yerine geçmeye adaydır.
- Alış/satış faturası oluşturma için `AddInvoice` resmi yol olarak
  değerlendirilecek.
- Banka ekstresi → Onay Merkezi → BizimHesap banka/kasa kaydı hattında,
  BizimHesap banka/kasa API endpointi gelene kadar mevcut kilitli worker
  korunacak (dokümanda banka/kasa hareketi ekleme, banka masrafı kaydı,
  tahsilat/ödeme fişi ekleme, hesaplar arası virman endpointi yok).
- Kullanıcı onayı olmadan kesin BizimHesap kaydı yapılmayacak.
- API token GitHub Secret olarak tutulacak, koda veya loga yazılmayacak.

### Gerekli secretlar

- `BIZIMHESAP_B2B_TOKEN`
- `BIZIMHESAP_FIRM_ID`
- Opsiyonel: `BIZIMHESAP_B2B_BASE_URL`, `BIZIMHESAP_B2B_AUTH_MODE`
  (`token-header` varsayılan, alternatifler `bearer`, `query-token`)

BizimHesap üyelik ekranındaki eşleşme: `Api Key(FirmID)` →
`BIZIMHESAP_FIRM_ID`; `Zirve Express Aktarım Api Key` → önce
`BIZIMHESAP_B2B_TOKEN` olarak denenir.

**2026-06-29 canlı test sonucu:** `products`, `customers`, `warehouses` GET
endpointleri `token` header, `Authorization: Bearer` ve `?token=` query
biçimleriyle denendi — üçünde de `401 Authorization has been denied for
this request` döndü. Bu Zirve anahtarı B2B GET endpointleri için yetkili
görünmüyor veya BizimHesap tarafında API erişimi henüz açık değil.

### Kontrol komutları

```powershell
npm run verify:bizimhesap:b2b-api        # yerel
npm run verify:bizimhesap:b2b-api:live   # canlı, sadece okuma yapan GET testi
```

Canlı yazma bu komutlarla yapılmaz.
