'use strict';

const WRITE_RISK = /\b(payment|pay|transfer|collection|collect|invoice|e-?invoice|ödeme|öde|transfer|tahsilat|tahsil|fatura|kaydet|oluştur|gönder)\b/i;
const READ_ONLY = /\b(read|show|list|count|health|status|report|oku|göster|listele|say|sağlık|durum|rapor)\b/i;

function routeCommand(command, payload = {}) {
  const text = `${command || ''} ${payload.text || ''}`.replace(/[._-]+/g, ' ');
  if (WRITE_RISK.test(text)) return { risk: 'approval_required', executionMode: 'prepare_only', approvalPolicy: 'explicit_single_use' };
  if (READ_ONLY.test(text)) return { risk: 'read', executionMode: 'automatic', approvalPolicy: 'none' };
  return { risk: 'low_risk', executionMode: 'automatic_with_audit', approvalPolicy: 'none' };
}

function prepareSignal(input) {
  return {
    source: input.source,
    sourceRef: input.sourceRef,
    observedAt: input.observedAt || new Date().toISOString(),
    importance: input.importance || 'normal',
    risk: input.risk || 'none',
    requiredAction: input.requiredAction || 'observe',
    summary: String(input.summary || '').slice(0, 500),
    provenance: { hash: input.hash || null, locator: input.locator || null }
  };
}

function auditEvent(input) {
  if (!input.commandId || !input.source || !input.decision) throw new Error('audit_chain_incomplete');
  return {
    command_id: input.commandId,
    source: input.source,
    decision: input.decision,
    approval: input.approval || 'not_required',
    execution_result: input.executionResult || 'not_executed',
    proof: input.proof || null,
    recorded_at: new Date().toISOString()
  };
}

module.exports = { routeCommand, prepareSignal, auditEvent };
