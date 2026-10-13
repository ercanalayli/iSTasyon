import { inspectAbstractEnvelope } from './bizimhesap-abstract-shape.js';
/**
 * Owner-only Telegram BizimHesap customer statement, READ ONLY.
 * Independent channel authentication: verified Telegram webhook secret,
 * allowlisted private owner chat, message.from.id === chat.id. This DOES NOT
 * grant or bypass the separate Supabase owner-JWT endpoint.
 * All secrets remain server-side. Zero ERP posting and zero background replay.
 */
const ID = /^[a-f0-9]{32}$/i;
const BASE = 'https://bizimhesap.com/api/b2b';
const noData = (reason) => '🔒 Cari ekstre okunamadı ('+reason+'). BizimHesap kaydı yapılmadı.';

export function ownerPrivateTelegram(identity, message) {
  return Boolean(identity?.ok && identity?.hardened &&
    message?.chat?.type === 'private' &&
    message?.from?.id != null &&
    String(message.from.id) === String(message.chat.id) &&
    String(identity.chatId) === String(message.chat.id) &&
    String(identity.userId) === String(message.from.id));
}

export function parseCariSearch(text) {
  const m = /^\/cariekstre(?:@\w+)?\s+(.+)$/iu.exec(String(text||'').trim());
  if(!m)return null;
  const name=m[1].replace(/\s+/g,' ').trim();
  if(name.length<3||name.length>70||!/^[\p{L}\p{N} .&'\-]+$/u.test(name))return null;
  return name;
}

export function cariLookupPath(name) {
  // PostgREST ILIKE %term%; encoded URI prevents interpolation into filter.
  return '/rest/v1/aperion_bh_customer_owner_lookup_v1' +
    '?select=customer_id,title,source_health,last_success_at' +
    '&title=ilike.'+encodeURIComponent('*'+name+'*')+'&limit=6';
}

function validRowName(row) {
  return typeof row?.title==='string' &&
    row.title.trim().length>0 && row.title.length<=220 &&
    ID.test(String(row.customer_id||''));
}
export function selectUniqueFreshCustomer(rows) {
  if(!Array.isArray(rows))return {ok:false,error:'KAYNAK_BELİRSİZ'};
  if(rows.length===0)return {ok:false,error:'CARİ_BULUNAMADI'};
  if(rows.some(r=>r?.source_health!=='FRESH'||!r?.last_success_at))
    return {ok:false,error:'CARİ_KAYNAĞI_GÜNCEL_DEĞİL'};
  if(rows.some(r=>!validRowName(r)))return {ok:false,error:'CARİ_KİMLİĞİ_DOĞRULANAMADI'};
  if(rows.length!==1)return {ok:false,error:'BİRDEN_FAZLA_CARİ',names:rows.slice(0,3).map(x=>String(x.title).slice(0,90))};
  return {ok:true,customerId:rows[0].customer_id,title:rows[0].title.trim(),sourceLastSuccess:rows[0].last_success_at};
}

const fieldsNormalized = x => String(x).toLowerCase().replace(/[^a-z0-9]/g,'');
const first=(row,fields)=>{
  const want=new Set(fields.map(fieldsNormalized));
  const containers=[row,row?.dates,row?.Dates,row?.amounts,row?.Amounts];
  for(const obj of containers){
    if(!obj || typeof obj!=='object' || Array.isArray(obj))continue;
    for(const [key,value] of Object.entries(obj)){
      if(want.has(fieldsNormalized(key)) && (typeof value==='string'||typeof value==='number') &&
        String(value).trim())return value;
    }
  }
  return null;
};
const dateFields=['documentDate','docDate','invoiceDate','issueDate','transactionDate','date','tarih','createdAt','islemTarihi','belgeTarihi','recordDate'];
const noFields=['documentNo','docNo','invoiceNo','invoiceNumber','documentNumber','reference','Reference','belgeNo','voucherNo','refNo','serialNo','faturaNo','guid'];
const amountFields=['amount','Amount','totalAmount','AmountTotal','gross','netAmount','paymentAmount','total','tutar','Tutar'];
const safeText=(v,max=75)=>String(v??'').replace(/[\r\n\t\u0000-\u001f]/g,' ').slice(0,max).trim();

export function summarizeVerifiedAbstract(vendor,{title,sourceLastSuccess,nowIso}) {
  if(!vendor||typeof vendor!=='object'||![1,'1'].includes(vendor.resultCode))
    return noData('BİZİMHESAP_BAŞARI_KODU_YOK');
  const inspection=inspectAbstractEnvelope(vendor);
  if(inspection.status==='OVERFLOW')
    return '⚠️ BizimHesap cari veri yapısı çok büyük veya derin. Eksik bölümü tam ekstre saymıyorum.';
  if(inspection.status==='UNSUPPORTED') {
    // Keys and types only; NEVER expose financial values, account IDs, tokens,
    // emails, phone numbers or raw provider response via error diagnostics.
    return '⚠️ BizimHesap okuması başarılı (resultCode=1), ancak cari hareket satırlarının biçimi doğrulanamadı. Ekstre VERIFIED değil.\n'+
      'Güvenli biçim özeti (yalnız alan adları): '+
      inspection.hints.join(' | ').slice(0,650);
  }
  if(inspection.status==='EMPTY')
    return '⚠️ BizimHesap yanıtında boş hareket dizileri var. Bu, müşterinin hareketi olmadığına veya kapsamın tam olduğuna ilişkin kesin kanıt değil.';
  const sectionLines=[];
  let foundDocument=false;
  for(const section of inspection.sections.slice(0,4)){
    const printable=[];
    for(const row of section.rows.slice(0,4)){
      if(!row||typeof row!=='object'||Array.isArray(row))continue;
      const date=safeText(first(row,dateFields),24),ref=safeText(first(row,noFields),65);
      const amount=safeText(first(row,amountFields),28);
      if(!date&&!ref)continue;
      foundDocument=true;
      printable.push('• '+(date||'Tarih yok')+' · '+(ref||'Belge no yok')+
        (amount?' · bildirilen tutar: '+amount:''));
    }
    const location=safeText(section.path,90);
    sectionLines.push('Bölüm: '+location+' · kaynak satırları: '+section.rows.length+
      (printable.length?'\n'+printable.join('\n'):' · belge alanları doğrulanamadı'));
  }
  if(!foundDocument)return '⚠️ Cari veri dizileri bulundu, ancak tarih/belge alanları doğrulanamadı. Ekstre VERIFIED değil.';
  return '📄 BizimHesap cari ekstresi — salt okuma\n'+
    'Cari: '+safeText(title,105)+'\n'+
    'Kaynak: GET /abstract · resultCode=1\n'+
    'Okuma: '+safeText(nowIso,30)+'\n'+
    'Cari listesinin son aktarımı: '+safeText(sourceLastSuccess,32)+'\n'+
    sectionLines.join('\n')+
    '\n⚠️ Bunlar kaynak yanıtından belge örnekleridir; borç/alacak yönü ve ekstre kapsamı ayrıca doğrulanmalı. Kayıt yapılmadı.';
}

// The telemetry is limited to allowlisted JSON key names. Nothing from a
// customer document or credential is saved. No financial write is performed.
export function safeCariShapeEvidence(payload) {
  const inspection=inspectAbstractEnvelope(payload);
  const allowed=/^[A-Za-z0-9_.,:\\[\\]{} ]{1,110}$/;
  const prohibited=/token|secret|password|auth|cookie|bearer|apikey|credential|email|phone|address|taxno|session/i;
  const key_shape_hints=inspection.hints.filter(x=>allowed.test(x)&&!prohibited.test(x)).slice(0,12);
  return {classification:inspection.status,key_shape_hints};
}

export async function readOwnerCariAbstract({env,message,identity,dbGet,providerGet,evidenceSink}) {
  if(!ownerPrivateTelegram(identity,message))return noData('YETKİLİ_ÖZEL_SOHBET_GEREKLİ');
  const name=parseCariSearch(message.text);
  if(!name)return 'Kullanım: /cariekstre cari adı (en az 3 karakter).';
  let resolver;
  try{resolver=await dbGet(cariLookupPath(name));}catch{return noData('CARİ_ARŞİVİ_ERİŞİM_HATASI');}
  if(!resolver?.ok)return noData('CARİ_ARŞİVİ_ERİŞİM_HATASI');
  const selected=selectUniqueFreshCustomer(resolver.data);
  if(!selected.ok)return selected.error==='BİRDEN_FAZLA_CARİ'
    ? '⚠️ Birden fazla cari bulundu; tam unvanla tekrar sorgula:\n'+selected.names.map(x=>'• '+safeText(x,90)).join('\n')
    :noData(selected.error);
  let credentials;
  try{credentials=await dbGet('/rest/v1/integrations?select=api_token&provider=eq.bizimhesap&is_active=eq.true&limit=2');}
  catch{return noData('KAYNAK_YETKİSİ_YOK');}
  if(!credentials?.ok||!Array.isArray(credentials.data)||credentials.data.length!==1 ||
      typeof credentials.data[0]?.api_token!=='string'||!credentials.data[0].api_token.trim())
    return noData('KAYNAK_YETKİSİ_YOK');
  let response;
  try{response=await providerGet(BASE+'/abstract/'+selected.customerId,credentials.data[0].api_token);}
  catch{return noData('SAĞLAYICI_ERİŞİLEMİYOR');}
  if(!response||response.status===429||response.status===503)return noData('SAĞLAYICI_HIZ_SINIRI_VEYA_KESİNTİ');
  if(response.status!==200)return noData('SAĞLAYICI_HTTP_HATASI');
  if(!response.json||typeof response.json!=='object')return noData('SAĞLAYICI_JSON_HATASI');
  if([1,'1'].includes(response.json.resultCode) && typeof evidenceSink==='function') {
    try { await evidenceSink(safeCariShapeEvidence(response.json)); }
    catch (_) { /* Schema telemetry must never break the owner read response. */ }
  }
  return summarizeVerifiedAbstract(response.json,{...selected,nowIso:new Date().toISOString()});
}
