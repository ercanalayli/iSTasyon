import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';

// Isolated lifecycle fixture: no gateway, worker, network, or financial write.
const db = new DatabaseSync(':memory:');
db.exec(`PRAGMA foreign_keys=ON;
CREATE TABLE intents(id TEXT PRIMARY KEY, payload TEXT NOT NULL, payload_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','approved','cancelled')),
  task_id TEXT UNIQUE, created_at INTEGER NOT NULL);
CREATE TABLE tasks(id TEXT PRIMARY KEY, intent_id TEXT NOT NULL UNIQUE REFERENCES intents(id),
  payload TEXT NOT NULL, payload_hash TEXT NOT NULL, approval_state TEXT NOT NULL,
  status TEXT NOT NULL, created_at INTEGER NOT NULL);`);

const payload = Object.freeze({company:'ALAYLI MEDİKAL',operation:'gider',amount:50,
  currency:'TRY',category:'MARKET',payment_account:'Ercan Nakit Kasa',date:'2026-09-16',paid_status:'ödenmiş'});
const canonical = JSON.stringify(payload);
const hash = createHash('sha256').update(canonical).digest('hex');
let now = Date.now();
function prepare(ttlMs=600000) {
  const id=randomUUID();
  db.prepare('INSERT INTO intents VALUES (?,?,?,?,?,?,?)').run(id,canonical,hash,now+ttlMs,'pending',null,now);
  return id;
}
function approve(id, observedHash=hash, injectFailure=false) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const row=db.prepare('SELECT * FROM intents WHERE id=?').get(id);
    if (!row) throw new Error('not_found');
    if (row.status==='approved') { db.exec('COMMIT'); return {task_id:row.task_id,duplicate:true}; }
    if (row.status!=='pending') throw new Error('not_pending');
    if (row.expires_at<=now) throw new Error('expired');
    if (row.payload_hash!==observedHash || createHash('sha256').update(row.payload).digest('hex')!==row.payload_hash) throw new Error('payload_changed');
    const taskId=randomUUID();
    const changed=db.prepare("UPDATE intents SET status='approved',task_id=? WHERE id=? AND status='pending' AND expires_at>?").run(taskId,id,now).changes;
    if (changed!==1) throw new Error('approval_lost');
    if (injectFailure) throw new Error('injected_failure');
    db.prepare("INSERT INTO tasks VALUES (?,?,?,?,?,?,?)").run(taskId,id,row.payload,row.payload_hash,'approved','pending',now);
    db.exec('COMMIT');
    return {task_id:taskId,duplicate:false};
  } catch(error) { db.exec('ROLLBACK'); throw error; }
}
function cancel(id) {
  return db.prepare("UPDATE intents SET status='cancelled' WHERE id=? AND status='pending'").run(id).changes;
}
const cases=[];
function check(name,fn) { fn(); cases.push(name); }
const first=prepare();
check('pre-approval has zero tasks',()=>assert.equal(db.prepare('SELECT count(*) n FROM tasks').get().n,0));
check('approval creates one bound task',()=>{const result=approve(first);assert.equal(result.duplicate,false);assert.equal(db.prepare('SELECT count(*) n FROM tasks').get().n,1);});
check('double tap and replay return same task',()=>{const a=approve(first),b=approve(first);assert.equal(a.task_id,b.task_id);assert.equal(a.duplicate,true);assert.equal(db.prepare('SELECT count(*) n FROM tasks').get().n,1);});
check('cancel creates no task',()=>{const id=prepare();assert.equal(cancel(id),1);assert.throws(()=>approve(id),/not_pending/);assert.equal(db.prepare('SELECT count(*) n FROM tasks').get().n,1);});
check('expiry creates no task',()=>{const id=prepare(1);now+=2;assert.throws(()=>approve(id),/expired/);assert.equal(db.prepare('SELECT count(*) n FROM tasks').get().n,1);});
check('payload mutation creates no task',()=>{const id=prepare();assert.throws(()=>approve(id,'wrong'),/payload_changed/);assert.equal(db.prepare('SELECT count(*) n FROM tasks').get().n,1);});
check('failure between approval and task rolls back both',()=>{const id=prepare();assert.throws(()=>approve(id,hash,true),/injected_failure/);assert.equal(db.prepare('SELECT status FROM intents WHERE id=?').get(id).status,'pending');assert.equal(db.prepare('SELECT count(*) n FROM tasks WHERE intent_id=?').get(id).n,0);});
check('worker or browser state absent from intent',()=>{const id=prepare();const row=db.prepare('SELECT * FROM intents WHERE id=?').get(id);assert.equal(row.payload.includes('tabId'),false);assert.equal(row.payload.includes('workerLease'),false);});
console.log(JSON.stringify({mode:'isolated_in_memory_only',passed:cases.length,total:cases.length,task_count:db.prepare('SELECT count(*) n FROM tasks').get().n,financial_writes:0,bizimhesap_writes:0}));
