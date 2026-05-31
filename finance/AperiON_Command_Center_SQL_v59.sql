-- =========================================================
-- AperiON v59 - Command Center SQL
-- =========================================================
-- Purpose:
-- Build compact answers for Telegram and dashboard commands:
-- /komuta, /bugun, /sonhareketler, /sonekstre, /onaylar
-- =========================================================

create or replace view aperion_command_today_v59_view as
select
  'alayli'::text as company,
  now()::date as report_date,
  (select count(*) from aperion_approval_center_v59 where company = 'alayli' and status in ('pending','in_review','needs_info','error')) as pending_approvals,
  (select count(*) from aperion_approval_center_v59 where company = 'alayli' and status in ('pending','in_review','needs_info','error') and priority in ('critical','high')) as high_priority_approvals,
  (select count(*) from aperion_document_metadata_v58 where company = 'alayli' and status in ('new','review','error')) as open_documents,
  (select count(*) from aperion_bank_transactions_raw_v59 where company = 'alayli' and status in ('new','review','error')) as open_bank_transactions,
  (select count(*) from aperion_moka_reconciliation_suggestions_v59 where company = 'alayli' and status = 'suggested') as moka_suggestions,
  (select coalesce(sum(amount),0) from aperion_finance_movement_pool_v59 where company = 'alayli' and status in ('draft','review','approved') and direction = 'inflow') as open_inflow_total,
  (select coalesce(sum(amount),0) from aperion_finance_movement_pool_v59 where company = 'alayli' and status in ('draft','review','approved') and direction = 'outflow') as open_outflow_total;

create or replace view aperion_last_statement_v59_view as
select
  company,
  detected_bank,
  file_name,
  statement_start_date,
  statement_end_date,
  row_count,
  parsed_count,
  duplicate_count,
  status,
  created_at,
  processed_at,
  id as batch_id
from aperion_processing_batches_v59
where company = 'alayli'
order by created_at desc
limit 1;

create or replace view aperion_recent_movements_v59_view as
select
  id,
  company,
  source_type,
  movement_date,
  title,
  amount,
  direction,
  currency,
  counterparty_name,
  confidence,
  status,
  created_at
from aperion_finance_movement_pool_v59
where company = 'alayli'
order by coalesce(movement_date, created_at::date) desc, created_at desc
limit 15;

create or replace function build_command_center_answer_v59(p_company text default 'alayli')
returns text
language plpgsql
as $$
declare
  t record;
  s record;
  v_answer text;
begin
  select * into t from aperion_command_today_v59_view where company = coalesce(nullif(p_company,''),'alayli');
  select * into s from aperion_last_statement_v59_view where company = coalesce(nullif(p_company,''),'alayli');

  v_answer := 'AperiON Komuta Merkezi' || E'\n\n' ||
    'Bekleyen onay: ' || coalesce(t.pending_approvals,0) || E'\n' ||
    'Yüksek öncelik: ' || coalesce(t.high_priority_approvals,0) || E'\n' ||
    'Açık belge: ' || coalesce(t.open_documents,0) || E'\n' ||
    'Açık banka hareketi: ' || coalesce(t.open_bank_transactions,0) || E'\n' ||
    'Moka önerisi: ' || coalesce(t.moka_suggestions,0) || E'\n\n' ||
    'Açık giriş: ' || coalesce(t.open_inflow_total,0) || ' TRY' || E'\n' ||
    'Açık çıkış: ' || coalesce(t.open_outflow_total,0) || ' TRY';

  if s.batch_id is not null then
    v_answer := v_answer || E'\n\nSon ekstre:' || E'\n' ||
      coalesce(s.detected_bank,'Banka bilinmiyor') || E'\n' ||
      coalesce(s.file_name,'-') || E'\n' ||
      'Hareket: ' || coalesce(s.parsed_count,0) || ' / Mükerrer: ' || coalesce(s.duplicate_count,0);
  end if;

  return v_answer;
end;
$$;

create or replace function build_recent_movements_answer_v59(p_company text default 'alayli', p_limit integer default 10)
returns text
language plpgsql
as $$
declare
  r record;
  v_answer text := 'Son finans hareketleri:' || E'\n';
  v_i integer := 0;
begin
  for r in
    select * from aperion_recent_movements_v59_view
    where company = coalesce(nullif(p_company,''),'alayli')
    limit greatest(1, least(coalesce(p_limit,10), 15))
  loop
    v_i := v_i + 1;
    v_answer := v_answer || v_i || '. ' || coalesce(r.title,'Hareket') || E'\n' ||
      '   ' || coalesce(r.movement_date::text,'tarih yok') || ' · ' || coalesce(r.amount::text,'0') || ' ' || coalesce(r.currency,'TRY') || ' · ' || coalesce(r.status,'-') || E'\n';
  end loop;

  if v_i = 0 then
    return 'Henüz finans hareketi görünmüyor.';
  end if;
  return v_answer;
end;
$$;

create or replace function build_last_statement_answer_v59(p_company text default 'alayli')
returns text
language plpgsql
as $$
declare
  s record;
begin
  select * into s from aperion_last_statement_v59_view where company = coalesce(nullif(p_company,''),'alayli');
  if s.batch_id is null then
    return 'Henüz işlenmiş ekstre görünmüyor.';
  end if;

  return 'Son ekstre:' || E'\n' ||
    'Banka: ' || coalesce(s.detected_bank,'Bilinmiyor') || E'\n' ||
    'Dosya: ' || coalesce(s.file_name,'-') || E'\n' ||
    'Satır: ' || coalesce(s.row_count,0) || E'\n' ||
    'İşlenen: ' || coalesce(s.parsed_count,0) || E'\n' ||
    'Mükerrer: ' || coalesce(s.duplicate_count,0) || E'\n' ||
    'Durum: ' || coalesce(s.status,'-') || E'\n' ||
    'Batch: ' || s.batch_id;
end;
$$;
