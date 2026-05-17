const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const backupPath = path.join(root, 'index.backup-before-finance-calendar-ui-actions-v48.html');

let html = fs.readFileSync(indexPath, 'utf8');
if (!fs.existsSync(backupPath)) fs.writeFileSync(backupPath, html, 'utf8');

let changed = false;
function addBefore(marker, block, label){
  if(html.includes(block.trim().slice(0, 60))){ console.log('SKIP already exists: ' + label); return; }
  const idx = html.lastIndexOf(marker);
  if(idx === -1) throw new Error('Marker not found: ' + marker);
  html = html.slice(0, idx) + block + '\n' + html.slice(idx);
  changed = true;
  console.log('OK ' + label);
}
function replaceOnce(search, replace, label){
  if(html.includes(replace)){ console.log('SKIP already applied: ' + label); return; }
  if(!html.includes(search)){ console.log('SKIP target not found: ' + label); return; }
  html = html.replace(search, replace);
  changed = true;
  console.log('OK ' + label);
}

const cssBlock = `
.finance-cal-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
.finance-cal-action{border:1px solid #CBD5E1;background:#fff;color:#334155;border-radius:9px;padding:6px 8px;font-size:10px;font-weight:950;cursor:pointer}
.finance-cal-action.ok{background:#ECFDF5;color:#047857;border-color:#A7F3D0}
.finance-cal-action.warn{background:#FFFBEB;color:#B45309;border-color:#FDE68A}
.finance-cal-action.danger{background:#FEF2F2;color:#B91C1C;border-color:#FECACA}
.finance-cal-action.info{background:#EFF6FF;color:#1D4ED8;border-color:#BFDBFE}
.finance-cal-toast{position:fixed;right:16px;bottom:86px;z-index:9200;background:#111827;color:#fff;border-radius:12px;padding:11px 13px;font-size:12px;font-weight:900;box-shadow:0 18px 40px rgba(15,23,42,.28);display:none;max-width:360px}
.finance-cal-toast.open{display:block}
`;
if(!html.includes('.finance-cal-actions')){
  html = html.replace('</style>', cssBlock + '\n</style>');
  changed = true;
  console.log('OK css actions v48');
}

const toastHtml = `<div class="finance-cal-toast" id="financeCalToast"></div>`;
if(!html.includes('id="financeCalToast"')){
  html = html.replace('<div class="bn">', toastHtml + '\n<div class="bn">');
  changed = true;
  console.log('OK toast html v48');
}

const actionJs = `
function financeCalToast(msg){
  const t=document.getElementById('financeCalToast');
  if(!t){alert(msg);return;}
  t.textContent=msg;t.classList.add('open');
  setTimeout(()=>t.classList.remove('open'),2600);
}
async function financeCalRpc(fnName,payload){
  const {data,error}=await db.rpc(fnName,payload);
  if(error) throw error;
  return data;
}
function financeCalActionButtons(r){
  const id=r.id;
  if(!id)return '';
  if(r.direction==='out')return `<div class="finance-cal-actions"><button class="finance-cal-action ok" onclick="financeCalDo('paid',${id})">Ödendi</button><button class="finance-cal-action warn" onclick="financeCalDo('postpone',${id})">Yarına Ertele</button><button class="finance-cal-action info" onclick="financeCalDo('detail',${id})">Detay</button></div>`;
  if(r.direction==='in')return `<div class="finance-cal-actions"><button class="finance-cal-action ok" onclick="financeCalDo('collected',${id})">Tahsil Edildi</button><button class="finance-cal-action warn" onclick="financeCalDo('postpone',${id})">Yarına Ertele</button><button class="finance-cal-action info" onclick="financeCalDo('detail',${id})">Detay</button></div>`;
  if(r.item_type==='approval')return `<div class="finance-cal-actions"><button class="finance-cal-action ok" onclick="financeCalDo('approve',${id})">Onayla</button><button class="finance-cal-action danger" onclick="financeCalDo('reject',${id})">Reddet</button><button class="finance-cal-action info" onclick="financeCalDo('detail',${id})">Detay</button></div>`;
  return `<div class="finance-cal-actions"><button class="finance-cal-action ok" onclick="financeCalDo('done',${id})">Tamamlandı</button><button class="finance-cal-action warn" onclick="financeCalDo('postpone',${id})">Yarına Ertele</button><button class="finance-cal-action info" onclick="financeCalDo('detail',${id})">Detay</button></div>`;
}
function financeTomorrowISO(){const d=new Date();d.setDate(d.getDate()+1);return d.toISOString().slice(0,10);}
async function financeCalDo(action,id){
  try{
    if(action==='detail'){
      const {data,error}=await db.from('finance_calendar_drawer_view').select('*').eq('id',id).limit(1);
      if(error)throw error;
      const r=(data||[])[0];
      if(!r)return financeCalToast('Kayıt bulunamadı');
      return financeCalToast(`${r.title||'-'} · ${moneyTR(r.remaining_amount||r.expected_amount||0)} · ${r.calendar_date||r.item_date||'-'}`);
    }
    let fn,payload;
    if(action==='paid'){fn='finance_calendar_mark_paid';payload={p_item_id:id,p_amount:null,p_actor:'web',p_note:'Web Finans Takvimi butonu'};}
    else if(action==='collected'){fn='finance_calendar_mark_collected';payload={p_item_id:id,p_amount:null,p_actor:'web',p_note:'Web Finans Takvimi butonu'};}
    else if(action==='done'){fn='finance_calendar_mark_done';payload={p_item_id:id,p_actor:'web',p_note:'Web Finans Takvimi butonu'};}
    else if(action==='approve'){fn='finance_calendar_approve';payload={p_item_id:id,p_actor:'web',p_note:'Web Finans Takvimi butonu'};}
    else if(action==='reject'){fn='finance_calendar_reject';payload={p_item_id:id,p_actor:'web',p_note:'Web Finans Takvimi butonu'};}
    else if(action==='postpone'){fn='finance_calendar_postpone';payload={p_item_id:id,p_new_date:financeTomorrowISO(),p_actor:'web',p_note:'Web Finans Takvimi: yarına ertele'};}
    else return financeCalToast('Bilinmeyen işlem');
    const res=await financeCalRpc(fn,payload);
    if(res && res.ok===false) return financeCalToast('İşlem yapılamadı: '+(res.error||'hata'));
    financeCalToast('İşlem tamamlandı');
    await openFinanceCalendarDrawer();
  }catch(e){console.error(e);financeCalToast('Hata: '+(e.message||e));}
}
`;
if(!html.includes('function financeCalDo(action,id)')) addBefore('</script>', actionJs, 'finance ui action js v48');

replaceOnce(
  "<span class=\"finance-cal-tag ${r.period_status==='overdue'?'overdue':r.period_status==='today'?'today':''}\">${escHtml(r.period_status||'-')}</span></div>`).join(''):'<div class=\"finance-cal-row\"><div class=\"finance-cal-row-title\">Kayıt yok</div><div class=\"finance-cal-row-meta\">Bugün için ödenecek, tahsil edilecek veya yapılacak görünmüyor.</div></div>';",
  "<span class=\"finance-cal-tag ${r.period_status==='overdue'?'overdue':r.period_status==='today'?'today':''}\">${escHtml(r.period_status||'-')}</span>${financeCalActionButtons(r)}</div>`).join(''):'<div class=\"finance-cal-row\"><div class=\"finance-cal-row-title\">Kayıt yok</div><div class=\"finance-cal-row-meta\">Bugün için ödenecek, tahsil edilecek veya yapılacak görünmüyor.</div></div>';",
  'drawer row action buttons v48'
);

if(changed){
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('RESULT: OK - finance calendar UI actions v48 patch applied. Backup: '+backupPath);
}else{
  console.log('RESULT: NO CHANGE - patch already applied or target not found.');
}
