create or replace function ingest_mail_bank_movements(p_rows jsonb)
returns jsonb
language plpgsql
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
      company_id,
      source,
      mailbox,
      bank_name,
      mail_id,
      mail_subject,
      mail_from,
      mail_date,
      attachment_name,
      statement_id,
      transaction_date,
      transaction_time,
      description,
      amount_in,
      amount_out,
      balance_after,
      detected_type,
      suggested_counterparty,
      confidence_score,
      status,
      duplicate_key
    ) values (
      coalesce(v_item->>'company_id', 'alayli'),
      coalesce(v_item->>'source', 'gmail_bank_statement'),
      coalesce(v_item->>'mailbox', 'alaylimedikal@gmail.com'),
      coalesce(v_item->>'bank_name', ''),
      coalesce(v_item->>'mail_id', ''),
      coalesce(v_item->>'mail_subject', ''),
      coalesce(v_item->>'mail_from', ''),
      coalesce(v_item->>'mail_date', ''),
      coalesce(v_item->>'attachment_name', ''),
      coalesce(v_item->>'statement_id', ''),
      nullif(v_item->>'transaction_date', '')::date,
      coalesce(v_item->>'transaction_time', ''),
      coalesce(v_item->>'description', ''),
      coalesce(nullif(v_item->>'amount_in', '')::numeric, 0),
      coalesce(nullif(v_item->>'amount_out', '')::numeric, 0),
      nullif(v_item->>'balance_after', '')::numeric,
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
