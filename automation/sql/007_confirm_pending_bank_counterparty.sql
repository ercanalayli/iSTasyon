-- AperiON: kullanicinin dogruladigi cari adini banka hareketi ve kuyruk kanitina tasir.
alter table pending_bank_movements
  add column if not exists confirmed_counterparty text,
  add column if not exists counterparty_confirmed boolean not null default false,
  add column if not exists counterparty_confirmed_at timestamptz;

create or replace function confirm_pending_bank_counterparty(
  p_id uuid,
  p_counterparty text,
  p_note text default null
)
returns boolean
language plpgsql
security definer
as $$
begin
  if nullif(btrim(coalesce(p_counterparty,'')), '') is null then
    raise exception 'counterparty is required';
  end if;

  update pending_bank_movements
  set confirmed_counterparty = btrim(p_counterparty),
      counterparty_confirmed = true,
      counterparty_confirmed_at = now(),
      approval_note = coalesce(p_note, approval_note),
      updated_at = now()
  where id = p_id
    and status in ('pending', 'needs_review');

  return found;
end;
$$;

create or replace function approve_pending_bank_movement(p_id uuid, p_note text default null)
returns uuid
language plpgsql
security definer
as $$
declare
  v_row pending_bank_movements%rowtype;
  v_queue_id uuid;
begin
  select * into v_row from pending_bank_movements where id = p_id for update;
  if not found then raise exception 'pending movement not found: %', p_id; end if;

  if v_row.status = 'approved' then
    select id into v_queue_id from bizimhesap_queue where pending_bank_movement_id = p_id order by created_at desc limit 1;
    return v_queue_id;
  end if;

  update pending_bank_movements
  set status='approved', approval_note=p_note, approved_at=now(), updated_at=now()
  where id=p_id;

  insert into bizimhesap_queue (company_id, pending_bank_movement_id, target_module, action_type, payload, status)
  values (
    v_row.company_id,
    v_row.id,
    'finance',
    case when coalesce(v_row.amount_in,0) > 0 then 'create_collection' else 'create_payment' end,
    jsonb_build_object(
      'bank_name', v_row.bank_name,
      'transaction_date', v_row.transaction_date,
      'transaction_time', v_row.transaction_time,
      'description', v_row.description,
      'amount_in', v_row.amount_in,
      'amount_out', v_row.amount_out,
      'confidence_score', v_row.confidence_score,
      'detected_type', v_row.detected_type,
      'suggested_counterparty', coalesce(nullif(v_row.confirmed_counterparty,''), v_row.suggested_counterparty),
      'confirmed_counterparty', v_row.confirmed_counterparty,
      'counterparty_confirmed', v_row.counterparty_confirmed,
      'suggested_bizimhesap_action',
        case
          when upper(coalesce(v_row.description,'')) like '%KOMISYON%'
            or upper(coalesce(v_row.description,'')) like '%KOMÄ°SYON%'
            or upper(coalesce(v_row.description,'')) like '%BSMV%'
            or upper(coalesce(v_row.description,'')) like '%ÃœCRET%'
            or upper(coalesce(v_row.description,'')) like '%UCRET%'
            or upper(coalesce(v_row.description,'')) like '%MASRAF%'
          then 'bank_fee_expense'
          when upper(coalesce(v_row.description,'')) like '%VIRMAN%'
            or upper(coalesce(v_row.description,'')) like '%VÄ°RMAN%'
          then 'bank_transfer'
          when upper(coalesce(v_row.description,'')) like '%KREDI KART BORC%'
            or upper(coalesce(v_row.description,'')) like '%KREDÄ° KART BORÃ‡%'
          then 'credit_card_payment'
          when coalesce(v_row.amount_in,0) > 0 then 'customer_collection'
          else 'supplier_or_expense_payment'
        end,
      'target_account', coalesce(v_row.bank_name,'Banka') || ' banka hesabÄ±',
      'target_counterparty', coalesce(nullif(v_row.confirmed_counterparty,''), nullif(v_row.suggested_counterparty,'')),
      'suggested_category',
        case
          when coalesce(v_row.amount_in,0) > 0 then 'Tahsilat'
          when upper(coalesce(v_row.description,'')) like '%KOMISYON%'
            or upper(coalesce(v_row.description,'')) like '%KOMÄ°SYON%'
            or upper(coalesce(v_row.description,'')) like '%BSMV%'
          then 'Banka masrafÄ±'
          else 'Ã–deme'
        end,
      'source', v_row.source,
      'mail_subject', v_row.mail_subject,
      'attachment_name', v_row.attachment_name,
      'duplicate_key', v_row.duplicate_key
    ),
    'ready_for_bizimhesap'
  ) returning id into v_queue_id;

  return v_queue_id;
end;
$$;

grant execute on function confirm_pending_bank_counterparty(uuid, text, text) to anon, authenticated, service_role;
grant execute on function approve_pending_bank_movement(uuid, text) to anon, authenticated, service_role;
notify pgrst, 'reload schema';
