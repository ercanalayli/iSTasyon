create or replace function approve_pending_bank_movement(p_id uuid, p_note text default null)
returns uuid
language plpgsql
as $$
declare
  v_row pending_bank_movements%rowtype;
  v_queue_id uuid;
begin
  select * into v_row
  from pending_bank_movements
  where id = p_id
  for update;

  if not found then
    raise exception 'pending movement not found: %', p_id;
  end if;

  if v_row.status = 'approved' then
    select id into v_queue_id
    from bizimhesap_queue
    where pending_bank_movement_id = p_id
    order by created_at desc
    limit 1;
    return v_queue_id;
  end if;

  update pending_bank_movements
  set status = 'approved',
      approval_note = p_note,
      approved_at = now(),
      updated_at = now()
  where id = p_id;

  insert into bizimhesap_queue (
    company_id,
    pending_bank_movement_id,
    target_module,
    action_type,
    payload,
    status
  ) values (
    v_row.company_id,
    v_row.id,
    'finance',
    case
      when coalesce(v_row.amount_in,0) > 0 then 'create_collection'
      else 'create_payment'
    end,
    jsonb_build_object(
      'bank_name', v_row.bank_name,
      'transaction_date', v_row.transaction_date,
      'transaction_time', v_row.transaction_time,
      'description', v_row.description,
      'amount_in', v_row.amount_in,
      'amount_out', v_row.amount_out,
      'detected_type', v_row.detected_type,
      'suggested_counterparty', v_row.suggested_counterparty,
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
