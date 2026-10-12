'use strict';

// Safety-critical guards shared by the existing Supabase listener and B2B
// invoice adapter. This is NOT an approval system; it never changes prepared
// commands into pending commands and never posts to BizimHesap.

function commandIdNumber(id) {
  const n = Number(id);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error('command_id_invalid');
  return n;
}

async function claimPendingBotCommand(db, id) {
  const commandId = commandIdNumber(id);
  // Atomic conditional UPDATE: another listener may have read the same pending
  // row; only ONE process can transition it to processing.
  const { data, error } = await db.from('bot_commands')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', commandId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (error) throw new Error('bot_command_claim_failed:' + error.message);
  return Number(data?.id) === commandId;
}

async function guardSingleInvoiceAttempt(db, idempotencyKey, commandIdInput) {
  const commandId = commandIdNumber(commandIdInput);
  const key = String(idempotencyKey || '').trim();
  if (!key || key.length > 256) throw new Error('invoice_idempotency_key_invalid');

  // Include ALL states, not just completed. An uncertain / failed earlier
  // financial call cannot be safely retried without ERP-side reconciliation.
  const { data, error } = await db.from('bot_commands')
    .select('id,status,result')
    .eq('command', 'bizimhesap_b2b_invoice')
    .contains('params', { idempotency_key: key })
    .order('id', { ascending: true });
  if (error) throw new Error('invoice_idempotency_lookup_failed:' + error.message);
  const rows = Array.isArray(data) ? data : [];
  const current = rows.find(row => Number(row.id) === commandId);
  if (!current || current.status !== 'processing') {
    throw new Error('invoice_not_atomically_claimed');
  }
  const other = rows.filter(row => Number(row.id) !== commandId);
  const previous = other.find(row => row.status === 'completed');
  if (previous) {
    return { duplicate_blocked: true, prior_command_id: previous.id, prior_result: previous.result || '' };
  }
  if (other.length) {
    throw new Error('invoice_duplicate_or_uncertain_attempt_requires_reconciliation');
  }
  return { duplicate_blocked: false };
}

module.exports = { claimPendingBotCommand, guardSingleInvoiceAttempt };
