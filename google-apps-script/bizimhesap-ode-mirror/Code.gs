/**
 * AperiON: BizimHesap -> Google Sheets (read-only ERP mirror).
 * Deploy this as a separate bound/standalone Apps Script; do not replace existing
 * Telegram, payment, or approval scripts. No BizimHesap POST operations.
 *
 * Required Script Property: APERION_BRIDGE_SECRET (same as Cloudflare APERION_BRIDGE_SECRET).
 * Optional: APERION_SHEET_ID. Run installBizimHesapMirror() once with owner's OAuth.
 * The clock trigger polls every minute; delivery is NOT instantaneous or guaranteed.
 * Only source-confirmed events are tagged as confirmed. Historic pilot rows remain separate.
 */
var BH_MIRROR={
  spreadsheetId:'1RdKOKgXRb5yt1bWnw-a4jYqpkkTk41941ZFlMFkEdxk',
  endpoint:'https://aperion-istasyon.pages.dev/api/bizimhesap-sheet-export',
  source:'cloudflare_d1.canonical_events',
  cursorProperty:'BH_MIRROR_EVENT_CURSOR_V1',
  healthTab:'BH_SENKRON_KONTROL',
  logTab:'BH_OLAY_GUNLUGU',
  dataStart:5
};

function safeText_(v) {
  if(v===null||v===undefined) return '';
  var s=String(v).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'').slice(0,1500);
  return /^[=+@]/.test(s) ? "'"+s : s;
}
function n_(v) {
  if(v===null||v===undefined||v==='')return '';
  var a=Number(v);return Number.isFinite(a)?a:'';
}
function status_(e) {
  return e.truth_state==='confirmed'?'KAYNAK DOĞRULADI — BANKA/ERP MUTABAKATI AYRI':
    e.truth_state==='deleted'?'KAYNAK SİLİNDİ — TARİHSEL KANIT KORUNDU':'KAYNAK DURUMU: '+safeText_(e.truth_state);
}
function sourceId_(e,p) {
  return safeText_(e.external_ref||p.source_id||p.record_id||p.id||e.event_key);
}
function makeModuleRow_(e) {
  var p=e.payload||{},type=String(e.event_type||'').toLowerCase();
  var id=sourceId_(e,p),company=safeText_(p.firma_id||p.company_id||''),
      source=BH_MIRROR.source,at=safeText_(e.received_at||''),
      stamp=safeText_(e.occurred_at||''),evidence=safeText_(e.evidence_ref||p.source_url||''),
      hash=safeText_(e.content_hash||''),status=status_(e),key=safeText_(e.event_key);
  if(type==='sale.invoice') {
    return {tab:'BH_SATIS_KALEMLERI',values:[
      key,id,n_(p.kaynak_satir),company,safeText_(p.firma_adi||''),safeText_(p.tarih||stamp.slice(0,10)),
      safeText_(p.fatura_no),safeText_(p.unvan),safeText_(p.urun_kod),safeText_(p.barkod),
      safeText_(p.urun),n_(p.adet),'',n_(p.ciro),n_(p.fifo_cost),'',
      source,evidence,stamp,at,status,hash]};
  }
  if(type.indexOf('stock.')===0||type.indexOf('inventory.')===0) {
    return {tab:'BH_STOK_ENVANTER',values:[key,company,safeText_(p.urun_kod),safeText_(p.barkod),
      safeText_(p.urun),safeText_(p.kategori),safeText_(p.birim),n_(p.stok_miktari),'','',
      n_(p.alis_fiyati),n_(p.satis_fiyati),n_(p.kdv_orani),
      p.negative_stock===true?'EKSİ STOK':'',source,stamp,at,status,hash]};
  }
  if(type.indexOf('customer.')===0&&type.indexOf('movement')<0) {
    return {tab:'BH_CARI_KARTLARI',values:[key,company,safeText_(p.cari_kod),safeText_(p.cari_unvan||p.unvan),
      safeText_(p.vergi_no),safeText_(p.vergi_dairesi),safeText_(p.sinif),
      n_(p.borc),n_(p.alacak),n_(p.bakiye),safeText_(p.para_birimi),
      safeText_(p.email||p.telefon),source,evidence,stamp,at,status,hash]};
  }
  if(type.indexOf('customer.movement')===0||type.indexOf('ledger.customer')===0) {
    return {tab:'BH_CARI_HAREKETLERI',values:[key,company,safeText_(p.cari_kod),safeText_(p.cari_unvan||p.unvan),
      safeText_(p.tarih||stamp.slice(0,10)),safeText_(p.belge_turu),safeText_(p.belge_no),
      safeText_(p.aciklama),n_(p.borc),n_(p.alacak),n_(p.bakiye),
      safeText_(p.para_birimi),source,evidence,stamp,at,status,hash]};
  }
  if(type.indexOf('account.')===0||type.indexOf('cash.')===0||type.indexOf('bank.')===0) {
    return {tab:'BH_KASA_BANKA',values:[key,company,safeText_(p.hesap_guid),
      safeText_(p.hesap_adi||p.hesap),safeText_(p.tarih||stamp.slice(0,10)),safeText_(p.islem),
      safeText_(p.aciklama),n_(p.giris),n_(p.cikis),n_(p.bakiye),safeText_(p.karsi_hesap),
      safeText_(p.ref_no),source,evidence,stamp,at,status,hash]};
  }
  if(type.indexOf('payment.')===0||type.indexOf('collection.')===0) {
    return {tab:'BH_ODEME_TAHSILAT',values:[key,company,safeText_(p.tarih||stamp.slice(0,10)),
      safeText_(e.event_type),safeText_(p.cari_unvan||p.unvan),n_(p.tutar),
      safeText_(p.odeme_araci||p.sekli),safeText_(p.hesap),safeText_(p.belge_no),
      safeText_(p.aciklama),safeText_(p.iliskili_islem_id),source,evidence,stamp,at,status,hash]};
  }
  if(type.indexOf('invoice.')===0||type.indexOf('e-invoice.')===0) {
    return {tab:'BH_FATURALAR',values:[key,company,safeText_(e.event_type),safeText_(p.fatura_no||p.belge_no),
      safeText_(p.uuid),safeText_(p.tarih||stamp.slice(0,10)),safeText_(p.vade),
      safeText_(p.unvan),safeText_(p.vergi_no),n_(p.matrah),n_(p.kdv),
      n_(p.toplam),safeText_(p.odeme_durumu),source,evidence,stamp,at,status,hash]};
  }
  return null; // Unrecognized types remain in the event log, without invented financial columns.
}
function readIndex_(sheet) {
  var n=Math.max(0,sheet.getLastRow()-BH_MIRROR.dataStart+1),a=n?
    sheet.getRange(BH_MIRROR.dataStart,1,n,1).getValues():[],m={};
  a.forEach(function(row,i){var k=String(row[0]||'');if(k) m[k]=i+BH_MIRROR.dataStart;});
  return m;
}
function upsert_(sheet,records) {
  if(!records.length)return {inserted:0,updated:0};
  var index=readIndex_(sheet),width=sheet.getLastColumn(),appended=[],updated=0;
  records.forEach(function(rec){
    var values=rec.values.map(function(x){return typeof x==='string'?safeText_(x):x;});
    while(values.length<width)values.push('');
    values=values.slice(0,width);
    var old=index[values[0]];
    if(old){sheet.getRange(old,1,1,width).setValues([values]);updated++;}
    else {index[values[0]]=sheet.getLastRow()+appended.length+1;appended.push(values);}
  });
  if(appended.length) {
    var row=Math.max(BH_MIRROR.dataStart,sheet.getLastRow()+1),last=row+appended.length-1;
    if(sheet.getMaxRows()<last)sheet.insertRowsAfter(sheet.getMaxRows(),last-sheet.getMaxRows());
    sheet.getRange(row,1,appended.length,width).setValues(appended);
  }
  return {inserted:appended.length,updated:updated};
}
function readBatch_(cursor,secret) {
  var endpoint=BH_MIRROR.endpoint+'?limit=150'+(cursor?'&cursor='+encodeURIComponent(cursor):'');
  var resp=UrlFetchApp.fetch(endpoint,{method:'get',muteHttpExceptions:true,headers:{
    'Authorization':'Bearer '+secret,'Accept':'application/json'
  }});
  if(resp.getResponseCode()!==200)throw new Error('D1 event export HTTP '+resp.getResponseCode());
  var data=JSON.parse(resp.getContentText());
  if(!data.ok||!Array.isArray(data.records))throw new Error('bad_export_contract');
  return data;
}
function updateHealth_(ss,details) {
  var sh=ss.getSheetByName(BH_MIRROR.healthTab);
  if(!sh)return;
  // BH_SENKRON_KONTROL row 4 is the D1 live sales route; only claim what is observed.
  sh.getRange(4,5,1,3).setValues([[
    new Date().toISOString(),
    details.count>0?'D1 -> GOOGLE SHEETS AKTARIM TESTLİ':'D1 OKUNDU, YENİ OLAY YOK',
    'BAŞARILI API OKUMASI; DİĞER MODÜLLER KAPSAM KONTROLÜ BEKLİYOR'
  ]]);
}
function syncBizimHesapOnce() {
  var lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw new Error('sync_already_running');
  try {
    var props=PropertiesService.getScriptProperties();
    var secret=props.getProperty('APERION_BRIDGE_SECRET');
    if(!secret)throw new Error('missing_APERION_BRIDGE_SECRET');
    var ss=SpreadsheetApp.openById(props.getProperty('APERION_SHEET_ID')||BH_MIRROR.spreadsheetId);
    var cursor=props.getProperty(BH_MIRROR.cursorProperty)||'';
    var counts={received:0,inserted:0,updated:0,pages:0,unknown:0};
    for(var page=0;page<6;page++) {
      var data=readBatch_(cursor,secret),group={},logs=[],seen={},stamp=new Date().toISOString();
      data.records.forEach(function(e){
        var key=String(e.event_key||'');if(!key||seen[key])return;seen[key]=true;
        var module=makeModuleRow_(e);
        if(module){(group[module.tab]=group[module.tab]||[]).push(module);}
        else counts.unknown++;
        logs.push({values:[key,e.event_type||'',e.truth_state||'',sourceId_(e,e.payload||{}),
          safeText_((e.payload||{}).firma_id||''),safeText_(e.occurred_at),
          safeText_(e.received_at),module?'UPSERT: '+module.tab:'OLAY KAYDI',
          '',safeText_(e.content_hash),safeText_(e.evidence_ref),
          status_(e),'',stamp,0]});
      });
      Object.keys(group).forEach(function(name){
        var sheet=ss.getSheetByName(name);if(!sheet)throw new Error('missing_sheet:'+name);
        var summary=upsert_(sheet,group[name]);counts.inserted+=summary.inserted;
        counts.updated+=summary.updated;
      });
      var audit=ss.getSheetByName(BH_MIRROR.logTab);
      if(!audit)throw new Error('missing_BH_OLAY_GUNLUGU');
      var auditStats=upsert_(audit,logs);
      counts.received+=data.records.length;counts.pages++;
      // Advance only AFTER all source rows and their event logs are safely written.
      if(data.cursor&&data.cursor!==cursor){cursor=data.cursor;props.setProperty(BH_MIRROR.cursorProperty,cursor);}
      if(!data.has_more||!data.records.length)break;
    }
    updateHealth_(ss,counts);
    return counts;
  } finally {lock.releaseLock();}
}
function installBizimHesapMirror() {
  var props=PropertiesService.getScriptProperties();
  if(!props.getProperty('APERION_BRIDGE_SECRET'))throw new Error('missing_APERION_BRIDGE_SECRET');
  SpreadsheetApp.openById(props.getProperty('APERION_SHEET_ID')||BH_MIRROR.spreadsheetId)
    .getSheetByName('BH_SENKRON_KONTROL');
  ScriptApp.getProjectTriggers().forEach(function(t){
    if(t.getHandlerFunction()==='syncBizimHesapOnce')ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncBizimHesapOnce').timeBased().everyMinutes(1).create();
  // Does not trigger any financial write. First run is explicit/next scheduler tick.
}
