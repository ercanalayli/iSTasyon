-- AperiON Bank Transaction Approval RPC v58
-- Purpose: Telegram one-click approval for legacy bank_transactions without requiring a local service role key.

create or replace function approve_bank_transaction_v58(
  p_bank_transaction_id bigint,
  p_approved_by text default 'telegram'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  b record;
  q_id uuid;
begin
  select * into b
  from bank_transactions
  where id = p_bank_transaction_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Banka hareketi bulunamadi');
  end if;

  if coalesce(b.onay_durumu, '') <> 'bekliyor' then
    return jsonb_build_object('ok', true, 'message', 'Zaten ' || coalesce(b.onay_durumu, 'islemde'));
  end if;

  update bank_transactions
  set onay_durumu = 'onaylandi',
      bizimhesap_durumu = 'kuyrukta',
      bizimhesap_mesaj = 'Telegram tek tik onaylandi; BizimHesap posting kuyruguna alindi.',
      updated_at = now()
  where id = p_bank_transaction_id;

  insert into bizimhesap_posting_queue (
    company,
    posting_type,
    customer_name,
    amount,
    currency,
    transaction_date,
    description,
    status,
    dry_run
  ) values (
    coalesce(b.firma_id, 'alayli'),
    coalesce(b.tur, 'bank_transaction'),
    coalesce(b.cari_unvan, b.karsi_taraf),
    abs(coalesce(b.tutar, 0)),
    'TRY',
    b.tarih,
    coalesce(b.aciklama, 'Banka hareketi') || ' | bank_transactions#' || p_bank_transaction_id::text,
    'pending',
    true
  )
  returning id into q_id;

  return jsonb_build_object('ok', true, 'message', 'Onaylandi ve BizimHesap kuyruguna alindi', 'queue_id', q_id);
end;
$$;

create or replace function reject_bank_transaction_v58(
  p_bank_transaction_id bigint,
  p_rejected_by text default 'telegram'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  b record;
begin
  select * into b
  from bank_transactions
  where id = p_bank_transaction_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Banka hareketi bulunamadi');
  end if;

  update bank_transactions
  set onay_durumu = 'reddedildi',
      bizimhesap_durumu = 'iptal',
      bizimhesap_mesaj = 'Telegram tek tik reddedildi.',
      updated_at = now()
  where id = p_bank_transaction_id;

  return jsonb_build_object('ok', true, 'message', 'Reddedildi');
end;
$$;
