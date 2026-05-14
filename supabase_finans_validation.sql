-- AperiON / ErpaltH iSTasyon
-- Finans Takvimi Veri Bütünlüğü / Validation SQL
-- Amaç: yanlış/eksik finans kayıtlarını veritabanı seviyesinde yakalamak.

alter table if exists finance_calendar_records
  add constraint if not exists chk_finance_expected_amount_nonnegative
  check (expected_amount >= 0);

alter table if exists finance_calendar_records
  add constraint if not exists chk_finance_realized_amount_nonnegative
  check (realized_amount >= 0);

alter table if exists finance_calendar_records
  add constraint if not exists chk_finance_actual_date_not_too_early
  check (actual_payment_date is null or actual_payment_date >= original_due_date - interval '15 days');

alter table if exists finance_calendar_records
  add constraint if not exists chk_finance_cari_name_not_empty
  check (length(trim(cari_name)) > 0);

alter table if exists fixed_payment_contracts
  add constraint if not exists chk_fixed_contract_amount_positive
  check (amount > 0);

alter table if exists fixed_payment_contracts
  add constraint if not exists chk_fixed_contract_date_order
  check (end_date is null or end_date >= start_date);

alter table if exists fixed_payment_contracts
  add constraint if not exists chk_fixed_contract_payment_day
  check (payment_day is null or (payment_day >= 1 and payment_day <= 31));

alter table if exists variable_payment_items
  add constraint if not exists chk_variable_payment_amount_positive
  check (amount > 0);

alter table if exists variable_payment_items
  add constraint if not exists chk_variable_payment_paid_nonnegative
  check (paid_amount >= 0);

alter table if exists moka_united_movements
  add constraint if not exists chk_moka_gross_positive
  check (gross_amount > 0);

alter table if exists moka_united_movements
  add constraint if not exists chk_moka_commission_nonnegative
  check (commission_amount >= 0);

alter table if exists moka_united_movements
  add constraint if not exists chk_moka_banked_nonnegative
  check (banked_amount >= 0);

alter table if exists moka_united_movements
  add constraint if not exists chk_moka_transfer_after_pos
  check (expected_bank_transfer_date is null or expected_bank_transfer_date >= pos_collection_date);

-- updated_at otomatik güncelleme fonksiyonu
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_finance_records_updated_at on finance_calendar_records;
create trigger trg_finance_records_updated_at
before update on finance_calendar_records
for each row execute function set_updated_at();

drop trigger if exists trg_fixed_contracts_updated_at on fixed_payment_contracts;
create trigger trg_fixed_contracts_updated_at
before update on fixed_payment_contracts
for each row execute function set_updated_at();

drop trigger if exists trg_moka_updated_at on moka_united_movements;
create trigger trg_moka_updated_at
before update on moka_united_movements
for each row execute function set_updated_at();
