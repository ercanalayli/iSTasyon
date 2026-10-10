export const FINANCE_COMMAND_ADAPTER_VERSION = 'apeiron-finance-adapter-v1';

export function toHermesPrepare({ commandText, eventId, conversationKey, channel = 'custom-gpt', namespace = 'production:user-command' }) {
  if (!commandText || !eventId || !conversationKey) throw new Error('adapter_identity_required');
  return { command_text:commandText, event_id:eventId, conversation_key:conversationKey,
    idempotency_namespace:namespace, adapter:{version:FINANCE_COMMAND_ADAPTER_VERSION,channel} };
}

export function toHermesApproval(internalContext) {
  if (!internalContext?.command_id || !internalContext?.payload_hash || !internalContext?.conversation_key) throw new Error('exact_approval_context_required');
  return { command_id:internalContext.command_id, payload_hash:internalContext.payload_hash,
    conversation_key:internalContext.conversation_key, approval_text:'Onaylıyorum' };
}

export function userFacingPrepare(response) {
  const id = String(response?._internal_approval_context?.command_id || response?.command_id || '').trim();
  const shortId = id ? id.slice(0, 8).toUpperCase() : null;
  const base = String(response?.message || 'İşlem hazırlanamadı.');
  return { message: shortId ? `${base}\n\nİşlem ID: ${shortId}` : base, native_confirmation_required:true, operation_id:shortId };
}

export function userFacingResult(response, summary) {
  if (response?.verified === true) return `✓ Kaydedildi\n${summary}\nBizimHesap doğrulandı.`;
  return String(response?.message || 'BizimHesap’a şu anda ulaşılamıyor.');
}

export const ADAPTER_SURFACES = Object.freeze(['custom-gpt-action','plugin-tool','connector','remote-mcp']);
