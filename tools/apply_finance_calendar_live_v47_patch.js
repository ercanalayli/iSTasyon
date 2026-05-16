const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const backupPath = path.join(root, 'index.backup-before-finance-calendar-live-v47.html');

let html = fs.readFileSync(indexPath, 'utf8');
if (!fs.existsSync(backupPath)) fs.writeFileSync(backupPath, html, 'utf8');

let changed = false;
function repl(search, replace, label){
  if(!html.includes(search)){
    console.log('SKIP target not found: ' + label);
    return;
  }
  if(html.includes(replace)){
    console.log('SKIP already applied: ' + label);
    return;
  }
  html = html.replace(search, replace);
  changed = true;
  console.log('OK ' + label);
}

// Replace old quick_control drawer query with live finance calendar drawer query.
repl(
  "const {data,error}=await db.from('quick_control_center_view').select('*').eq('company','ALAYLI').in('period_status',['overdue','today','this_week']).order('item_date',{ascending:true}).limit(80);",
  "const {data,error}=await db.from('finance_calendar_drawer_view').select('*').eq('company','ALAYLI').order('calendar_date',{ascending:true}).limit(120);",
  'drawer view query v47'
);

// Replace fallback demo rows date field to match v47 calendar_date/item shape.
repl(
  "{item_type:'payable',item_date:today(),title:'Bugün ödenecek örnek kayıt',remaining_amount:0,period_status:'today',status:'demo'},\n      {item_type:'receivable',item_date:today(),title:'Bugün tahsil edilecek örnek kayıt',remaining_amount:0,period_status:'today',status:'demo'},\n      {item_type:'task',item_date:today(),title:'Bugünkü yapılacak örnek görev',remaining_amount:0,period_status:'today',status:'demo'}",
  "{item_type:'payable',calendar_date:today(),title:'Bugün ödenecek örnek kayıt',remaining_amount:0,period_status:'today',status:'demo',direction:'out'},\n      {item_type:'receivable',calendar_date:today(),title:'Bugün tahsil edilecek örnek kayıt',remaining_amount:0,period_status:'today',status:'demo',direction:'in'},\n      {item_type:'task',calendar_date:today(),title:'Bugünkü yapılacak örnek görev',remaining_amount:0,period_status:'today',status:'demo',direction:'neutral'}",
  'drawer fallback rows v47'
);

// Replace KPI calculation for v47 types/direction.
repl(
  "const todayPay=rows.filter(r=>r.item_type==='payable'&&r.period_status==='today').reduce((a,r)=>a+(+r.remaining_amount||0),0);\n  const todayRec=rows.filter(r=>r.item_type==='receivable'&&r.period_status==='today').reduce((a,r)=>a+(+r.remaining_amount||0),0);\n  const overduePay=rows.filter(r=>r.item_type==='payable'&&r.period_status==='overdue').reduce((a,r)=>a+(+r.remaining_amount||0),0);\n  const tasks=rows.filter(r=>r.item_type==='task'&&(r.period_status==='today'||r.period_status==='overdue')).length;",
  "const todayPay=rows.filter(r=>r.direction==='out'&&r.period_status==='today').reduce((a,r)=>a+(+r.remaining_amount||0),0);\n  const todayRec=rows.filter(r=>r.direction==='in'&&r.period_status==='today').reduce((a,r)=>a+(+r.remaining_amount||0),0);\n  const overduePay=rows.filter(r=>r.direction==='out'&&r.period_status==='overdue').reduce((a,r)=>a+(+r.remaining_amount||0),0);\n  const overdueRec=rows.filter(r=>r.direction==='in'&&r.period_status==='overdue').reduce((a,r)=>a+(+r.remaining_amount||0),0);\n  const tasks=rows.filter(r=>r.item_type==='task'&&(r.period_status==='today'||r.period_status==='overdue')).length;\n  const net=todayRec-todayPay;",
  'drawer kpi calculation v47'
);

// Replace KPI HTML to include net and overdue receivable.
repl(
  "const kpis=`<div class=\"finance-cal-kpis\"><div class=\"finance-cal-kpi\"><span>Bugün Ödenecek</span><b>${moneyTR(todayPay)}</b></div><div class=\"finance-cal-kpi\"><span>Bugün Tahsil</span><b>${moneyTR(todayRec)}</b></div><div class=\"finance-cal-kpi\"><span>Geciken Ödeme</span><b>${moneyTR(overduePay)}</b></div><div class=\"finance-cal-kpi\"><span>Görev</span><b>${tasks}</b></div></div>`;",
  "const kpis=`<div class=\"finance-cal-kpis\"><div class=\"finance-cal-kpi\"><span>Bugün Ödenecek</span><b>${moneyTR(todayPay)}</b></div><div class=\"finance-cal-kpi\"><span>Bugün Tahsil</span><b>${moneyTR(todayRec)}</b></div><div class=\"finance-cal-kpi\"><span>Bugün Net</span><b>${moneyTR(net)}</b></div><div class=\"finance-cal-kpi\"><span>Geciken Ödeme</span><b>${moneyTR(overduePay)}</b></div><div class=\"finance-cal-kpi\"><span>Geciken Tahsil</span><b>${moneyTR(overdueRec)}</b></div><div class=\"finance-cal-kpi\"><span>Görev</span><b>${tasks}</b></div></div>`;",
  'drawer kpi html v47'
);

// Replace row date display item_date -> calendar_date fallback.
repl(
  "${escHtml(r.item_date||'-')} · ${escHtml(r.item_type||'-')} · ${escHtml(r.status||'-')}",
  "${escHtml(r.calendar_date||r.item_date||'-')} · ${escHtml(r.item_type||'-')} · ${escHtml(r.status||'-')}",
  'drawer row date v47'
);

// Add v47 helper badges for type names if not present.
const helperMarker = "function moneyTR(n){return 'TL '+Math.round(Number(n||0)).toLocaleString('tr-TR');}";
const helperReplace = "function moneyTR(n){return 'TL '+Math.round(Number(n||0)).toLocaleString('tr-TR');}\nfunction financeTypeTR(t){return {payable:'Ödenecek',receivable:'Tahsil',task:'Görev',approval:'Onay',credit:'Kredi',credit_card:'Kredi Kartı',check:'Çek/Senet',note:'Not',moka:'Moka',fixed_payment:'Sabit Ödeme',variable_expense:'Değişken Gider'}[t]||t||'-';}";
if(html.includes(helperMarker) && !html.includes('function financeTypeTR')){
  html=html.replace(helperMarker,helperReplace);
  changed=true;
  console.log('OK finance type helper v47');
}

// Use translated type in row meta.
repl(
  "${escHtml(r.calendar_date||r.item_date||'-')} · ${escHtml(r.item_type||'-')} · ${escHtml(r.status||'-')}",
  "${escHtml(r.calendar_date||r.item_date||'-')} · ${escHtml(financeTypeTR(r.item_type))} · ${escHtml(r.status||'-')}",
  'drawer row type translation v47'
);

if(changed){
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('RESULT: OK - finance calendar live v47 patch applied. Backup: ' + backupPath);
}else{
  console.log('RESULT: NO CHANGE - patch may already be applied or base patch not yet applied.');
}
