(function(){
  var NO='1605260707';
  function m(n){return(+n||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}
  function vat(p){return String(p[1]||'').toLocaleLowerCase('tr-TR').indexOf('çinko')>=0?1.20:1.10}
  function prods(){var d=window.HASTA_BEZI_DATA||{},u=window.HASTA_BEZI_GORUKLE_ILAVE||{};var a=(d.products||[]).slice();if(u.products&&u.replaceProductsFor)a=a.filter(function(p){return p[0]!==u.replaceProductsFor}).concat(u.products);return a}
  function find(n){n=String(n||'').trim().toLocaleLowerCase('tr-TR');return prods().find(function(p){return String(p[1]||'').trim().toLocaleLowerCase('tr-TR')===n})}
  function td(v){var x=document.createElement('td');x.textContent=m(v);x.style.cssText='font-weight:900;font-size:14px;background:#fff3b0;color:#06142a;border:1px solid #d6b900';return x}
  function patch(){var s=document.getElementById('stamp');if(s)s.textContent='Güncelleme No: '+NO;document.querySelectorAll('table').forEach(function(t){var th=Array.from(t.querySelectorAll('thead th'));var l=th.map(function(x){return x.textContent.trim()});var u=l.indexOf('Ürün'),i=l.indexOf('İskonto'),sh=l.indexOf('Satış Hrç');if(u<0||i<0||sh<0||l.indexOf('İsk.Dhl')>=0)return;var h=document.createElement('th');h.textContent='İsk.Dhl';h.style.cssText='font-weight:900;background:#fff3b0;color:#06142a';th[i].after(h);Array.from(t.querySelectorAll('tbody tr')).forEach(function(r){var c=Array.from(r.children),p=find(c[u]&&c[u].textContent);if(!p)return;c[i].after(td(((+p[10]||0)/(+p[2]||1))*vat(p)))})})}
  setTimeout(patch,0);setTimeout(patch,300);setTimeout(patch,1000);setTimeout(patch,2000);
})();
