(function(){
  var NO='1714260707';
  var rows=[
    ['IST2026000000410','30.06.2026','Jender bel bantlı Small',40,453.11,403.27,11.00],
    ['IST2026000000411','30.06.2026','Coverdry serme 60x90',60,172.81,141.90,17.89],
    ['IST2026000000411','30.06.2026','Jender 90x180 serme',30,286.59,264.81,7.60],
    ['IST2026000000411','30.06.2026','Lorina mesane pedi',12,434.81,347.85,20.00],
    ['IST2026000000411','30.06.2026','Lorina çinko krem',12,436.97,388.90,11.00],
    ['IST2026000000406','30.06.2026','Lorina mesane pedi',522,434.81,347.85,20.00],
    ['IST2026000000406','30.06.2026','Lorina Allnight bel Large',40,957.74,861.97,10.00],
    ['IST2026000000406','30.06.2026','Lorina Allnight bel XL-XXL',40,1008.53,907.68,10.00],
    ['IST2026000000406','30.06.2026','Lorina çinko krem',180,436.97,388.90,11.00],
    ['IST2026000000406','30.06.2026','Jender bel bantlı Small',80,453.11,403.27,11.00]
  ];
  function m(n){return(+n||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}
  function norm(x){return String(x||'').toLocaleLowerCase('tr-TR').replace(/ı/g,'i')}
  function matchDisc(name){var n=norm(name);if(n.includes('coverdry')&&n.includes('serme'))return 17.89;if(n.includes('jender')&&n.includes('90x180'))return 7.60;if(n.includes('jender')&&(n.includes('small')||n.includes('/ s')||n.includes(' s')))return 11.00;if(n.includes('mesane'))return 20.00;if(n.includes('çinko')||n.includes('cinko'))return 11.00;if(n.includes('allnight')&&n.includes('large'))return 10.00;if(n.includes('allnight')&&n.includes('xl'))return 10.00;return null}
  function yellow(v,suf){return '<b style="display:block;background:#fff3b0;border:1px solid #d6b900;padding:4px 7px;border-radius:6px;font-size:14px">'+v+(suf||'')+'</b>'}
  function patchCols(){document.querySelectorAll('table').forEach(function(t){var th=Array.from(t.querySelectorAll('thead th')),lab=th.map(function(x){return x.textContent.trim()});var u=lab.indexOf('Ürün'),l=lab.indexOf('Liste');if(u<0||l<0)return;var old=lab.indexOf('Mayıs İsk %');if(old>=0){Array.from(t.querySelectorAll('tbody tr')).forEach(function(r){var c=Array.from(r.children),d=matchDisc(c[u]&&c[u].textContent);if(c[old])c[old].innerHTML=d==null?'—':yellow(m(d),'%')});return}var h=document.createElement('th');h.textContent='Mayıs İsk %';h.style.cssText='font-weight:900;background:#fff3b0;color:#06142a';th[l].after(h);Array.from(t.querySelectorAll('tbody tr')).forEach(function(r){var c=Array.from(r.children),d=matchDisc(c[u]&&c[u].textContent),td=document.createElement('td');td.innerHTML=d==null?'—':yellow(m(d),'%');if(c[l])c[l].after(td)})})}
  function panel(){var old=document.getElementById('alisKontrol3Parti');if(old)old.remove();var sec=document.getElementById('urun');if(!sec)return;var html='<div class="card" id="alisKontrol3Parti"><div class="head"><h3>3 Parti Alış Fiyat Kontrolü - Mayıs Liste Satış Fiyatına Göre</h3><div class="muted">İskonto hesabı Mayıs liste SATIŞ KDV DAHİL fiyatından net alış KDV DAHİL fiyata göre yapılır. Örnek Lorina mesane pedi: 434,81 → 347,85 = %20,00.</div></div><div class="wrap"><table><thead><tr><th>Fatura</th><th>Tarih</th><th>Ürün</th><th>Miktar</th><th>Mayıs Liste Satış Dhl</th><th>Net Alış Dhl</th><th>Mayıs İsk %</th></tr></thead><tbody>';
    rows.forEach(function(r){html+='<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+r[3]+'</td><td>'+yellow(m(r[4]))+'</td><td>'+yellow(m(r[5]))+'</td><td>'+yellow(m(r[6]),'%')+'</td></tr>'});
    html+='</tbody></table></div></div>';sec.insertAdjacentHTML('beforeend',html)}
  function run(){var s=document.getElementById('stamp');if(s)s.textContent='Güncelleme No: '+NO;patchCols();panel()}
  setTimeout(run,0);setTimeout(run,300);setTimeout(run,1000);setTimeout(run,2000);
})();
