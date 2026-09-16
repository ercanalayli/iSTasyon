import { browserSessionStatus, pageValue } from 'file:///C:/Users/HP/Documents/Codex/2026-08-27/referenced-chatgpt-conversation-this-is-an/work/aperion-command-bridge/src/windows-worker.js';

const origin = 'https://uygulama.bizimhesap.com';
const health = await browserSessionStatus({ startIfMissing: false });
if (!health.authenticated) throw new Error('bizimhesap_session_not_authenticated');
const options = await pageValue(`${origin}/web/ngn/acc/ngncostentry?rc=1`, `(() => {
  const get = id => [...(document.querySelector(id)?.options || [])].map(o => ({ name: String(o.textContent || '').trim(), value: o.value }));
  return { account: get('#ddlCashierNew'), category: get('#ddlCostAccounts'), payment: get('#ddlPaymentOption'), title: document.title };
})()`);
const norm = value => String(value || '').toLocaleLowerCase('tr-TR').replace(/[*\s/]+/g, ' ').trim();
const accountMatches = options.account.filter(item => norm(item.name).includes('ercan nakit'));
const categoryMatches = options.category.filter(item => /çay|ikram/i.test(item.name));
const duplicate = await pageValue(`${origin}/web/ngn/acc/ngncostss`, `(async () => {
  const r = await fetch('/api/AngularControllers/costs/GetAllCosts', { method: 'POST', credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ guid:'',searchText:'',startIndex:0,totalRecordCount:300,sortColumnIndex:0,
      sortDirectionAsc:false,paymentStatus:0,canViewAll:true,costSearchCalendarType:1 }) });
  if (!r.ok) return { available:false, httpStatus:r.status };
  const j=await r.json();
  const arrays=[]; const visit=(value,depth=0)=>{if(depth>5||!value||typeof value!=='object')return;
    if(Array.isArray(value)){arrays.push(value);return;} for(const child of Object.values(value))visit(child,depth+1);}; visit(j);
  const rows=arrays.flat().filter(v=>v&&typeof v==='object'&&v.dsGuid&&v.dsStatus!==null);
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Istanbul'});
  const candidates=rows.filter(v=>Math.abs(Number(v.mtAmount)-50)<0.01&&/ercan nakit/i.test(String(v.dsSupplier||'')));
  return { available:true, scanned:rows.length, possibleDuplicates:candidates.length, today, recentCandidates:candidates.slice(0,5).map(v=>({date:v.dtTransaction,amount:v.mtAmount,category:v.dsAccount,detail:v.dsAccountDetail,account:String(v.dsSupplier||'').replace(/\s*\([^)]*\)\s*$/, '')})) };
})()`);
const result = {
  status: accountMatches.length===1 && categoryMatches.length===1 && duplicate.available ? 'prepared_for_approval' : 'needs_review',
  company: 'ALAYLI MEDİKAL', amount:50, currency:'TRY', date:new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Istanbul'}),
  paid:true, accountMatches:accountMatches.map(v=>({name:v.name.replace(/\s*\([^)]*\)\s*$/, '')})), categoryMatches:categoryMatches.map(v=>({name:v.name})),
  duplicateCheck:duplicate, browserAuthenticated:true, financialWrites:0, bizimHesapWrites:0, secretsExposed:0
};
console.log(JSON.stringify(result));
