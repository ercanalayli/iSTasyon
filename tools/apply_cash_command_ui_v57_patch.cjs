const fs = require('fs');
const path = require('path');

const indexPath = path.join(process.cwd(), 'index.html');

function fail(message) {
  console.error('❌ ' + message);
  process.exit(1);
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

if (!fs.existsSync(indexPath)) {
  fail('index.html bulunamadı. Bu script repo kökünden çalıştırılmalı.');
}

let html = fs.readFileSync(indexPath, 'utf8');

if (html.includes('APERION_CASH_COMMAND_CENTER_UI_V57')) {
  console.log('✅ v57 Nakit Komuta Merkezi UI zaten uygulanmış.');
  process.exit(0);
}

const css = `
/* APERION_CASH_COMMAND_CENTER_UI_V57 */
.cash57-hero{border:1px solid #D0D5DD;background:linear-gradient(135deg,#FFFFFF,#EFF6FF);border-radius:18px;padding:18px;margin-bottom:14px;box-shadow:0 18px 42px rgba(15,23,42,.06)}
.cash57-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.cash57-title{font-size:20px;font-weight:950;color:#101828;letter-spacing:-.02em}
.cash57-sub{font-size:12px;color:#667085;font-weight:750;line-height:1.45;margin-top:4px;max-width:760px}
.cash57-badge{display:inline-flex;align-items:center;border:1px solid #A7F3D0;background:#ECFDF5;color:#047857;border-radius:999px;padding:6px 10px;font-size:10px;font-weight:950;font-family:var(--mono)}
.cash57-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0 14px}
.cash57-tab{border:1px solid #D0D5DD;background:#FFFFFF;color:#344054;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:900;cursor:pointer}
.cash57-tab.on{background:#1D4ED8;border-color:#1D4ED8;color:#FFFFFF}
.cash57-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}
.cash57-card{border:1px solid #E4E7EC;background:#FFFFFF;border-radius:14px;padding:13px;box-shadow:0 10px 24px rgba(15,23,42,.045);min-height:96px}
.cash57-k{font-size:10px;color:#667085;font-weight:950;text-transform:uppercase;letter-spacing:.4px}
.cash57-v{font-family:var(--mono);font-size:22px;font-weight:950;color:#101828;margin-top:9px;line-height:1.1}
.cash57-v.good{color:#047857}.cash57-v.bad{color:#B91C1C}.cash57-v.warn{color:#B45309}.cash57-v.blue{color:#175CD3}
.cash57-n{font-size:11px;color:#667085;font-weight:750;margin-top:7px;line-height:1.35}
.cash57-two{display:grid;grid-template-columns:1.2fr .8fr;gap:12px}
.cash57-table-wrap{border:1px solid #E4E7EC;border-radius:14px;overflow:auto;background:#FFFFFF}
.cash57-table{width:100%;border-collapse:collapse;min-width:820px}
.cash57-table th{background:#F8FAFC;color:#667085;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.4px;text-align:left;padding:10px;border-bottom:1px solid #EAECF0}
.cash57-table td{padding:10px;border-bottom:1px solid #EAECF0;font-size:12px;color:#344054;font-weight:750;vertical-align:top}
.cash57-table tr:last-child td{border-bottom:0}
.cash57-empty{border:1px dashed #D0D5DD;background:#F8FAFC;color:#667085;border-radius:12px;padding:12px;font-size:12px;font-weight:750;line-height:1.45}
.cash57-status{display:inline-flex;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:950;border:1px solid #D0D5DD;background:#F8FAFC;color:#475467}
.cash57-status.ok{background:#ECFDF5;color:#047857;border-color:#A7F3D0}.cash57-status.wait{background:#FFFBEB;color:#B45309;border-color:#FDE68A}.cash57-status.bad{background:#FEF2F2;color:#B91C1C;border-color:#FECACA}
@media(max-width:1100px){.cash57-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cash57-two{grid-template-columns:1fr}}
@media(max-width:720px){.cash57-grid{grid-template-columns:1fr}.cash57-title{font-size:18px}}
/* /APERION_CASH_COMMAND_CENTER_UI_V57 */
`;

const page = `
    <!-- APERION_CASH_COMMAND_CENTER_UI_V57 -->
    <div id="pg-nakit" class="page">
      <div class="cash57-hero">
        <div class="cash57-head">
          <div>
            <div class="cash57-title">Nakit Komuta Merkezi</div>
            <div class="cash57-sub">ALAYLI Medikal için banka, kasa, Moka/POS bekleyenleri, gelecek tahsilatlar, ödenecekler, onay bekleyen hareketler ve nakit açığı. Veri yoksa uydurma hesap yapılmaz; eksik veri açıkça gösterilir.</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span class="cash57-badge">v57 · onaysız kesin kayıt yok</span>
            <button class="flow-btn" onclick="renderCashCommandCenter()">↻ Yenile</button>
          </div>
        </div>
        <div class="cash57-tabs" id="cash57Tabs"></div>
        <div id="cash57Kpis" class="cash57-grid"><div class="cash57-empty">Nakit Komuta Merkezi yükleniyor...</div></div>
      </div>
      <div class="cash57-two">
        <div class="card">
          <div class="card-hd"><div class="card-l">Dönemsel Nakit Planı</div><span class="cash57-status wait" id="cash57DataStatus">kontrol</span></div>
          <div id="cash57Forecast" class="cash57-table-wrap"><div class="cash57-empty">Veri bekleniyor...</div></div>
        </div>
        <div class="card">
          <div class="card-hd"><div class="card-l">Onay / Moka-POS Kontrol</div></div>
          <div id="cash57Side"><div class="cash57-empty">Kontrol verisi bekleniyor...</div></div>
        </div>
      </div>
    </div>
    <!-- /APERION_CASH_COMMAND_CENTER_UI_V57 -->
`;

const script = `
// APERION_CASH_COMMAND_CENTER_UI_V57
const CASH57_PERIODS=[
  {k:'today',label:'Bugün'},
  {k:'tomorrow',label:'Yarın'},
  {k:'this_week',label:'Bu Hafta'},
  {k:'this_month',label:'Bu Ay'},
  {k:'month_end',label:'Ay Sonuna Kadar'}
];
let cash57Period='today';
const cash57Num=v=>Number.isFinite(+v)?+v:0;
const cash57Money=v=>Number.isFinite(+v)?('TL '+Math.round(+v).toLocaleString('tr-TR')):'eksik veri';
function cash57Status(text,cls='wait'){return '<span class="cash57-status '+cls+'">'+escHtml(text||'-')+'</span>';}
function cash57Card(k,v,n,cls='blue'){
  return '<div class="cash57-card"><div class="cash57-k">'+escHtml(k)+'</div><div class="cash57-v '+cls+'">'+escHtml(v)+'</div><div class="cash57-n">'+escHtml(n||'')+'</div></div>';
}
function renderCash57Tabs(){
  const el=document.getElementById('cash57Tabs');if(!el)return;
  el.innerHTML=CASH57_PERIODS.map(p=>'<button class="cash57-tab '+(p.k===cash57Period?'on':'')+'" onclick="cash57Period=\''+p.k+'\';renderCashCommandCenter()">'+p.label+'</button>').join('');
}
async function cash57Fetch(table,query){
  try{
    const q=query?query(db.from(table)):db.from(table).select('*');
    const {data,error}=await q;
    if(error)return {rows:[],error:error.message};
    return {rows:data||[],error:null};
  }catch(e){return {rows:[],error:e.message||'eksik veri'};}
}
async function renderCashCommandCenter(){
  renderCash57Tabs();
  const kpis=document.getElementById('cash57Kpis'), forecastEl=document.getElementById('cash57Forecast'), side=document.getElementById('cash57Side'), st=document.getElementById('cash57DataStatus');
  if(!kpis||!forecastEl||!side)return;
  kpis.innerHTML='<div class="cash57-empty">Nakit verisi okunuyor...</div>';
  forecastEl.innerHTML='<div class="cash57-empty">Dönemsel plan okunuyor...</div>';
  side.innerHTML='<div class="cash57-empty">Onay ve Moka/POS kontrolleri okunuyor...</div>';
  const cash=await cash57Fetch('finance_cash_position_v57_view',q=>q.select('*').eq('company','alayli').limit(1));
  const forecast=await cash57Fetch('cash_forecast_v57_view',q=>q.select('*').eq('company','alayli'));
  const approvals=await cash57Fetch('cash_approval_waiting_v57_view',q=>q.select('*').eq('company','alayli').limit(8));
  const moka=await cash57Fetch('moka_pos_expected_v57_view',q=>q.select('*').eq('company','alayli').order('due_date',{ascending:true}).limit(8));
  const issues=[cash.error,forecast.error,approvals.error,moka.error].filter(Boolean);
  const cashRow=(cash.rows||[])[0]||{};
  const selected=(forecast.rows||[]).find(r=>r.period_key===cash57Period)||{};
  const available=cash57Num(cashRow.available_cash), mokaPending=cash57Num(cashRow.moka_pos_pending_balance), incoming=cash57Num(selected.incoming_amount), outgoing=cash57Num(selected.outgoing_amount), net=cash57Num(selected.net_cash_amount), after=cash57Num(selected.forecast_cash_after_period);
  kpis.innerHTML=[
    cash57Card('Eldeki Nakit',cash.rows.length?cash57Money(available):'eksik veri','Banka + kasa; Moka/POS dahil değildir','good'),
    cash57Card('Moka/POS Bekleyen',cash.rows.length?cash57Money(mokaPending):'eksik veri','Bankaya geçmemiş gelecek para','blue'),
    cash57Card((selected.period_label||'Seçili Dönem')+' Gelecek',forecast.rows.length?cash57Money(incoming):'eksik veri','Tahsilat + Moka/POS beklenen','good'),
    cash57Card((selected.period_label||'Seçili Dönem')+' Ödenecek',forecast.rows.length?cash57Money(outgoing):'eksik veri','Planlı çıkışlar ve ödemeler','bad'),
    cash57Card('Net Nakit',forecast.rows.length?cash57Money(net):'eksik veri','Gelecek - ödenecek',net>=0?'good':'bad'),
    cash57Card('Dönem Sonu Tahmini',forecast.rows.length?cash57Money(after):'eksik veri','Eldeki nakit + dönem neti',after>=0?'good':'bad'),
    cash57Card('Onay Bekleyen',approvals.error?'eksik veri':String((approvals.rows||[]).length),'Ham veri / öneri / kontrol kuyruğu','warn'),
    cash57Card('Veri Durumu',issues.length?'eksik veri':'ok',issues.length?issues.slice(0,2).join(' · '):'v57 view kaynakları okunuyor',issues.length?'warn':'good')
  ].join('');
  if(st){st.textContent=issues.length?'eksik veri':'ok';st.className='cash57-status '+(issues.length?'wait':'ok');}
  const fRows=forecast.rows||[];
  forecastEl.innerHTML=fRows.length?'<table class="cash57-table"><thead><tr><th>Dönem</th><th>Gelecek</th><th>Ödenecek</th><th>Net</th><th>Eldeki</th><th>Dönem Sonu</th></tr></thead><tbody>'+fRows.map(r=>'<tr><td><b>'+escHtml(r.period_label||r.period_key||'-')+'</b></td><td>'+cash57Money(r.incoming_amount)+'</td><td>'+cash57Money(r.outgoing_amount)+'</td><td>'+cash57Money(r.net_cash_amount)+'</td><td>'+cash57Money(r.available_cash)+'</td><td>'+cash57Money(r.forecast_cash_after_period)+'</td></tr>').join('')+'</tbody></table>':'<div class="cash57-empty">eksik veri: cash_forecast_v57_view kurulmamış veya kayıt yok.</div>';
  const apHtml=(approvals.rows||[]).length?'<div class="cash57-table-wrap"><table class="cash57-table" style="min-width:520px"><thead><tr><th>Başlık</th><th>Tutar</th><th>Durum</th></tr></thead><tbody>'+approvals.rows.map(r=>'<tr><td>'+escHtml(r.approval_title||r.source_type||'-')+'</td><td>'+cash57Money(r.suggested_amount)+'</td><td>'+cash57Status(r.status||'bekliyor','wait')+'</td></tr>').join('')+'</tbody></table></div>':'<div class="cash57-empty">Onay bekleyen kayıt yok veya approval view kurulmadı.</div>';
  const mokaHtml=(moka.rows||[]).length?'<div style="margin-top:10px" class="cash57-table-wrap"><table class="cash57-table" style="min-width:420px"><thead><tr><th>Moka/POS Vade</th><th>Beklenen</th><th>Taksit</th></tr></thead><tbody>'+moka.rows.map(r=>'<tr><td>'+escHtml((r.due_date||'-').toString().substring(0,10))+'</td><td>'+cash57Money(r.expected_remaining_amount)+'</td><td>'+escHtml(r.installment_count||0)+'</td></tr>').join('')+'</tbody></table></div>':'<div class="cash57-empty" style="margin-top:10px">Moka/POS beklenen taksit yok veya view kurulmadı.</div>';
  side.innerHTML=apHtml+mokaHtml+(issues.length?'<div class="cash57-empty" style="margin-top:10px">Eksik kurulum: '+escHtml([...new Set(issues)].join(', '))+'</div>':'');
}
// /APERION_CASH_COMMAND_CENTER_UI_V57
`;

if (!html.includes('/* APERION_CASH_COMMAND_CENTER_UI_V57 */')) {
  html = html.replace('</style>', `${css}\n</style>`);
}

if (!html.includes('id="pg-nakit"')) {
  html = html.replace('    <div id="pg-bildirim" class="page">', `${page}\n    <div id="pg-bildirim" class="page">`);
}

if (!html.includes("gP('nakit',this)")) {
  const navNeedle = `<div class="sb-item" onclick="gP('finans',this);setTimeout(()=>document.querySelector('.ft-tab[onclick*=banka]')?.click(),60)"><span class="sb-ico">BK</span><span><span class="sb-lbl">Banka Islem</span><span class="sb-sub">ekstre, onay, BizimHesap</span></span></div>`;
  const navInsert = `${navNeedle}\n      <div class="sb-item" onclick="gP('nakit',this);setTimeout(()=>renderCashCommandCenter(),80)"><span class="sb-ico">NK</span><span><span class="sb-lbl">Nakit Komuta</span><span class="sb-sub">banka, kasa, Moka/POS, vade</span></span></div>`;
  if (html.includes(navNeedle)) html = html.replace(navNeedle, navInsert);
  else console.warn('⚠️ Sidebar nav hedefi bulunamadı; sayfa eklendi ama menü linki eklenemedi.');
}

if (!html.includes("gP('nakit',this)"><span class="bn-ic">NK")) {
  const bottomNeedle = `<div class="bn-btn" onclick="gP('finans',this)"><span class="bn-ic">FN</span><span class="bn-lb">FINANS</span></div>`;
  const bottomInsert = `${bottomNeedle}\n    <div class="bn-btn" onclick="gP('nakit',this);setTimeout(()=>renderCashCommandCenter(),80)"><span class="bn-ic">NK</span><span class="bn-lb">NAKIT</span></div>`;
  if (html.includes(bottomNeedle)) html = html.replace(bottomNeedle, bottomInsert);
}

if (!html.includes('// APERION_CASH_COMMAND_CENTER_UI_V57')) {
  html = html.replace("window.addEventListener('load',async()=>{", `${script}\nwindow.addEventListener('load',async()=>{`);
}

if (!html.includes('setTimeout(()=>renderCashCommandCenter(),1600);')) {
  html = html.replace('setTimeout(()=>loadGorevler(),3000);', `setTimeout(()=>loadGorevler(),3000);\n  setTimeout(()=>renderCashCommandCenter(),1600);`);
}

write(indexPath, html);
console.log('✅ v57 Nakit Komuta Merkezi UI patch uygulandı.');
console.log('Kontrol: npm run verify:cash-command-ui-v57');
