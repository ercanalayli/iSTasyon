const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const backupPath = path.join(root, 'index.backup-before-dashboard-risk-center-v49.html');

let html = fs.readFileSync(indexPath, 'utf8');
if (!fs.existsSync(backupPath)) fs.writeFileSync(backupPath, html, 'utf8');
let changed = false;

function addBefore(marker, block, label){
  if(html.includes(block.trim().slice(0, 70))){ console.log('SKIP already exists: '+label); return; }
  const idx = html.lastIndexOf(marker);
  if(idx === -1) throw new Error('Marker not found: '+marker);
  html = html.slice(0, idx) + block + '\n' + html.slice(idx);
  changed = true;
  console.log('OK '+label);
}

function replaceOnce(search, replace, label){
  if(html.includes(replace)){ console.log('SKIP already applied: '+label); return; }
  if(!html.includes(search)){ console.log('SKIP target not found: '+label); return; }
  html = html.replace(search, replace);
  changed = true;
  console.log('OK '+label);
}

const css = `
.risk-center{border:1px solid #E5E7EB;background:#fff;border-radius:16px;padding:14px;margin:12px 0;box-shadow:0 8px 22px rgba(15,23,42,.04)}
.risk-center-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.risk-center-title{font-size:15px;font-weight:950;color:#111827}.risk-center-sub{font-size:11px;color:#64748B;font-weight:800;margin-top:3px}
.risk-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.risk-kpi{border:1px solid #E5E7EB;background:#F8FAFC;border-radius:12px;padding:10px}.risk-kpi span{display:block;font-size:10px;color:#64748B;font-weight:950;text-transform:uppercase}.risk-kpi b{display:block;margin-top:5px;font-size:19px;color:#111827}.risk-kpi.critical b{color:#DC2626}.risk-kpi.high b{color:#D97706}.risk-kpi.warning b{color:#CA8A04}.risk-kpi.amount b{color:#2563EB}
.risk-list{margin-top:10px;display:grid;gap:7px}.risk-item{border:1px solid #E5E7EB;background:#F8FAFC;border-radius:11px;padding:9px}.risk-item-top{display:flex;justify-content:space-between;gap:8px}.risk-item-title{font-size:12px;font-weight:950;color:#111827}.risk-item-amount{font-family:var(--mono);font-size:12px;font-weight:950;color:#2563EB;white-space:nowrap}.risk-item-msg{font-size:11px;color:#64748B;font-weight:750;margin-top:5px;line-height:1.35}.risk-badge{display:inline-flex;border-radius:999px;padding:3px 7px;font-size:10px;font-weight:950;margin-top:7px}.risk-badge.critical{background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA}.risk-badge.high{background:#FFFBEB;color:#B45309;border:1px solid #FDE68A}.risk-badge.warning{background:#FEFCE8;color:#A16207;border:1px solid #FEF08A}
@media(max-width:700px){.risk-grid{grid-template-columns:1fr 1fr}}
`;
if(!html.includes('.risk-center')){
  html = html.replace('</style>', css + '\n</style>');
  changed = true;
  console.log('OK risk center css');
}

const riskJs = `
function riskLevelTR(level){return {critical:'Kritik',high:'Yüksek',warning:'Uyarı',ok:'Normal'}[level]||level||'-';}
function riskIcon(level){return {critical:'🚨',high:'🟠',warning:'🟡',ok:'🟢'}[level]||'•';}
async function loadRiskCenter(){
  try{
    const [sumRes, feedRes]=await Promise.all([
      db.from('aperion_risk_summary_v49_view').select('*').eq('company','ALAYLI').limit(1),
      db.from('aperion_risk_feed_v49_view').select('*').eq('company','ALAYLI').limit(12)
    ]);
    if(sumRes.error) throw sumRes.error;
    if(feedRes.error) throw feedRes.error;
    const s=(sumRes.data||[])[0]||{};
    const rows=feedRes.data||[];
    return {summary:s, rows};
  }catch(e){
    console.warn('Risk center fallback', e);
    return {summary:{total_risk_count:0,critical_count:0,high_count:0,warning_count:0,financial_risk_amount:0},rows:[]};
  }
}
function renderRiskCenter(targetId,data){
  const el=document.getElementById(targetId); if(!el)return;
  const s=data.summary||{}; const rows=data.rows||[];
  const list=rows.length?`<div class="risk-list">${rows.slice(0,6).map(r=>`<div class="risk-item"><div class="risk-item-top"><div class="risk-item-title">${riskIcon(r.risk_level)} ${escHtml(r.title||'-')}</div><div class="risk-item-amount">${moneyTR(r.amount||0)}</div></div><div class="risk-item-msg">${escHtml(r.message||'-')}${r.ref_name?'<br>Ref: '+escHtml(r.ref_name):''}</div><span class="risk-badge ${r.risk_level||'warning'}">${riskLevelTR(r.risk_level)}</span></div>`).join('')}</div>`:`<div class="risk-list"><div class="risk-item"><div class="risk-item-title">🟢 Risk görünmüyor</div><div class="risk-item-msg">Kritik/yüksek/uyarı seviyesinde alarm yok.</div></div></div>`;
  el.innerHTML=`<div class="risk-center-head"><div><div class="risk-center-title">Risk Merkezi</div><div class="risk-center-sub">Nakit, gecikme ve fiyat riskleri</div></div><button class="finance-cal-action info" onclick="openFinanceCalendarDrawer()">Finans Takvimi</button></div><div class="risk-grid"><div class="risk-kpi critical"><span>Kritik</span><b>${s.critical_count||0}</b></div><div class="risk-kpi high"><span>Yüksek</span><b>${s.high_count||0}</b></div><div class="risk-kpi warning"><span>Uyarı</span><b>${s.warning_count||0}</b></div><div class="risk-kpi amount"><span>Risk Tutarı</span><b>${moneyTR(s.financial_risk_amount||0)}</b></div></div>${list}`;
}
async function refreshRiskCenters(){const data=await loadRiskCenter();renderRiskCenter('dashboardRiskCenter',data);renderRiskCenter('financeDrawerRiskCenter',data);}
`;
if(!html.includes('function refreshRiskCenters()')) addBefore('</script>', riskJs, 'risk center js');

// Add risk block inside finance drawer body after KPI generation if target exists.
replaceOnce(
  "body.innerHTML=kpis+list;",
  "body.innerHTML='<div id=\"financeDrawerRiskCenter\" class=\"risk-center\"></div>'+kpis+list; await refreshRiskCenters();",
  'finance drawer risk center render'
);

// Add dashboard floating risk center near a likely main dashboard container.
// We avoid destructive insertion: if a known page marker exists, place just after body app start area.
if(!html.includes('id="dashboardRiskCenter"')){
  const marker = '<div class="main">';
  if(html.includes(marker)){
    html = html.replace(marker, marker + '\n<div id="dashboardRiskCenter" class="risk-center"></div>');
    changed = true;
    console.log('OK dashboard risk center after main marker');
  } else if(html.includes('<body>')){
    html = html.replace('<body>', '<body>\n<div id="dashboardRiskCenter" class="risk-center" style="max-width:1480px;margin:10px auto"></div>');
    changed = true;
    console.log('OK dashboard risk center after body');
  } else {
    console.log('SKIP dashboard risk center marker not found');
  }
}

// Trigger risk refresh after DOM/runtime starts. If there is an existing init hook, this harmless timeout will run.
if(!html.includes('setTimeout(refreshRiskCenters,900)')){
  addBefore('</script>', "\nsetTimeout(refreshRiskCenters,900);\n", 'risk center startup refresh');
}

if(changed){
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('RESULT: OK - Dashboard Risk Center v49 patch applied. Backup: '+backupPath);
}else{
  console.log('RESULT: NO CHANGE - patch may already be applied.');
}
