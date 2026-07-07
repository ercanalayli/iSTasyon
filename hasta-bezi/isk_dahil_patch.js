(function(){
  var NO='1704260707';
  var rows=[
    ['IST2026000000410','30.06.2026','Jender bel bantlı Small',40,541,366.61,403.27,32.24],
    ['IST2026000000411','30.06.2026','Coverdry serme 60x90',60,196.37,129.00,141.90,34.31],
    ['IST2026000000411','30.06.2026','Jender 90x180 serme',30,325.67,240.73,264.81,26.08],
    ['IST2026000000411','30.06.2026','Lorina mesane pedi',12,549,316.22,347.85,42.40],
    ['IST2026000000411','30.06.2026','Lorina çinko krem',12,700,324.09,388.90,53.70],
    ['IST2026000000406','30.06.2026','Lorina mesane pedi',522,549,316.22,347.85,42.40],
    ['IST2026000000406','30.06.2026','Lorina Allnight bel Large',40,1320,783.60,861.97,40.64],
    ['IST2026000000406','30.06.2026','Lorina Allnight bel XL-XXL',40,1390,825.16,907.68,40.64],
    ['IST2026000000406','30.06.2026','Lorina çinko krem',180,700,324.08,388.90,53.70],
    ['IST2026000000406','30.06.2026','Jender bel bantlı Small',80,541,366.61,403.27,32.24]
  ];
  function m(n){return(+n||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}
  function norm(x){return String(x||'').toLocaleLowerCase('tr-TR').replace(/ı/g,'i')}
  function matchDisc(name){var n=norm(name);if(n.includes('coverdry')&&n.includes('serme'))return 34.31;if(n.includes('jender')&&n.includes('90x180'))return 26.08;if(n.includes('jender')&&(n.includes('small')||n.includes('/ s')||n.includes(' s')))return 32.24;if(n.includes('mesane'))return 42.40;if(n.includes('çinko')||n.includes('cinko'))return 53.70;if(n.includes('allnight')&&n.includes('large'))return 40.64;if(n.includes('allnight')&&n.includes('xl'))return 40.64;return null}
  function yellow(v,suf){return '<b style="display:block;background:#fff3b0;border:1px solid #d6b900;padding:4px 7px;border-radius:6px;font-size:14px">'+v+(suf||'')+'</b>'}
  function patchCols(){document.querySelectorAll('table').forEach(function(t){var th=Array.from(t.querySelectorAll('thead th')),lab=th.map(function(x){return x.textContent.trim()});var u=lab.indexOf('Ürün'),l=lab.indexOf('Liste');if(u<0||l<0||lab.indexOf('Mayıs İsk %')>=0)return;var h=document.createElement('th');h.textContent='Mayıs İsk %';h.style.cssText='font-weight:900;background:#fff3b0;color:#06142a';th[l].after(h);Array.from(t.querySelectorAll('tbody tr')).forEach(function(r){var c=Array.from(r.children),d=matchDisc(c[u]&&c[u].textContent),td=document.createElement('td');td.innerHTML=d==null?'—':yellow(m(d),'%');if(c[l])c[l].after(td)})})}
  function panel(){var sec=document.getElementById('urun');if(!sec||document.getElementById('alisKontrol3Parti'))return;var html='<div class="card" id="alisKontrol3Parti"><div class="head"><h3>3 Parti Alış Fiyat Kontrolü - Mayıs Liste İskonto Oranı</h3><div class="muted">IST2026000000410 / 0411 / 0406 fatura satırları; Mayıs liste birim fiyatına göre efektif iskonto.</div></div><div class="wrap"><table><thead><tr><th>Fatura</th><th>Tarih</th><th>Ürün</th><th>Miktar</th><th>Mayıs Liste Hrç</th><th>Net Alış Hrç</th><th>Net Alış Dhl</th><th>Mayıs İsk %</th></tr></thead><tbody>';
    rows.forEach(function(r){html+='<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+r[3]+'</td><td>'+m(r[4])+'</td><td>'+m(r[5])+'</td><td>'+yellow(m(r[6]))+'</td><td>'+yellow(m(r[7]),'%')+'</td></tr>'});
    html+='</tbody></table></div></div>';sec.insertAdjacentHTML('beforeend',html)}
  function run(){var s=document.getElementById('stamp');if(s)s.textContent='Güncelleme No: '+NO;patchCols();panel()}
  setTimeout(run,0);setTimeout(run,300);setTimeout(run,1000);setTimeout(run,2000);
})();
