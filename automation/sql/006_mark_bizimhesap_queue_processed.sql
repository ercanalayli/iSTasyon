create or replace function mark_bizimhesap_queue_processed(
  p_queue_id uuid,
  p_message text default null,
  p_result jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_payload jsonb;
begin
  select payload into v_payload
  from bizimhesap_queue
  where id = p_queue_id
  for update;

  if not found then
    raise exception 'bizimhesap queue not found: %', p_queue_id;
  end if;

  update bizimhesap_queue
  set status = 'processed',
      processed_at = now(),
      error_message = null,
      payload = coalesce(v_payload, '{}'::jsonb) || jsonb_build_object(
        'aperion_posting_result',
        jsonb_build_object(
          'status', 'processed',
          'message', coalesce(p_message, 'BizimHesap kaydi islendi'),
          'at', now()
        ) || coalesce(p_result, '{}'::jsonb)
      )
  where id = p_queue_id;

  return true;
end;
$$;

grant execute on function mark_bizimhesap_queue_processed(uuid, text, jsonb) to anon, authenticated, service_role;
notify pgrst, 'reload schema';

-- AperiON SQL install trigger: 2026-06-29 queue close RPC refresh.
