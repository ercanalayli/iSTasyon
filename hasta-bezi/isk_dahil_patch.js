(function(){
  var NO='1021260807';
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
  var purchaseHistory={
    'jender bel bantlı small':[ 
      {date:'31.01.2026',invoice:'IST2026000000084',netHrc:248.19,netDhl:272.99,note:'Önceki alış'},
      {date:'30.06.2026',invoice:'IST2026000000410',qty:40,listeHrc:411.92,listeDhl:453.11,netHrc:366.6065,netDhl:403.2672,discount:11.00,note:'Son alış - iskonto düşülmüş net'}
    ]
  };
  function m(n,d){return(+n||0).toLocaleString('tr-TR',{minimumFractionDigits:d==null?2:d,maximumFractionDigits:d==null?2:d})}
  function norm(x){return String(x||'').toLocaleLowerCase('tr-TR').replace(/ı/g,'i')}
  function vatByName(name){var n=norm(name);return n.includes('çinko')||n.includes('cinko')?1.20:1.10}
  function yellow(v,suf){return '<b style="display:block;background:#fff3b0;border:1px solid #d6b900;padding:4px 7px;border-radius:6px;font-size:14px">'+v+(suf||'')+'</b>'}
  function allProducts(){var d=window.HASTA_BEZI_DATA||{},u=window.HASTA_BEZI_GORUKLE_ILAVE||{},arr=(d.products||[]).slice();if(u.products&&u.replaceProductsFor)arr=arr.filter(function(p){return p[0]!==u.replaceProductsFor}).concat(u.products);return arr}
  function keyFromCari(c){var s=String(c||'').toUpperCase();if(s.includes('GÖRÜKLE'))return'GÖRÜKLE';if(s.includes('ZEYBEK'))return'ZEYBEK';if(s.includes('SERCAN'))return'SERCAN';if(s.includes('SETON'))return'SETON';return s.split(' ')[0]}
  function productData(name,cari){var n=norm(name).trim(),k=cari?keyFromCari(cari):'';var a=allProducts();return a.find(function(p){return (!k||p[0]===k)&&norm(p[1]).trim()===n})||a.find(function(p){return norm(p[1]).trim()===n})}
  function hist(name){return purchaseHistory[norm(name).trim()]||[]}
  function lastHist(name){var h=hist(name);return h.length?h[h.length-1]:null}
  function discountPct(p){var v=String((p&&p[4])||'').replace('%','').replace(',','.');var x=parseFloat(v);return isNaN(x)?0:x}
  function listeDhl(p){var isk=discountPct(p);var iskD=+p[9]||0;return isk?iskD/(1-isk/100):iskD}
  function listeHrc(p,name){return listeDhl(p)/vatByName(name)}
  function iskDhl(p){return +p[9]||0}
  function matchDisc(name,cari){var p=productData(name,cari);if(p)return discountPct(p);return 0}
  function packText(name,adet){var q=+adet||0,n=norm(name);if((n.includes('serme')||n.includes('90x180')||n.includes('60x90')||n.includes('mesane'))&&q%6===0)return(q/6)+' balya × 6 = '+q+' paket';if(n.includes('çinko')||n.includes('cinko')){var k=q%12===0?q/12:1;return k+' koli × 12 = '+q+' adet'}return q+' paket × 1 = '+q+' paket'}
  function histText(name,p){var h=hist(name);if(!h.length&&p)return p[6]+' '+p[7]+' Net Hrç: '+m(p[5],2);return h.map(function(x){return x.date+' '+x.invoice+' Net Hrç: '+m(x.netHrc,4)+' / Net Dhl: '+m(x.netDhl,4)}).join(' | ')}
  function addLegend(){if(document.getElementById('alisSatisLegend'))return;var hero=document.querySelector('.hero');if(!hero)return;hero.insertAdjacentHTML('beforeend','<div id="alisSatisLegend" style="margin-top:8px"><span style="display:inline-block;background:#ffecec;border:1px solid #e6a8a8;color:#5a1717;padding:5px 9px;border-radius:8px;font-weight:900;margin-right:8px">Alış / maliyet alanları</span><span style="display:inline-block;background:#eaffef;border:1px solid #9bd9aa;color:#064b1e;padding:5px 9px;border-radius:8px;font-weight:900">Satış / liste / ciro alanları</span><span style="display:inline-block;background:#eef5ff;border:1px solid #9db5d7;color:#0b2850;padding:5px 9px;border-radius:8px;font-weight:900;margin-left:8px">Alış geçmişi: tarih + fatura + net maliyet</span></div>')}
  function th(txt,cls){return '<th class="'+cls+'">'+txt+'</th>'}
  function td(v,cls){return '<td class="'+cls+'">'+v+'</td>'}
  function rebuildProductTables(){document.querySelectorAll('table').forEach(function(t){var old=Array.from(t.querySelectorAll('thead th')).map(function(x){return x.textContent.trim()});var ui=old.indexOf('Ürün'),pi=old.indexOf('Balya/Koli'),ai=old.indexOf('Adet'),ci=old.indexOf('Cari');if(ui<0||pi<0||ai<0)return;var hasCari=ci>=0;var body='';Array.from(t.querySelectorAll('tbody tr')).forEach(function(r){var c=Array.from(r.children),name=c[ui]&&c[ui].textContent.trim(),cari=hasCari?c[ci].textContent.trim():'';var p=productData(name,cari);if(!p)return;var q=+p[2]||0,kar=+p[11]||0,cost=(+p[5]||0)*q,satis=+p[10]||0;var marj=satis?kar/satis*100:0,oran=cost?kar/cost*100:0;var lh=lastHist(p[1]);var netAlisHrc=lh?lh.netHrc:+p[5]||0,netAlisDhl=lh?lh.netDhl:(+p[5]||0)*vatByName(p[1]);body+='<tr>'+(hasCari?td(cari,''):'')+td(p[1],'')+td(packText(p[1],q),'')+td(q,'')+td((p[3]||'').split(/[\s/]+/)[0],'satis')+td(yellow(m(discountPct(p)),'%'),'satis')+td(m(listeHrc(p,p[1]),4),'satis')+td(yellow(m(listeDhl(p),4)),'satis')+td(yellow(m(iskDhl(p),4)),'satis')+td(m(netAlisHrc,4),'alis')+td(yellow(m(netAlisDhl,4)),'alis')+td(histText(p[1],p),'alis')+td(m(satis,2),'satis')+td(m(oran,2),'satis')+td(m(marj,2),'satis')+td(p[6],'alis')+td(p[7],'alis')+td(p[8],'alis')+td(m(kar,2),'')+'</tr>'});if(!body)return;var head='<thead><tr>'+(hasCari?th('Cari',''):'')+th('Ürün','')+th('Balya/Koli','')+th('Adet','')+th('Liste','satis')+th('Liste İsk %','satis')+th('Liste Hrç','satis')+th('Liste Dhl','satis')+th('İsk.Dhl','satis')+th('Net Alış Hrç','alis')+th('Net Alış Dhl','alis')+th('Alış Geçmişi','alis')+th('İsk.Net Satış Hrç','satis')+th('Oran %','satis')+th('Marj %','satis')+th('FIFO Alış Tarihi','alis')+th('FIFO Alış Fatura','alis')+th('Fark Fatura','alis')+th('Kâr','')+'</tr></thead>';t.innerHTML=head+'<tbody>'+body+'</tbody>'})}
  function colorize(){document.querySelectorAll('table').forEach(function(t){Array.from(t.querySelectorAll('th.alis,td.alis')).forEach(function(x){x.style.background='#fff6f6';x.style.color='#3d1111'});Array.from(t.querySelectorAll('th.satis,td.satis')).forEach(function(x){x.style.background='#f3fff6';x.style.color='#063b19'});Array.from(t.querySelectorAll('th.alis')).forEach(function(x){x.style.background='#ffecec';x.style.color='#5a1717'});Array.from(t.querySelectorAll('th.satis')).forEach(function(x){x.style.background='#eaffef';x.style.color='#064b1e'})})}
  function panel(){var old=document.getElementById('alisKontrol3Parti');if(old)old.remove();var sec=document.getElementById('urun');if(!sec)return;var html='<div class="card" id="alisKontrol3Parti"><div class="head"><h3>Tek Mayıs Liste - Alış Net Maliyet Kontrolü</h3><div class="muted">Bu bölümde fatura iskonto zinciri düşüldükten sonra net alış maliyeti ve alış geçmişi görünür.</div></div><div class="wrap"><table><thead><tr><th>Fatura</th><th>Tarih</th><th>Ürün</th><th>Ambalaj</th><th>Mayıs Liste Dhl</th><th>Net Alış Dhl</th><th>Net Alış Hrç</th><th>Liste İsk %</th></tr></thead><tbody>';
    rows.forEach(function(r){var h=lastHist(r[2]);var netH=h?h.netHrc:r[5]/1.10;html+='<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+packText(r[2],r[3])+'</td><td>'+yellow(m(r[4]))+'</td><td>'+yellow(m(r[5],4))+'</td><td>'+m(netH,4)+'</td><td>'+yellow(m(r[6]),'%')+'</td></tr>'});
    html+='</tbody></table></div></div>';sec.insertAdjacentHTML('beforeend',html)}
  function run(){var s=document.getElementById('stamp');if(s)s.textContent='Güncelleme No: '+NO;addLegend();panel();rebuildProductTables();colorize()}
  setTimeout(run,0);setTimeout(run,300);setTimeout(run,1000);setTimeout(run,2000);
})();
