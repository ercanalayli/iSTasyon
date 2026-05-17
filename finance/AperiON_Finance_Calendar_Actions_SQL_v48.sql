-- AperiON Finance Calendar Actions SQL v48
-- Purpose: safe RPC functions for Telegram/UI action buttons.
-- Safe rule: every status/date/amount change writes finance_calendar_action_log.
-- Requires: AperiON_Finance_Calendar_Live_SQL_v47.sql

create or replace function finance_calendar_log_action(
  p_company text,
  p_item_id bigint,
  p_action_type text,
  p_old_status text,
  p_new_status text,
  p_old_date date,
  p_new_date date,
  p_amount numeric,
  p_actor text,
  p_source_type text,
  p_note text
)
returns bigint
language plpgsql
security definer
as $$
declare
  v_log_id bigint;
begin
  insert into finance_calendar_action_log (
    company, item_id, action_type, old_status, new_status, old_date, new_date, amount, actor, source_type, note
  ) values (
    coalesce(p_company,'ALAYLI'), p_item_id, p_action_type, p_old_status, p_new_status, p_old_date, p_new_date, p_amount, coalesce(p_actor,'telegram'), coalesce(p_source_type,'telegram'), p_note
  ) returning id into v_log_id;
  return v_log_id;
end;
$$;

create or replace function finance_calendar_mark_paid(
  p_item_id bigint,
  p_amount numeric default null,
  p_actor text default 'telegram',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v finance_calendar_items%rowtype;
  v_amount numeric;
begin
  select * into v from finance_calendar_items where id = p_item_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;
  if v.direction <> 'out' then
    return jsonb_build_object('ok', false, 'error', 'not_payable_item');
  end if;

  v_amount := coalesce(p_amount, v.remaining_amount, v.expected_amount, 0);

  update finance_calendar_items
  set paid_amount = least(coalesce(paid_amount,0) + v_amount, coalesce(expected_amount,0)),
      status = case when least(coalesce(paid_amount,0) + v_amount, coalesce(expected_amount,0)) >= coalesce(expected_amount,0) then 'done' else 'partial' end,
      updated_at = now()
  where id = p_item_id;

  perform finance_calendar_log_action(v.company, v.id, 'paid', v.status,
    case when coalesce(v.paid_amount,0) + v_amount >= coalesce(v.expected_amount,0) then 'done' else 'partial' end,
    v.item_date, v.item_date, v_amount, p_actor, 'telegram', p_note);

  return jsonb_build_object('ok', true, 'action', 'paid', 'item_id', p_item_id, 'amount', v_amount);
end;
$$;

create or replace function finance_calendar_mark_collected(
  p_item_id bigint,
  p_amount numeric default null,
  p_actor text default 'telegram',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v finance_calendar_items%rowtype;
  v_amount numeric;
begin
  select * into v from finance_calendar_items where id = p_item_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;
  if v.direction <> 'in' then
    return jsonb_build_object('ok', false, 'error', 'not_receivable_item');
  end if;

  v_amount := coalesce(p_amount, v.remaining_amount, v.expected_amount, 0);

  update finance_calendar_items
  set collected_amount = least(coalesce(collected_amount,0) + v_amount, coalesce(expected_amount,0)),
      status = case when least(coalesce(collected_amount,0) + v_amount, coalesce(expected_amount,0)) >= coalesce(expected_amount,0) then 'done' else 'partial' end,
      updated_at = now()
  where id = p_item_id;

  perform finance_calendar_log_action(v.company, v.id, 'collected', v.status,
    case when coalesce(v.collected_amount,0) + v_amount >= coalesce(v.expected_amount,0) then 'done' else 'partial' end,
    v.item_date, v.item_date, v_amount, p_actor, 'telegram', p_note);

  return jsonb_build_object('ok', true, 'action', 'collected', 'item_id', p_item_id, 'amount', v_amount);
end;
$$;

create or replace function finance_calendar_mark_done(
  p_item_id bigint,
  p_actor text default 'telegram',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v finance_calendar_items%rowtype;
begin
  select * into v from finance_calendar_items where id = p_item_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;

  update finance_calendar_items
  set status = 'done', updated_at = now()
  where id = p_item_id;

  perform finance_calendar_log_action(v.company, v.id, 'done', v.status, 'done', v.item_date, v.item_date, 0, p_actor, 'telegram', p_note);

  return jsonb_build_object('ok', true, 'action', 'done', 'item_id', p_item_id);
end;
$$;

create or replace function finance_calendar_postpone(
  p_item_id bigint,
  p_new_date date,
  p_actor text default 'telegram',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v finance_calendar_items%rowtype;
  v_effective date;
begin
  select * into v from finance_calendar_items where id = p_item_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;
  if p_new_date is null then
    return jsonb_build_object('ok', false, 'error', 'new_date_required');
  end if;

  v_effective := finance_next_business_day(p_new_date);

  update finance_calendar_items
  set item_date = p_new_date,
      original_due_date = coalesce(original_due_date, v.item_date),
      effective_due_date = v_effective,
      status = 'postponed',
      updated_at = now()
  where id = p_item_id;

  perform finance_calendar_log_action(v.company, v.id, 'postponed', v.status, 'postponed', v.item_date, v_effective, 0, p_actor, 'telegram', p_note);

  return jsonb_build_object('ok', true, 'action', 'postponed', 'item_id', p_item_id, 'new_date', v_effective);
end;
$$;

create or replace function finance_calendar_approve(
  p_item_id bigint,
  p_actor text default 'telegram',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v finance_calendar_items%rowtype;
begin
  select * into v from finance_calendar_items where id = p_item_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;

  update finance_calendar_items
  set status = 'done', updated_at = now()
  where id = p_item_id;

  perform finance_calendar_log_action(v.company, v.id, 'approved', v.status, 'done', v.item_date, v.item_date, 0, p_actor, 'telegram', p_note);

  return jsonb_build_object('ok', true, 'action', 'approved', 'item_id', p_item_id);
end;
$$;

create or replace function finance_calendar_reject(
  p_item_id bigint,
  p_actor text default 'telegram',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v finance_calendar_items%rowtype;
begin
  select * into v from finance_calendar_items where id = p_item_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;

  update finance_calendar_items
  set status = 'cancelled', updated_at = now()
  where id = p_item_id;

  perform finance_calendar_log_action(v.company, v.id, 'rejected', v.status, 'cancelled', v.item_date, v.item_date, 0, p_actor, 'telegram', p_note);

  return jsonb_build_object('ok', true, 'action', 'rejected', 'item_id', p_item_id);
end;
$$;

-- Optional checks:
-- select finance_calendar_mark_paid(1, null, 'telegram', 'test');
-- select * from finance_calendar_action_log order by id desc limit 20;
