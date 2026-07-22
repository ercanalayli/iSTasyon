import { createHash, randomUUID } from 'node:crypto';
import { validateOperation } from './simulator-rules.mjs';
const clone = value => JSON.parse(JSON.stringify(value));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function createSimulator(seed={}){return{company:seed.company||'alayli',mode:'simulation',accounts:clone(seed.accounts||{}),products:clone(seed.products||{}),movements:[],audit:[],idempotency:{}}}
export function previewOperation(state,operation){
  const errors=validateOperation(state,operation); if(errors.length)return{status:errors[0]==='Mükerrer işlem'?'duplicate':'blocked',errors};
  const next=clone(state),warnings=[]; if(operation.waitingAccount)warnings.push('İşlem emanet hesapta bekleyecek');
  const movement={id:randomUUID(),...clone(operation),status:'simulated',simulatedAt:new Date().toISOString()};
  next.movements.push(movement); next.idempotency[operation.idempotencyKey]=movement.id; next.audit.push({action:'previewed',movementId:movement.id,payloadHash:hash(operation)});
  return{status:'preview',requiresApproval:true,warnings,movement,nextState:next};
}
export function approvePreview(preview,approver){if(preview?.status!=='preview')throw new Error('Onaylanabilir ön izleme yok');if(!approver)throw new Error('Onaylayan kullanıcı zorunlu');return{...preview,queueItem:{id:randomUUID(),target:'bizimhesap',operation:clone(preview.movement),status:'approved_for_live_queue',approvedBy:approver,approvedAt:new Date().toISOString()}}}
