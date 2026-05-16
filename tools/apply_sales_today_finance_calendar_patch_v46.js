const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const backupPath = path.join(root, 'index.backup-before-sales-today-finance-calendar-v46.html');

let html = fs.readFileSync(indexPath, 'utf8');
if (!fs.existsSync(backupPath)) fs.writeFileSync(backupPath, html, 'utf8');

let changed = false;
function replaceOnce(search, replace, label) {
  if (html.includes(replace)) {
    console.log(label + ' already applied');
    return;
  }
  if (!html.includes(search)) throw new Error('Target not found: ' + label);
  html = html.replace(search, replace);
  changed = true;
  console.log(label + ' applied');
}

// 1) Sales flow period buttons: add Bugün first and put date order in the visible bar.
const oldSalesBar = `        <span class="fbar-l">Dönem</span>
        <button class="fb" onclick="sM('yesterday',this,1)">Dün</button>
        <button class="fb" onclick="sM('week',this,1)">Bu Hafta</button>
        <button class="fb" onclick="sM('month',this,1)">Bu Ay</button>
        <button class="fb" onclick="sM('last_month',this,1)" id="lastMonthBtn">Geçen Ay</button>
        <button class="fb on" onclick="sM('year',this,1)">Bu Yıl</button>
        <button class="fb" onclick="sM('last_year',this,1)">Geçen Yıl</button>`;
const newSalesBar = `        <span class="fbar-l">Dönem</span>
        <button class="fb on" data-period="today" onclick="sM('today',this,1)">Bugün</button>
        <button class="fb" data-period="yesterday" onclick="sM('yesterday',this,1)">Dün</button>
        <button class="fb" data-period="week" onclick="sM('week',this,1)">Bu Hafta</button>
        <button class="fb" data-period="month" onclick="sM('month',this,1)">Bu Ay</button>
        <button class="fb" data-period="last_month" onclick="sM('last_month',this,1)" id="lastMonthBtn">Geçen Ay</button>
        <button class="fb" data-period="year" onclick="sM('year',this,1)">Bu Yıl</button>
        <button class="fb" data-period="last_year" onclick="sM('last_year',this,1)">Geçen Yıl</button>`;
if (html.includes(oldSalesBar)) replaceOnce(oldSalesBar, newSalesBar, 'sales today period bar');

// 2) Add Finance Calendar button to Sales flow actions.
const oldFlowActions = `          <button class="flow-btn" onclick="gP('stok',null)">Ürünlere Git</button>
          <button class="flow-btn" onclick="gP('cariler',null)">Müşterilere Git</button>
          <button class="flow-btn" onclick="gP('finans',null)">Finans Özeti</button>`;
const newFlowActions = `          <button class="flow-btn" onclick="gP('stok',null)">Ürünlere Git</button>
          <button class="flow-btn" onclick="gP('cariler',null)">Müşterilere Git</button>
          <button class="flow-btn" onclick="gP('finans',null)">Finans Özeti</button>
          <button class="flow-btn" onclick="openFinanceCalendarDrawer()">Finans Takvimi</button>`;
if (html.includes(oldFlowActions)) replaceOnce(oldFlowActions, newFlowActions, 'sales finance calendar action');

// 3) Add sidebar menu item for Finance Calendar under Para.
const financeMenuLine = `      <div class="sb-item" onclick="gP('finans',this)"><span class="sb-ico">FN</span><span><span class="sb-lbl">Finans Merkezi</span><span class="sb-sub">gelir, gider, net sonuc</span></span></div>`;
const financeMenuWithCalendar = `${financeMenuLine}
      <div class="sb-item" onclick="openFinanceCalendarDrawer()"><span class="sb-ico">FT</span><span><span class="sb-lbl">Finans Takvimi</span><span class="sb-sub">odenecek, tahsil, gorev</span></span></div>`;
if (!html.includes('Finans Takvimi</span><span class="sb-sub">odenecek, tahsil, gorev')) {
  replaceOnce(financeMenuLine, financeMenuWithCalendar, 'sidebar finance calendar item');
}

// 4) CSS for floating button + drawer.
const cssMarker = `</style>`;
const cssBlock = `
.finance-cal-float{position:fixed;right:14px;bottom:22px;z-index:8500;border:0;border-radius:999px;background:#2563EB;color:#fff;padding:13px 18px;font-weight:950;box-shadow:0 16px 34px rgba(37,99,235,.32);cursor:pointer;display:flex;align-items:center;gap:8px}
.finance-cal-float:hover{transform:translateY(-2px);box-shadow:0 20px 44px rgba(37,99,235,.4)}
.finance-drawer-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.38);z-index:8900;display:none}
.finance-drawer-backdrop.open{display:block}
.finance-drawer{position:fixed;top:0;right:-440px;width:min(430px,96vw);height:100vh;background:#fff;border-left:1px solid #E5E7EB;z-index:9000;box-shadow:-20px 0 48px rgba(15,23,42,.18);transition:right .22s ease;display:flex;flex-direction:column}
.finance-drawer.open{right:0}
.finance-drawer-head{padding:16px;border-bottom:1px solid #E5E7EB;display:flex;justify-content:space-between;gap:10px;align-items:flex-start;background:#F8FAFC}
.finance-drawer-title{font-size:18px;font-weight:950;color:#111827}.finance-drawer-sub{font-size:12px;color:#64748B;font-weight:750;margin-top:4px}
.finance-drawer-close{border:0;background:#111827;color:#fff;border-radius:10px;padding:8px 11px;font-weight:950;cursor:pointer}
.finance-drawer-body{padding:12px;overflow:auto;flex:1;background:#F4F6FA}
.finance-cal-kpis{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}.finance-cal-kpi{border:1px solid #E5E7EB;background:#fff;border-radius:12px;padding:10px}.finance-cal-kpi span{display:block;font-size:10px;color:#64748B;font-weight:950;text-transform:uppercase}.finance-cal-kpi b{display:block;margin-top:6px;font-size:18px;color:#111827}
.finance-cal-row{border:1px solid #E5E7EB;background:#fff;border-radius:12px;padding:10px;margin-bottom:8px}.finance-cal-row-top{display:flex;justify-content:space-between;gap:8px}.finance-cal-row-title{font-size:13px;font-weight:950;color:#111827}.finance-cal-row-amount{font-family:var(--mono);font-size:12px;font-weight:950;color:#047857;white-space:nowrap}.finance-cal-row-meta{font-size:11px;color:#64748B;font-weight:750;margin-top:5px;line-height:1.35}.finance-cal-tag{display:inline-flex;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:950;margin-top:7px;background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE}.finance-cal-tag.overdue{background:#FEF2F2;color:#B91C1C;border-color:#FECACA}.finance-cal-tag.today{background:#ECFDF5;color:#047857;border-color:#A7F3D0}
@media(max-width:640px){.finance-cal-float{right:10px;bottom:74px;padding:12px 14px}.finance-cal-kpis{grid-template-columns:1fr}}
`;
if (!html.includes('.finance-cal-float')) {
  html = html.replace(cssMarker, cssBlock + '\n' + cssMarker);
  changed = true;
  console.log('finance drawer css applied');
}

// 5) Drawer HTML before bottom nav.
const drawerHtml = `
<button class="finance-cal-float" onclick="openFinanceCalendarDrawer()">💰 Finans Takvimi</button>
<div class="finance-drawer-backdrop" id="financeCalBackdrop" onclick="closeFinanceCalendarDrawer()"></div>
<aside class="finance-drawer" id="financeCalDrawer">
  <div class="finance-drawer-head">
    <div><div class="finance-drawer-title">Finans Takvimi</div><div class="finance-drawer-sub">Ödenecekler · Tahsil edilecekler · Yapılacaklar · Onay</div></div>
    <button class="finance-drawer-close" onclick="closeFinanceCalendarDrawer()">×</button>
  </div>
  <div class="finance-drawer-body" id="financeCalBody"><div style="font-size:12px;color:#64748B;font-weight:800">Yükleniyor...</div></div>
</aside>
`;
if (!html.includes('id="financeCalDrawer"')) {
  html = html.replace('<div class="bn">', drawerHtml + '\n<div class="bn">');
  changed = true;
  console.log('finance drawer html applied');
}

// 6) JS functions before </script>.
const jsMarker = `</script>`;
const jsBlock = `
function setSalesPeriodButton(period){
  const page=document.getElementById('pg-satis'); if(!page) return;
  const bar=page.querySelector('.fbar'); if(!bar) return;
  bar.querySelectorAll('.fb').forEach(b=>b.classList.remove('on'));
  const target=bar.querySelector('[data-period="'+period+'"]'); if(target) target.classList.add('on');
}
function moneyTR(n){return 'TL '+Math.round(Number(n||0)).toLocaleString('tr-TR');}
async function loadFinanceCalendarRows(){
  try{
    const {data,error}=await db.from('quick_control_center_view').select('*').eq('company','ALAYLI').in('period_status',['overdue','today','this_week']).order('item_date',{ascending:true}).limit(80);
    if(error) throw error;
    return data||[];
  }catch(e){
    return [
      {item_type:'payable',item_date:today(),title:'Bugün ödenecek örnek kayıt',remaining_amount:0,period_status:'today',status:'demo'},
      {item_type:'receivable',item_date:today(),title:'Bugün tahsil edilecek örnek kayıt',remaining_amount:0,period_status:'today',status:'demo'},
      {item_type:'task',item_date:today(),title:'Bugünkü yapılacak örnek görev',remaining_amount:0,period_status:'today',status:'demo'}
    ];
  }
}
async function openFinanceCalendarDrawer(){
  const d=document.getElementById('financeCalDrawer'), b=document.getElementById('financeCalBackdrop'), body=document.getElementById('financeCalBody');
  if(!d||!b||!body) return;
  b.classList.add('open'); d.classList.add('open');
  body.innerHTML='<div style="font-size:12px;color:#64748B;font-weight:800">Finans takvimi yükleniyor...</div>';
  const rows=await loadFinanceCalendarRows();
  const todayPay=rows.filter(r=>r.item_type==='payable'&&r.period_status==='today').reduce((a,r)=>a+(+r.remaining_amount||0),0);
  const todayRec=rows.filter(r=>r.item_type==='receivable'&&r.period_status==='today').reduce((a,r)=>a+(+r.remaining_amount||0),0);
  const overduePay=rows.filter(r=>r.item_type==='payable'&&r.period_status==='overdue').reduce((a,r)=>a+(+r.remaining_amount||0),0);
  const tasks=rows.filter(r=>r.item_type==='task'&&(r.period_status==='today'||r.period_status==='overdue')).length;
  const kpis=`<div class="finance-cal-kpis"><div class="finance-cal-kpi"><span>Bugün Ödenecek</span><b>${moneyTR(todayPay)}</b></div><div class="finance-cal-kpi"><span>Bugün Tahsil</span><b>${moneyTR(todayRec)}</b></div><div class="finance-cal-kpi"><span>Geciken Ödeme</span><b>${moneyTR(overduePay)}</b></div><div class="finance-cal-kpi"><span>Görev</span><b>${tasks}</b></div></div>`;
  const list=rows.length?rows.map(r=>`<div class="finance-cal-row"><div class="finance-cal-row-top"><div class="finance-cal-row-title">${escHtml(r.title||'-')}</div><div class="finance-cal-row-amount">${moneyTR(r.remaining_amount||0)}</div></div><div class="finance-cal-row-meta">${escHtml(r.item_date||'-')} · ${escHtml(r.item_type||'-')} · ${escHtml(r.status||'-')}</div><span class="finance-cal-tag ${r.period_status==='overdue'?'overdue':r.period_status==='today'?'today':''}">${escHtml(r.period_status||'-')}</span></div>`).join(''):'<div class="finance-cal-row"><div class="finance-cal-row-title">Kayıt yok</div><div class="finance-cal-row-meta">Bugün için ödenecek, tahsil edilecek veya yapılacak görünmüyor.</div></div>';
  body.innerHTML=kpis+list;
}
function closeFinanceCalendarDrawer(){document.getElementById('financeCalDrawer')?.classList.remove('open');document.getElementById('financeCalBackdrop')?.classList.remove('open');}
`;
if (!html.includes('function openFinanceCalendarDrawer()')) {
  const lastScript = html.lastIndexOf(jsMarker);
  if (lastScript === -1) throw new Error('No script closing tag found');
  html = html.slice(0,lastScript) + jsBlock + '\n' + html.slice(lastScript);
  changed = true;
  console.log('finance drawer js applied');
}

// 7) When entering Sales, switch to today first.
const oldGP = `if(id==='satis')rU();`;
const newGP = `if(id==='satis'){cM='today';setSalesPeriodButton('today');refresh().then(()=>rU());}`;
if (html.includes(oldGP) && !html.includes("setSalesPeriodButton('today');refresh().then(()=>rU())")) {
  html = html.replace(oldGP, newGP);
  changed = true;
  console.log('sales page default today applied');
}

if (changed) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('Patch complete. Backup:', backupPath);
} else {
  console.log('No changes needed.');
}
