import {authenticateDashboard,json} from '../shared/istasyon-dashboard-auth.js';

async function safeFirst(db,sql,...bind){
  try{return await db.prepare(sql).bind(...bind).first()}catch(_){return null}
}
export async function onRequestGet({request,env}){
  if(!await authenticateDashboard(request,env)) return json({ok:false,error:'unauthorized'},401);
  if(!env.APERION_DB) return json({ok:false,error:'store_unavailable'},503);
  const [bank,health,pending]=await Promise.all([
    safeFirst(env.APERION_DB,`SELECT COUNT(*) count,
      COALESCE(SUM(CASE WHEN amount_in>0 THEN amount_in ELSE 0 END),0) amount_in,
      COALESCE(SUM(CASE WHEN amount_out>0 THEN amount_out ELSE 0 END),0) amount_out,
      MAX(transaction_date) last_date
      FROM bank_transactions WHERE company_id='alkam'`),
    safeFirst(env.APERION_DB,`SELECT COUNT(*) count FROM source_health WHERE status='healthy'`),
    safeFirst(env.APERION_DB,`SELECT COUNT(*) count FROM commitment_timeline
      WHERE status NOT IN ('completed','cancelled','verified','done','closed')`)
  ]);
  return json({ok:true,generated_at:new Date().toISOString(),company:'alkam',read_only:true,
    bank:bank?{count:Number(bank.count||0),amount_in:Number(bank.amount_in||0),amount_out:Number(bank.amount_out||0),last_date:bank.last_date||null}:null,
    source_health_count:Number(health?.count||0),
    open_commitment_count:Number(pending?.count||0),
    financial_writes:false,
    note:'Private dashboard session; detailed ALKAM Sheets synchronization is the next source layer.'
  });
}
