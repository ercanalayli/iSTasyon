/* AperiON Mail Ekstre Onay Merkezi
   pending_bank_movements -> tek tuş onay -> approve_pending_bank_movement -> bizimhesap_queue
   Mevcut index.html bozulmadan eklenebilir modül.
*/
(function(){
  function tl(n){return Number(n||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' TL'}
  function esc(v){return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  async function db(){
    if(!window.db) throw new Error('Supabase db bulunamadı');
    return window.db;
  }
  async function loadRows(){
    const s=await db();
    const res=await s.from('pending_bank_movements').select('*').eq('company_id','alayli').in('status',['pending','needs_review']).order('transaction_date',{ascending:false}).limit(200);
    if(res.error) throw res.error;
    return res.data||[];
  }
  async function approve(id){
    const note=prompt('Onay notu yazılabilir:','Tek tuş onay')||'Tek tuş onay';
    const s=await db();
    const res=await s.rpc('approve_pending_bank_movement',{p_id:id,p_note:note});
    if(res.error) throw res.error;
    alert('Onaylandı ve BizimHesap kuyruğuna alındı.');
    await render();
  }
  async function reject(id){
    const note=prompt('Ret sebebi:','Kullanıcı reddetti')||'Kullanıcı reddetti';
    const s=await db();
    const res=await s.rpc('reject_pending_bank_movement',{p_id:id,p_note:note});
    if(res.error) throw res.error;
    alert('Reddedildi. Kayıt silinmedi.');
    await render();
  }
  function rowHtml(r){
    const giris=Number(r.amount_in||0), cikis=Number(r.amount_out||0);
    return '<tr>'+[
      '<td>'+esc(r.transaction_date||'')+'<br><small>'+esc(r.transaction_time||'')+'</small></td>',
      '<td><b>'+esc(r.bank_name||'')+'</b><br><small>'+esc(r.mail_subject||'')+'</small></td>',
      '<td>'+esc(r.description||'')+'<br><small>'+esc(r.duplicate_key||'')+'</small></td>',
      '<td style="text-align:right;color:#166534;font-weight:800">'+(giris?tl(giris):'')+'</td>',
      '<td style="text-align:right;color:#991B1B;font-weight:800">'+(cikis?tl(cikis):'')+'</td>',
      '<td>'+esc(r.detected_type||'')+'<br><small>'+esc(r.suggested_counterparty||'')+'</small></td>',
      '<td>'+esc(r.confidence_score||'')+'</td>',
      '<td><button data-act="approve" data-id="'+esc(r.id)+'">Onayla</button> <button data-act="reject" data-id="'+esc(r.id)+'">Reddet</button></td>'
    ].join('')+'</tr>'
  }
  function ensureBox(){
    let box=document.getElementById('aperionMailApprovalCenter');
    if(box)return box;
    box=document.createElement('div');
    box.id='aperionMailApprovalCenter';
    box.innerHTML='<div class="amc-card"><h2>Mail Ekstre Onay Merkezi</h2><p>Banka ekstrelerinden gelen pending kayıtlar. Onayla butonu kaydı BizimHesap kuyruğuna alır.</p><div id="amcStats"></div><div id="amcRows">Yükleniyor...</div></div>';
    const target=document.getElementById('fbanka')||document.body;
    target.appendChild(box);
    const st=document.createElement('style');
    st.textContent='.amc-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:16px;margin:14px 0;box-shadow:0 10px 24px rgba(15,23,42,.06);font-family:Inter,Arial,sans-serif}.amc-card h2{margin:0 0 6px}.amc-card p{color:#64748b;font-size:12px}.amc-card table{width:100%;border-collapse:collapse;font-size:12px}.amc-card th,.amc-card td{border-bottom:1px solid #e5e7eb;padding:8px;vertical-align:top}.amc-card th{text-align:left;color:#475569}.amc-card button{border:0;border-radius:8px;background:#2563eb;color:#fff;padding:7px 10px;font-weight:800;cursor:pointer;margin:2px}.amc-card button[data-act=reject]{background:#991b1b}#amcStats{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}#amcStats span{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;font-weight:800}';
    document.head.appendChild(st);
    box.addEventListener('click',function(e){
      const b=e.target.closest('button[data-act]'); if(!b)return;
      const id=b.getAttribute('data-id');
      if(b.getAttribute('data-act')==='approve') approve(id).catch(err=>alert(err.message||err));
      if(b.getAttribute('data-act')==='reject') reject(id).catch(err=>alert(err.message||err));
    });
    return box;
  }
  async function render(){
    const box=ensureBox();
    const rowsEl=box.querySelector('#amcRows');
    const statsEl=box.querySelector('#amcStats');
    try{
      const rows=await loadRows();
      const totalIn=rows.reduce((a,r)=>a+Number(r.amount_in||0),0);
      const totalOut=rows.reduce((a,r)=>a+Number(r.amount_out||0),0);
      statsEl.innerHTML='<span>Bekleyen: '+rows.length+'</span><span>Giriş: '+tl(totalIn)+'</span><span>Çıkış: '+tl(totalOut)+'</span><span>Net: '+tl(totalIn-totalOut)+'</span>';
      if(!rows.length){rowsEl.innerHTML='Bekleyen mail ekstresi hareketi yok.';return;}
      rowsEl.innerHTML='<table><thead><tr><th>Tarih</th><th>Banka/Mail</th><th>Açıklama</th><th>Giriş</th><th>Çıkış</th><th>Tip/Cari</th><th>Güven</th><th>İşlem</th></tr></thead><tbody>'+rows.map(rowHtml).join('')+'</tbody></table>';
    }catch(err){rowsEl.innerHTML='Onay merkezi yüklenemedi: '+esc(err.message||err);}
  }
  window.AperiONMailApprovalCenter={render:render,approve:approve,reject:reject};
  document.addEventListener('DOMContentLoaded',function(){setTimeout(render,900)});
})();
