# AperiON iSTasyon – Veri Modeli

AperiON'daki tüm işler şu standart akışa bağlanır:

**Kaynak → Belge → Kayıt → Karar → Onay → İşlem → Doğrulama → Log**

## Ana tablolar

### companies

Şirket/bağlam kayıtları.

Örnekler:

- ALAYLI
- ŞAHSİ
- BELİRSİZ

### accounts

Banka, POS, kasa, kredi kartı, KMH ve BizimHesap hesap eşleşmeleri.

Zorunlu alanlar:

- company_id
- account_name
- account_type
- bank_name
- bizimhesap_account_name
- is_active

### sources

Veri kaynakları.

Örnekler:

- Gmail
- Banka ekstresi
- BizimHesap
- Moka
- Telegram
- Manuel

### documents

Mail eki, PDF, XLSX, XML, HTML, satış raporu gibi ham belge kayıtları.

Zorunlu alanlar:

- source_id
- company_id
- document_type
- title
- file_name
- received_at
- document_date
- sender
- hash
- raw_ref

### records

Operasyon merkezine düşen her finans/operasyon kaydı.

Zorunlu alanlar:

- document_id
- source
- company
- record_type
- title
- description
- amount
- currency
- record_date
- bank_name
- account_name
- counterparty
- risk_level
- status
- action_target
- evidence_json
- duplicate_key
- bank_row_key
- created_at
- updated_at

### approvals

Kullanıcı onay/reddetme kararları.

Zorunlu alanlar:

- record_id
- approval_status
- approved_by
- approved_at
- reject_reason
- telegram_message_id
- approval_url

### actions

Sistemin yaptığı her işlem.

Örnekler:

- Telegram'a gönderildi
- Kullanıcı onayladı
- BizimHesap'a işlendi
- Tekrar kontrol edildi
- Reddedildi

### ledger_links

AperiON kaydı ile BizimHesap veya başka hedef sistemdeki gerçek kayıt arasındaki bağlantı.

Zorunlu alanlar:

- record_id
- target_system
- target_account
- target_record_id
- target_status
- verified_at

### audit_log

Değişmez işlem günlüğü.

Her kritik işlem buraya yazılacaktır.

### automation_rules

Otomasyon kuralları.

Örnek:

- POS Batch → transfer
- Aynı banka+tarih+saat+tutar+açıklama → mükerrer
- Cari boşsa → Cari eşleşmesi bekliyor

## Durum standardı

- new
- needs_review
- pending_approval
- approved
- rejected
- processing
- posted
- verified
- failed
- duplicate
- archived

## Risk standardı

- green
- yellow
- orange
- red

## Mükerrer anahtarlar

Finansal kayıtlarda en az şu alanlardan türetilmelidir:

- banka
- hesap
- tarih
- saat
- tutar
- açıklama
- karşı taraf
- belge hash
- satır no

Banka hareketlerinde `bank_row_key` zorunludur.
