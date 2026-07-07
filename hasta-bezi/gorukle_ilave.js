window.HASTA_BEZI_GORUKLE_ILAVE = {
  updateNo: '1440260707',
  customer: 'GÖRÜKLE MEDİKAL / BURSA',
  note: 'Görükle Medikal ilave: 10 balya Moly serme. Sermeler Nisan listesi, diğerleri Mayıs listesi.',
  replaceOrderName: 'GÖRÜKLE MEDİKAL / BURSA',
  replaceProductsFor: 'GÖRÜKLE',
  order: ['GÖRÜKLE MEDİKAL / BURSA','02.07.2026 + 07.07.2026 Moly ilave','FATURA BEKLİYOR','SEVK EDİLMEDİ','Sermeler Nisan / Diğerleri Mayıs','Yok','Bursa / Orhangazi',31416.08,34994.66,21867.71,1250,8298.37],
  products: [
    ['GÖRÜKLE','Coverdry serme 60x90',60,'Nisan / 18.04.2025','Yok',80.66,'30.11.2025','IST2025000001583','Uygulanmaz',141.53,7719.82,2880.52],
    ['GÖRÜKLE','Jender 90x180 serme',30,'Nisan / 18.04.2025','Yok',187.34,'30.04.2026','IST2026000000285','M012026000000113',234.718,6401.40,781.20],
    ['GÖRÜKLE','Moly serme 60x90',60,'Nisan / 18.04.2025','Yok',71.25,'30.11.2025','IST2025000001583','Uygulanmaz',150.00,8181.82,3906.82],
    ['GÖRÜKLE','Lorina mesane pedi',12,'Mayıs 2026','Yok',300.39,'31.07.2025','PDE2025000001241','Kontrol paneli',434.808,4743.36,1138.68],
    ['GÖRÜKLE','Lorina çinko krem',12,'Mayıs 2026','Yok',294.04,'31.01.2026','IST2026000000080','M012026000000046',436.968,4369.68,841.15]
  ],
  invoiceUpdates: [
    { key: 'ZEYBEK MEDİKAL / KÜTAHYA', invoiceNo: 'M012026000000156', invoiceDate: '03.07.2026', net: 129228.74, gross: 142151.59, shipmentStatus: 'SEVK TARİHİ BEKLİYOR' },
    { key: 'SERCAN MEDİKAL / ESKİŞEHİR', invoiceNo: 'M012026000000155', invoiceDate: '03.07.2026', net: 28770.79, gross: 31647.88, shipmentStatus: 'SEVK TARİHİ BEKLİYOR' },
    { key: 'SETON BİYOMEDİKAL / ESKİŞEHİR', invoiceNo: 'M012026000000157', invoiceDate: '03.07.2026', net: 55020.43, gross: 60522.48, shipmentStatus: 'SEVK TARİHİ BEKLİYOR' }
  ]
};
(function(){
  var d = window.HASTA_BEZI_DATA;
  var u = window.HASTA_BEZI_GORUKLE_ILAVE;
  if(!d || !Array.isArray(d.orders) || !u || !Array.isArray(u.invoiceUpdates)) return;
  u.invoiceUpdates.forEach(function(x){
    d.orders.forEach(function(o){
      if(String(o[0]).indexOf(x.key) >= 0){
        o[1] = (o[1] || '').replace(/ \/ Fatura: .*$/,'') + ' / Fatura: ' + x.invoiceDate;
        o[2] = x.invoiceNo;
        o[3] = x.shipmentStatus || o[3];
        if(x.net) o[7] = x.net;
        if(x.gross) o[8] = x.gross;
      }
    });
  });
  function runAfter(){
    var s = document.getElementById('stamp');
    if(s) s.textContent = 'Güncelleme No: ' + u.updateNo;
    enhanceClassicDetails();
  }
  setTimeout(runAfter, 0);
  setTimeout(runAfter, 250);
  setTimeout(runAfter, 1000);

  function money(n, digits){
    return (+n || 0).toLocaleString('tr-TR',{minimumFractionDigits:digits == null ? 2 : digits, maximumFractionDigits:digits == null ? 2 : digits});
  }
  function keyOf(o){
    var x = String((o && o[0]) || '').toUpperCase();
    if(x.indexOf('GÖRÜKLE')>=0) return 'GÖRÜKLE';
    if(x.indexOf('ZEYBEK')>=0) return 'ZEYBEK';
    if(x.indexOf('SERCAN')>=0) return 'SERCAN';
    if(x.indexOf('SETON')>=0) return 'SETON';
    return x.split(' ')[0];
  }
  function orderDate(o){
    var text = String((o && o[1]) || '').replace(/\s*\/\s*Fatura:\s*[0-9.]+.*$/,'');
    var dates = text.match(/\d{2}\.\d{2}\.\d{4}/g);
    return dates && dates.length ? dates.join(' + ') : (text || '—');
  }
  function invDate(o){
    var m = String((o && o[1]) || '').match(/Fatura:\s*([0-9.]+)/);
    return m ? m[1] : '—';
  }
  function listMonth(p){
    var t = String((p && p[3]) || '').toLocaleLowerCase('tr-TR');
    if(t.indexOf('nisan')>=0) return 'Nisan';
    if(t.indexOf('mayıs')>=0 || t.indexOf('mayis')>=0) return 'Mayıs';
    return String((p && p[3]) || '—').split(/[\s/]+/)[0] || '—';
  }
  function packLine(p){
    var q = +p[2] || 0;
    var name = String(p[1] || '').toLocaleLowerCase('tr-TR');
    if((name.indexOf('serme')>=0 || name.indexOf('90x180')>=0 || name.indexOf('60x90')>=0 || name.indexOf('mesane')>=0) && q % 6 === 0) return (q/6) + ' / ' + q;
    if(name.indexOf('çinko')>=0 && q === 12) return '1 koli / 12';
    return q + ' / ' + q;
  }
  function packNote(p){
    var q = +p[2] || 0;
    var name = String(p[1] || '').toLocaleLowerCase('tr-TR');
    if((name.indexOf('serme')>=0 || name.indexOf('90x180')>=0 || name.indexOf('60x90')>=0 || name.indexOf('mesane')>=0) && q % 6 === 0) return (q/6) + ' balya × 6 = ' + q + ' paket';
    if(name.indexOf('çinko')>=0 && q === 12) return '1 koli × 12 = 12 adet';
    return q + ' paket/adet';
  }
  function vatRate(p){ return String(p[1]||'').toLocaleLowerCase('tr-TR').indexOf('çinko')>=0 ? 1.20 : 1.10; }
  function isSerme(p){ var x=String(p[1]||'').toLocaleLowerCase('tr-TR'); return x.indexOf('serme')>=0 || x.indexOf('90x180')>=0 || x.indexOf('60x90')>=0; }
  function margin(k,s){ return s ? ((+k||0)/(+s||0)*100) : 0; }
  function rate(k,c){ return c ? ((+k||0)/(+c||0)*100) : 0; }
  function netProfit(o){ return (+o[7]||0)-(+o[9]||0)-(+o[10]||0); }
  function allOrders(){
    var orders = (d.orders || []).slice();
    if(u.replaceOrderName && u.order) orders = orders.filter(function(o){return o[0] !== u.replaceOrderName}).concat([u.order]);
    return orders;
  }
  function allProducts(){
    var products = (d.products || []).slice();
    if(u.replaceProductsFor && u.products) products = products.filter(function(p){return p[0] !== u.replaceProductsFor}).concat(u.products);
    return products;
  }
  function classicProduct(p){
    var q = +p[2] || 0;
    var vat = vatRate(p);
    var listeDhl = +p[9] || 0;
    var listeHrc = listeDhl / vat;
    var iskHrc = q ? ((+p[10] || 0) / q) : 0;
    var iskDhl = iskHrc * vat;
    var toplamDhl = (+p[10] || 0) * vat;
    var kar = +p[11] || 0;
    var maliyetToplam = (+p[5] || 0) * q;
    var kontrol = isSerme(p) ? 'Kar-Dağ %5: Uygulanmaz — serme ürünü' : 'Alış/Fark Kontrolü: Alış tutarı, fatura içi iskontolar ve Kar-Dağ %5 fark faturası kontrol edilecek';
    return '<div class="classic-item" style="background:#fff;border:1px solid #c8d9ec;border-radius:10px;padding:10px;margin:10px 0;color:#06142a">'
      + '<b style="font-size:14px">' + p[1] + '</b>'
      + '<div style="margin-top:5px">Bly/Pkt: <b>' + packLine(p) + '</b> | Liste: <b>' + listMonth(p) + ' 2026 listesi</b> | İsk: <b>' + (p[4] === 'Yok' ? 'Yok / 0%' : p[4]) + '</b></div>'
      + '<div>Maliyet: <b>' + money(p[5]) + '</b> | Alış Tarihi: <b>' + p[6] + '</b> | Alış Fatura: <b>' + p[7] + '</b> | Fark Fatura: <b>' + p[8] + '</b></div>'
      + '<div>' + kontrol + '</div>'
      + '<div>Liste Hariç: <b>' + money(listeHrc,4) + '</b> | İsk.Hrç: <b>' + money(iskHrc,4) + '</b> | İsk.Dhl: <b>' + money(iskDhl,4) + '</b></div>'
      + '<div>Top.Hrç: <b>' + money(p[10]) + '</b> | Top.Dhl: <b>' + money(toplamDhl) + '</b> | Kâr: <b>' + money(kar) + '</b></div>'
      + '<div>Kâr Marjı: <b>%' + money(margin(kar,p[10]),2) + '</b> | Kâr Oranı: <b>%' + money(rate(kar,maliyetToplam),2) + '</b></div>'
      + '</div>';
  }
  function enhanceClassicDetails(){
    document.querySelectorAll('.head h3').forEach(function(h){ h.innerHTML = h.innerHTML.replace(/^focus1\s*—\s*/,''); });
    var orders = allOrders();
    var products = allProducts();
    document.querySelectorAll('.detail').forEach(function(el){
      if(el.querySelector('.classic-info')) return;
      var id = el.id || '';
      var order = null;
      if(id === 'dfocus') order = orders.find(function(o){return String(o[0]).indexOf('GÖRÜKLE')>=0}) || orders[orders.length-1];
      else if(/^d\d+$/.test(id)) order = orders[parseInt(id.slice(1),10)];
      if(!order) return;
      var key = keyOf(order);
      var ps = products.filter(function(p){return p[0] === key});
      var html = '<div class="classic-info" style="margin-top:14px"><h3 style="margin:0 0 8px;color:#06142a">Klasik Fatura Kesim Detayı — Eksiksiz Bilgi</h3>'
        + '<div style="background:#fff;border:1px solid #c8d9ec;border-radius:10px;padding:10px;margin-bottom:10px;color:#06142a">'
        + '<b>' + order[0] + '</b><br>'
        + 'Sipariş Tarihi: <b>' + orderDate(order) + '</b><br>'
        + 'Fatura Durumu: <b>' + (String(order[2]).indexOf('BEKLİYOR')>=0 ? 'FATURA BEKLİYOR' : 'KESİLDİ') + '</b><br>'
        + 'Fatura No: <b>' + (order[2] || '—') + '</b><br>'
        + 'Fatura Tarihi: <b>' + invDate(order) + '</b><br>'
        + 'Sevkiyat: <b>' + (order[3] || '—') + '</b><br>'
        + 'Sevk Tarihi: <b>' + (String(order[3]).match(/\d/) ? order[3] : 'BEKLİYOR') + '</b><br>'
        + 'Kaynak Liste: <b>' + ([...new Set(ps.map(listMonth))].join(' / ') || order[4]) + '</b><br>'
        + 'İskonto: <b>' + order[5] + '</b><br>'
        + 'Rota: <b>' + order[6] + '</b><br>'
        + 'Nakliye: <b>' + money(order[10]) + ' TL</b><br>'
        + 'Net Kâr: <b>' + money(netProfit(order)) + ' TL</b><br>'
        + 'Net Kâr Marjı: <b>%' + money(margin(netProfit(order),order[7]),2) + '</b><br>'
        + 'Net Kâr Oranı: <b>%' + money(rate(netProfit(order),order[9]),2) + '</b>'
        + '</div>' + ps.map(classicProduct).join('') + '</div>';
      el.insertAdjacentHTML('beforeend', html);
    });
  }
})();