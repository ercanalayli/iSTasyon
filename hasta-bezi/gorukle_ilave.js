window.HASTA_BEZI_GORUKLE_ILAVE = {
  updateNo: '1105260707',
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
    { key: 'SERCAN MEDİKAL / ESKİŞEHİR', invoiceNo: 'M012026000000155', invoiceDate: '03.07.2026', net: 28770.79, gross: 31647.88, shipmentStatus: 'SEVK TARİHİ BEKLİYOR' }
  ]
};
(function(){
  var d = window.HASTA_BEZI_DATA;
  var u = window.HASTA_BEZI_GORUKLE_ILAVE;
  if(!d || !Array.isArray(d.orders) || !u || !Array.isArray(u.invoiceUpdates)) return;
  u.invoiceUpdates.forEach(function(x){
    d.orders.forEach(function(o){
      if(String(o[0]).indexOf(x.key) >= 0){
        o[1] = (o[1] || '') + ' / Fatura: ' + x.invoiceDate;
        o[2] = x.invoiceNo;
        o[3] = x.shipmentStatus || o[3];
        if(x.net) o[7] = x.net;
        if(x.gross) o[8] = x.gross;
      }
    });
  });
})();
