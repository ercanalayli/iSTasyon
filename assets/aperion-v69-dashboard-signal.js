/* AperiON v69 Dashboard Signal
   Purpose: show Gmail Yapı Kredi bank statement pending approval signal on main dashboard.
   Additive: v68 approval logic remains untouched.
*/
(function(){
  function txt(v){return String(v == null ? '' : v);}
  function lower(v){return txt(v).toLocaleLowerCase('tr-TR');}
  function isPending(row){
    var s = lower(row.status || row.durum || row.onay_durumu || row.approval_status || '');
    return !s || s.indexOf('bekliyor') >= 0 || s.indexOf('pending') >= 0 || s.indexOf('onay') >= 0 || s.indexOf('needs_review') >= 0 || s.indexOf('inceleme') >= 0;
  }
  async function readRowsFromDb(){
    if(!window.db) return [];
    var tables = ['pending_bank_movements','bank_transactions'];
    for(var i=0;i<tables.length;i++){
      try{
        var table = tables[i];
        var q = window.db.from(table).select('*').limit(500);
        if(table === 'bank_transactions' && window.PILOT_FIRMA) q = q.eq('firma_id', window.PILOT_FIRMA);
        var res = await q;
        if(!res.error && Array.isArray(res.data) && res.data.length) return res.data.filter(isPending);
      }catch(e){}
    }
    return [];
  }
  async function readRowsFromSeed(){
    try{
      var res = await fetch('data/pending-bank-movements-yapikredi-20260601.json?v=69',{cache:'no-store'});
      if(!res.ok) return [];
      var payload = await res.json();
      return Array.isArray(payload.rows) ? payload.rows.filter(isPending) : [];
    }catch(e){return [];}
  }
  async function readRows(){
    var dbRows = await readRowsFromDb();
    if(dbRows.length) return dbRows;
    return await readRowsFromSeed();
  }
  function ensureBox(){
    var old = document.getElementById('mailStatementSignal');
    if(old) return old;
    var grid = document.getElementById('reportHubGrid') || document.querySelector('.report-grid') || document.querySelector('.kpi-row') || document.querySelector('.content');
    if(!grid || !grid.parentNode) return null;
    var box = document.createElement('div');
    box.id = 'mailStatementSignal';
    box.style.display = 'none';
    box.className = 'mail-signal-card';
    box.innerHTML = '<div class="mail-signal-icon">🔔</div><div class="mail-signal-body"><div class="mail-signal-title">Mailden Banka Ekstresi Geldi</div><div class="mail-signal-text" id="mailStatementSignalText">Banka hareketleri onay bekliyor.</div><div class="mail-signal-meta" id="mailStatementSignalMeta">Kaynak: Gmail / Yapı Kredi</div></div><button class="mail-signal-btn" type="button">Onay Merkezi’ne Git</button>';
    grid.parentNode.insertBefore(box, grid.nextSibling);
    var btn = box.querySelector('button');
    if(btn) btn.addEventListener('click', goBankApproval);
    return box;
  }
  function ensureStyle(){
    if(document.getElementById('mailStatementSignalStyle')) return;
    var st = document.createElement('style');
    st.id = 'mailStatementSignalStyle';
    st.textContent = '.mail-signal-card{display:flex;align-items:center;gap:14px;margin:14px 0;padding:16px 18px;border-radius:14px;border:1px solid rgba(217,119,6,.24);background:linear-gradient(135deg,rgba(251,191,36,.16),rgba(255,255,255,.96));box-shadow:0 14px 32px rgba(146,64,14,.08)}.mail-signal-icon{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(217,119,6,.14);font-size:20px;flex-shrink:0}.mail-signal-body{flex:1;min-width:0}.mail-signal-title{font-size:14px;font-weight:900;color:#92400E}.mail-signal-text{font-size:13px;font-weight:800;color:#111827;margin-top:4px}.mail-signal-meta{font-size:11px;font-weight:700;color:#64748B;margin-top:4px}.mail-signal-btn{border:none;border-radius:10px;background:#D97706;color:#fff;font-size:12px;font-weight:900;padding:10px 14px;cursor:pointer;white-space:nowrap;box-shadow:0 8px 18px rgba(217,119,6,.18)}@media(max-width:760px){.mail-signal-card{align-items:flex-start;flex-direction:column}.mail-signal-btn{width:100%}}';
    document.head.appendChild(st);
  }
  function goBankApproval(){
    if(typeof window.gP === 'function') window.gP('finans', null);
    setTimeout(function(){
      var tabs = Array.prototype.slice.call(document.querySelectorAll('.ft-tab'));
      var tab = tabs.find(function(x){return lower(x.textContent).indexOf('banka') >= 0;});
      if(tab) tab.click();
      var panel = document.getElementById('fbanka') || document.querySelector('[id*=banka]');
      if(panel) panel.scrollIntoView({behavior:'smooth', block:'start'});
      if(!panel && location.hash !== '#finans') location.hash='finans';
    },100);
  }
  async function render(){
    ensureStyle();
    var box = ensureBox();
    if(!box) return;
    var rows = await readRows();
    if(!rows.length){box.style.display='none';return;}
    var first = rows.slice().sort(function(a,b){return txt(b.mail_date || b.created_at || b.tarih || b.transaction_date).localeCompare(txt(a.mail_date || a.created_at || a.tarih || a.transaction_date));})[0] || {};
    var bank = first.bank_name || first.banka || 'Yapı Kredi';
    var source = first.source || first.kaynak || 'Gmail';
    var date = txt(first.mail_date || first.created_at || first.tarih || first.transaction_date).substring(0,16) || '-';
    var text = document.getElementById('mailStatementSignalText');
    var meta = document.getElementById('mailStatementSignalMeta');
    if(text) text.textContent = bank + ' ekstresinden ' + rows.length + ' hareket onay bekliyor.';
    if(meta) meta.textContent = 'Kaynak: ' + source + ' / ' + bank + ' · Son kayıt: ' + date;
    box.style.display='flex';
  }
  window.renderDashboardApprovalSignal = render;
  window.goToBankApprovalCenter = goBankApproval;
  document.addEventListener('DOMContentLoaded', function(){setTimeout(render,600);});
  setInterval(render, 60000);
})();
