# AperiON iSTasyon – Kalıcı Kart Veri Şeması

Bu dosya, AperiON Üst Akıl sistemine gelen belge, ekran görüntüsü ve kullanıcı notlarının hangi kalıcı kartlara dönüştürüleceğini tanımlar.

## Güvenlik kararı

Gerçek abone numarası, hesap numarası, kart numarası, kimlik bilgisi ve benzeri özel veriler public GitHub dosyalarına açık yazılmaz.

Bu repo yalnızca şema, kural ve maskeli örnek tutar. Gerçek özel veri Supabase/private storage tarafında tutulacaktır.

## Ortak alanlar

Her kartta şu alanlar bulunur:

```text
card_id
card_type
owner_class: ALAYLI | SAHSI | BELIRSIZ
status: active | passive | needs_review | cancelled
source_type: screenshot | pdf | email | manual_note | bank_statement | invoice
source_summary
created_at
updated_at
last_seen_at
evidence_required
notes
```

## 1. Abonelik Kartı

Kullanım:

- Su
- Elektrik
- Doğalgaz
- İnternet
- Telefon
- Aidat
- Yazılım aboneliği
- Diğer periyodik hizmetler

Alanlar:

```text
card_type: subscription
subscription_group
institution
subscriber_name
subscriber_no_masked
contract_no_masked
service_address_summary
billing_period
average_amount
payment_status
auto_payment_status
payment_method_ref
next_due_date
bizimhesap_category
```

## 2. Otomatik Ödeme Talimatı Kartı

Kullanım:

- Banka hesabından otomatik fatura ödeme
- Kredi kartından otomatik fatura ödeme
- Kurum talimatı

Alanlar:

```text
card_type: auto_payment_instruction
institution
bill_type
subscriber_no_masked
payment_source_type: bank_account | credit_card
payment_source_ref
start_date
end_date
auto_payment_status: active | passive | cancelled | needs_review
last_payment_date
last_payment_amount
risk_note
```

## 3. Banka Hesabı Kartı

Alanlar:

```text
card_type: bank_account
bank_name
account_owner
owner_class
account_type
iban_masked
account_no_masked
currency
usage_scope
linked_cards
linked_auto_payments
```

## 4. Kredi Kartı Kartı

Alanlar:

```text
card_type: credit_card
bank_name
card_name
card_owner
owner_class
card_last4
network
card_type_detail
limit_total
limit_available
statement_debt
minimum_payment
due_date
auto_payment_source_ref
usage_scope
```

## 5. Fatura Kartı

Alanlar:

```text
card_type: invoice
institution
invoice_no
invoice_date
due_date
amount_total
currency
owner_class
payment_status
linked_subscription_ref
linked_auto_payment_ref
evidence_ref
```

## 6. Cari / Tedarikçi Kartı

Alanlar:

```text
card_type: counterparty
counterparty_name
owner_class
relationship_type: customer | supplier | bank | public_institution | personal
current_balance
risk_level
payment_terms
contact_summary
bizimhesap_ref
```

## Bursa Su örnek kart mantığı

Not: Gerçek abone numarası public repo içinde açık tutulmayacaktır.

```text
SAHSI
└── Ev Abonelikleri
    └── Su
        Kurum          : Bursa Su
        Abone No       : maskeli özel veri
        Ödeme Yöntemi  : VakıfBank Ercan şahsi vadesiz hesap
        Otomatik Ödeme : Aktif
        Başlangıç      : 08.07.2026
        Durum          : İzleniyor
```

## Cevap standardı

Gelen belge veya görsel için cevap sonunda şu bölüm gösterilir:

```text
Kalıcı kayıt önerisi:
```

Bu bölümde gerçek özel veri gerekiyorsa kullanıcıya gösterilebilir; ancak public repo dosyasına açık yazılmaz.

## Eksik alan kuralı

Eksik alan varsa tüm bilgiyi tekrar istemek yasaktır. Sadece eksik alan sorulur.

Örnek:

```text
Eksik Alan: Hizmet adresi görünmüyor. Bu abonelik ev adresi mi, işyeri mi?
```
