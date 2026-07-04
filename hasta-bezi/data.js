window.HASTA_BEZI_DATA = {
  updateNo: '1854260407',
  period: { year: '2026', month: 'Temmuz' },
  rules: [
    ['Kâr hesabı', 'KDV hariç'],
    ['Net Kâr', 'Satış KDV Hariç - FIFO Maliyet - Nakliye'],
    ['Kâr Marjı', 'Kâr / Satış KDV Hariç'],
    ['Kâr Oranı', 'Kâr / FIFO Maliyet'],
    ['Sipariş kapanışı', 'Fatura No + Sevk Tarihi zorunlu'],
    ['Görükle sermeler', 'Nisan liste'],
    ['Diğer ürünler', 'Mayıs liste'],
    ['Zeybek Moly', 'Mayıs liste + %11 iskonto'],
    ['Serme ürünleri', 'Kar-Dağ %5 nakit iskonto uygulanmaz'],
    ['Kar-Dağ %5 fark faturası', 'Varsa ürün maliyetinden düşülür']
  ],
  screenCards: [
    {
      title: 'Gelir Tablosu Ana Kalemler',
      tag: 'Finans merkezi',
      desc: 'Satışlar, satılan malın maliyeti, brüt kâr, giderler, VÖK, vergi ve net kâr tek ekrandan yönetilir.',
      bullets: ['Bugün / Dün / Bu Hafta', 'Bu Ay / Geçen Ay', 'Bu Yıl / Geçen Yıl'],
      target: 'genel'
    },
    {
      title: 'Hasta Bezi Ana Kalemler',
      tag: 'Operasyon kırılımı',
      desc: 'Belbantlı, külotlu, serme-yatak koruyucu ve mesane ürünleri perakende/toptan kırılımıyla izlenir.',
      bullets: ['Toplam TL', 'Toplam adet', 'Ortalama %, kâr TL, ortalama TL'],
      target: 'urun'
    },
    {
      title: 'Giderler',
      tag: 'Kontrol alanı',
      desc: 'Sabit ve değişken giderler kârlılığı ezmeden takip edilir; nakliye ayrı görünür.',
      bullets: ['Sabit gider', 'Değişken gider', 'Nakliye etkisi'],
      target: 'kontrol'
    },
    {
      title: 'Karlılık Raporları',
      tag: 'Üst akıl',
      desc: 'Cari, ürün, liste, iskonto ve FIFO bazında kâr marjı ile kâr oranı birlikte okunur.',
      bullets: ['Kâr marjı', 'Kâr oranı', 'Riskli satır analizi'],
      target: 'genel'
    }
  ],
  categoryBlocks: [
    { category: 'BELBANTLI', channels: ['Perakende', 'Distribütör-Toptan'], metrics: ['Toplam TL', 'Toplam Adet', 'Ortalama %', 'Toplam Kâr TL', 'Ortalama TL'] },
    { category: 'KÜLOTLU', channels: ['Perakende', 'Distribütör-Toptan'], metrics: ['Toplam TL', 'Toplam Adet', 'Ortalama %', 'Toplam Kâr TL', 'Ortalama TL'] },
    { category: 'SERME - YATAK KORUYUCU', channels: ['Perakende', 'Distribütör-Toptan'], metrics: ['Toplam TL', 'Toplam Adet', 'Ortalama %', 'Toplam Kâr TL', 'Ortalama TL'] },
    { category: 'MESANE', channels: ['Perakende', 'Distribütör-Toptan'], metrics: ['Toplam TL', 'Toplam Adet', 'Ortalama %', 'Toplam Kâr TL', 'Ortalama TL'] }
  ],
  incomeLines: ['SATIŞLAR', 'MEDİKAL AKÜLÜ', 'MEDİKAL ELEKTRONİK', 'HASTA ALTI BEZİ', 'PERİNE VÜCUT TEMİZLEME', 'KİRALIK', 'KARYOLA', 'YÜRÜMEYE YARDIMCI', 'ORTOPEDİ TEKSTİL', 'SARF', 'SONDA', 'KOLOSTOMİ', 'AYAKKABI TERLİK', 'SGK', 'SOLUNUM', 'SATILAN MALIN MALİYETİ', 'BRÜT KÂR', 'GİDERLER', 'VÖK', 'VERGİ', 'NET KÂR'],
  orders: [
    ['ZEYBEK MEDİKAL / KÜTAHYA','03.07.2026 ilave dahil','FATURA BEKLİYOR','SEVK EDİLMEDİ','Mayıs 2026','Jender %11 / Moly %11','Eskişehir / Bilecik / Kütahya',129228.70,142151.57,86002.50,1500,41726.20],
    ['SERCAN MEDİKAL / ESKİŞEHİR','önceki kayıt + ilave','FATURA BEKLİYOR','SEVK EDİLMEDİ','Nisan / 18.04.2025','Yok','Eskişehir / Bilecik / Kütahya',28770.79,31647.88,21705.14,1500,5565.65],
    ['SETON BİYOMEDİKAL / ESKİŞEHİR','03.07.2026','FATURA BEKLİYOR','SEVK EDİLMEDİ','Nisan / 18.04.2025','Yok','Eskişehir / Bilecik / Kütahya',55020.43,60522.48,40466.35,1500,13054.08],
    ['GÖRÜKLE MEDİKAL / BURSA','02.07.2026','FATURA BEKLİYOR','SEVK EDİLMEDİ','Sermeler Nisan / Diğerleri Mayıs','Yok','Bursa / Orhangazi',23234.26,25994.66,17592.71,1250,4391.55]
  ],
  products: [
    ['ZEYBEK','Jender bağlama Small / S',20,'Mayıs 2026','11%',248.19,'03.07.2026','-','-',403.2672,7332.13,2368.33],
    ['ZEYBEK','Jender bağlama M',40,'Mayıs 2026','11%',243.03,'03.07.2026','-','-',394.2395,14335.98,4614.82],
    ['ZEYBEK','Jender bağlama L',40,'Mayıs 2026','11%',279.31,'03.07.2026','-','-',464.0764,16875.49,5703.11],
    ['ZEYBEK','Jender bağlama XL',40,'Mayıs 2026','11%',289.07,'03.07.2026','-','-',485.4775,17653.73,6091.09],
    ['ZEYBEK','Jender külot M',20,'Mayıs 2026','11%',283.94,'03.07.2026','-','-',451.9973,8218.13,2539.41],
    ['ZEYBEK','Jender külot L',60,'Mayıs 2026','11%',302.80,'03.07.2026','-','-',498.8506,27210.03,9041.85],
    ['ZEYBEK','Jender külot XL',60,'Mayıs 2026','11%',341.01,'03.07.2026','-','-',551.2162,30066.34,9605.62],
    ['ZEYBEK','Moly serme',60,'Mayıs 2026','11%',71.25,'03.07.2026','-','Uygulanmaz',138.176,7536.87,3261.87],
    ['SERCAN','Coverdry külot M',8,'Nisan / 18.04.2025','Yok',259.64,'03.07.2026','-','-',337.84,2457.02,379.94],
    ['SERCAN','Coverdry bağlama L',28,'Nisan / 18.04.2025','Yok',235.06,'03.07.2026','-','-',354.32,9019.05,2437.41],
    ['SETON','Jender külot XL',12,'Nisan / 18.04.2025','Yok',341.01,'03.07.2026','-','-',533.17,5816.40,1724.28],
    ['SETON','Coverdry serme',12,'Nisan / 18.04.2025','Yok',80.66,'03.07.2026','-','Uygulanmaz',141.53,1543.96,576.10],
    ['GÖRÜKLE','Coverdry serme 60x90',60,'Nisan / 18.04.2025','Yok',80.66,'03.07.2026','-','Uygulanmaz',141.53,7719.82,2880.52],
    ['GÖRÜKLE','Jender 90x180 serme',30,'Nisan / 18.04.2025','Yok',187.34,'03.07.2026','-','Uygulanmaz',234.718,6401.40,781.20],
    ['GÖRÜKLE','Lorina mesane pedi',12,'Mayıs 2026','Yok',300.39,'03.07.2026','-','Kontrol paneli',434.808,4743.36,1138.68],
    ['GÖRÜKLE','Lorina çinko krem',12,'Mayıs 2026','Yok',294.04,'03.07.2026','IST2026000000080','M012026000000046',436.968,4369.68,841.15]
  ],
  checks: [
    ['IST2026000000080','M012026000000046','KESİLDİ','182.995,38','Fatura geneli fiyat farkı; çinko krem bu alış içinde.'],
    ['IST2026000000084','M012026000000047','KESİLDİ','61.416,22','Fatura geneli fiyat farkı.'],
    ['IST2026000000281','M012026000000112','KESİLDİ','6.920,86','Fatura geneli fiyat farkı.'],
    ['IST2026000000285','M012026000000113','KESİLDİ','844,97','Fatura geneli fiyat farkı.'],
    ['IST2025000001640','-','FARK GÖRÜNMEDİ','-','Fatura içi iskonto var; fark faturası görünmüyor.'],
    ['IST2025000001583','-','FARK GÖRÜNMEDİ','-','Koli/balya eski fatura; serme satırlarında %5 uygulanmaz.']
  ],
  closed: [['Laboral','M012026000000152',''],['Ada','M012026000000150','']]
};
