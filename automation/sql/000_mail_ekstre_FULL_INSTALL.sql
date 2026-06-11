create extension if not exists pgcrypto;

create table if not exists pending_bank_movements (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'alayli',
  source text not null default 'gmail_bank_statement',
  mailbox text,
  bank_name text,
  account_name text,
  iban_or_account_no text,
  mail_id text,
  mail_subject text,
  mail_from text,
  mail_date text,
  attachment_name text,
  statement_id text,
  statement_period text,
  transaction_date date,
  transaction_time text,
  value_date date,
  description text,
  amount_in numeric default 0,
  amount_out numeric default 0,
  balance_after numeric,
  raw_text text,
  detected_type text,
  suggested_counterparty text,
  confidence_score numeric,
  status text not null default 'pending',
  approval_note text,
  approved_at timestamptz,
  duplicate_key text not null unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_pending_bank_company_status on pending_bank_movements(company_id,status);
create index if not exists idx_pending_bank_date on pending_bank_movements(transaction_date);
create index if not exists idx_pending_bank_bank on pending_bank_movements(bank_name);
create index if not exists idx_pending_bank_created on pending_bank_movements(created_at desc);

create table if not exists bizimhesap_queue (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default 'alayli',
  pending_bank_movement_id uuid references pending_bank_movements(id),
  target_module text not null default 'finance',
  action_type text not null default 'create_payment_or_collection',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'ready_for_bizimhesap',
  error_message text,
  created_at timestamptz default now(),
  processed_at timestamptz
);

create index if not exists idx_bizimhesap_queue_status on bizimhesap_queue(status);
create index if not exists idx_bizimhesap_queue_company on bizimhesap_queue(company_id);

alter table pending_bank_movements enable row level security;
alter table bizimhesap_queue enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pending_bank_movements' and policyname='pending_bank_movements_read') then
    create policy pending_bank_movements_read on pending_bank_movements for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bizimhesap_queue' and policyname='bizimhesap_queue_read') then
    create policy bizimhesap_queue_read on bizimhesap_queue for select using (true);
  end if;
end $$;

create or replace function ingest_mail_bank_movements(p_rows jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_item jsonb;
  v_inserted int := 0;
  v_duplicate int := 0;
  v_failed int := 0;
  v_key text;
begin
  for v_item in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    v_key := v_item->>'duplicate_key';

    if v_key is null or length(v_key) = 0 then
      v_failed := v_failed + 1;
      continue;
    end if;

    if exists (
      select 1 from pending_bank_movements
      where duplicate_key = v_key
         or (
          coalesce(bank_name,'') = coalesce(v_item->>'bank_name','')
          and transaction_date = nullif(v_item->>'transaction_date', '')::date
          and coalesce(transaction_time,'') = coalesce(v_item->>'transaction_time','')
          and coalesce(amount_in,0) = coalesce(nullif(v_item->>'amount_in', '')::numeric, 0)
          and coalesce(amount_out,0) = coalesce(nullif(v_item->>'amount_out', '')::numeric, 0)
          and coalesce(balance_after,0) = coalesce(nullif(v_item->>'balance_after', '')::numeric, 0)
          and coalesce(description,'') = coalesce(v_item->>'description','')
        )
    ) then
      v_duplicate := v_duplicate + 1;
      continue;
    end if;

    insert into pending_bank_movements (
      company_id, source, mailbox, bank_name, account_name, iban_or_account_no,
      mail_id, mail_subject, mail_from, mail_date, attachment_name, statement_id,
      statement_period, transaction_date, transaction_time, value_date, description,
      amount_in, amount_out, balance_after, raw_text, detected_type,
      suggested_counterparty, confidence_score, status, duplicate_key
    ) values (
      coalesce(v_item->>'company_id', 'alayli'),
      coalesce(v_item->>'source', 'gmail_bank_statement'),
      coalesce(v_item->>'mailbox', 'alaylimedikal@gmail.com'),
      coalesce(v_item->>'bank_name', ''),
      coalesce(v_item->>'account_name', ''),
      coalesce(v_item->>'iban_or_account_no', ''),
      coalesce(v_item->>'mail_id', ''),
      coalesce(v_item->>'mail_subject', ''),
      coalesce(v_item->>'mail_from', ''),
      coalesce(v_item->>'mail_date', ''),
      coalesce(v_item->>'attachment_name', ''),
      coalesce(v_item->>'statement_id', ''),
      coalesce(v_item->>'statement_period', ''),
      nullif(v_item->>'transaction_date', '')::date,
      coalesce(v_item->>'transaction_time', ''),
      nullif(v_item->>'value_date', '')::date,
      coalesce(v_item->>'description', ''),
      coalesce(nullif(v_item->>'amount_in', '')::numeric, 0),
      coalesce(nullif(v_item->>'amount_out', '')::numeric, 0),
      nullif(v_item->>'balance_after', '')::numeric,
      coalesce(v_item->>'raw_text', ''),
      coalesce(v_item->>'detected_type', ''),
      coalesce(v_item->>'suggested_counterparty', ''),
      coalesce(nullif(v_item->>'confidence_score', '')::numeric, 0),
      'pending',
      v_key
    );

    v_inserted := v_inserted + 1;
  end loop;

  return jsonb_build_object(
    'input', jsonb_array_length(coalesce(p_rows, '[]'::jsonb)),
    'inserted', v_inserted,
    'duplicate', v_duplicate,
    'failed', v_failed
  );
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
      'detected_type', v_row.detected_type,
      'suggested_counterparty', v_row.suggested_counterparty,
      'suggested_bizimhesap_action',
        case
          when upper(coalesce(v_row.description,'')) like '%KOMISYON%'
            or upper(coalesce(v_row.description,'')) like '%KOMİSYON%'
            or upper(coalesce(v_row.description,'')) like '%BSMV%'
            or upper(coalesce(v_row.description,'')) like '%ÜCRET%'
            or upper(coalesce(v_row.description,'')) like '%UCRET%'
            or upper(coalesce(v_row.description,'')) like '%MASRAF%'
          then 'bank_fee_expense'
          when upper(coalesce(v_row.description,'')) like '%VIRMAN%'
            or upper(coalesce(v_row.description,'')) like '%VİRMAN%'
          then 'bank_transfer'
          when upper(coalesce(v_row.description,'')) like '%KREDI KART BORC%'
            or upper(coalesce(v_row.description,'')) like '%KREDİ KART BORÇ%'
          then 'credit_card_payment'
          when coalesce(v_row.amount_in,0) > 0
          then 'customer_collection'
          else 'supplier_or_expense_payment'
        end,
      'target_account', coalesce(v_row.bank_name,'Banka') || ' banka hesabı',
      'target_counterparty', nullif(v_row.suggested_counterparty,''),
      'suggested_category',
        case
          when coalesce(v_row.amount_in,0) > 0 then 'Tahsilat'
          when upper(coalesce(v_row.description,'')) like '%KOMISYON%'
            or upper(coalesce(v_row.description,'')) like '%KOMİSYON%'
            or upper(coalesce(v_row.description,'')) like '%BSMV%'
          then 'Banka masrafı'
          else 'Ödeme'
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

create or replace function reject_pending_bank_movement(p_id uuid, p_note text default null)
returns boolean
language plpgsql
security definer
as $$
begin
  update pending_bank_movements
  set status='rejected', approval_note=p_note, updated_at=now()
  where id=p_id;
  return found;
end;
$$;

grant execute on function ingest_mail_bank_movements(jsonb) to anon, authenticated, service_role;
grant execute on function approve_pending_bank_movement(uuid, text) to anon, authenticated, service_role;
grant execute on function reject_pending_bank_movement(uuid, text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
