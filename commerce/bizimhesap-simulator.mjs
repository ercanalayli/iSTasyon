import { createHash, randomUUID } from 'node:crypto';

const WAITING_ACCOUNTS = new Set([
  'emanet_banka', 'emanet_kasa', 'emanet_cari', 'emanet_transfer_pos', 'emanet_diger'
]);

const clone = value => JSON.parse(JSON.stringify(value));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function createSimulator(seed = {}) {
  return {
    company: seed.company || 'alayli',
    mode: 'simulation',
    accounts: clone(seed.accounts || {}),
    products: clone(seed.products || {}),
    movements: [],
    audit: [],
    idempotency: {},
  };
}

export function previewOperation(state, operation) {
  if (!operation?.type) return { status: 'blocked', errors: ['İşlem türü eksik'] };
  if (!operation.evidence?.source || !operation.evidence?.hash) {
    return { status: 'blocked', errors: ['Kaynak belge ve kanıt hash zorunlu'] };
  }
  if (!operation.idempotencyKey) return { status: 'blocked', errors: ['Idempotency anahtarı zorunlu'] };
  if (state.idempotency[operation.idempotencyKey]) return { status: 'duplicate', errors: ['Mükerrer işlem'] };

  const next = clone(state);
  const warnings = [];
  if (operation.waitingAccount) {
    if (!WAITING_ACCOUNTS.has(operation.waitingAccount)) {
      return { status: 'blocked', errors: ['Geçersiz emanet hesabı'] };
    }
    for (const field of ['reason', 'candidateAccount', 'owner', 'resolveBy']) {
      if (!operation.waitingMeta?.[field]) return { status: 'blocked', errors: [`Emanet alanı eksik: ${field}`] };
    }
    warnings.push('İşlem emanet hesapta bekleyecek');
  }

  if (operation.type === 'pos_to_bank_transfer' && operation.kind === 'collection') {
    return { status: 'blocked', errors: ['POS banka geçişi tahsilat değil transfer olmalı'] };
  }
  if (operation.type === 'pos_to_bank_transfer' && (!operation.sourceAccount || !operation.targetAccount)) {
    return { status: 'blocked', errors: ['POS transferinde kaynak ve hedef hesap zorunlu'] };
  }

  const movement = {
    id: randomUUID(),
    ...clone(operation),
    status: 'simulated',
    simulatedAt: new Date().toISOString(),
  };
  next.movements.push(movement);
  next.idempotency[operation.idempotencyKey] = movement.id;
  next.audit.push({ action: 'previewed', movementId: movement.id, payloadHash: hash(operation) });
  return { status: 'preview', requiresApproval: true, warnings, movement, nextState: next };
}

export function approvePreview(preview, approver) {
  if (preview?.status !== 'preview') throw new Error('Onaylanabilir ön izleme yok');
  if (!approver) throw new Error('Onaylayan kullanıcı zorunlu');
  const queueItem = {
    id: randomUUID(),
    target: 'bizimhesap',
    operation: clone(preview.movement),
    status: 'approved_for_live_queue',
    approvedBy: approver,
    approvedAt: new Date().toISOString(),
  };
  return { ...preview, queueItem };
}

