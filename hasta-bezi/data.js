window.HASTA_BEZI_DATA = {
  updateNo: 'GPT202607060838',
  period: { year: '2026', month: 'Temmuz' },
  rules: [
    ['Kâr hesabı', 'KDV hariç'],
    ['Net Kâr', 'Satış KDV Hariç - FIFO Maliyet - Nakliye'],
    ['Kâr Marjı', 'Kâr / Satış KDV Hariç'],
    ['Kâr Oranı', 'Kâr / FIFO Maliyet'],
    ['Sipariş kapanışı', 'Fatura No + Sevk Tarihi zorunlu'],
    ['Alış fatura no', 'Her ürün satırında zorunlu'],
    ['Görükle sermeler', 'Nisan liste'],
    ['Diğer ürünler', 'Mayıs liste'],
    ['Zeybek Moly', 'Mayıs liste + %11 iskonto'],
    ['Serme ürünleri', 'Kar-Dağ %5 nakit iskonto uygulanmaz'],
    ['Kar-Dağ %5 fark faturası', 'Varsa ürün maliyetinden düşülür']
  ],
  screenCards: [
    { title: 'Excel Hasta Bezi Raporu', tag: 'Yeni ekran', desc: 'Ekrandaki Excel kurgusu: Belbantlı, Külotlu, Serme-Yatak Koruyucu ve Mesane; Perakende / Distribütör-Toptan; Bugün, Dün, Hafta, Ay, Yıl ve önceki yıl kolonları.', bullets: ['Kategori + kanal kırılımı', 'Tutar / adet / % ciroda', 'Kâr TL / ortalama TL'], target: 'rapor' },
    { title: 'Ürün / Cari Ara', tag: 'Hızlı arama', desc: 'Ürün adı, cari adı veya fatura numarası yaz; ilgili ürün, cari, alış, fark, kâr ve oran bilgileri tek ekranda listelensin.', bullets: ['Cari + ürün birlikte aranır', 'Alış fatura no görünür', 'Kâr, marj, oran görünür'], target: 'arama' },
    { title: 'Gelir Tablosu Ana Kalemler', tag: 'Finans merkezi', desc: 'Satışlar, satılan malın maliyeti, brüt kâr, giderler, VÖK, vergi ve net kâr tek ekrandan yönetilir.', bullets: ['Bugün / Dün / Bu Hafta', 'Bu Ay / Geçen Ay', 'Bu Yıl / Geçen Yıl'], target: 'genel' },
    { title: 'Hasta Bezi Ana Kalemler', tag: 'Operasyon kırılımı', desc: 'Belbantlı, külotlu, serme-yatak koruyucu ve mesane ürünleri perakende/toptan kırılımıyla izlenir.', bullets: ['Toplam TL', 'Toplam adet', 'Ortalama %, kâr TL, ortalama TL'], target: 'urun' },
    { title: 'Giderler', tag: 'Kontrol alanı', desc: 'Sabit ve değişken giderler kârlılığı ezmeden takip edilir; nakliye ayrı görünür.', bullets: ['Sabit gider', 'Değişken gider', 'Nakliye etkisi'], target: 'kontrol' },
    { title: 'Karlılık Raporları', tag: 'Üst akıl', desc: 'Cari, ürün, liste, iskonto ve FIFO bazında kâr marjı ile kâr oranı birlikte okunur.', bullets: ['Kâr marjı', 'Kâr oranı', 'Riskli satır analizi'], target: 'genel' }
  ],
  reportColumns: ['BUGÜN TOPLAM', 'DÜN TOPLAM', 'BU HAFTA TOPLAM', 'BU AY TOPLAM', 'BİR ÖNCEKİ AY TOPLAM', 'BU YIL TOPLAM', 'ÖNCEKİ YIL TOPLAM'],
  categoryBlocks: [
    { category: 'BELBANTLI', channels: ['PERAKENDE', 'DİSTRİBÜTÖR-TOPTAN'], metrics: ['TOPLAM TL', 'TOPLAM ADET', 'ORTALAMA %', 'TOPLAM KÂR TL', 'ORTALAMA TL'] },
    { category: 'KÜLOTLU', channels: ['PERAKENDE', 'DİSTRİBÜTÖR-TOPTAN'], metrics: ['TOPLAM TL', 'TOPLAM ADET', 'ORTALAMA %', 'TOPLAM KÂR TL', 'ORTALAMA TL'] },
    { category: 'SERME - YATAK KORUYUCU', channels: ['PERAKENDE', 'DİSTRİBÜTÖR-TOPTAN'], metrics: ['TOPLAM TL', 'TOPLAM ADET', 'ORTALAMA %', 'TOPLAM KÂR TL', 'ORTALAMA TL'] },
    { category: 'MESANE', channels: ['PERAKENDE', 'DİSTRİBÜTÖR-TOPTAN'], metrics: ['TOPLAM TL', 'TOPLAM ADET', 'ORTALAMA %', 'TOPLAM KÂR TL', 'ORTALAMA TL'] }
  ],
  incomeLines: ['SATIŞLAR', 'MEDİKAL AKÜLÜ', 'MEDİKAL ELEKTRONİK', 'HASTA ALTI BEZİ', 'PERİNE VÜCUT TEMİZLEME', 'KİRALIK', 'KARYOLA', 'YÜRÜMEYE YARDIMCI', 'ORTOPEDİ TEKSTİL', 'SARF', 'SONDA', 'KOLOSTOMİ', 'AYAKKABI TERLİK', 'SGK', 'SOLUNUM', 'SATILAN MALIN MALİYETİ', 'BRÜT KÂR', 'GİDERLER', 'VÖK', 'VERGİ', 'NET KÂR'],
  orders: [
    ['ZEYBEK MEDİKAL / KÜTAHYA','03.07.2026 ilave dahil','FATURA BEKLİYOR','SEVK EDİLMEDİ','Mayıs 2026','Jender %11 / Moly %11','Eskişehir / Bilecik / Kütahya',129228.70,142151.57,86002.50,1500,41726.20],
    ['SERCAN MEDİKAL / ESKİŞEHİR','önceki kayıt + ilave','FATURA BEKLİYOR','SEVK EDİLMEDİ','Nisan / 18.04.2025','Yok','Eskişehir / Bilecik / Kütahya',28770.79,31647.88,21705.14,1500,5565.65],
    ['SETON BİYOMEDİKAL / ESKİŞEHİR','03.07.2026','FATURA BEKLİYOR','SEVK EDİLMEDİ','Nisan / 18.04.2025','Yok','Eskişehir / Bilecik / Kütahya',55020.43,60522.48,40466.35,1500,13054.08],
    ['GÖRÜKLE MEDİKAL / BURSA','02.07.2026','FATURA BEKLİYOR','SEVK EDİLMEDİ','Sermeler Nisan / Diğerleri Mayıs','Yok','Bursa / Orhangazi',23234.26,25994.66,17592.71,1250,4391.55]
  ],
  products: [
    ['ZEYBEK','Jender bağlama Small / S',20,'Mayıs 2026','11%',248.19,'31.01.2026','IST2026000000084','M012026000000047',403.2672,7332.13,2368.33],
    ['ZEYBEK','Jender bağlama M',40,'Mayıs 2026','11%',243.03,'31.01.2026','IST2026000000080','M012026000000046',394.2395,14335.98,4614.82],
    ['ZEYBEK','Jender bağlama L',40,'Mayıs 2026','11%',279.31,'31.01.2026','IST2026000000080','M012026000000046',464.0764,16875.49,5703.11],
    ['ZEYBEK','Jender bağlama XL',40,'Mayıs 2026','11%',289.07,'31.01.2026','IST2026000000080','M012026000000046',485.4775,17653.73,6091.09],
    ['ZEYBEK','Jender külot M',20,'Mayıs 2026','11%',283.94,'31.01.2026','IST2026000000080','M012026000000046',451.9973,8218.13,2539.41],
    ['ZEYBEK','Jender külot L',60,'Mayıs 2026','11%',302.80,'31.01.2026','IST2026000000080','M012026000000046',498.8506,27210.03,9041.85],
    ['ZEYBEK','Jender külot XL',60,'Mayıs 2026','11%',341.01,'31.01.2026','IST2026000000080','M012026000000046',551.2162,30066.34,9605.62],
    ['ZEYBEK','Moly serme',60,'Mayıs 2026','11%',71.25,'30.11.2025','IST2025000001583','Uygulanmaz',138.176,7536.87,3261.87],
    ['SERCAN','Coverdry külot M',8,'Nisan / 18.04.2025','Yok',259.64,'30.04.2026','IST2026000000281','M012026000000112',337.84,2457.02,379.94],
    ['SERCAN','Coverdry bağlama L',28,'Nisan / 18.04.2025','Yok',235.06,'19.12.2025','IST2025000001606','Kontrol edilecek',354.32,9019.05,2437.41],
    ['SETON','Jender külot XL',12,'Nisan / 18.04.2025','Yok',341.01,'19.12.2025','IST2025000001606','Kontrol edilecek',533.17,5816.40,1724.28],
    ['SETON','Coverdry serme',12,'Nisan / 18.04.2025','Yok',80.66,'30.11.2025','IST2025000001583','Uygulanmaz',141.53,1543.96,576.10],
    ['GÖRÜKLE','Coverdry serme 60x90',60,'Nisan / 18.04.2025','Yok',80.66,'30.11.2025','IST2025000001583','Uygulanmaz',141.53,7719.82,2880.52],
    ['GÖRÜKLE','Jender 90x180 serme',30,'Nisan / 18.04.2025','Yok',187.34,'30.04.2026','IST2026000000285','M012026000000113',234.718,6401.40,781.20],
    ['GÖRÜKLE','Lorina mesane pedi',12,'Mayıs 2026','Yok',300.39,'31.07.2025','PDE2025000001241','Kontrol paneli',434.808,4743.36,1138.68],
    ['GÖRÜKLE','Lorina çinko krem',12,'Mayıs 2026','Yok',294.04,'31.01.2026','IST2026000000080','M012026000000046',436.968,4369.68,841.15]
  ],
  checks: [
    ['IST2026000000080','M012026000000046','KESİLDİ','182.995,38','Fatura geneli fiyat farkı; çinko krem ve Jender/Lorina ana alışlar bu fatura içinde.'],
    ['IST2026000000084','M012026000000047','KESİLDİ','61.416,22','Jender small/XS ve küçük paket alışları için fark faturası.'],
    ['IST2026000000281','M012026000000112','KESİLDİ','6.920,86','Coverdry külot fatura geneli fiyat farkı.'],
    ['IST2026000000285','M012026000000113','KESİLDİ','844,97','Jender 90x180 serme fatura geneli fiyat farkı.'],
    ['IST2025000001640','-','FARK GÖRÜNMEDİ','-','Jender 60x90 serme; fatura içi iskonto var.'],
    ['IST2025000001583','-','FARK GÖRÜNMEDİ','-','Moly/Jender/Coverdry serme; serme satırlarında %5 uygulanmaz.'],
    ['IST2025000001606','-','KONTROL','-','Coverdry bağlama ve eski Jender/Coverall FIFO kaynak kontrol satırı.'],
    ['PDE2025000001241','-','KONTROL','-','Lorina hijyen/mesane eşleşmesi kontrol panelinde tutulacak.']
  ],
  liveBizimHesap: {
    "source": "BizimHesap Chrome botu",
    "syncedAt": "2026-07-06T08:38:45.157Z",
    "date": "2026-07-06",
    "firm": "ALAYLI MEDİKAL",
    "summary": {
      "rows": 17,
      "qty": 31,
      "amount": 9577.26
    },
    "byCategory": [
      {
        "category": "*ORTOPEDİ TEKSTİL",
        "rows": 7,
        "qty": 7,
        "amount": 3454.5400000000004
      },
      {
        "category": "*HASTA BEZİ KÜLOTLU",
        "rows": 2,
        "qty": 9,
        "amount": 3090.9100000000003
      },
      {
        "category": "*HASTA BEZİ BELBANTLI",
        "rows": 1,
        "qty": 4,
        "amount": 1381.82
      },
      {
        "category": "*HASTA BEZİ SERME YATAK KORUYUCU",
        "rows": 3,
        "qty": 6,
        "amount": 1045.45
      },
      {
        "category": "*SARF",
        "rows": 1,
        "qty": 1,
        "amount": 318.18
      },
      {
        "category": "*HASTA BEZİ MESANE",
        "rows": 1,
        "qty": 1,
        "amount": 200
      },
      {
        "category": "*ELEKTRONİK",
        "rows": 1,
        "qty": 1,
        "amount": 50
      },
      {
        "category": "*SONDA",
        "rows": 1,
        "qty": 2,
        "amount": 36.36
      }
    ],
    "rows": [
      {
        "date": "2026-07-06",
        "customer": "Perakende Satışlar",
        "product": "2026 DR COMFORT KÜLOTLU HASTA BEZİ 30'LU LARGE (1X4X30)",
        "category": "*HASTA BEZİ KÜLOTLU",
        "qty": 8,
        "amount": 2909.09
      },
      {
        "date": "2026-07-06",
        "customer": "Perakende Satışlar",
        "product": "2026 COVER DRY BEL BANTLI HASTA BEZİ LARGE 30'LU",
        "category": "*HASTA BEZİ BELBANTLI",
        "qty": 4,
        "amount": 1381.82
      },
      {
        "date": "2026-07-06",
        "customer": "Perakende Satışlar",
        "product": "2026 VİZOR ÖRME PATELLA VE FLEXİBLE LİGAMENT DESTEKLİ DİZLİK",
        "category": "*ORTOPEDİ TEKSTİL",
        "qty": 1,
        "amount": 727.27
      },
      {
        "date": "2026-07-06",
        "customer": "Perakende Satışlar",
        "product": "2026 MOLY YATAK KORUYUCU SERME ORTU 60X90 30LU",
        "category": "*HASTA BEZİ SERME YATAK KORUYUCU",
        "qty": 4,
        "amount": 545.45
      },
      {
        "date": "2026-07-06",
        "customer": "Perakende Satışlar",
        "product": "2026 BR0404 - VİZOR ÇALIŞMA KORSESİ STANDART",
        "category": "*ORTOPEDİ TEKSTİL",
        "qty": 1,
        "amount": 545.45
      },
      {
        "date": "2026-07-06",
        "customer": "Perakende Satışlar",
        "product": "2026 AYAK BİLEKLİĞİ PEDLİ PLUS STABİLİZASYON ORTEZİ AİRCAST",
        "category": "*ORTOPEDİ TEKSTİL",
        "qty": 1,
        "amount": 500
      },
      {
        "date": "2026-07-06",
        "customer": "Perakende Satışlar",
        "product": "2026 +DİZ ALTI DÜŞÜK BASINÇ VARİS ÇORABI CCL1",
        "category": "*ORTOPEDİ TEKSTİL",
        "qty": 1,
        "amount": 454.55
      },
      {
        "date": "2026-07-06",
        "customer": "Perakende Satışlar",
        "product": "2026 ELASTİK DİZLİK ÖRGÜ DESTEKSİZ ÖRME (S-M-L-XL-XXL)",
        "category": "*ORTOPEDİ TEKSTİL",
        "qty": 1,
        "amount": 409.09
      },
      {
        "date": "2026-07-06",
        "customer": "Perakende Satışlar",
        "product": "2026 ELASTİK DİZLİK ÖRGÜ DESTEKSİZ ÖRME (S-M-L-XL-XXL)",
        "category": "*ORTOPEDİ TEKSTİL",
        "qty": 1,
        "amount": 409.09
      },
      {
        "date": "2026-07-06",
        "customer": "Perakende Satışlar",
        "product": "2026 /+++ ABDOMİNAL KORSE 26CM STANDART SOLES",
        "category": "*ORTOPEDİ TEKSTİL",
        "qty": 1,
        "amount": 409.09
      },
      {
        "date": "2026-07-06",
        "customer": "Perakende Satışlar",
        "product": "2026 /*ALEZ 160*200 ÇİFT KİŞİLİK",
        "category": "*HASTA BEZİ SERME YATAK KORUYUCU",
        "qty": 1,
        "amount": 345.45
      },
      {
        "date": "2026-07-06",
        "customer": "Perakende Satışlar",
        "product": "2026 NİTRİL ELDİVEN SMALL-MEDIUM-LARGE PERAKENDE",
        "category": "*SARF",
        "qty": 1,
        "amount": 318.18
      },
      {
        "date": "2026-07-06",
        "customer": "Perakende Satışlar",
        "product": "***CANPED MESANE PEDİ LARGE 20'Lİ+++",
        "category": "*HASTA BEZİ MESANE",
        "qty": 1,
        "amount": 200
      },
      {
        "date": "2026-07-06",
        "customer": "Perakende Satışlar",
        "product": "+++MAVİ BEYAZ KÜLOTLU HASTA BEZİ MEDIUM 9 LU",
        "category": "*HASTA BEZİ KÜLOTLU",
        "qty": 1,
        "amount": 181.82
      },
      {
        "date": "2026-07-06",
        "customer": "MAHMUT KESKİN",
        "product": "2026 COVER DRY YATAK KORUYUCU ÖRTÜ SERME 60X90 30'LU*6",
        "category": "*HASTA BEZİ SERME YATAK KORUYUCU",
        "qty": 1,
        "amount": 154.55
      },
      {
        "date": "2026-07-06",
        "customer": "Perakende Satışlar",
        "product": "2026 ŞEKER ÖLÇÜM PİLİ",
        "category": "*ELEKTRONİK",
        "qty": 1,
        "amount": 50
      },
      {
        "date": "2026-07-06",
        "customer": "Perakende Satışlar",
        "product": "/STERİL İDRAR TORBASI T MUSLUK",
        "category": "*SONDA",
        "qty": 2,
        "amount": 36.36
      }
    ]
  },
  closed: [['Laboral','M012026000000152',''],['Ada','M012026000000150','']]
};
