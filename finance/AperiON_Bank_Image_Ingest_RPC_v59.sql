create or replace function public.ingest_bank_image_transactions_v59(
  p_company text,
  p_rows jsonb,
  p_raw_text text default ''
)
returns table(raw_count integer, approval_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  raw_id bigint;
  amount_value numeric;
  direction_value text;
  suggested_type_value text;
  status_value text;
  raw_total integer := 0;
  approval_total integer := 0;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows array olmali';
  end if;

  for item in select * from jsonb_array_elements(p_rows)
  loop
    amount_value := abs(coalesce((item->>'tutar')::numeric, 0));
    direction_value := coalesce(item->>'direction', case when coalesce((item->>'tutar')::numeric, 0) > 0 then 'in' when coalesce((item->>'tutar')::numeric, 0) < 0 then 'out' else 'unknown' end);
    suggested_type_value := coalesce(item->>'suggested_type', case when coalesce((item->>'tutar')::numeric, 0) > 0 then 'tahsilat' else 'gider_odeme' end);
    status_value := case when coalesce(item->>'durum', '') = 'islenmeyecek' then 'rejected' else 'approval_waiting' end;

    select id into raw_id
    from public.bank_transactions_raw
    where company = p_company
      and transaction_hash = item->>'hash'
    limit 1;

    if raw_id is null then
      insert into public.bank_transactions_raw (
        company,
        bank_name,
        transaction_date,
        description,
        debit_amount,
        credit_amount,
        amount,
        currency,
        balance_after,
        direction,
        raw_text,
        source_type,
        source_file_name,
        transaction_hash,
        duplicate_status,
        status
      )
      values (
        p_company,
        coalesce(item->>'kaynak_banka', 'IS BANKASI'),
        (item->>'tarih')::date,
        coalesce(item->>'aciklama', ''),
        case when direction_value = 'out' then amount_value else 0 end,
        case when direction_value = 'in' then amount_value else 0 end,
        amount_value,
        'TRY',
        nullif(item->>'bakiye', '')::numeric,
        direction_value,
        p_raw_text,
        'telegram_bank_image',
        coalesce(item->>'kaynak_dosya', ''),
        item->>'hash',
        'unique',
        status_value
      )
      returning id into raw_id;
      raw_total := raw_total + 1;
    end if;

    if not exists (
      select 1 from public.cash_transaction_suggestions where raw_transaction_id = raw_id
    ) then
      insert into public.cash_transaction_suggestions (
        company,
        raw_transaction_id,
        suggested_type,
        suggested_customer_name,
        confidence_score,
        match_reason,
        risk_note,
        approval_status
      )
      values (
        p_company,
        raw_id,
        suggested_type_value,
        coalesce(item->>'karsi_taraf', item->>'aday_cari', ''),
        coalesce((item->>'guven')::numeric, 50),
        coalesce(item->>'risk', 'Telegram banka gorseli OCR siniflandirma'),
        case when coalesce((item->>'guven')::numeric, 50) >= 85 then 'Tek tik onaya hazir.' else 'Kontrol onerilir.' end,
        case when coalesce((item->>'guven')::numeric, 50) >= 70 then 'approval_waiting' else 'control_waiting' end
      );
    end if;

    if not exists (
      select 1
      from public.aperion_approval_center
      where source_type = 'bank_transactions_raw'
        and source_id = raw_id
    ) then
      insert into public.aperion_approval_center (
        company,
        source_type,
        source_id,
        approval_title,
        approval_description,
        suggested_entry_type,
        suggested_customer_name,
        suggested_amount,
        confidence_score,
        match_reason,
        risk_note,
        status
      )
      values (
        p_company,
        'bank_transactions_raw',
        raw_id,
        coalesce(item->>'kaynak_banka', 'IS BANKASI') || ' ' || suggested_type_value || ' ' || to_char(amount_value, 'FM999G999G999D00') || ' TL',
        coalesce(item->>'aciklama', ''),
        suggested_type_value,
        coalesce(item->>'karsi_taraf', item->>'aday_cari', ''),
        amount_value,
        coalesce((item->>'guven')::numeric, 50),
        coalesce(item->>'risk', 'Telegram banka gorseli OCR siniflandirma'),
        case when coalesce((item->>'guven')::numeric, 50) >= 85 then 'Tek tik onaya hazir.' else 'Kontrol onerilir.' end,
        status_value
      );
      approval_total := approval_total + 1;
    end if;
  end loop;

  raw_count := raw_total;
  approval_count := approval_total;
  return next;
end;
$$;

grant execute on function public.ingest_bank_image_transactions_v59(text, jsonb, text) to anon;
grant execute on function public.ingest_bank_image_transactions_v59(text, jsonb, text) to authenticated;
