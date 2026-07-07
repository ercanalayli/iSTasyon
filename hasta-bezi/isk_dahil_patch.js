(function(){
  var NO='1723260707';
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
  function m(n,d){return(+n||0).toLocaleString('tr-TR',{minimumFractionDigits:d==null?2:d,maximumFractionDigits:d==null?2:d})}
  function norm(x){return String(x||'').toLocaleLowerCase('tr-TR').replace(/ı/g,'i')}
  function vatByName(name){var n=norm(name);return n.includes('çinko')||n.includes('cinko')?1.20:1.10}
  function productData(name){var d=window.HASTA_BEZI_DATA||{},u=window.HASTA_BEZI_GORUKLE_ILAVE||{},arr=(d.products||[]).slice();if(u.products&&u.replaceProductsFor)arr=arr.filter(function(p){return p[0]!==u.replaceProductsFor}).concat(u.products);var n=norm(name).trim();return arr.find(function(p){return norm(p[1]).trim()===n})}
  function matchDisc(name){var n=norm(name);if(n.includes('coverdry')&&n.includes('serme'))return 17.89;if(n.includes('jender')&&n.includes('90x180'))return 7.60;if(n.includes('jender')&&(n.includes('small')||n.includes('/ s')||n.includes(' s')))return 11.00;if(n.includes('mesane'))return 20.00;if(n.includes('çinko')||n.includes('cinko'))return 11.00;if(n.includes('allnight')&&n.includes('large'))return 10.00;if(n.includes('allnight')&&n.includes('xl'))return 10.00;return null}
  function yellow(v,suf){return '<b style="display:block;background:#fff3b0;border:1px solid #d6b900;padding:4px 7px;border-radius:6px;font-size:14px">'+v+(suf||'')+'</b>'}
  function patchCols(){document.querySelectorAll('table').forEach(function(t){var th=Array.from(t.querySelectorAll('thead th')),lab=th.map(function(x){return x.textContent.trim()});var u=lab.indexOf('Ürün'),l=lab.indexOf('Liste'),lh=lab.indexOf('Liste Hrç');if(u<0||l<0)return;var old=lab.indexOf('Mayıs İsk %');if(old<0){var hi=document.createElement('th');hi.textContent='Mayıs İsk %';hi.style.cssText='font-weight:900;background:#fff3b0;color:#06142a';th[l].after(hi)}var ld=lab.indexOf('Liste Dhl');if(lh>=0&&ld<0){var hd=document.createElement('th');hd.textContent='Liste Dhl';hd.style.cssText='font-weight:900;background:#fff3b0;color:#06142a';th[lh].after(hd)}Array.from(t.querySelectorAll('tbody tr')).forEach(function(r){var c=Array.from(r.children),name=c[u]&&c[u].textContent,p=productData(name),disc=matchDisc(name);var iskIndex=old>=0?old:l+1;if(c[iskIndex])c[iskIndex].innerHTML=disc==null?'—':yellow(m(disc),'%');else if(c[l]){var td=document.createElement('td');td.innerHTML=disc==null?'—':yellow(m(disc),'%');c[l].after(td)}c=Array.from(r.children);var lh2=Array.from(t.querySelectorAll('thead th')).map(function(x){return x.textContent.trim()}).indexOf('Liste Hrç');var ld2=Array.from(t.querySelectorAll('thead th')).map(function(x){return x.textContent.trim()}).indexOf('Liste Dhl');if(p&&lh2>=0&&c[lh2]){var dhl=+p[9]||0,hrc=dhl/vatByName(name);c[lh2].textContent=m(hrc,4);if(ld2>=0&&c[ld2])c[ld2].innerHTML=yellow(m(dhl,4));else{var td2=document.createElement('td');td2.innerHTML=yellow(m(dhl,4));c[lh2].after(td2)}}})})}
  function panel(){var old=document.getElementById('alisKontrol3Parti');if(old)old.remove();var sec=document.getElementById('urun');if(!sec)return;var html='<div class="card" id="alisKontrol3Parti"><div class="head"><h3>3 Parti Alış Fiyat Kontrolü - Mayıs Liste Satış Fiyatına Göre</h3><div class="muted">İskonto hesabı Mayıs liste SATIŞ KDV DAHİL fiyatından net alış KDV DAHİL fiyata göre yapılır. Liste Hrç ve Liste Dhl ayrı gösterilir.</div></div><div class="wrap"><table><thead><tr><th>Fatura</th><th>Tarih</th><th>Ürün</th><th>Miktar</th><th>Mayıs Liste Satış Dhl</th><th>Net Alış Dhl</th><th>Mayıs İsk %</th></tr></thead><tbody>';
    rows.forEach(function(r){html+='<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+r[3]+'</td><td>'+yellow(m(r[4]))+'</td><td>'+yellow(m(r[5]))+'</td><td>'+yellow(m(r[6]),'%')+'</td></tr>'});
    html+='</tbody></table></div></div>';sec.insertAdjacentHTML('beforeend',html)}
  function run(){var s=document.getElementById('stamp');if(s)s.textContent='Güncelleme No: '+NO;patchCols();panel()}
  setTimeout(run,0);setTimeout(run,300);setTimeout(run,1000);setTimeout(run,2000);
})();
