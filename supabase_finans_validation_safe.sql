-- AperiON / ErpaltH iSTasyon
-- Finans Takvimi Safe Validation SQL
-- Supabase/Postgres uyumluluğu için constraint eklemeleri pg_constraint kontrolüyle yapılır.

-- finance_calendar_records
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_finance_expected_amount_nonnegative') THEN
    ALTER TABLE finance_calendar_records ADD CONSTRAINT chk_finance_expected_amount_nonnegative CHECK (expected_amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_finance_realized_amount_nonnegative') THEN
    ALTER TABLE finance_calendar_records ADD CONSTRAINT chk_finance_realized_amount_nonnegative CHECK (realized_amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_finance_actual_date_not_too_early') THEN
    ALTER TABLE finance_calendar_records ADD CONSTRAINT chk_finance_actual_date_not_too_early CHECK (actual_payment_date IS NULL OR actual_payment_date >= original_due_date - interval '15 days');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_finance_cari_name_not_empty') THEN
    ALTER TABLE finance_calendar_records ADD CONSTRAINT chk_finance_cari_name_not_empty CHECK (length(trim(cari_name)) > 0);
  END IF;
END $$;

-- fixed_payment_contracts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_fixed_contract_amount_positive') THEN
    ALTER TABLE fixed_payment_contracts ADD CONSTRAINT chk_fixed_contract_amount_positive CHECK (amount > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_fixed_contract_date_order') THEN
    ALTER TABLE fixed_payment_contracts ADD CONSTRAINT chk_fixed_contract_date_order CHECK (end_date IS NULL OR end_date >= start_date);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_fixed_contract_payment_day') THEN
    ALTER TABLE fixed_payment_contracts ADD CONSTRAINT chk_fixed_contract_payment_day CHECK (payment_day IS NULL OR (payment_day >= 1 AND payment_day <= 31));
  END IF;
END $$;

-- variable_payment_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_variable_payment_amount_positive') THEN
    ALTER TABLE variable_payment_items ADD CONSTRAINT chk_variable_payment_amount_positive CHECK (amount > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_variable_payment_paid_nonnegative') THEN
    ALTER TABLE variable_payment_items ADD CONSTRAINT chk_variable_payment_paid_nonnegative CHECK (paid_amount >= 0);
  END IF;
END $$;

-- moka_united_movements
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_moka_gross_positive') THEN
    ALTER TABLE moka_united_movements ADD CONSTRAINT chk_moka_gross_positive CHECK (gross_amount > 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_moka_commission_nonnegative') THEN
    ALTER TABLE moka_united_movements ADD CONSTRAINT chk_moka_commission_nonnegative CHECK (commission_amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_moka_banked_nonnegative') THEN
    ALTER TABLE moka_united_movements ADD CONSTRAINT chk_moka_banked_nonnegative CHECK (banked_amount >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_moka_transfer_after_pos') THEN
    ALTER TABLE moka_united_movements ADD CONSTRAINT chk_moka_transfer_after_pos CHECK (expected_bank_transfer_date IS NULL OR expected_bank_transfer_date >= pos_collection_date);
  END IF;
END $$;

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_finance_records_updated_at ON finance_calendar_records;
CREATE TRIGGER trg_finance_records_updated_at
BEFORE UPDATE ON finance_calendar_records
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_fixed_contracts_updated_at ON fixed_payment_contracts;
CREATE TRIGGER trg_fixed_contracts_updated_at
BEFORE UPDATE ON fixed_payment_contracts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_moka_updated_at ON moka_united_movements;
CREATE TRIGGER trg_moka_updated_at
BEFORE UPDATE ON moka_united_movements
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
