(function(){
  function norm(x){return String(x||'').toLocaleUpperCase('tr-TR').replace(/\s+/g,' ').trim()}
  function key(x){var s=norm(x);if(s.includes('FEYZA'))return'FEYZA';if(s.includes('GÖRÜKLE'))return'GÖRÜKLE';if(s.includes('ZEYBEK'))return'ZEYBEK';if(s.includes('SERCAN'))return'SERCAN';if(s.includes('SETON'))return'SETON';return s.split(' ')[0]}
  function dateVal(s){var m=String(s||'').match(/(\d{2})\.(\d{2})\.(\d{4})/);return m?new Date(+m[3],+m[2]-1,+m[1]).getTime():0}
  function allOrders(){var d=window.HASTA_BEZI_DATA||{},g=window.HASTA_BEZI_GORUKLE_ILAVE||{};var a=(d.orders||[]).slice();if(g.replaceOrderName&&g.order)a=a.filter(function(o){return o[0]!==g.replaceOrderName}).concat([g.order]);return a}
  function latestShipment(cari){var k=key(cari);var rows=allOrders().filter(function(o){return key(o[0])===k&&dateVal(o[3])>0}).sort(function(a,b){return dateVal(b[3])-dateVal(a[3])});return rows[0]||null}
  function apply(){
    document.querySelectorAll('.classic-info').forEach(function(box){
      if(box.querySelector('.last-shipment-box'))return;
      var cari='';
      box.querySelectorAll('.box').forEach(function(b){var s=b.querySelector('small'),v=b.querySelector('b');if(s&&v&&s.textContent.trim()==='Cari')cari=v.textContent.trim()});
      if(!cari)return;
      var o=latestShipment(cari);
      var html=o?'<div class="last-shipment-box" style="margin-top:12px;background:#e8fff1;border:1px solid #77c99a;border-radius:10px;padding:10px;color:#064b2d"><b>Son Sevkiyat — 100/100 Doğrulanmış</b><div style="margin-top:6px">Sevk Tarihi: <b>'+o[3]+'</b> | Fatura: <b>'+(o[2]||'—')+'</b> | Satış KDV Hariç: <b>'+(+o[7]||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' TL</b></div></div>':'<div class="last-shipment-box" style="margin-top:12px;background:#fff2bf;border:1px solid #d6b900;border-radius:10px;padding:10px;color:#806000"><b>Son Sevkiyat</b><div style="margin-top:6px">VERİ EKSİK — 100/100 doğrulanmış sevk tarihi bulunan geçmiş kayıt yok. Rakam veya tarih gösterilmedi.</div></div>';
      box.insertAdjacentHTML('beforeend',html);
    });
  }
  [0,300,800,1500,3000,5000].forEach(function(t){setTimeout(apply,t)});
  window.ALALYLI_LAST_SHIPMENT=apply;
})();