-- =========================================================
-- AperiON v58.3 - Assistant Rule Engine SQL
-- =========================================================
-- Purpose:
-- Generate first-rule-based assistant answers from existing views.
-- This is the safe MVP before any external AI model is connected.
-- =========================================================

create extension if not exists pgcrypto;

create or replace view aperion_assistant_focus_today_v58_view as
select
  'late'::text as source_type,
  id::text as source_id,
  title,
  coalesce(asset_name, '-') as asset_name,
  record_type,
  category,
  due_date,
  amount,
  currency,
  priority,
  status,
  100 as score,
  'Gecikmiş kayıt'::text as reason
from aperion_life_late_v58_view

union all

select
  'today'::text as source_type,
  id::text as source_id,
  title,
  coalesce(asset_name, '-') as asset_name,
  record_type,
  category,
  due_date,
  amount,
  currency,
  priority,
  status,
  case priority when 'critical' then 95 when 'high' then 85 when 'normal' then 70 else 55 end as score,
  'Bugünkü kayıt'::text as reason
from aperion_life_today_v58_view

union all

select
  'week'::text as source_type,
  id::text as source_id,
  title,
  coalesce(asset_name, '-') as asset_name,
  record_type,
  category,
  due_date,
  amount,
  currency,
  priority,
  status,
  case priority when 'critical' then 80 when 'high' then 70 when 'normal' then 50 else 35 end as score,
  'Bu hafta yaklaşan kayıt'::text as reason
from aperion_life_week_v58_view
where due_date > current_date
order by score desc, due_date asc nulls last
limit 10;

create or replace function build_assistant_focus_answer_v58(p_owner text default 'ercan')
returns text
language plpgsql
as $$
declare
  v_line text;
  v_answer text := '';
  v_count int := 0;
  v_total numeric := 0;
begin
  select count(*), coalesce(sum(amount) filter (where record_type='payment'),0)
    into v_count, v_total
  from aperion_assistant_focus_today_v58_view;

  if v_count = 0 then
    return 'Bugün için açık kritik kayıt görünmüyor. Yine de Telegram ve belge gelenlerini kontrol et.';
  end if;

  v_answer := 'Bugün odaklanılacak ilk işler:' || chr(10);

  for v_line in
    select row_number() over(order by score desc, due_date asc nulls last)::text || '. ' ||
           title ||
           case when asset_name <> '-' then ' — ' || asset_name else '' end ||
           case when due_date is not null then ' — ' || due_date::text else '' end ||
           case when amount is not null then ' — ' || amount::text || ' ' || currency else '' end ||
           ' (' || reason || ')'
    from aperion_assistant_focus_today_v58_view
    order by score desc, due_date asc nulls last
    limit 5
  loop
    v_answer := v_answer || v_line || chr(10);
  end loop;

  if v_total > 0 then
    v_answer := v_answer || chr(10) || 'Açık ödeme toplamı: ' || v_total::text || ' TL';
  end if;

  return v_answer;
end;
$$;

create or replace function build_assistant_week_answer_v58(p_owner text default 'ercan')
returns text
language plpgsql
as $$
declare
  v_line text;
  v_answer text := '';
  v_count int := 0;
  v_total numeric := 0;
begin
  select count(*), coalesce(sum(amount) filter (where record_type='payment'),0)
    into v_count, v_total
  from aperion_life_week_v58_view;

  if v_count = 0 then
    return 'Bu hafta için açık kayıt görünmüyor.';
  end if;

  v_answer := 'Bu hafta görünen kayıtlar:' || chr(10);

  for v_line in
    select row_number() over(order by due_date asc nulls last)::text || '. ' ||
           title ||
           case when asset_name is not null then ' — ' || asset_name else '' end ||
           case when due_date is not null then ' — ' || due_date::text else '' end ||
           case when amount is not null then ' — ' || amount::text || ' ' || currency else '' end
    from aperion_life_week_v58_view
    order by due_date asc nulls last
    limit 10
  loop
    v_answer := v_answer || v_line || chr(10);
  end loop;

  if v_total > 0 then
    v_answer := v_answer || chr(10) || 'Haftalık açık ödeme toplamı: ' || v_total::text || ' TL';
  end if;

  return v_answer;
end;
$$;

create or replace function build_assistant_risk_answer_v58(p_owner text default 'ercan')
returns text
language plpgsql
as $$
declare
  v_late int := 0;
  v_critical int := 0;
  v_unlinked int := 0;
  v_answer text := '';
begin
  select count(*) into v_late from aperion_life_late_v58_view;
  select count(*) into v_critical from aperion_life_week_v58_view where priority='critical';
  begin
    select count(*) into v_unlinked from aperion_unlinked_documents_v58_view;
  exception when undefined_table then
    v_unlinked := 0;
  end;

  v_answer := 'Risk özeti:' || chr(10) ||
              '- Geciken kayıt: ' || v_late::text || chr(10) ||
              '- Bu hafta kritik kayıt: ' || v_critical::text || chr(10) ||
              '- Bağlanmamış belge: ' || v_unlinked::text;

  if v_late > 0 then
    v_answer := v_answer || chr(10) || 'Öncelik: önce geciken kayıtları kapat.';
  elsif v_critical > 0 then
    v_answer := v_answer || chr(10) || 'Öncelik: kritik kayıtları bugün gözden geçir.';
  else
    v_answer := v_answer || chr(10) || 'Şu an büyük kırmızı risk görünmüyor.';
  end if;

  return v_answer;
end;
$$;

create or replace function answer_assistant_message_v58(p_message_id uuid)
returns text
language plpgsql
as $$
declare
  v_msg aperion_assistant_messages_v58%rowtype;
  v_answer text;
begin
  select * into v_msg from aperion_assistant_messages_v58 where id = p_message_id;

  if not found then
    raise exception 'assistant message not found';
  end if;

  if v_msg.intent = 'focus_today' then
    v_answer := build_assistant_focus_answer_v58(v_msg.owner);
  elsif v_msg.intent = 'week_summary' then
    v_answer := build_assistant_week_answer_v58(v_msg.owner);
  elsif v_msg.intent = 'risk_check' then
    v_answer := build_assistant_risk_answer_v58(v_msg.owner);
  else
    v_answer := 'Bu soru için kural motoru henüz hazır değil. Soru kaydedildi; daha sonra ilgili modüle bağlanacak.';
  end if;

  update aperion_assistant_messages_v58
  set answer_text = v_answer,
      status = 'answered',
      answered_at = now()
  where id = p_message_id;

  return v_answer;
end;
$$;

create or replace view aperion_assistant_answered_today_v58_view as
select *
from aperion_assistant_messages_v58
where status='answered'
  and answered_at::date = current_date
order by answered_at desc;

-- Quick checks:
-- select build_assistant_focus_answer_v58('ercan');
-- select answer_assistant_message_v58('<message_id>'::uuid);
