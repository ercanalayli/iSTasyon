/**
 * APEIRON | İSTASYON — PRODUCTION WEB APP V2
 * Old Apeiron feature-parity migration on canonical read/control sources. Financial records remain read-only.
 * Only todo/order/received completion is writable and audited.
 * No BizimHesap write functions and no legacy Gmail/bank automations in this file.
 */

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
  VERSION: '2.0.0',
  CONTROL_ID: '155hZ1PRVKH-vlztPY99LnaGEuX5wq8ebNgoiCgcHdmc',
  PAYMENT_ID: '1RdKOKgXRb5yt1bWnw-a4jYqpkkTk41941ZFlMFkEdxk',
  TZ: 'Europe/Istanbul',
  TASK_SHEET: 'IS_TAKIP_GIRIS',
  CONFIG_SHEET: 'WEB_APP_CONFIG',
  MENU_SHEET: 'WEB_APP_MENU',
  EVENT_SHEET: 'EVENT_LEDGER'
});

const APP_INLINE_HTML = "<!doctype html>\n<html lang=\"tr\">\n<head>\n  <base target=\"_top\">\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n  <style>\n    :root{\n      --bg:#06111d;--panel:#0d1c2e;--panel2:#12253b;--line:#233d59;--text:#f4f8ff;\n      --muted:#9db0c5;--blue:#4db8ff;--green:#4bd69a;--amber:#ffc65e;--red:#ff6b76;--teal:#42ddd5;\n      --shadow:0 16px 42px rgba(0,0,0,.28)\n    }\n    *{box-sizing:border-box}html,body{margin:0;background:linear-gradient(180deg,#06111d,#071827);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif}\n    body{min-height:100vh}.app{max-width:1320px;margin:auto;padding:12px 12px 70px}\n    button,input{font:inherit}.topSwitch{position:sticky;top:6px;z-index:50;display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:6px;border:1px solid var(--line);background:#071522ed;border-radius:18px;backdrop-filter:blur(16px)}\n    .topSwitch button{border:0;border-radius:13px;padding:14px;background:transparent;color:var(--muted);font-weight:900;letter-spacing:.5px}.topSwitch button.on{background:linear-gradient(135deg,#198cf5,#5ed6ff);color:#04111d}\n    .hero{margin-top:12px;border:1px solid var(--line);background:linear-gradient(135deg,#112842,#0c1b2d);border-radius:20px;padding:18px;box-shadow:var(--shadow)}\n    .eyebrow{font-size:11px;letter-spacing:1.4px;color:var(--teal);font-weight:900}.hero h1{font-size:27px;margin:5px 0 0}.hero p{margin:7px 0 0;color:var(--muted);line-height:1.45}\n    .sourcebar,.meta,.chips{display:flex;gap:7px;flex-wrap:wrap}.sourcebar{margin-top:11px}.badge,.pill{font-size:10px;border:1px solid #285071;background:#112b43;color:#b9d9f2;border-radius:999px;padding:5px 8px}.badge.good,.pill.green{background:#143d2b;border-color:#2c694b;color:#9cf1c2}.pill.red{background:#47212a;border-color:#6d303c;color:#ffabb2}.pill.amber{background:#493819;border-color:#6d5629;color:#ffd98a}\n    .moduleNav{display:flex;gap:7px;overflow:auto;margin:12px 0 8px;padding:6px;border:1px solid var(--line);background:#0b1828;border-radius:16px;scrollbar-width:none}.moduleNav::-webkit-scrollbar{display:none}.moduleNav button{white-space:nowrap;border:0;background:transparent;color:var(--muted);padding:10px 12px;border-radius:11px;font-weight:850}.moduleNav button.on{background:var(--panel2);color:white}\n    .toolbar{display:flex;gap:8px;margin:10px 0}.toolbar input{flex:1;min-width:0;border:1px solid var(--line);background:#071522;color:white;padding:12px;border-radius:13px}.toolbar button,.action{border:1px solid var(--line);background:var(--panel2);color:white;border-radius:12px;padding:11px 13px;font-weight:850}\n    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}.kpi{border:1px solid var(--line);background:var(--panel);border-radius:16px;padding:13px}.kpi small{display:block;color:var(--muted);font-size:11px}.kpi b{display:block;font-size:22px;margin-top:5px}.kpi.red b{color:var(--red)}.kpi.amber b{color:var(--amber)}.kpi.green b{color:var(--green)}\n    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.panel{border:1px solid var(--line);background:var(--panel);border-radius:17px;padding:14px;margin-top:10px}.panel h2,.panel h3{margin:0}.panel h2{font-size:17px}.panel h3{font-size:14px}.sub{color:var(--muted);font-size:11px;margin-top:4px;line-height:1.45}\n    .sectionHead{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-bottom:8px}.sectionHead span{font-size:11px;color:var(--muted)}\n    .list{display:grid;gap:8px}.item{border:1px solid var(--line);background:#081725;border-radius:14px;padding:12px}.itemTop{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.item h3{margin:0;font-size:14px;line-height:1.35}.note{font-size:12px;color:#bac9d8;line-height:1.45;margin-top:8px}.action{padding:8px 10px;font-size:11px;border-color:#2e694d;background:#153a28;color:#a6f2c9}\n    .priority{border:1px solid #2a6f62;background:linear-gradient(135deg,#0f302d,#0b1f2b)}.priority h2{font-size:19px}.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:10px}.step{background:#0a1926;border:1px solid #28465e;border-radius:12px;padding:10px}.step b{font-size:12px}.step span{display:block;color:var(--muted);font-size:10px;margin-top:4px}\n    .warning{border:1px solid #715628;background:#3a2d17;color:#ffe2a4;border-radius:13px;padding:11px;font-size:12px;line-height:1.45}.okbox{border:1px solid #2d654a;background:#153424;color:#b4f3d0;border-radius:13px;padding:11px;font-size:12px}\n    .workTabs{display:flex;gap:6px;overflow:auto;padding:5px;border:1px solid var(--line);background:#091725;border-radius:14px;margin-top:10px}.workTabs button{white-space:nowrap;border:0;background:transparent;color:var(--muted);padding:9px 11px;border-radius:9px;font-weight:800}.workTabs button.on{background:var(--panel2);color:white}\n    .financeTable{width:100%;border-collapse:collapse;font-size:11px}.financeTable td{padding:7px 5px;border-bottom:1px solid #1d344c;vertical-align:top}.financeTable td:first-child{color:#bed0e1}\n    .empty{padding:28px;border:1px dashed var(--line);border-radius:14px;text-align:center;color:var(--muted)}.error{padding:12px;border:1px solid #783741;background:#3d1e25;color:#ffc2c8;border-radius:13px}\n    #istasyon{display:none}\n    @media(max-width:900px){.kpis,.grid3{grid-template-columns:repeat(2,1fr)}.grid2{grid-template-columns:1fr}.steps{grid-template-columns:repeat(2,1fr)}}\n    @media(max-width:560px){.kpis{grid-template-columns:repeat(2,1fr)}.grid3{grid-template-columns:1fr}.steps{grid-template-columns:1fr}.itemTop{flex-direction:column}.action{width:100%}.hero h1{font-size:23px}}\n  </style>\n</head>\n<body>\n<div class=\"app\">\n  <div class=\"topSwitch\">\n    <button id=\"swA\" class=\"on\" onclick=\"switchMode('apeiron')\">APEIRON</button>\n    <button id=\"swI\" onclick=\"switchMode('istasyon')\">İSTASYON</button>\n  </div>\n\n  <section id=\"apeiron\">\n    <div class=\"hero\">\n      <div class=\"eyebrow\">CONTROL CENTER · SINGLE SOURCE OF TRUTH</div>\n      <h1>Apeiron İş Takibi</h1>\n      <p>Eski Apeiron İş Takibi işlevleri kanonik Google Sheets kaynaklarına taşınıyor. Eski ekrandaki sayı değil, işlev korunur; güncel veri her zaman kanonik kaynaktan gelir.</p>\n      <div class=\"sourcebar\">\n        <span id=\"generated\" class=\"badge good\">Yükleniyor…</span>\n        <span id=\"source1\" class=\"badge\">Kontrol kaynağı</span>\n        <span id=\"source2\" class=\"badge\">Ödeme kaynağı</span>\n        <span id=\"version\" class=\"badge\">V2</span>\n      </div>\n    </div>\n\n    <div id=\"moduleNav\" class=\"moduleNav\"></div>\n\n    <div class=\"toolbar\">\n      <input id=\"search\" placeholder=\"Görev, cari, banka, belge, not ara…\" oninput=\"renderModule()\">\n      <button onclick=\"loadData()\">Yenile</button>\n    </div>\n\n    <div id=\"content\"></div>\n  </section>\n\n  <section id=\"istasyon\">\n    <div class=\"hero\">\n      <div class=\"eyebrow\">İSTASYON · ALKAMMALI</div>\n      <h1>İstasyON Mali Operasyon</h1>\n      <p>Canlı kaynak önceliği, mutabakat, denetim izi ve onay kontrollü nihai yazım.</p>\n      <div class=\"sourcebar\"><span class=\"badge good\">READ / PREPARE OTOMATİK</span><span class=\"badge\">FINAL POSTING = ONAY</span></div>\n    </div>\n    <div id=\"istGrid\" class=\"grid2\"></div>\n    <div class=\"panel\">\n      <div class=\"sectionHead\"><h2>Finans Özeti</h2><span>FINANS_DASHBOARD</span></div>\n      <div id=\"finance\"></div>\n    </div>\n  </section>\n</div>\n\n<script>\nlet DATA=null;\nlet MODULE='daily';\nlet WORK='today';\n\nconst MODULES=[\n ['daily','Günlük Özet'],\n ['work','İş Takibi'],\n ['ready','Hazır Kayıtlar'],\n ['bizimhesap','BizimHesap'],\n ['finance','Finans / POS'],\n ['source','Kaynak İncelemesi'],\n ['documents','Belgeler'],\n ['health','Kaynak Sağlığı'],\n ['audit','İşlem Günlüğü']\n];\nconst WORKTABS=[\n ['critical','Kritik'],['today','Bugün'],['next7','7 Gün'],['todo','Yapılacaklar'],['payment','Ödenecekler'],\n ['collect','Tahsilatlar'],['order','Verilecek Siparişler'],['received','Alınan Siparişler'],['completed','Tamamlananlar']\n];\n\nfunction esc(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[m]})}\nfunction norm(s){return String(s==null?'':s).toLocaleLowerCase('tr-TR')}\nfunction hay(x){try{return norm(JSON.stringify(x))}catch(e){return norm(x)}}\nfunction fmtMoney(n){return new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(Number(n||0))}\nfunction dateLabel(d){const m=String(d||'').match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);return m?m[3]+'.'+m[2]+'.'+m[1]:String(d||'')}\nfunction duePill(d){if(!d)return '<span class=\"pill\">Tarihsiz</span>';const t=(DATA&&DATA.today)||'';const dl=dateLabel(d);if(t&&d<t)return '<span class=\"pill red\">Gecikmiş · '+esc(dl)+'</span>';if(t&&d===t)return '<span class=\"pill amber\">Bugün · '+esc(dl)+'</span>';return '<span class=\"pill\">'+esc(dl)+'</span>'}\nfunction shortTime(s){try{return new Date(s).toLocaleString('tr-TR')}catch(e){return s||''}}\nfunction titleOf(x){return x.title||x.account||x.ISLEM||x.OLAY||x.OZET||x['AÇIKLAMA']||x.ACIKLAMA||x.KURUM||'Kayıt'}\nfunction filterRows(rows){const q=norm(search.value.trim());return (rows||[]).filter(function(x){return !q||hay(x).includes(q)})}\n\nfunction switchMode(m){\n  apeiron.style.display=m==='apeiron'?'block':'none';\n  istasyon.style.display=m==='istasyon'?'block':'none';\n  swA.classList.toggle('on',m==='apeiron');swI.classList.toggle('on',m==='istasyon');\n  if(m==='istasyon'&&DATA)renderIstasyon();\n}\nfunction setModule(m){MODULE=m;renderModuleNav();renderModule()}\nfunction setWork(k){WORK=k;renderWork()}\nfunction renderModuleNav(){moduleNav.innerHTML=MODULES.map(function(x){return '<button class=\"'+(MODULE===x[0]?'on':'')+'\" onclick=\"setModule(\\''+x[0]+'\\')\">'+x[1]+'</button>'}).join('')}\n\nfunction loadData(){\n  generated.textContent='Veri okunuyor…';\n  google.script.run.withSuccessHandler(function(d){\n    DATA=d;\n    generated.textContent='CANLI · '+d.generated_at;\n    source1.textContent='Kontrol: '+shortTime(d.sources.control_modified_at);\n    source2.textContent='Ödeme: '+shortTime(d.sources.payment_modified_at)+' · '+d.sources.payment_tabs.join(', ');\n    version.textContent='Sürüm '+d.version;\n    renderModuleNav();renderModule();renderIstasyon();\n  }).withFailureHandler(function(e){\n    generated.textContent='BAĞLANTI HATASI';\n    content.innerHTML='<div class=\"error\">Veri okunamadı: '+esc(e.message||e)+'</div>';\n  }).getAppBootstrap();\n}\n\nfunction renderModule(){\n  if(!DATA)return;\n  if(MODULE==='daily')renderDaily();\n  else if(MODULE==='work')renderWork();\n  else if(MODULE==='ready')renderReady();\n  else if(MODULE==='bizimhesap')renderBizimHesap();\n  else if(MODULE==='finance')renderFinance();\n  else if(MODULE==='source')renderSource();\n  else if(MODULE==='documents')renderDocuments();\n  else if(MODULE==='health')renderHealth();\n  else if(MODULE==='audit')renderAudit();\n}\n\nfunction kpiHtml(){\n const k=DATA.kpi;\n const xs=[\n  ['Kritik / Gecikmiş',k.critical,'red'],['Bugün',k.today,'amber'],['7 Gün',k.next7,''],\n  ['Yapılacak',k.todos,''],['Açık Ödeme',fmtMoney(k.open_payment),''],['Tahsilat',k.collections,''],\n  ['Verilecek Sip.',k.orders_to_place,'green'],['Alınan Sip.',k.received_orders,'green']\n ];\n return '<div class=\"kpis\">'+xs.map(function(x){return '<div class=\"kpi '+x[2]+'\"><small>'+x[0]+'</small><b>'+x[1]+'</b></div>'}).join('')+'</div>';\n}\n\nfunction renderDaily(){\n const p=DATA.priority;\n const highlights=filterRows((DATA.sections.today||[]).concat(DATA.sections.critical||[]).slice(0,8));\n let h=kpiHtml();\n h+='<div class=\"grid2\">';\n h+='<div class=\"panel\"><div class=\"sectionHead\"><h2>Öne Çıkanlar</h2><span>Bugün + kritik</span></div><div class=\"list\">'+(highlights.length?highlights.map(card).join(''):'<div class=\"empty\">Şu anda öne çıkan kayıt yok.</div>')+'</div></div>';\n h+='<div class=\"panel\"><div class=\"sectionHead\"><h2>Yaklaşanlar</h2><span>Önümüzdeki 7 gün</span></div><div class=\"list\">'+((DATA.sections.next7||[]).length?filterRows(DATA.sections.next7).slice(0,8).map(card).join(''):'<div class=\"empty\">7 gün içinde kayıt yok.</div>')+'</div></div>';\n h+='</div>';\n if(p)h+=priorityCard(p);\n h+='<div class=\"grid2\">';\n h+='<div class=\"panel\"><div class=\"sectionHead\"><h2>Banka kapsamı</h2><span>Eski işlev taşındı</span></div>'+(DATA.bank_coverage.available?'<div class=\"okbox\">'+esc(DATA.bank_coverage.note)+'</div>':'<div class=\"warning\">'+esc(DATA.bank_coverage.note)+'</div>')+healthMini()+'</div>';\n h+='<div class=\"panel\"><div class=\"sectionHead\"><h2>Önümüzdeki 48 Saat</h2><span>Takvim</span></div>'+(DATA.calendar48.available?'<div class=\"okbox\">'+esc(DATA.calendar48.note)+'</div>':'<div class=\"warning\">'+esc(DATA.calendar48.note)+'</div>')+'</div>';\n h+='</div>';\n h+='<div class=\"panel\"><div class=\"sectionHead\"><h2>Kaynak İncelemesi</h2><span>'+DATA.source_review.events.length+' olay · '+DATA.source_review.documents.length+' belge</span></div>'+sourceMini()+'</div>';\n content.innerHTML=h;\n}\n\nfunction priorityCard(x){\n const note=esc(x.note||'');\n return '<div class=\"panel priority\"><div class=\"eyebrow\">EN ÖNCELİKLİ İŞ · AÇIK</div><h2>'+esc(titleOf(x))+'</h2><div class=\"meta\">'+duePill(x.due)+(x.amount?'<span class=\"pill\">'+fmtMoney(x.amount)+'</span>':'')+(x.category?'<span class=\"pill green\">'+esc(x.category)+'</span>':'')+'</div>'+\n '<div class=\"note\">'+note+'</div>'+\n '<div class=\"steps\"><div class=\"step\"><b>1 · Cari eşleşmesi</b><span>Kimlik eşleşmesi / kaynak teyidi</span></div><div class=\"step\"><b>2 · Taslak</b><span>Varsa taslak kaydı doğrula</span></div><div class=\"step\"><b>3 · Fatura</b><span>Fatura teyidi beklenir</span></div><div class=\"step\"><b>4 · Sevkiyat</b><span>Tarih ve kanıt beklenir</span></div></div>'+\n ((!['collect','payment'].includes(x.category)&&['todo','order','received'].includes(x.category))?'<button class=\"action\" style=\"margin-top:10px\" onclick=\"completeTask(\\''+esc(x.id)+'\\')\">Tamamlandı</button>':'')+\n '</div>';\n}\n\nfunction renderWork(){\n let rows=filterRows(DATA.sections[WORK]||[]);\n let h=kpiHtml();\n h+='<div class=\"panel\"><div class=\"sectionHead\"><div><h2>İş takibi ve bekleyenler</h2><div class=\"sub\">Yeni iş eklemek için normal ChatGPT’ye yaz. Web paneli ikinci veri kaynağı oluşturmaz.</div></div><span>'+rows.length+' kayıt</span></div>';\n h+='<div class=\"workTabs\">'+WORKTABS.map(function(x){return '<button class=\"'+(WORK===x[0]?'on':'')+'\" onclick=\"setWork(\\''+x[0]+'\\')\">'+x[1]+'</button>'}).join('')+'</div>';\n h+='<div class=\"list\" style=\"margin-top:8px\">'+(rows.length?rows.map(card).join(''):'<div class=\"empty\">Bu bölümde açık kayıt yok.</div>')+'</div></div>';\n content.innerHTML=h;\n}\n\nfunction card(x){\n const isPayment=x.kind==='payment'||Object.prototype.hasOwnProperty.call(x,'remaining');\n let meta=duePill(x.due||x.VADE||'');\n if(isPayment){\n   meta+='<span class=\"pill\">Kalan '+fmtMoney(x.remaining)+'</span>';\n   if(x.bank)meta+='<span class=\"pill\">'+esc(x.bank)+'</span>';\n }else{\n   if(x.amount)meta+='<span class=\"pill\">'+fmtMoney(x.amount)+'</span>';\n   if(x.category)meta+='<span class=\"pill\">'+esc(x.category)+'</span>';\n   if(x.owner)meta+='<span class=\"pill\">'+esc(x.owner)+'</span>';\n }\n const note=esc(x.note||x.ACIKLAMA||x['AÇIKLAMA / NOT']||x['AÇIKLAMA']||x.KANIT||x.SONRAKI_ADIM||'');\n const canComplete=!isPayment&&['todo','order','received'].includes(x.category)&&!x.completed_at;\n return '<div class=\"item\"><div class=\"itemTop\"><div><h3>'+esc(titleOf(x))+'</h3><div class=\"meta\">'+meta+'</div></div>'+(canComplete?'<button class=\"action\" onclick=\"completeTask(\\''+esc(x.id)+'\\')\">Tamamlandı</button>':'')+'</div>'+(note?'<div class=\"note\">'+note+'</div>':'')+'</div>';\n}\n\nfunction completeTask(id){\n if(!confirm('Bu operasyonel görevi tamamlandı olarak işaretleyeyim mi?'))return;\n google.script.run.withSuccessHandler(function(){loadData()}).withFailureHandler(function(e){alert(e.message||e)}).completeOperationalTask(id);\n}\n\nfunction renderReady(){\n const rows=filterRows(DATA.sections.ready||[]);\n let h='<div class=\"panel\"><div class=\"sectionHead\"><div><h2>Hazır Kayıtlar</h2><div class=\"sub\">Hazır olmak, nihai finansal yazımın yapıldığı anlamına gelmez. Final işlem açık onay ister.</div></div><span>'+rows.length+' kayıt</span></div>';\n h+='<div class=\"list\">'+(rows.length?rows.map(card).join(''):'<div class=\"empty\">Hazır kayıt yok.</div>')+'</div></div>';\n content.innerHTML=h;\n}\n\nfunction renderBizimHesap(){\n const rows=filterRows(DATA.bizimhesap.notifications||[]);\n let h='<div class=\"panel\"><div class=\"sectionHead\"><div><h2>BizimHesap</h2><div class=\"sub\">Salt-okuma / raporlama. Web uygulaması BizimHesap’a kayıt yazmaz.</div></div><span>'+rows.length+' bildirim</span></div>';\n h+=DATA.bizimhesap.health.length?'<div class=\"grid3\">'+DATA.bizimhesap.health.map(healthCard).join('')+'</div>':'<div class=\"warning\">BizimHesap için ayrı taze sağlık satırı yok.</div>';\n h+='<div class=\"list\" style=\"margin-top:10px\">'+(rows.length?rows.slice(0,20).map(genericCard).join(''):'<div class=\"empty\">BizimHesap bildirimi bulunamadı.</div>')+'</div></div>';\n content.innerHTML=h;\n}\n\nfunction renderFinance(){\n const rows=filterRows(DATA.finance_notifications||[]);\n let h=kpiHtml();\n h+='<div class=\"panel\"><div class=\"sectionHead\"><h2>Finans / POS Bildirimleri</h2><span>'+rows.length+' kayıt</span></div><div class=\"list\">'+(rows.length?rows.slice(0,25).map(genericCard).join(''):'<div class=\"empty\">Finans bildirimi yok.</div>')+'</div></div>';\n h+='<div class=\"panel\"><div class=\"sectionHead\"><h2>Finans Dashboard</h2><span>Özet görünüm</span></div><div id=\"finTable\"></div></div>';\n content.innerHTML=h;\n const mr=(DATA.finance||[]).filter(function(r){return r.some(function(v){return String(v||'').trim()})});\n finTable.innerHTML='<table class=\"financeTable\">'+mr.slice(0,40).map(function(r){return '<tr>'+r.slice(0,5).map(function(v){return '<td>'+esc(v)+'</td>'}).join('')+'</tr>'}).join('')+'</table>';\n}\n\nfunction renderSource(){\n let ev=filterRows(DATA.source_review.events||[]);\n let docs=filterRows(DATA.source_review.documents||[]);\n let fin=filterRows(DATA.source_review.finance||[]);\n let h='<div class=\"grid3\">';\n h+='<div class=\"panel\"><div class=\"sectionHead\"><h2>Olaylar</h2><span>'+ev.length+'</span></div><div class=\"list\">'+(ev.length?ev.slice(0,15).map(genericCard).join(''):'<div class=\"empty\">Olay yok.</div>')+'</div></div>';\n h+='<div class=\"panel\"><div class=\"sectionHead\"><h2>Belgeler</h2><span>'+docs.length+'</span></div><div class=\"list\">'+(docs.length?docs.slice(0,15).map(genericCard).join(''):'<div class=\"empty\">Belge yok.</div>')+'</div></div>';\n h+='<div class=\"panel\"><div class=\"sectionHead\"><h2>Finans gözlemleri</h2><span>'+fin.length+'</span></div><div class=\"list\">'+(fin.length?fin.slice(0,15).map(genericCard).join(''):'<div class=\"empty\">Gözlem yok.</div>')+'</div></div>';\n h+='</div><div class=\"sub\" style=\"margin-top:8px\">Kaynak gözlemi; ödeme, fatura, teslim veya nihai kayıt onayı değildir.</div>';\n content.innerHTML=h;\n}\n\nfunction sourceMini(){\n const ev=(DATA.source_review.events||[]).slice(0,3);\n const docs=(DATA.source_review.documents||[]).slice(0,3);\n const rows=ev.concat(docs);\n return '<div class=\"list\">'+(rows.length?rows.map(genericCard).join(''):'<div class=\"empty\">İnceleme kaydı yok.</div>')+'</div>';\n}\n\nfunction renderDocuments(){\n const rows=filterRows(DATA.documents||[]);\n content.innerHTML='<div class=\"panel\"><div class=\"sectionHead\"><div><h2>Belgeler</h2><div class=\"sub\">Drive kanıtı, belge durumu ve ilişkili kayıt birlikte gösterilir.</div></div><span>'+rows.length+' kayıt</span></div><div class=\"list\">'+(rows.length?rows.map(genericCard).join(''):'<div class=\"empty\">Bekleyen belge yok.</div>')+'</div></div>';\n}\nfunction renderHealth(){\n const rows=filterRows(DATA.health||[]);\n content.innerHTML='<div class=\"panel\"><div class=\"sectionHead\"><div><h2>Kaynak Sağlığı</h2><div class=\"sub\">Eski tarihli kaynak satırı taze veri olarak yorumlanmaz.</div></div><span>'+rows.length+' kaynak</span></div><div class=\"grid3\">'+(rows.length?rows.map(healthCard).join(''):'<div class=\"empty\">Sağlık kaydı yok.</div>')+'</div></div>';\n}\nfunction healthMini(){const rows=(DATA.health||[]).slice(0,6);return '<div class=\"grid3\" style=\"margin-top:9px\">'+rows.map(healthCard).join('')+'</div>'}\nfunction healthCard(x){return '<div class=\"item\"><h3>'+esc(x.KAYNAK||titleOf(x))+'</h3><div class=\"meta\"><span class=\"pill\">'+esc(x.DURUM||'—')+'</span></div><div class=\"note\">'+esc(x['SON BASARILI CEKIM']||x.ACIKLAMA||'')+'</div></div>'}\n\nfunction renderAudit(){\n const rows=filterRows(DATA.events||[]);\n content.innerHTML='<div class=\"panel\"><div class=\"sectionHead\"><div><h2>İşlem Günlüğü</h2><div class=\"sub\">Kullanıcı eylemleri ve kaynak olayları denetim izi olarak saklanır.</div></div><span>'+rows.length+' olay</span></div><div class=\"list\">'+(rows.length?rows.map(genericCard).join(''):'<div class=\"empty\">Olay yok.</div>')+'</div></div>';\n}\n\nfunction genericCard(x){\n const t=titleOf(x);\n const status=x.DURUM||x.STATUS||x.RISK||x['BİLDİRİM TÜRÜ']||'';\n const when=x.ZAMAN||x.TARIH||x['İŞLEM TARİHİ']||x['YAKALAMA TARİHİ']||x.SON_GUNCELLEME||'';\n const note=x.OZET||x.ACIKLAMA||x['AÇIKLAMA']||x.NOT||x.SONRAKI_ADIM||x.KANIT||'';\n const amount=x.TUTAR||x['TUTAR']||'';\n return '<div class=\"item\"><h3>'+esc(t)+'</h3><div class=\"meta\">'+(status?'<span class=\"pill\">'+esc(status)+'</span>':'')+(when?'<span class=\"pill\">'+esc(when)+'</span>':'')+(amount?'<span class=\"pill\">'+esc(amount)+'</span>':'')+'</div>'+(note?'<div class=\"note\">'+esc(note)+'</div>':'')+'</div>';\n}\n\nfunction renderIstasyon(){\n if(!DATA)return;\n const x=DATA.istasyon||{};\n const cards=[\n  ['Durum',x.status],['Sürüm',x.version],['Son snapshot',x.generated_at],['Write mode',x.write_mode],\n  ['Banka otomasyonu',x.bank_automation],['Son banka kontrolü',x.last_bank_check],['Moka',x.moka_status],['Master',x.master_status]\n ];\n istGrid.innerHTML=cards.map(function(c){return '<div class=\"panel\"><small class=\"sub\">'+esc(c[0])+'</small><h3 style=\"margin-top:6px\">'+esc(c[1]||'—')+'</h3></div>'}).join('');\n const rows=(DATA.finance||[]).filter(function(r){return r.some(function(v){return String(v||'').trim()})});\n finance.innerHTML='<table class=\"financeTable\">'+rows.slice(0,40).map(function(r){return '<tr>'+r.slice(0,5).map(function(v){return '<td>'+esc(v)+'</td>'}).join('')+'</tr>'}).join('')+'</table>';\n}\nloadData();\n</script>\n</body>\n</html>";

function doGet(e) {
  if (e && e.parameter && e.parameter.health === '1') {
    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      app: 'Apeiron | İstasyON',
      version: APP.VERSION,
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
  const financeNotifications = sheetObjects_(control, 'FINANS_BILDIRIMLERI', 'A1:R220', 220);
  const istasyon = readIstasyon_(control);

  const openTasks = tasks.filter(t => !t.completed_at);
  const todo = openTasks.filter(t => t.category === 'todo');
  const collect = openTasks.filter(t => t.category === 'collect');
  const order = openTasks.filter(t => t.category === 'order');
  const received = openTasks.filter(t => t.category === 'received');
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

  const recentEvents = events.slice(-60).reverse();
  const recentFinance = financeNotifications.slice(-80).reverse();
  const bizimhesapNotifications = recentFinance.filter(x => /bizimhesap/.test(norm_(x.KURUM + ' ' + x['BİLDİRİM TÜRÜ'])));
  const bizimhesapHealth = health.filter(x => /bizimhesap/.test(norm_(x.KAYNAK + ' ' + x.ACIKLAMA)));
  const priority = received[0] || todayTasks[0] || order[0] || todo[0] || (critical[0] || null);

  return {
    ok: true,
    version: APP.VERSION,
    generated_at: fmtDateTime_(now),
    generated_iso: now.toISOString(),
    today: today,
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
    events: recentEvents,
    health,
    finance,
    finance_notifications: recentFinance,
    priority: priority,
    source_review: {
      events: recentEvents,
      documents: pendingDocs,
      finance: recentFinance
    },
    bizimhesap: {
      notifications: bizimhesapNotifications,
      health: bizimhesapHealth
    },
    bank_coverage: {
      available: false,
      note: 'Banka kapsamı bileşeni taşındı; ancak eski ekrandaki 2/19 sayısı güncel kanonik kaynakta yok. Taze kapsam kaynağı bağlanana kadar eski sayı tekrar kullanılmayacak.'
    },
    calendar48: {
      available: false,
      note: '48 saat takvim bileşeni taşındı. Kullanılacak takvim kimlikleri kanonik olarak bağlanmadan etkinlik var/yok sonucu üretilmeyecek.'
    },
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
  const required = ['KAYIT_ID','CATEGORY','BASLIK','VADE','STAGE','TAMAMLANMA','SON_GUNCELLEME'];
  const missing = required.filter(h => idx[h] == null);
  if (missing.length) throw new Error(APP.TASK_SHEET + ' şema hatası: eksik sütun ' + missing.join(', '));
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
      completed_at: isoDate_(r[idx.TAMAMLANMA]),
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
    const table = findTable_(values, [['TARİH','TARIH'], ['TUTAR','TAHAKKUK','KALAN']]);
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

function runApeironSelfTest() {
  const checks = [];
  const add = (name, ok, detail) => checks.push({name:name, ok:!!ok, detail:String(detail == null ? '' : detail)});
  try {
    const control = SpreadsheetApp.openById(APP.CONTROL_ID);
    const payment = SpreadsheetApp.openById(APP.PAYMENT_ID);
    add('CONTROL_SHEET_ACCESS', !!control, control.getName());
    add('PAYMENT_SHEET_ACCESS', !!payment, payment.getName());

    const requiredSheets = [APP.TASK_SHEET, APP.CONFIG_SHEET, APP.MENU_SHEET, APP.EVENT_SHEET, 'KAYNAK SAGLIGI', 'ONAY KUYRUGU', 'BELGE_INDEKSI', 'FINANS_DASHBOARD', 'ISTASYON_SNAPSHOT'];
    requiredSheets.forEach(n => add('SHEET_' + n, !!control.getSheetByName(n), n));

    const taskSh = control.getSheetByName(APP.TASK_SHEET);
    if (taskSh) {
      const headers = taskSh.getRange(1,1,1,Math.max(taskSh.getLastColumn(),20)).getDisplayValues()[0].map(String);
      const idx = indexMap_(headers);
      ['KAYIT_ID','CATEGORY','BASLIK','VADE','STAGE','TAMAMLANMA','SON_GUNCELLEME'].forEach(h => add('TASK_HEADER_' + h, idx[h] != null, h));
    }

    const currentTab = monthTab_(new Date());
    const paySh = payment.getSheetByName(currentTab);
    add('PAYMENT_TAB_CURRENT', !!paySh, currentTab);
    if (paySh) {
      const vals = paySh.getRange(1,1,Math.min(Math.max(paySh.getLastRow(),1),250),Math.min(Math.max(paySh.getLastColumn(),1),20)).getDisplayValues();
      const table = findTable_(vals, [['TARİH','TARIH'], ['TUTAR','TAHAKKUK','KALAN']]);
      add('PAYMENT_TABLE_HEADER', table.headers.length > 0, table.headers.join(' | '));
    }

    add('DATE_01_EKIM_26', isoDate_('01 Ekim 26') === '2026-10-01', isoDate_('01 Ekim 26'));
    add('DATE_01_KASIM_26', isoDate_('01 Kasım 26') === '2026-11-01', isoDate_('01 Kasım 26'));
    add('DATE_DDMMYYYY', isoDate_('05.10.2026') === '2026-10-05', isoDate_('05.10.2026'));
    add('MONEY_75000', money_('75.000 ₺') === 75000, money_('75.000 ₺'));
    add('MONEY_327889_44', Math.abs(money_('327.889,44 TL') - 327889.44) < 0.001, money_('327.889,44 TL'));
    add('MONEY_1', money_('1 ₺') === 1, money_('1 ₺'));

    const boot = getAppBootstrap();
    add('BOOTSTRAP_OK', boot && boot.ok === true, boot && boot.version);
    add('TODAY_FORMAT', /^20\d{2}-\d{2}-\d{2}$/.test(boot.today || ''), boot.today);
    add('PAYMENT_TABS_USED', !!(boot.sources && boot.sources.payment_tabs && boot.sources.payment_tabs.length), (boot.sources && boot.sources.payment_tabs || []).join(', '));
    add('SOURCE_REVIEW_READY', !!(boot.source_review && Array.isArray(boot.source_review.events)), 'events=' + ((boot.source_review && boot.source_review.events || []).length));
    add('PRIORITY_RULE', Object.prototype.hasOwnProperty.call(boot,'priority'), boot.priority ? boot.priority.id || boot.priority.title || 'set' : 'none');
    add('OLD_FEATURE_GATES', !!boot.bank_coverage && !!boot.calendar48, 'bank/calendar components present');
  } catch (e) {
    add('UNCAUGHT', false, e && e.stack ? e.stack : e);
  }
  const failed = checks.filter(x => !x.ok);
  return {ok: failed.length === 0, version: APP.VERSION, checked_at: fmtDateTime_(new Date()), total: checks.length, failed: failed.length, checks: checks};
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
  const groups = (requiredHeaders || []).map(x => Array.isArray(x) ? x : [x]);
  for (let i=0;i<values.length;i++) {
    const norm = values[i].map(v => String(v || '').trim().toLocaleUpperCase('tr-TR'));
    const ok = groups.every(g => g.some(h => norm.includes(String(h).toLocaleUpperCase('tr-TR'))));
    if (ok) { hi = i; break; }
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
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v == null ? '' : v).trim();
  if (!s || s === '-' || s === '—') return 0;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1,-1); }
  s = s.replace(/\s/g,'').replace(/₺|TRY|TL/gi,'').replace(/[^0-9,\.\-]/g,'');
  if (!s) return 0;
  if (s.includes(',')) {
    s = s.replace(/\./g,'').replace(',','.');
  } else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g,'');
  } else {
    s = s.replace(/,/g,'');
  }
  const n = Number(s);
  if (!isFinite(n)) return 0;
  return neg ? -Math.abs(n) : n;
}
function isoDate_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return Utilities.formatDate(v,APP.TZ,'yyyy-MM-dd');
  const s = String(v == null ? '' : v).trim();
  if (!s) return '';

  let m = s.match(/^(20\d{2})-(\d{2})-(\d{2})/);
  if (m) return m[1]+'-'+m[2]+'-'+m[3];

  m = s.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2}|20\d{2})/);
  if (m) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return y+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
  }

  const trMonths = {
    'oca':1,'ocak':1,
    'sub':2,'şub':2,'subat':2,'şubat':2,
    'mar':3,'mart':3,
    'nis':4,'nisan':4,
    'may':5,'mayis':5,'mayıs':5,
    'haz':6,'haziran':6,
    'tem':7,'temmuz':7,
    'agu':8,'ağu':8,'agustos':8,'ağustos':8,
    'eyl':9,'eylul':9,'eylül':9,
    'eki':10,'ekim':10,
    'kas':11,'kasim':11,'kasım':11,
    'ara':12,'aralik':12,'aralık':12
  };
  const clean = s.toLocaleLowerCase('tr-TR').replace(/\s+/g,' ').trim();
  m = clean.match(/^(\d{1,2})\s+([a-zçğıöşü]+)\s+(\d{2}|20\d{2})/i);
  if (m) {
    const mon = trMonths[m[2]];
    if (mon) {
      const y = m[3].length === 2 ? '20' + m[3] : m[3];
      return y+'-'+('0'+mon).slice(-2)+'-'+('0'+m[1]).slice(-2);
    }
  }
  return '';
}
function fmtDateTime_(d) { return Utilities.formatDate(d,APP.TZ,'dd.MM.yyyy HH:mm'); }
function sum_(rows,key) { return Math.round(rows.reduce((a,r)=>a+Number(r[key]||0),0)*100)/100; }
