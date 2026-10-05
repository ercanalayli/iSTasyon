// APERION WHATSAPP BOT v9 - KESİN SÜRÜM
const APERION_SHEET_ID = "1mUsy41s5dqyhKNtkw2xYcxj59PZztDw12ITNilM45ro"; // SENİN SHEET ID
const APERION_SHEET_NAME = "APERION";

function doGetLegacy(e) {
  return ContentService.createTextOutput("Mali Merkez Aktif v9");
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const mesaj = data.message;
    const sonuc = parseEt(mesaj);
    kaydet(sonuc);
    return ContentService.createTextOutput(JSON.stringify({status: "ok"}))
       .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", msg: err.toString()}))
       .setMimeType(ContentService.MimeType.JSON);
  }
}

function parseEt(metin) {
  const parts = metin.split(" ");
  return {
    tarih: new Date(),
    islem: parts[0], // MT
    tutar: parts[1].replace("TL", ""), // 500
    cari: parts.slice(2, parts.length-1).join(" "), // Ahmet
    not: "",
    tur: parts[parts.length -1] // Gelir
  };
}

function kaydet(data) {
  const ss = SpreadsheetApp.openById(APERION_SHEET_ID);
  const sheet = ss.getSheetByName(APERION_SHEET_NAME);
  sheet.appendRow([data.tarih, data.islem, data.tutar, data.cari, data.not, data.tur]);
}

/**
 * L sütununda "yapay zeka" geçen satırların A:L dış çerçevesini kalınlaştırır.
 */
function applyAIBorders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return;

  var values = sheet.getRange("L1:L" + lastRow).getDisplayValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0] || "").toLocaleLowerCase("tr-TR").indexOf("yapay zeka") !== -1) {
      sheet.getRange(i + 1, 1, 1, 12).setBorder(
        true, true, true, true,
        false, false,
        "black",
        SpreadsheetApp.BorderStyle.SOLID_MEDIUM
      );
    }
  }
}


// --- BİZİM HESAP CARİ AKTARIM KODU ---
function cariAktarBizimHesap() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("BH_CARİ_YÖNETİMİ");
  var data = sheet.getDataRange().getValues();
  
  // DİKKAT: Bizim Hesap'tan aldığınız FirmId'yi aşağıdaki tırnak işaretleri içine yazın.
  var firmId = "0075B067430344968D95C925E19B75B4"; 
  var apiUrl = "https://bizimhesap.com/api/b2b/addcustomer";
  
  // 1. satır başlıklar olduğu için 2. satırdan (index 1) okumaya başlıyoruz
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var unvan = row[1]; // B Sütunu: Unvan
    
    // Eğer unvan boş değilse Bizim Hesap'a gönder
    if (unvan !== "") {
      var payload = {
        "FirmId": firmId,
        "CustomerName": unvan,
        "TaxOffice": row[2] || "", 
        "TaxNumber": row[3] || "", 
        "City": row[4] || "",      
        "Town": row[5] || "",      
        "Address": row[6] || "",   
        "Currency": row[7] || "TRY", 
        "Phone": row[8] || "",     
        "Email": row[9] || ""      
      };
      
      var options = {
        "method": "post",
        "contentType": "application/json",
        "payload": JSON.stringify(payload),
        "muteHttpExceptions": true
      };
      
      try {
        var response = UrlFetchApp.fetch(apiUrl, options);
        var result = JSON.parse(response.getContentText());
        sheet.getRange(i + 1, 11).setValue("Aktarıldı: " + response.getResponseCode());
      } catch (e) {
        sheet.getRange(i + 1, 11).setValue("Hata: " + e.message);
      }
    }
  }
}
/**
 * 1. Belirtilen sekmedeki 11-25 ölü alanı siler, veri tablosunu 12. satıra çeker ve KPI'ları bağlar.
 */
function cfoStandartinaDonustur(sayfaAdi) {
  const ss = SpreadsheetApp.openById(APERION_SHEET_ID);
  const sheet = ss.getSheetByName(sayfaAdi || "826 sayfasının kopyası");
  if (!sheet) return;

  // 11 ile 25 arasındaki 15 satırlık ölü alanı siler
  sheet.deleteRows(11, 15);

  // Tablo başlığını (AĞUSTOS 2026) 12. satırda kurumsal laciverte boyar
  sheet.getRange("A12:L12").setBackground("#1F3A60").setFontColor("#FFFFFF").setFontWeight("bold");

  // 14. satıra dinamik kümülatif formüllerini yazar
  sheet.getRange("B14").setFormula("=SUM(B15:B)");
  sheet.getRange("C14").setFormula("=SUM(C15:C)");
  sheet.getRange("E14").setFormula("=SUM(E15:E)");

  // Üstteki 4 adet KPI kartını dinamik bağlar
  sheet.getRange("B2").setFormula("=B14");
  sheet.getRange("E2").setFormula("=C14");
  sheet.getRange("H2").setFormula("=E14");
  sheet.getRange("L2").setFormula("=C14/B14");

  // Başlıkları 13. satıra kadar dondurur
  sheet.setFrozenRows(13);
  
  // Format kurallarını çalıştırır
  kuralFormatlariniUygula(sayfaAdi || "826 sayfasının kopyası");
}

/**
 * 2. Kural 8 & 9: Kalan = 0 olanları siyah/çerçevesiz, Kalan > 0 olanları kırmızı/kalın çerçeve yapar.
 */
function kuralFormatlariniUygula(sayfaAdi) {
  const ss = SpreadsheetApp.openById(APERION_SHEET_ID);
  const sheet = ss.getSheetByName(sayfaAdi || "826 sayfasının kopyası");
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow < 15) return;

  for (let r = 15; r <= lastRow; r++) {
    const kalan = sheet.getRange(r, 5).getValue(); // E sütunu (Kalan)
    const rowRange = sheet.getRange(r, 1, 1, 12);   // A:L aralığı

    if (kalan === 0 || kalan === "0" || kalan === "0,00") {
      // Ödenmiş: Siyah yazı, kenarlıksız
      rowRange.setFontColor("#000000");
      rowRange.setBorder(false, false, false, false, false, false);
    } else if (kalan > 0) {
      // Ödenmemiş/Açık Risk: Kırmızı yazı, belirgin kalın çerçeve
      rowRange.setFontColor("#CC0000");
      rowRange.setBorder(true, true, true, true, false, false, "#CC0000", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    }
  }
}
/**
 * OTONOM CFO ASİSTANI - İŞ BANKASI KREDİ KARTI EKSTRE ENTEGRASYONU
 * -------------------------------------------------------------
 * İş Bankası kurumsal/şirket kredi kartı hesap özetini Gmail'den okur,
 * dönem borcu ve asgari ödeme tutarını ilgili ayın kokpit tablosuna işler.
 */
function syncIsBankasiEkstre() {
  const SPREADSHEET = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. GMAIL ARAMASI: Son 15 gün içindeki İş Bankası ekstre e-postasını bul
  const searchQuery = 'from:(isbank.com.tr) ("Hesap Özeti" OR "Kredi Kartı") "3904" newer_than:15d';
  const threads = GmailApp.search(searchQuery, 0, 1);
  
  if (threads.length === 0) {
    Logger.log("Yeni İş Bankası ekstresi bulunamadı.");
    return;
  }
  
  const messages = threads[0].getMessages();
  const latestMessage = messages[messages.length - 1];
  const bodyText = latestMessage.getPlainBody();
  
  // 2. REGEX PARSER: Dönem Borcu ve Asgari Tutarı Ayıkla
  // Örnek: "Hesap Özeti Borcu: 327.889,44 TL" veya "Dönem Borcu ... TL"
  let toplamBorc = null;
  let asgariTutar = null;
  let sonOdemeTarihi = null;

  // Toplam Borç Regex
  const borcMatch = bodyText.match(/(?:Dönem\s*Borcu|Hesap\s*Özeti\s*Borcu|Toplam\s*Borç)[\s\:\=]*([0-9\.\,]+)\s*(?:TL|₺)/i);
  if (borcMatch) {
    toplamBorc = parseTurkishNumber(borcMatch[1]);
  }

  // Asgari Ödeme Regex
  const asgariMatch = bodyText.match(/(?:Asgari\s*Tutar|Asgari\s*Ödeme(?:si)?)[\s\:\=]*([0-9\.\,]+)\s*(?:TL|₺)/i);
  if (asgariMatch) {
    asgariTutar = parseTurkishNumber(asgariMatch[1]);
  }

  // Son Ödeme Tarihi Regex (Örnek: 10.09.2026 veya 10/09/2026)
  const vadeMatch = bodyText.match(/(?:Son\s*Ödeme\s*Tarihi)[\s\:\=]*([0-9]{2}[\.\/][0-9]{2}[\.\/][0-9]{4})/i);
  if (vadeMatch) {
    sonOdemeTarihi = vadeMatch[1];
  }

  Logger.log(`Bulunan Veriler -> Toplam Borç: ${toplamBorc}, Asgari: ${asgariTutar}, Vade: ${sonOdemeTarihi}`);

  if (!toplamBorc) {
    Logger.log("Tutar regex ile ayıklanamadı. E-posta gövdesi kontrol edilmeli.");
    return;
  }

  // 3. HEDEF TABLOYU VE AYI BELİRLE
  // İçinde bulunulan ay/yıla göre kokpit sayfasını seç (Örn: 926_KOKPIT_2055, 1026_KOKPIT_2055)
  const now = new Date();
  const ay = now.getMonth() + 1; // 1-12
  const yilKisa = String(now.getFullYear()).slice(-2); // "26"
  const sheetName = `${ay}${yilKisa}_KOKPIT_2055`;
  
  let targetSheet = SPREADSHEET.getSheetByName(sheetName);
  if (!targetSheet) {
    // Bulunamazsa şu anki aktif sayfayı baz al
    targetSheet = SPREADSHEET.getActiveSheet();
  }

  // 4. İLGİLİ SATIRI BUL (Kredi Kartı - İş Bankası - Şirket)
  // Tablo satırları 36'dan itibaren başlar
  const lastRow = targetSheet.getLastRow();
  const data = targetSheet.getRange(36, 1, lastRow - 35, 12).getValues(); 
  // Sütunlar: [A: Tarih, B: Durum, C: Tutar, D: Ödenen, E: Kalan, F: Bölüm, G: Banka, H: Cari, ..., L: Açıklama]

  let targetRowIndex = -1;

  for (let i = 0; i < data.length; i++) {
    const bolum = String(data[i][5]).toUpperCase(); // F sütunu
    const banka = String(data[i][6]).toUpperCase(); // G sütunu
    const cari = String(data[i][7]).toUpperCase();  // H sütunu

    if (bolum.includes("KREDİ KARTI") && (banka.includes("İŞ") || banka.includes("IS")) && cari.includes("ŞİRKET")) {
      targetRowIndex = 36 + i;
      break;
    }
  }

  // 5. HÜCRELERİ GÜNCELLE
  if (targetRowIndex !== -1) {
    // Tutar Hücresi (C Sütunu)
    targetSheet.getRange(targetRowIndex, 3).setValue(toplamBorc);
    
    // Açıklama Hücresi (L Sütunu)
    const asgariStr = asgariTutar ? `Asgari: ${formatTurkishCurrency(asgariTutar)}` : "";
    const notMetni = `${asgariStr} | Kart: 3904 (Oto-Sync)`.trim();
    targetSheet.getRange(targetRowIndex, 12).setValue(notMetni);

    Logger.log(`Başarıyla güncellendi: Satır ${targetRowIndex}, Tutar: ${toplamBorc}`);
  } else {
    Logger.log("Tabloda eşleşen Kredi Kartı (İŞ / ŞİRKET) satırı bulunamadı.");
  }
}

// Türkçe formatlı para metnini ("327.889,44") sayıya ("327889.44") dönüştürür
function parseTurkishNumber(str) {
  if (!str) return 0;
  const cleanStr = str.replace(/\./g, "").replace(",", ".");
  return parseFloat(cleanStr);
}

// Sayıyı formatlama yardımcısı
function formatTurkishCurrency(num) {
  return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
}


// ==============================
// APEIRON | ISTASYON WEB APP UI
// ==============================

/**
 * Apeiron | İstasyON Web App
 * Free runtime: Google Apps Script + Google Sheets/Drive only.
 * Canonical architecture:
 * - Tasks: Apeiron Kontrol Merkezi / IS_TAKIP_GIRIS
 * - Payments: authorized payment spreadsheet, relevant A-tab
 * - Approvals/docs/audit/finance: canonical control-center sheets
 * - Default = read-only. Only non-financial operational completion is writable.
 */

const APP = Object.freeze({
  CONTROL_ID: '155hZ1PRVKH-vlztPY99LnaGEuX5wq8ebNgoiCgcHdmc',
  PAYMENT_ID: '1RdKOKgXRb5yt1bWnw-a4jYqpkkTk41941ZFlMFkEdxk',
  TZ: 'Europe/Istanbul',
  TASK_SHEET: 'IS_TAKIP_GIRIS',
  CONFIG_SHEET: 'WEB_APP_CONFIG',
  MENU_SHEET: 'WEB_APP_MENU',
  EVENT_SHEET: 'EVENT_LEDGER'
});

const APP_INLINE_HTML = "<!doctype html>\n<html lang=\"tr\">\n<head>\n  <base target=\"_top\">\n  <meta charset=\"utf-8\">\n  <style>\n    :root{\n      --bg:#07111f;--bg2:#0b1728;--panel:#0f1e31;--panel2:#13243a;--line:#243a56;\n      --text:#f4f8ff;--muted:#9aacbf;--blue:#57b3ff;--green:#4bd39a;--amber:#ffc766;\n      --red:#ff6b77;--teal:#43d5cf;--shadow:0 18px 50px rgba(0,0,0,.28)\n    }\n    *{box-sizing:border-box}html,body{margin:0;background:linear-gradient(180deg,var(--bg),#091827 55%,#07111f);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif}\n    body{min-height:100vh}.app{max-width:1240px;margin:auto;padding:12px 12px 80px}\n    .topSwitch{position:sticky;top:8px;z-index:40;display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:6px;background:#071320e8;border:1px solid var(--line);border-radius:20px;backdrop-filter:blur(18px);box-shadow:var(--shadow)}\n    button{font:inherit}.topSwitch button{border:0;border-radius:15px;padding:15px 12px;font-weight:900;letter-spacing:.5px;background:transparent;color:var(--muted)}\n    .topSwitch button.on{background:linear-gradient(135deg,#1f86f2,#5bd2ff);color:#04101c}\n    .hero{margin-top:12px;padding:20px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(135deg,#10253d,#0d192a);box-shadow:var(--shadow)}\n    .eyebrow{font-size:11px;letter-spacing:1.5px;color:var(--teal);font-weight:900}.hero h1{margin:5px 0 0;font-size:27px}.hero p{margin:7px 0 0;color:var(--muted);line-height:1.45}\n    .sourcebar{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.badge{display:inline-flex;gap:6px;align-items:center;padding:7px 10px;border-radius:999px;background:#10283c;border:1px solid #244866;color:#b9d8ef;font-size:11px}\n    .badge.good{background:#123725;color:#87f0bb;border-color:#245c40}\n    .toolbar{display:flex;gap:8px;align-items:center;margin:12px 0}.toolbar input{flex:1;min-width:0;border:1px solid var(--line);background:#091522;color:white;border-radius:14px;padding:12px 14px;font-size:14px}\n    .toolbar button{border:1px solid var(--line);background:var(--panel);color:white;border-radius:14px;padding:12px 14px;font-weight:800}\n    .kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:9px;margin:12px 0}.kpi{border:1px solid var(--line);background:var(--panel);border-radius:17px;padding:14px}.kpi small{display:block;color:var(--muted);font-size:11px}.kpi b{display:block;font-size:24px;margin-top:5px}.kpi.red b{color:var(--red)}.kpi.amber b{color:var(--amber)}.kpi.green b{color:var(--green)}\n    .nav{display:flex;gap:7px;overflow:auto;padding:6px;background:var(--panel);border:1px solid var(--line);border-radius:17px;scrollbar-width:none}.nav::-webkit-scrollbar{display:none}.nav button{white-space:nowrap;border:0;background:transparent;color:var(--muted);padding:10px 12px;border-radius:11px;font-weight:800}.nav button.on{background:var(--panel2);color:white}\n    .section{margin-top:12px}.sectionHead{display:flex;align-items:end;justify-content:space-between;gap:8px;margin:0 2px 8px}.sectionHead h2{font-size:16px;margin:0}.sectionHead span{color:var(--muted);font-size:11px}\n    .list{display:grid;gap:8px}.item{border:1px solid var(--line);background:#0a1624;border-radius:16px;padding:13px}.itemTop{display:flex;gap:10px;justify-content:space-between;align-items:flex-start}.item h3{font-size:14px;margin:0;line-height:1.35}.meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.pill{font-size:10px;padding:4px 7px;border-radius:999px;background:#16304b;color:#aed7f5}.pill.red{background:#44202b;color:#ff9da5}.pill.amber{background:#46351a;color:#ffd98e}.pill.green{background:#173c2b;color:#9bf1bf}.note{margin-top:8px;color:#b6c4d5;font-size:12px;line-height:1.45}.action{border:1px solid #2d6149;background:#153624;color:#a5efc4;border-radius:10px;padding:8px 9px;font-size:11px;font-weight:900}\n    .empty{padding:32px;text-align:center;border:1px dashed var(--line);border-radius:16px;color:var(--muted);background:#0a1624}\n    #istasyon{display:none}.istGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.istCard{border:1px solid var(--line);background:var(--panel);border-radius:17px;padding:15px}.istCard small{color:var(--muted)}.istCard b{display:block;margin-top:6px;font-size:15px}\n    .financeTable{width:100%;border-collapse:collapse;font-size:12px}.financeTable td{border-bottom:1px solid #1d3048;padding:8px 6px}.financeTable td:first-child{color:#b8c6d6}.error{background:#3c1e25;border:1px solid #723541;color:#ffbac1;border-radius:14px;padding:12px}\n    @media(max-width:900px){.kpis{grid-template-columns:repeat(3,1fr)}}@media(max-width:600px){.app{padding:10px 10px 70px}.hero{padding:17px}.hero h1{font-size:23px}.kpis{grid-template-columns:repeat(2,1fr)}.istGrid{grid-template-columns:1fr}.itemTop{flex-direction:column}.action{width:100%}}\n  </style>\n</head>\n<body>\n<div class=\"app\">\n  <div class=\"topSwitch\">\n    <button id=\"swA\" class=\"on\" onclick=\"switchMode('apeiron')\">APEIRON</button>\n    <button id=\"swI\" onclick=\"switchMode('istasyon')\">İSTASYON</button>\n  </div>\n\n  <section id=\"apeiron\">\n    <div class=\"hero\">\n      <div class=\"eyebrow\">CONTROL CENTER · SINGLE SOURCE OF TRUTH</div>\n      <h1>Apeiron İş Takibi</h1>\n      <p>ChatGPT Site işlevleri artık Google Apps Script + Sheets üzerinde. Varsayılan salt-okuma; finansal yazma yalnız açık onayla.</p>\n      <div class=\"sourcebar\">\n        <span id=\"generated\" class=\"badge good\">Yükleniyor…</span>\n        <span id=\"source1\" class=\"badge\">Kontrol kaynağı</span>\n        <span id=\"source2\" class=\"badge\">Ödeme kaynağı</span>\n      </div>\n    </div>\n\n    <div class=\"toolbar\">\n      <input id=\"search\" placeholder=\"Görev, cari, banka, not ara…\" oninput=\"renderActive()\">\n      <button onclick=\"loadData()\">Yenile</button>\n    </div>\n\n    <div id=\"kpis\" class=\"kpis\"></div>\n    <div id=\"nav\" class=\"nav\"></div>\n    <div id=\"content\" class=\"section\"></div>\n  </section>\n\n  <section id=\"istasyon\">\n    <div class=\"hero\">\n      <div class=\"eyebrow\">ISTASYON · ALKAMMALI</div>\n      <h1>İstasyON Mali Operasyon</h1>\n      <p>Canlı kaynak önceliği, mutabakat, denetim izi ve onay kontrollü nihai yazım.</p>\n      <div class=\"sourcebar\"><span class=\"badge good\">READ / PREPARE OTOMATİK</span><span class=\"badge\">FINAL POSTING = ONAY</span></div>\n    </div>\n    <div id=\"istGrid\" class=\"istGrid\" style=\"margin-top:12px\"></div>\n    <div class=\"section\">\n      <div class=\"sectionHead\"><h2>Finans Özeti</h2><span>FINANS_DASHBOARD</span></div>\n      <div class=\"item\"><div id=\"finance\"></div></div>\n    </div>\n  </section>\n</div>\n\n<script>\nlet DATA=null, ACTIVE='critical';\nconst NAV=[\n ['critical','Kritik'],['today','Bugün'],['next7','7 Gün'],['todo','Yapılacaklar'],['payment','Ödenecekler'],\n ['collect','Tahsilatlar'],['order','Verilecek Siparişler'],['received','Alınan Siparişler'],['ready','Hazır Kayıtlar'],\n ['completed','Tamamlananlar']\n];\n\nfunction switchMode(m){\n  apeiron.style.display=m==='apeiron'?'block':'none';istasyon.style.display=m==='istasyon'?'block':'none';\n  swA.classList.toggle('on',m==='apeiron');swI.classList.toggle('on',m==='istasyon');\n}\nfunction esc(s){return String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[m]))}\nfunction fmtMoney(n){return new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(Number(n||0))}\nfunction duePill(d){if(!d)return '<span class=\"pill\">Tarihsiz</span>';const t=new Date().toISOString().slice(0,10);if(d<t)return '<span class=\"pill red\">Gecikmiş · '+esc(d)+'</span>';if(d===t)return '<span class=\"pill amber\">Bugün · '+esc(d)+'</span>';return '<span class=\"pill\">'+esc(d)+'</span>'}\nfunction titleOf(x){return x.title||x.account||x.ISLEM||x.OZET||x.OLAY||'Kayıt'}\nfunction hay(x){return JSON.stringify(x).toLocaleLowerCase('tr-TR')}\n\nfunction loadData(){\n  generated.textContent='Veri okunuyor…';\n  google.script.run.withSuccessHandler(d=>{\n    DATA=d; generated.textContent='CANLI · '+d.generated_at;\n    source1.textContent='Kontrol: '+shortTime(d.sources.control_modified_at);\n    source2.textContent='Ödeme: '+shortTime(d.sources.payment_modified_at)+' · '+d.sources.payment_tabs.join(', ');\n    renderAll();\n  }).withFailureHandler(e=>{\n    content.innerHTML='<div class=\"error\">Veri okunamadı: '+esc(e.message||e)+'</div>';\n    generated.textContent='BAĞLANTI HATASI';\n  }).getAppBootstrap();\n}\nfunction shortTime(s){try{return new Date(s).toLocaleString('tr-TR')}catch{return s||''}}\nfunction renderAll(){renderKpis();renderNav();renderActive();renderIstasyon()}\nfunction renderKpis(){\n const k=DATA.kpi;\n const items=[\n  ['Kritik / Gecikmiş',k.critical,'red'],['Bugün',k.today,'amber'],['7 Gün',k.next7,''],\n  ['Açık Ödeme',fmtMoney(k.open_payment),''],['Tahsilat',k.collections,''],['Sipariş',k.orders_to_place+k.received_orders,'green']\n ];\n kpis.innerHTML=items.map(x=>'<div class=\"kpi '+x[2]+'\"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>').join('');\n}\nfunction renderNav(){\n nav.innerHTML=NAV.map(x=>'<button class=\"'+(ACTIVE===x[0]?'on':'')+'\" onclick=\"setActive(\\''+x[0]+'\\')\">'+x[1]+'</button>').join('');\n}\nfunction setActive(k){ACTIVE=k;renderNav();renderActive()}\nfunction renderActive(){\n if(!DATA)return;\n const q=search.value.trim().toLocaleLowerCase('tr-TR');\n let rows=(DATA.sections[ACTIVE]||[]).filter(x=>!q||hay(x).includes(q));\n const label=(NAV.find(x=>x[0]===ACTIVE)||[,'Kayıtlar'])[1];\n content.innerHTML='<div class=\"sectionHead\"><h2>'+label+'</h2><span>'+rows.length+' kayıt</span></div>'+\n   '<div class=\"list\">'+(rows.length?rows.map(card).join(''):'<div class=\"empty\">Bu bölümde açık kayıt yok.</div>')+'</div>';\n}\nfunction card(x){\n const isPayment=x.kind==='payment'||Object.prototype.hasOwnProperty.call(x,'remaining');\n const title=esc(titleOf(x));\n const due=x.due||x.VADE||'';\n let meta=duePill(due);\n if(isPayment){\n   meta+='<span class=\"pill\">Kalan '+fmtMoney(x.remaining)+'</span>';\n   if(x.bank)meta+='<span class=\"pill\">'+esc(x.bank)+'</span>';\n } else {\n   if(x.category)meta+='<span class=\"pill\">'+esc(x.category)+'</span>';\n   if(x.owner)meta+='<span class=\"pill\">'+esc(x.owner)+'</span>';\n }\n const note=esc(x.note||x.ACIKLAMA||x['AÇIKLAMA']||x.KANIT||'');\n const canComplete=!isPayment && ['todo','order','received'].includes(x.category) && !x.completed_at;\n const action=canComplete?'<button class=\"action\" onclick=\"completeTask(\\''+esc(x.id)+'\\')\">Tamamlandı</button>':'';\n return '<div class=\"item\"><div class=\"itemTop\"><div><h3>'+title+'</h3><div class=\"meta\">'+meta+'</div></div>'+action+'</div>'+\n        (note?'<div class=\"note\">'+note+'</div>':'')+'</div>';\n}\nfunction completeTask(id){\n if(!confirm('Bu operasyonel görevi tamamlandı olarak işaretleyeyim mi?'))return;\n google.script.run.withSuccessHandler(()=>loadData()).withFailureHandler(e=>alert(e.message||e)).completeOperationalTask(id);\n}\nfunction renderIstasyon(){\n const x=DATA.istasyon||{};\n const cards=[\n  ['Durum',x.status],['Sürüm',x.version],['Son snapshot',x.generated_at],['Write mode',x.write_mode],\n  ['Banka otomasyonu',x.bank_automation],['Son banka kontrolü',x.last_bank_check],['Moka',x.moka_status],['Master',x.master_status]\n ];\n istGrid.innerHTML=cards.map(c=>'<div class=\"istCard\"><small>'+esc(c[0])+'</small><b>'+esc(c[1]||'—')+'</b></div>').join('');\n const rows=(DATA.finance||[]).filter(r=>r.some(v=>String(v||'').trim()));\n finance.innerHTML='<table class=\"financeTable\">'+rows.map(r=>'<tr>'+r.slice(0,5).map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</table>';\n}\nloadData();\n</script>\n</body></html>";

function doGet(e) {
  if (e && e.parameter && e.parameter.health === '1') {
    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      app: 'Apeiron | İstasyON',
      version: 'SCRIPT_SHEETS_V1_ONE_PASTE',
      time: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return HtmlService.createHtmlOutput(APP_INLINE_HTML)
    .setTitle('Apeiron | İstasyON')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getAppBootstrap() {
  const now = new Date();
  const today = isoDate_(now);
  const next7 = isoDate_(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
  const control = SpreadsheetApp.openById(APP.CONTROL_ID);
  const payment = SpreadsheetApp.openById(APP.PAYMENT_ID);

  const tasks = readTasks_(control);
  const payments = readPayments_(payment, now);
  const approvals = sheetObjects_(control, 'ONAY KUYRUGU', 'A1:Z150', 150);
  const documents = sheetObjects_(control, 'BELGE_INDEKSI', 'A1:L150', 150);
  const events = sheetObjects_(control, APP.EVENT_SHEET, 'A1:L150', 150);
  const health = sheetObjects_(control, 'KAYNAK SAGLIGI', 'A1:H80', 80);
  const menu = sheetObjects_(control, APP.MENU_SHEET, 'A1:H80', 80);
  const config = sheetObjects_(control, APP.CONFIG_SHEET, 'A1:D80', 80);
  const finance = sheetMatrix_(control, 'FINANS_DASHBOARD', 'A1:L40');
  const istasyon = readIstasyon_(control);

  const openTasks = tasks.filter(t => !t.completed_at && t.stage < 2);
  const todo = openTasks.filter(t => t.category === 'todo');
  const collect = openTasks.filter(t => t.category === 'collect');
  const order = openTasks.filter(t => t.category === 'order');
  const received = tasks.filter(t => !t.completed_at && t.category === 'received' && t.stage < 3);
  const completedToday = tasks.filter(t => String(t.completed_at || '').slice(0,10) === today);

  const openPayments = payments.rows.filter(p => p.remaining > 0);
  const overduePayments = openPayments.filter(p => p.due && p.due < today);
  const todayPayments = openPayments.filter(p => p.due === today);
  const next7Payments = openPayments.filter(p => p.due && p.due > today && p.due <= next7);

  const overdueTasks = openTasks.filter(t => t.due && t.due < today);
  const todayTasks = openTasks.filter(t => t.due === today);
  const next7Tasks = openTasks.filter(t => t.due && t.due > today && t.due <= next7);

  const critical = [
    ...overduePayments.map(p => Object.assign({kind:'payment'}, p)),
    ...overdueTasks.map(t => Object.assign({kind:'task'}, t))
  ].sort((a,b) => String(a.due || '').localeCompare(String(b.due || '')));

  const todayItems = [
    ...todayPayments.map(p => Object.assign({kind:'payment'}, p)),
    ...todayTasks.map(t => Object.assign({kind:'task'}, t))
  ];

  const next7Items = [
    ...next7Payments.map(p => Object.assign({kind:'payment'}, p)),
    ...next7Tasks.map(t => Object.assign({kind:'task'}, t))
  ].sort((a,b) => String(a.due || '').localeCompare(String(b.due || '')));

  const pendingApprovals = approvals.filter(a => {
    const s = norm_(a.DURUM);
    return !/uygulandi|uygulandı|tamam|closed|kapandi|kapandı/.test(s);
  });

  const pendingDocs = documents.filter(d => /bekliyor|inceleme|eslesme|eşleşme/.test(norm_(d.DURUM)));
  const ready = pendingApprovals.filter(a => /hazir|hazır|onay/.test(norm_(a.DURUM + ' ' + a.ISLEM)));

  return {
    ok: true,
    version: 'SCRIPT_SHEETS_V1',
    generated_at: fmtDateTime_(now),
    generated_iso: now.toISOString(),
    read_only_default: true,
    sources: {
      control_sheet_id: APP.CONTROL_ID,
      control_modified_at: DriveApp.getFileById(APP.CONTROL_ID).getLastUpdated().toISOString(),
      payment_sheet_id: APP.PAYMENT_ID,
      payment_modified_at: DriveApp.getFileById(APP.PAYMENT_ID).getLastUpdated().toISOString(),
      payment_tabs: payments.tabs
    },
    config: config,
    menu: menu.filter(x => norm_(x.STATUS) === 'aktif'),
    kpi: {
      critical: critical.length,
      today: todayItems.length,
      next7: next7Items.length,
      open_payment: sum_(openPayments,'remaining'),
      collections: collect.length,
      orders_to_place: order.length,
      received_orders: received.length,
      todos: todo.length,
      approvals: pendingApprovals.length
    },
    sections: {
      critical,
      today: todayItems,
      next7: next7Items,
      todo,
      payment: openPayments,
      collect,
      order,
      received,
      completed: completedToday,
      ready
    },
    approvals: pendingApprovals,
    documents: pendingDocs,
    events: events.slice(-30).reverse(),
    health,
    finance,
    istasyon
  };
}

/**
 * Non-financial write only.
 * collect/payment are intentionally blocked.
 * Uses KAYIT_ID for idempotent lookup and audit trail.
 */
function completeOperationalTask(taskId) {
  if (!taskId) throw new Error('KAYIT_ID gerekli.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.openById(APP.CONTROL_ID);
    const sh = ss.getSheetByName(APP.TASK_SHEET);
    const values = sh.getDataRange().getValues();
    const headers = values[0].map(String);
    const idx = indexMap_(headers);
    const rowOffset = values.slice(1).findIndex(r => String(r[idx.KAYIT_ID] || '') === String(taskId));
    if (rowOffset < 0) throw new Error('Kayıt bulunamadı: ' + taskId);

    const rowNo = rowOffset + 2;
    const row = values[rowNo - 1];
    const category = String(row[idx.CATEGORY] || '').toLowerCase();

    if (category === 'collect' || category === 'payment') {
      throw new Error('Finansal sonuç doğuran kayıtlar web panelinden tamamlanamaz; açık onay gerekir.');
    }
    if (!['todo','order','received'].includes(category)) {
      throw new Error('Bu kategori web panelinden tamamlanmaya kapalı.');
    }

    const completedCol = idx.TAMAMLANMA + 1;
    const stageCol = idx.STAGE + 1;
    const updatedCol = idx.SON_GUNCELLEME + 1;
    if (String(row[idx.TAMAMLANMA] || '').trim()) {
      return {ok:true, duplicate:true, id:taskId};
    }

    const stamp = new Date().toISOString();
    sh.getRange(rowNo, completedCol).setValue(stamp);
    sh.getRange(rowNo, stageCol).setValue(category === 'received' ? 3 : 2);
    sh.getRange(rowNo, updatedCol).setValue(stamp);

    appendAuditEvent_(ss, {
      source: 'Apps Script Web App',
      area: 'IS_TAKIP',
      event: 'OPERASYON_GOREVI_TAMAMLANDI',
      status: 'TAMAMLANDI',
      risk: 'DUSUK',
      approval: 'FINANSAL_DEGIL',
      next: '',
      evidence: 'KAYIT_ID=' + taskId,
      related: taskId
    });

    SpreadsheetApp.flush();
    return {ok:true, duplicate:false, id:taskId, completed_at:stamp};
  } finally {
    lock.releaseLock();
  }
}

function readTasks_(ss) {
  const sh = ss.getSheetByName(APP.TASK_SHEET);
  if (!sh) throw new Error(APP.TASK_SHEET + ' bulunamadı.');
  const values = sh.getRange(1,1,Math.max(sh.getLastRow(),1),20).getDisplayValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  const idx = indexMap_(headers);
  return values.slice(1)
    .filter(r => String(r[idx.KAYIT_ID] || '').trim())
    .map(r => ({
      id: String(r[idx.KAYIT_ID] || ''),
      category: String(r[idx.CATEGORY] || '').toLowerCase(),
      title: String(r[idx.BASLIK] || ''),
      due: isoDate_(r[idx.VADE]),
      amount: money_(r[idx.TUTAR]),
      paid: money_(r[idx.ODENEN]),
      stage: Number(r[idx.STAGE] || 0),
      note: String(r[idx.NOT] || ''),
      owner: String(r[idx.SAHIP] || ''),
      source: String(r[idx.KAYNAK] || ''),
      sync: String(r[idx.SYNC_DURUM] || ''),
      promise_date: isoDate_(r[idx.ODEME_SOZU_TARIHI]),
      promise_amount: money_(r[idx.ODEME_SOZU_TUTARI]),
      promisor: String(r[idx.SOZ_VEREN] || ''),
      completed_at: String(r[idx.TAMAMLANMA] || ''),
      updated_at: String(r[idx.SON_GUNCELLEME] || '')
    }));
}

function readPayments_(ss, now) {
  const tabNames = [monthTab_(now), monthTab_(new Date(now.getFullYear(), now.getMonth()+1, 1))];
  let rows = [];
  const used = [];
  tabNames.forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    used.push(name);
    const values = sh.getRange(1,1,Math.min(Math.max(sh.getLastRow(),1),250),Math.min(Math.max(sh.getLastColumn(),1),20)).getDisplayValues();
    const table = findTable_(values, ['TARİH','TARIH']);
    table.rows.forEach(x => {
      const accrual = money_(first_(x,['TUTAR','TAHAKKUK']));
      const paid = money_(first_(x,['ÖDENEN','ODENEN']));
      const remainingRaw = first_(x,['KALAN']);
      const remaining = remainingRaw === '' ? Math.max(accrual-paid,0) : money_(remainingRaw);
      rows.push({
        tab:name,
        due: isoDate_(first_(x,['TARİH','TARIH'])),
        due_status: String(first_(x,['VADE']) || ''),
        radar: String(first_(x,['RADAR']) || ''),
        status: String(first_(x,['DURUM']) || ''),
        accrual,
        paid,
        remaining,
        section: String(first_(x,['BÖLÜM','BOLUM']) || ''),
        bank: String(first_(x,['BANKA']) || ''),
        account: String(first_(x,['CARİ','CARI','KURUM']) || ''),
        method: String(first_(x,['YÖNTEM','YONTEM']) || ''),
        type: String(first_(x,['TÜR','TUR']) || ''),
        note: String(first_(x,['AÇIKLAMA / NOT','ACIKLAMA / NOT','AÇIKLAMA','ACIKLAMA']) || '')
      });
    });
  });
  return {tabs:used, rows:rows.filter(r => r.due || r.accrual || r.paid || r.remaining || r.bank || r.account || r.note)};
}

function readIstasyon_(control) {
  const sh = control.getSheetByName('ISTASYON_SNAPSHOT');
  if (!sh) return {ok:false, error:'ISTASYON_SNAPSHOT yok'};
  const vals = sh.getRange('A1:B40').getDisplayValues();
  const map = {};
  vals.slice(1).forEach(r => { if (r[0]) map[String(r[0])] = r[1]; });
  let snap = {};
  try { snap = map.SNAPSHOT_JSON ? JSON.parse(map.SNAPSHOT_JSON) : {}; } catch (e) {}
  return {
    ok:true,
    generated_at: map.GENERATED_AT || '',
    version: map.VERSION || '',
    status: map.STATUS || snap.status || '',
    write_mode: map.WRITE_MODE || snap.write_mode || '',
    main_source_id: map.MAIN_SOURCE_ID || (snap.main_source && snap.main_source.spreadsheet_id) || '',
    bank_automation: map.BANK_AUTOMATION || '',
    last_bank_check: map.LAST_BANK_CHECK || '',
    moka_status: map.MOKA_STATUS || '',
    data_quality_alert: map.DATA_QUALITY_ALERT || '',
    master_status: map.MASTER_STATUS || ''
  };
}

function sheetObjects_(ss, sheetName, rangeA1, limit) {
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return [];
  const values = sh.getRange(rangeA1).getDisplayValues();
  if (!values.length) return [];
  const headers = values[0].map(v => String(v || '').trim());
  return values.slice(1)
    .filter(r => r.some(v => String(v || '').trim()))
    .slice(0,limit || 200)
    .map(r => {
      const o = {};
      headers.forEach((h,i) => { if (h) o[h] = r[i]; });
      return o;
    });
}

function sheetMatrix_(ss, sheetName, rangeA1) {
  const sh = ss.getSheetByName(sheetName);
  return sh ? sh.getRange(rangeA1).getDisplayValues() : [];
}

function appendAuditEvent_(ss, x) {
  const sh = ss.getSheetByName(APP.EVENT_SHEET);
  if (!sh) return;
  const headers = sh.getRange(1,1,1,Math.max(sh.getLastColumn(),12)).getDisplayValues()[0].map(String);
  const map = {
    EVENT_ID: 'WEB-' + Utilities.getUuid(),
    ZAMAN: new Date().toISOString(),
    KAYNAK: x.source || 'Apps Script',
    ALAN: x.area || 'WEB_APP',
    OLAY: x.event || '',
    DURUM: x.status || '',
    RISK: x.risk || '',
    ONAY: x.approval || '',
    SONRAKI_ADIM: x.next || '',
    KANIT: x.evidence || '',
    ILISKILI_ID: x.related || '',
    SON_GUNCELLEME: new Date().toISOString()
  };
  const row = headers.map(h => map[h] == null ? '' : map[h]);
  sh.appendRow(row);
}

function findTable_(values, requiredHeaders) {
  let hi = -1;
  for (let i=0;i<values.length;i++) {
    const norm = values[i].map(v => String(v || '').trim().toLocaleUpperCase('tr-TR'));
    if (requiredHeaders.some(h => norm.includes(h))) { hi = i; break; }
  }
  if (hi < 0) return {headers:[], rows:[]};
  const headers = values[hi].map(v => String(v || '').trim().toLocaleUpperCase('tr-TR'));
  const rows = values.slice(hi+1)
    .filter(r => r.some(v => String(v || '').trim()))
    .map(r => {
      const o = {};
      headers.forEach((h,i) => { if (h) o[h] = r[i]; });
      return o;
    });
  return {headers, rows};
}

function first_(o, keys) {
  for (const k of keys) if (Object.prototype.hasOwnProperty.call(o,k)) return o[k];
  return '';
}
function indexMap_(headers) {
  const out = {};
  headers.forEach((h,i) => out[String(h || '').trim()] = i);
  return out;
}
function monthTab_(d) { return String(d.getMonth()+1) + String(d.getFullYear()).slice(-2) + 'A'; }
function norm_(v) { return String(v || '').toLocaleLowerCase('tr-TR').replace(/\s+/g,' ').trim(); }
function money_(v) {
  if (typeof v === 'number') return v;
  let s = String(v == null ? '' : v).trim();
  if (!s) return 0;
  s = s.replace(/\s/g,'').replace(/₺|TRY|TL/gi,'');
  if (s.includes(',')) s = s.replace(/\./g,'').replace(',','.');
  else s = s.replace(/,/g,'');
  const n = Number(s);
  return isFinite(n) ? n : 0;
}
function isoDate_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return Utilities.formatDate(v,APP.TZ,'yyyy-MM-dd');
  const s = String(v == null ? '' : v).trim();
  if (!s) return '';
  let m = s.match(/^(20\d{2})-(\d{2})-(\d{2})/);
  if (m) return m[1]+'-'+m[2]+'-'+m[3];
  m = s.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d{2})/);
  if (m) return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
  return s;
}
function fmtDateTime_(d) { return Utilities.formatDate(d,APP.TZ,'dd.MM.yyyy HH:mm'); }
function sum_(rows,key) { return Math.round(rows.reduce((a,r)=>a+Number(r[key]||0),0)*100)/100; }
