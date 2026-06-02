create or replace function reject_pending_bank_movement(p_id uuid, p_note text default null)
returns boolean
language plpgsql
as $$
begin
  update pending_bank_movements
  set status = 'rejected',
      approval_note = p_note,
      updated_at = now()
  where id = p_id;

  return found;
end;
$$;
