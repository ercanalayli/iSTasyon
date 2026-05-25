-- AperiON Personal Finance Actions SQL v54
-- Purpose: controlled phone/Telegram intake for obligations, payments and documents.
-- Safe rule: creates RPCs only. External accounting write is not performed here.

create or replace function public.personal_finance_create_obligation(
  p_owner text default 'ercan',
  p_company text default 'ALAYLI',
  p_firma_id text default 'alayli',
  p_scope text default 'ozel',
  p_expense_group text default 'Diger / Kontrol Bekleyen',
  p_expense_type text default 'kontrol_bekleyen',
  p_title text default null,
  p_vendor_name text default null,
  p_account_name text default null,
  p_payment_method text default null,
  p_card_name text default null,
  p_contract_no text default null,
  p_start_date date default null,
  p_end_date date default null,
  p_period text default 'once',
  p_due_day integer default null,
  p_next_due_date date default null,
  p_expected_amount numeric default null,
  p_average_amount numeric default null,
  p_currency text default 'TRY',
  p_is_fixed boolean default false,
  p_is_variable boolean default true,
  p_priority text default 'normal',
  p_source_type text default 'telegram',
  p_source_ref text default null,
  p_document_url text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_id bigint;
  v_title text;
  v_due date;
begin
  v_title := nullif(trim(coalesce(p_title,'')), '');
  if v_title is null then
    return jsonb_build_object('ok', false, 'error', 'title_required');
  end if;

  v_due := coalesce(
    p_next_due_date,
    public.personal_finance_calc_next_due(coalesce(p_start_date, current_date), coalesce(p_period,'once'), p_due_day, current_date)
  );

  insert into public.personal_finance_obligations (
    owner, company, firma_id, scope, expense_group, expense_type, title, vendor_name,
    account_name, payment_method, card_name, contract_no, start_date, end_date, period,
    due_day, next_due_date, expected_amount, average_amount, currency, is_fixed,
    is_variable, priority, source_type, source_ref, document_url, note,
    verification_status, data_date, last_source_update_at
  )
  values (
    coalesce(p_owner,'ercan'), coalesce(p_company,'ALAYLI'), coalesce(p_firma_id,'alayli'),
    coalesce(p_scope,'ozel'), coalesce(p_expense_group,'Diger / Kontrol Bekleyen'),
    coalesce(p_expense_type,'kontrol_bekleyen'), v_title, p_vendor_name,
    p_account_name, p_payment_method, p_card_name, p_contract_no, p_start_date, p_end_date,
    coalesce(p_period,'once'), p_due_day, v_due, p_expected_amount, p_average_amount,
    coalesce(p_currency,'TRY'), coalesce(p_is_fixed,false), coalesce(p_is_variable,true),
    coalesce(p_priority,'normal'), coalesce(p_source_type,'telegram'), p_source_ref,
    p_document_url, p_note, 'kontrol_bekliyor', current_date, now()
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'status', 'kontrol_bekliyor', 'next_due_date', v_due);
end;
$$;

create or replace function public.personal_finance_log_payment(
  p_obligation_id bigint default null,
  p_owner text default 'ercan',
  p_company text default 'ALAYLI',
  p_firma_id text default 'alayli',
  p_scope text default 'ozel',
  p_expense_group text default null,
  p_expense_type text default null,
  p_title text default null,
  p_vendor_name text default null,
  p_payment_date date default current_date,
  p_due_date date default null,
  p_amount numeric default 0,
  p_currency text default 'TRY',
  p_paid_from_account text default null,
  p_payment_method text default null,
  p_receipt_url text default null,
  p_source_type text default 'telegram',
  p_source_ref text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_id bigint;
begin
  insert into public.personal_finance_payments (
    obligation_id, owner, company, firma_id, scope, expense_group, expense_type, title,
    vendor_name, payment_date, due_date, amount, currency, paid_from_account,
    payment_method, payment_status, receipt_url, source_type, source_ref, note,
    verification_status
  )
  values (
    p_obligation_id, coalesce(p_owner,'ercan'), coalesce(p_company,'ALAYLI'),
    coalesce(p_firma_id,'alayli'), coalesce(p_scope,'ozel'), p_expense_group,
    p_expense_type, p_title, p_vendor_name, coalesce(p_payment_date,current_date),
    p_due_date, coalesce(p_amount,0), coalesce(p_currency,'TRY'), p_paid_from_account,
    p_payment_method, 'paid', p_receipt_url, coalesce(p_source_type,'telegram'),
    p_source_ref, p_note, 'kontrol_bekliyor'
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'status', 'kontrol_bekliyor');
end;
$$;

create or replace function public.personal_finance_register_document(
  p_owner text default 'ercan',
  p_company text default 'ALAYLI',
  p_scope text default null,
  p_document_type text default 'belge',
  p_file_url text default null,
  p_file_name text default null,
  p_mime_type text default null,
  p_extracted_text text default null,
  p_parsed_amount numeric default null,
  p_parsed_date date default null,
  p_parsed_vendor text default null,
  p_ai_category text default null,
  p_ai_confidence numeric default null,
  p_source_type text default 'telegram',
  p_telegram_file_id text default null,
  p_telegram_message_id text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_id bigint;
begin
  insert into public.personal_finance_documents (
    owner, company, scope, document_type, file_url, file_name, mime_type,
    extracted_text, parsed_amount, parsed_date, parsed_vendor, ai_category,
    ai_confidence, status, source_type, telegram_file_id, telegram_message_id, note
  )
  values (
    coalesce(p_owner,'ercan'), coalesce(p_company,'ALAYLI'), p_scope,
    coalesce(p_document_type,'belge'), p_file_url, p_file_name, p_mime_type,
    p_extracted_text, p_parsed_amount, p_parsed_date, p_parsed_vendor,
    p_ai_category, p_ai_confidence, 'received', coalesce(p_source_type,'telegram'),
    p_telegram_file_id, p_telegram_message_id, p_note
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'status', 'received');
end;
$$;

create or replace view public.personal_finance_mobile_inbox_v54_view as
select
  'obligation' as item_kind,
  id,
  owner,
  company,
  scope,
  expense_group,
  expense_type,
  title,
  vendor_name,
  live_next_due_date as item_date,
  planned_amount as amount,
  timing_status,
  alert_level,
  verification_status,
  source_type,
  created_at
from public.personal_finance_obligation_live_v53_view
where source_type in ('telegram','mobile','manual')
union all
select
  'document' as item_kind,
  id,
  owner,
  company,
  scope,
  coalesce(ai_category, 'Diger / Kontrol Bekleyen') as expense_group,
  document_type as expense_type,
  coalesce(file_name, parsed_vendor, document_type) as title,
  parsed_vendor as vendor_name,
  parsed_date as item_date,
  parsed_amount as amount,
  status as timing_status,
  case when status = 'received' then 'warning' else 'ok' end as alert_level,
  status as verification_status,
  source_type,
  created_at
from public.personal_finance_documents
where source_type in ('telegram','mobile')
order by created_at desc;

-- Quick checks:
-- select public.personal_finance_create_obligation(p_title => 'Test odeme', p_expected_amount => 100, p_next_due_date => current_date);
-- select * from public.personal_finance_mobile_inbox_v54_view where company='ALAYLI';
