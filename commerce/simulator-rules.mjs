export const WAITING_ACCOUNTS = new Set(['emanet_banka','emanet_kasa','emanet_cari','emanet_transfer_pos','emanet_diger']);

export function validateOperation(state, operation) {
  if (!operation?.type) return ['İşlem türü eksik'];
  if (!operation.evidence?.source || !operation.evidence?.hash) return ['Kaynak belge ve kanıt hash zorunlu'];
  if (!operation.idempotencyKey) return ['Idempotency anahtarı zorunlu'];
  if (state?.idempotency?.[operation.idempotencyKey]) return ['Mükerrer işlem'];
  if (operation.waitingAccount) {
    if (!WAITING_ACCOUNTS.has(operation.waitingAccount)) return ['Geçersiz emanet hesabı'];
    for (const field of ['reason','candidateAccount','owner','resolveBy']) if (!operation.waitingMeta?.[field]) return [`Emanet alanı eksik: ${field}`];
  }
  if (operation.type === 'pos_to_bank_transfer' && operation.kind === 'collection') return ['POS banka geçişi tahsilat değil transfer olmalı'];
  if (operation.type === 'pos_to_bank_transfer' && (!operation.sourceAccount || !operation.targetAccount)) return ['POS transferinde kaynak ve hedef hesap zorunlu'];
  return [];
}
