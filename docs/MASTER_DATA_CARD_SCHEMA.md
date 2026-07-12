# AperiON iSTasyon – Kalıcı Kart Veri Şeması

Bu dosya, AperiON Üst Akıl sistemine gelen belge, ekran görüntüsü, e-posta, ekstre ve kullanıcı notlarının hangi kalıcı kartlara dönüştürüleceğini tanımlar.

## Ana amaç

AperiON yalnızca belge saklamaz. Şirket ve şahsi hayatla ilgili bütün önemli varlık, yükümlülük, ilişki, sözleşme, ürün, müşteri, tedarikçi, gider, gelir ve riskleri kart tabanlı olarak öğrenir.

Her yeni bilgi:

1. Var olan kartla eşleştirilir.
2. Yeni bilgi karta eklenir.
3. Eksik alanlar belirlenir.
4. Kullanıcıya yalnızca eksik alanlar sorulur.
5. Kart tamamlanma oranı güncellenir.
6. Risk, vade, ödeme, tahsilat ve operasyon takibine bağlanır.

## Güvenlik kararı

Gerçek abone numarası, hesap numarası, kart numarası, kimlik bilgisi, özel sözleşme bilgisi ve benzeri hassas veriler public GitHub dosyalarına açık yazılmaz.

Repo yalnızca şema, kural ve maskeli örnek tutar. Gerçek özel veri Supabase/private storage tarafında tutulacaktır.

## Ortak alanlar

Her kartta şu alanlar bulunur:

```text
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

## Kart aileleri

### 1. Banka Hesabı Kartı

```text
bank_name
branch
account_owner
account_type
currency
iban_masked
account_no_masked
balance
available_balance
blocked_amount
kmh_limit
kmh_used
usage_scope
linked_cards
linked_auto_payments
linked_pos_accounts
last_statement_date
```

### 2. Kredi Kartı Kartı

```text
bank_name
card_name
card_owner
card_last4
network
card_type_detail
total_limit
available_limit
cash_advance_limit
current_debt
statement_debt
minimum_payment
statement_cut_date
due_date
auto_payment_source_ref
linked_expenses
linked_subscriptions
installment_balance
risk_note
```

### 3. Sanal Kredi Kartı Kartı

```text
bank_name
virtual_card_name
card_last4
linked_main_card_ref
virtual_limit
available_limit
expiry_rule
usage_scope
merchant_restriction
active_status
last_transaction_date
```

### 4. Abonelik Kartı

```text
subscription_group
institution
subscriber_name
subscriber_no_masked
contract_no_masked
service_address_summary
billing_frequency
billing_period
average_amount
amount_change_rule
last_amount
next_due_date
payment_status
auto_payment_status
payment_method_ref
mail_source
bizimhesap_category
```

### 5. Aidat Kartı

```text
property_ref
site_or_building_name
independent_unit
management_name
management_contact
payment_frequency: monthly | quarterly | annual | variable
amount
amount_change_rule
last_increase_date
payment_day
payment_method: cash | bank_transfer | credit_card | auto_payment
payment_source_ref
receipt_required
last_payment_date
next_due_date
```

### 6. Otomatik Ödeme Talimatı Kartı

```text
institution
bill_type
subscriber_no_masked
payment_source_type: bank_account | credit_card
payment_source_ref
start_date
end_date
auto_payment_status
last_payment_date
last_payment_amount
failed_payment_count
risk_note
```

### 7. Fatura Kartı

```text
institution
invoice_no
invoice_date
due_date
amount_total
currency
payment_status
linked_subscription_ref
linked_auto_payment_ref
payment_source_ref
evidence_ref
```

### 8. Kira Sözleşmesi Kartı

```text
property_ref
landlord_name
tenant_name
contract_start_date
contract_end_date
contract_duration
renewal_type
increase_month
increase_rule
monthly_total
cash_amount
bank_amount
payment_day
payment_method
payment_source_ref
contract_document_ref
deposit_amount
last_increase_date
next_increase_date
termination_notice_period
```

### 9. Gayrimenkul Kartı

```text
property_code
property_type
address_summary
ownership_type
owner_name
usage_type
linked_rent_contracts
linked_aidat
linked_utilities
insurance_ref
tax_ref
market_value
```

### 10. Ürün Kartı

```text
product_code
barcode
product_name
brand
category
subcategory
unit
package_quantity
purchase_vat_rate
sales_vat_rate
supplier_refs
purchase_price
sales_price
price_list_ref
fifo_cost
stock_quantity
minimum_stock
maximum_stock
expiry_tracking
lot_tracking
sales_rules
profit_rule
```

### 11. Tedarikçi Kartı

```text
supplier_name
legal_title
tax_office
tax_no_masked
contact_person
phone
email
address_summary
product_groups
payment_terms
currency
current_balance
credit_limit
bank_info_ref
purchase_discount_rules
return_rules
risk_level
bizimhesap_ref
```

### 12. Müşteri Kartı

```text
customer_name
legal_title
customer_type
contact_person
phone
email
address_summary
city
sales_region
product_preferences
price_list_ref
discount_rules
payment_terms
credit_limit
current_balance
collection_risk
last_order_date
last_collection_date
bizimhesap_ref
```

### 13. Cari Kartı

```text
counterparty_ref
relationship_type: customer | supplier | mixed | personal | public_institution
current_balance
balance_direction
payment_terms
open_invoices
open_orders
open_collections
open_payments
risk_level
last_reconciliation_date
```

### 14. Sipariş Kartı

```text
order_no
customer_ref
order_date
product_lines
price_list_ref
discount_rule
vat_rule
shipping_status
invoice_status
collection_status
delivery_date
profitability
```

### 15. Satın Alma Kartı

```text
purchase_no
supplier_ref
purchase_date
product_lines
invoice_no
payment_terms
payment_status
warehouse_entry_status
cost_allocation
```

### 16. Personel Kartı

```text
employee_name
role
department
start_date
salary
payment_day
sgk_status
meal_benefit
bonus_rule
advance_balance
bank_account_ref
leave_balance
emergency_contact
```

### 17. Araç Kartı

```text
plate
brand
model
model_year
ownership_type
owner_class
insurance_ref
casco_ref
inspection_date
exhaust_date
mtv_dates
hgs_ref
fuel_type
maintenance_plan
last_maintenance
next_maintenance
assigned_driver
```

### 18. Sigorta Kartı

```text
insurance_type
insurance_company
policy_no_masked
insured_asset_ref
start_date
end_date
premium_amount
payment_plan
payment_source_ref
renewal_date
agent_contact
```

### 19. Vergi / Resmi Yükümlülük Kartı

```text
obligation_type
institution
period
amount
due_date
payment_status
payment_source_ref
penalty_risk
document_ref
```

### 20. Gider Kartı

```text
expense_type
expense_category
fixed_or_variable
frequency
expected_amount
actual_amount
payment_day
payment_method
payment_source_ref
linked_contract_ref
linked_supplier_ref
last_payment_date
next_due_date
```

### 21. Gelir Kartı

```text
income_type
income_category
fixed_or_variable
frequency
expected_amount
actual_amount
collection_day
collection_method
collection_account_ref
linked_customer_ref
last_collection_date
next_expected_date
```

### 22. Kredi / Finansman Kartı

```text
bank_name
credit_type
principal_amount
remaining_principal
interest_rate
installment_amount
installment_day
start_date
end_date
payment_account_ref
collateral_ref
risk_note
```

### 23. POS / Moka Kartı

```text
provider
merchant_no_masked
bank_account_ref
commission_rate
settlement_rule
installment_rule
pending_amount
next_settlement_date
last_reconciliation_date
```

### 24. Sözleşme Kartı

```text
contract_type
counterparty_ref
start_date
end_date
duration
renewal_rule
termination_notice
payment_terms
price_revision_rule
document_ref
responsible_person
```

### 25. Görev / Taahhüt Kartı

```text
task_type
source_ref
responsible_person
due_date
priority
status
approval_required
completion_evidence
```

### 26. Risk Kartı

```text
risk_type
linked_card_ref
risk_level
trigger_condition
current_value
threshold
recommended_action
owner
status
```

## Kart ilişkileri

Kartlar tek başına tutulmaz. Birbirine bağlanır:

```text
Müşteri → Sipariş → Fatura → Tahsilat → Banka
Tedarikçi → Satın Alma → Fatura → Ödeme → Banka/Kart
Gayrimenkul → Kira → Aidat → Elektrik/Su/İnternet
Kredi Kartı → Ekstre → Bağlı Giderler → Ödeme Hesabı
Ürün → Tedarikçi → Alış → Stok → Satış → Kâr
Araç → Sigorta → MTV → Bakım → Yakıt
Personel → Maaş → SGK → Prim → Avans
```

## Eksik alan ve tamamlama kuralı

Her kart için zorunlu alanlar tanımlanır ve tamamlanma yüzdesi hesaplanır.

```text
%0–49   : Eksik
%50–79  : Kısmi
%80–99  : Neredeyse tamam
%100    : Tam
```

Eksik alan varsa bütün bilgiyi tekrar istemek yasaktır. Sadece eksik alanlar sorulur.

## Üst Akıl davranışı

AperiON aşağıdakileri otomatik düşünmelidir:

- Bu bilgi hangi karta ait?
- Daha önce aynı kart var mı?
- Yeni bilgi eski bilgiyle çelişiyor mu?
- Hangi alan eksik?
- Hangi vade yaklaşıyor?
- Hangi ödeme veya tahsilat riskli?
- Hangi kart başka bir kartla bağlanmalı?
- Hangi işlem kullanıcı onayı olmadan yapılamaz?
- Hangi bilgi tekrar sorulmamalı?

## Cevap standardı

Her belge, ekran veya kullanıcı notu sonunda:

```text
Tespit:
Sınıf:
Güncellenen Kart:
Eksik Alanlar:
Operasyonel Etki:
Kalıcı kayıt önerisi:
```

Bu yapı AperiON'un şirket ve şahsi hayat için tam bilgi sahibi olan Üst Akıl katmanının temelidir.
