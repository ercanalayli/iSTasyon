// AperiON — read-only ERP event -> ÖDE Sheets mirror. GitHub Actions/cron.
 // No BizimHesap API writes, no changes to monthly payment tabs.
const SPREADSHEET = '1RdKOKgXRb5yt1bWnw-a4jYqpkkTk41941ZFlMFkEdxk';
const ENDPOINT = 'https://aperion-istasyon.pages.dev/api/bizimhesap-sheet-export';
const PREFIX = 'https://sheets.googleapis.com/v4/spreadsheets/';
const MODULES = {
  'BH_SATIS_KALEMLERI':22, 'BH_STOK_ENVANTER':19, 'BH_CARI_KARTLARI':18,
  'BH_CARI_HAREKETLERI':18, 'BH_KASA_BANKA':18, 'BH_ODEME_TAHSILAT':17,
  'BH_FATURALAR':19, 'BH_OLAY_GUNLUGU':15
};
const TRACK = 'BH_SENKRON_KONTROL';
const MAX_PAGES = 8, PAGE_SIZE = 150, ROW_START = 5;
const env = process.env;
function required(s) {if(!env[s]) throw Error('missing_secret_'+s);return env[s];}
function cell(v) {
  if(v===undefined||v===null)return '';
  if(typeof v==='number')return Number.isFinite(v)?v:'';
  if(typeof v==='boolean')return v?'TRUE':'FALSE';
  return String(v).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').slice(0,3500);
}
function money(v){if(v==null||v==='')return '';const x=Number(v);return Number.isFinite(x)?x:'';}
function src(e,p){return cell(e.external_ref||p.source_id||p.record_id||e.event_key);}
function moduleRow(e) {
 const p=e.payload||{},t=String(e.event_type||''),key=cell(e.event_key),company=cell(p.firma_id||p.company_id||e.subject_ref),
 stamp=cell(e.occurred_at),at=cell(e.received_at),url=cell(e.evidence_ref),hash=cell(e.content_hash);
 const state=e.truth_state==='confirmed'?'KAYNAK DOĞRULADI — ERP MUTABAKATI AYRI':
   e.truth_state==='deleted'?'KAYNAK SİLİNDİ — KANIT SAKLANDI':'KAYNAK DURUMU: '+cell(e.truth_state);
 if(t==='sale.invoice')return ['BH_SATIS_KALEMLERI',[key,src(e,p),money(p.kaynak_satir),company,cell(p.firma_adi),
  cell(p.tarih||stamp.slice(0,10)),cell(p.fatura_no),cell(p.unvan),cell(p.urun_kod),cell(p.barkod),
  cell(p.urun),money(p.adet),'',money(p.ciro),money(p.fifo_cost),'','cloudflare_d1',url,stamp,at,state,hash]];
 if(t.startsWith('stock.')||t.startsWith('inventory.'))return ['BH_STOK_ENVANTER',[key,company,cell(p.urun_kod),
  cell(p.barkod),cell(p.urun),cell(p.kategori),cell(p.birim),money(p.stok_miktari),'','',
  money(p.alis_fiyati),money(p.satis_fiyati),money(p.kdv_orani),p.negative_stock?'EKSİ STOK':'',
  'cloudflare_d1',stamp,at,state,hash]];
 if(t.startsWith('customer.')&&!t.startsWith('customer.movement.'))return ['BH_CARI_KARTLARI',
  [key,company,cell(p.cari_kod),cell(p.cari_unvan||p.unvan),cell(p.vergi_no),cell(p.vergi_dairesi),
  cell(p.sinif),money(p.borc),money(p.alacak),money(p.bakiye),cell(p.para_birimi),cell(p.email||p.telefon),
  'cloudflare_d1',url,stamp,at,state,hash]];
 if(t.startsWith('customer.movement')||t.startsWith('ledger.customer'))return ['BH_CARI_HAREKETLERI',
  [key,company,cell(p.cari_kod),cell(p.cari_unvan||p.unvan),cell(p.tarih||stamp.slice(0,10)),
  cell(p.belge_turu),cell(p.belge_no),cell(p.aciklama),money(p.borc),money(p.alacak),
  money(p.bakiye),cell(p.para_birimi),'cloudflare_d1',url,stamp,at,state,hash]];
 if(t.startsWith('account.')||t.startsWith('bank.')||t.startsWith('cash.'))return ['BH_KASA_BANKA',
  [key,company,cell(p.hesap_guid),cell(p.hesap_adi||p.hesap),cell(p.tarih||stamp.slice(0,10)),
  cell(p.islem),cell(p.aciklama),money(p.giris),money(p.cikis),money(p.bakiye),
  cell(p.karsi_hesap),cell(p.ref_no),'cloudflare_d1',url,stamp,at,state,hash]];
 if(t.startsWith('payment.')||t.startsWith('collection.'))return ['BH_ODEME_TAHSILAT',
  [key,company,cell(p.tarih||stamp.slice(0,10)),t,cell(p.cari_unvan||p.unvan),money(p.tutar),
  cell(p.odeme_araci||p.sekli),cell(p.hesap),cell(p.belge_no),cell(p.aciklama),
  cell(p.iliskili_islem_id),'cloudflare_d1',url,stamp,at,state,hash]];
 if(t.startsWith('invoice.')||t.startsWith('e-invoice.'))return ['BH_FATURALAR',
  [key,company,t,cell(p.fatura_no||p.belge_no),cell(p.uuid),cell(p.tarih||stamp.slice(0,10)),
  cell(p.vade),cell(p.unvan),cell(p.vergi_no),money(p.matrah),money(p.kdv),
  money(p.toplam),cell(p.odeme_durumu),'cloudflare_d1',url,stamp,at,state,hash]];
 return null;
}
const quote = s=>"'"+s.replaceAll("'","''")+"'";
async function api(token,url,options={}){
 const res=await fetch(url,{...options,headers:{Authorization:'Bearer '+token,
 'Content-Type':'application/json',...(options.headers||{})},signal:AbortSignal.timeout(50000)});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw Error('google_api_'+res.status+'_'+(data.error?.status||'failure'));
 return data;
}
async function googleToken(){
 const response=await fetch('https://oauth2.googleapis.com/token',{
  method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({client_id:required('GOOGLE_CLIENT_ID'),
    client_secret:required('GOOGLE_CLIENT_SECRET'),
    refresh_token:required('GOOGLE_REFRESH_TOKEN'),grant_type:'refresh_token'}),
  signal:AbortSignal.timeout(20000)});
 const obj=await response.json();if(!response.ok||!obj.access_token)throw Error('google_oauth_refresh_failed');
 return obj.access_token;
}
async function read(token,ranges){
 const u=new URL(PREFIX+SPREADSHEET+'/values:batchGet');
 for(const range of ranges)u.searchParams.append('ranges',range);
 u.searchParams.set('valueRenderOption','UNFORMATTED_VALUE');
 return (await api(token,u.toString())).valueRanges||[];
}
async function write(token,data){
 if(!data.length)return;
 const r=await api(token,PREFIX+SPREADSHEET+'/values:batchUpdate',{method:'POST',
   body:JSON.stringify({valueInputOption:'RAW',data,includeValuesInResponse:false})});
 if(!r.totalUpdatedCells)throw Error('zero_updated_cells');
}
async function grids(token) {
 const url=PREFIX+SPREADSHEET+'?fields=sheets(properties(title,sheetId,gridProperties(rowCount)))';
 const res=await api(token,url);
 return new Map((res.sheets||[]).map(s=>[s.properties.title,s.properties]));
}
async function grow(token,grids,name,toRow) {
 const grid=grids.get(name);if(!grid)throw Error('missing_sheet_'+name);
 if(grid.gridProperties.rowCount>=toRow)return;
 const need=toRow-grid.gridProperties.rowCount;
 await api(token,PREFIX+SPREADSHEET+':batchUpdate',{method:'POST',
  body:JSON.stringify({requests:[{appendDimension:{sheetId:grid.sheetId,dimension:'ROWS',length:need}}]})});
 grid.gridProperties.rowCount=toRow;
}
async function cloudflare(cursor){
 const uri=new URL(ENDPOINT);uri.searchParams.set('limit',String(PAGE_SIZE));
 if(cursor)uri.searchParams.set('cursor',cursor);
 const r=await fetch(uri,{headers:{Authorization:'Bearer '+required('APERION_BRIDGE_SECRET')},
   signal:AbortSignal.timeout(30000)});
 const data=await r.json().catch(()=>({}));
 if(!r.ok||data.ok!==true||!Array.isArray(data.records))throw Error('D1_export_http_'+r.status+'_'+(data.error||'invalid_contract'));
 return data;
}
async function main(){
 const token=await googleToken();
 const grid=await grids(token);
 for(const key of [...Object.keys(MODULES),TRACK])if(!grid.has(key))throw Error('missing_sheet_'+key);
 let cursor=(await read(token,[quote(TRACK)+'!L5']))[0]?.values?.[0]?.[0]||'';
 const original=cursor;
 const counts={seen:0,created:0,changed:0,skipped:0,pages:0};
 const rowCache=new Map();
 for(const tab of Object.keys(MODULES)){
   const rows=(await read(token,[quote(tab)+'!A5:A']))[0]?.values||[];
   rowCache.set(tab,new Map(rows.map((r,i)=>[String(r[0]||''),i+ROW_START]).filter(x=>x[0])));
 }
 for(let page=0;page<MAX_PAGES;page++){
   const data=await cloudflare(cursor);
   const grouped=new Map(),stamp=new Date().toISOString();
   for(const e of data.records){
     if(!e?.event_key)throw Error('event_missing_key');
     const module=moduleRow(e),log=[cell(e.event_key),cell(e.event_type),cell(e.truth_state),
       src(e,e.payload||{}),cell(e.payload?.firma_id),cell(e.occurred_at),
       cell(e.received_at),module?'UPSERT '+module[0]:'GÜNLÜK SADECE',
       '',cell(e.content_hash),cell(e.evidence_ref),'KAYNAK OLAYI','',stamp,0];
     for(const [tab,vals] of [module||[null,null],['BH_OLAY_GUNLUGU',log]]){
       if(!tab)continue;
       const group=grouped.get(tab)||[];group.push(vals);grouped.set(tab,group);
     }
     counts.seen++;
   }
   for(const [name,sourceRows] of grouped){
     const map=rowCache.get(name),width=MODULES[name],changes=[];
     for(const vals of sourceRows){
       const key=String(vals[0]);
       let row=map.get(key);
       if(!row){row=ROW_START+map.size;map.set(key,row);counts.created++;}
       else counts.changed++;
       const padded=Array.from({length:width},(_,i)=>cell(vals[i]));
       changes.push({range:quote(name)+'!A'+row+':'+String.fromCharCode(64+width)+' '+row,values:[padded]});
     }
     await grow(token,grid,name,ROW_START+map.size+5);
     // Correct ranges before sending, and write in API-safe chunks.
     for(const item of changes) item.range=item.range.replace(' ','');
     for(let i=0;i<changes.length;i+=75)await write(token,changes.slice(i,i+75));
     const sample=changes[changes.length-1];
     if(sample) {
       const returned=(await read(token,[sample.range]))[0]?.values?.[0]?.[0];
       if(String(returned)!==String(sample.values[0][0]))throw Error('readback_mismatch_'+name);
     }
   }
   if(data.records.length&&data.cursor===cursor)throw Error('cursor_not_advanced');
   // The cursor advances only once the corresponding source events have been written & verified.
   if(data.cursor&&data.cursor!==cursor){
      cursor=data.cursor; await write(token,[{range:quote(TRACK)+'!L5',values:[[cursor]]}]);
   }
   counts.pages++;
   if(!data.has_more||!data.records.length)break;
 }
 const now=new Date().toISOString();
 await write(token,[{range:quote(TRACK)+'!E4:G4',
    values:[[now,counts.seen?'D1 -> GOOGLE SHEETS AKTARIMI OK':'D1 OKUNDU — YENİ OLAY YOK',
       'SADECE OKUMA • Kaynak olay aktarımı; eksik modüller ayrı kontrol edilir']]}]);
 console.log(JSON.stringify({ok:true,cursorAdvanced:cursor!==original,counts}));
}
main().catch(error=>{console.error('BH_MIRROR_FAILED: '+String(error.message||error).slice(0,220));process.exitCode=1;});
