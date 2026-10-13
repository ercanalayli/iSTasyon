/**
 * AperiON @ercanalayli_bot: isolated, owner-only Telegram command adapter.
 * Source candidate ONLY: not deployed to aperion-command-bridge.
 * Important: NO BizimHesap POST, NO Telegram setWebhook, NO public financial data.
 */
const VERSION = 'ercanalayli-telegram-safe-v1-readonly';
const enc = new TextEncoder();
const secureJson = (obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store','x-content-type-options':'nosniff'
}});
const ok=extra=>secureJson({ok:true,...extra});
const denied=(code,status=403)=>secureJson({ok:false,error:code},status);

async function sameSecret(a,b) {
  const digest = async value=>new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value)));
  const [left,right]=await Promise.all([digest(a),digest(b)]);
  let difference=left.length ^ right.length;
  for(let i=0;i<left.length;i++)difference|=left[i]^right[i];
  return difference===0;
}
function parseCommand(text) {
  const t=String(text||'').trim().replace(/\s+/g,' ').toLocaleUpperCase('tr-TR');
  if (t==='DURUM'||t==='/DURUM') return 'status';
  if (t==='A1 DURUM'||t==='/A1'||t==='/A1 DURUM') return 'a1';
  if (t==='GAMZE ONAY'||t==='/GAMZE'||t==='GAMZE DURUM'||t==='/GAMZEDURUM') return 'gamze';
  if (t==='/START'||t==='/YARDIM') return 'help';
  return 'unknown';
}
function authIdentity(update, env) {
  const m=update?.message;
  const owner=String(env.APERION_TELEGRAM_OWNER_USER_ID||'').trim();
  const configuredChat=String(env.APERION_TELEGRAM_OWNER_CHAT_ID||owner).trim();
  const from=m?.from?.id == null?'':String(m.from.id);
  const chat=m?.chat?.id == null?'':String(m.chat.id);
  if (!owner || !configuredChat || !m || m.chat?.type!=='private' ||
      !from || from!==owner || chat!==configuredChat || from!==chat ||
      m.from?.is_bot===true || !Number.isSafeInteger(m.message_id)) return null;
  return {chatId:chat,messageId:m.message_id,text:String(m.text||'').slice(0,2048)};
}
async function claimReadOnlyEvent(db, updateId, chat, messageId, command) {
  if(!db)throw Error('audit_store_not_configured');
  await db.prepare(`CREATE TABLE IF NOT EXISTS aperion_telegram_ro_events (
    update_id INTEGER PRIMARY KEY,
    chat_id TEXT NOT NULL,
    message_id INTEGER NOT NULL,
    command_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    delivered_at TEXT
  )`).run();
  await db.prepare(`INSERT OR IGNORE INTO aperion_telegram_ro_events
    (update_id,chat_id,message_id,command_code,status)
    VALUES (?,?,?,?,'pending')`).bind(updateId,chat,messageId,command).run();
  const result=await db.prepare(`UPDATE aperion_telegram_ro_events SET
      status='processing', attempts=attempts+1
    WHERE update_id=? AND chat_id=? AND message_id=? AND
      command_code=? AND status IN ('pending','failed')`)
    .bind(updateId,chat,messageId,command).run();
  return Number(result?.meta?.changes||0)===1;
}
async function markReadOnlyEvent(db, updateId, status) {
  await db.prepare(`UPDATE aperion_telegram_ro_events SET status=?,
    delivered_at=CASE WHEN ?='delivered' THEN datetime('now') ELSE NULL END
    WHERE update_id=?`).bind(status,status,updateId).run();
}
async function reportA1(env) {
  // An authenticated source endpoint can be connected later; never use
  // hard-coded 164740.30 totals or cancelled 9000 TL logistics assumptions.
  const sourceUrl=String(env.APERION_A1_VERIFIED_READ_URL||'');
  const key=String(env.APERION_A1_READ_SECRET||'');
  if(!sourceUrl || !key)return '📦 A1: Canlı, kanıtlı rapor kaynağı henüz bağlanmadı. Eski sabit toplamlar ve 9.000 TL lojistik iptal edildi; rapor uydurulmuyor.';
  let u;
  try {u=new URL(sourceUrl);} catch {return '⚠️ A1: kaynak URL yapılandırması geçersiz.';}
  if(u.protocol!=='https:' || u.hostname!=='aperion-istasyon.pages.dev' ||
     u.pathname!=='/api/telegram-a1-verified' || u.search || u.hash)
    return '⚠️ A1: doğrulanmamış rapor kaynağı reddedildi.';
  let r;
  try{r=await fetch(u.toString(),{method:'GET',headers:{
    Authorization:'Bearer '+key,Accept:'application/json'},signal:AbortSignal.timeout(8000),cache:'no-store'});}
  catch{return '⚠️ A1: canlı kaynak ulaşılamıyor; önceki rakamlar güncel sayılamaz.';}
  if(!r.ok)return '⚠️ A1: doğrulanmış veri okunamadı; güncel toplam bildirilmiyor.';
  let doc;try{doc=await r.json();}catch{return '⚠️ A1: kaynak JSON hatası.';}
  const at=Date.parse(doc?.verified_at||'');
  const sum=doc?.gross_total_kurus;
  if(doc?.ok!==true || doc?.source!=='APERION_A1_CANONICAL_READONLY' ||
     !/^A1-20\d{6}-v\d+$/.test(String(doc.version||'')) ||
     !Number.isSafeInteger(sum) || sum<0 ||
     !Number.isFinite(at) || Date.now()-at>86400000 || at>Date.now()+300000)
    return '⚠️ A1: kaynak eski veya tutarlılık kanıtı yetersiz; VERIFIED rapor yok.';
  const amount=(sum/100).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
  // Totals belong to a timestamped immutable snapshot, not present-time bank state.
  return '📦 A1 kanıtlı anlık görüntü: '+doc.version+'\nKaynak doğrulama: '+
    String(doc.verified_at).slice(0,19)+'\nAltı müşterili sevkiyat belge toplamı: '+
    amount+' TL\nLojistik: kanıt bekleniyor; otomatik maliyet eklenmez.\n'+
    'Bu bir snapshot; teslimat ve e-Fatura gönderimi ayrı kanıttır.';
}
async function responseFor(command,env) {
  if(command==='status')return '🤖 AperiON Telegram botu erişilebilir.\n🔒 Telegram kimlik ve webhook doğrulaması etkin.\n📦 A1: /A1\n🧾 Gamze kayıt kontrolü: /GAMZE\n⚠️ Bu Worker finansal POST yapmaz; BizimHesap yazım motoru bağlı/aktif olarak kanıtlanmadı.';
  if(command==='a1')return reportA1(env);
  if(command==='gamze')return '🧾 Gamze Eczanesi / WA-20261010-GAMZE\n'+
    'BizimHesap API yanıtına göre yeni satış GUID: FCB82CD3053A491986C6B2D1C9F5D329\n'+
    'Bildirilen toplam: 9.531,92 TL\n'+
    'Eski GUID: A782C5B8C1D64F649F4A8010F937F923\n'+
    'Eski iptal API yanıtı: status=0; ERP iptal durumu bağımsız teyit bekliyor.\n'+
    'Yeni belgenin cari ve satır geri okuması bekleniyor.\n'+
    '🔒 YENİ FATURA OLUŞTURULMADI; mükerrer POST yasak.';
  if(command==='help')return 'AperiON: DURUM, A1 DURUM, GAMZE DURUM.\nBu sürüm yalnız doğrulanmış durum/kayıt bildirir; onay yazmak finansal işlem başlatmaz.';
  return 'Tanımlı komutlar: DURUM · A1 DURUM · GAMZE DURUM. Finansal talep oluşturulmadı.';
}
async function sendTelegram(env,chat,text) {
  const token=String(env.TELEGRAM_BOT_TOKEN||'');
  if(!token)throw Error('bot_token_not_configured');
  const reply=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({chat_id:chat,text,disable_web_page_preview:true}),
    signal:AbortSignal.timeout(10000)
  });
  const body=await reply.json().catch(()=>null);
  if(!reply.ok || body?.ok!==true)throw Error('telegram_send_unconfirmed');
}
export async function handleTelegramRequest(request, env) {
  const url=new URL(request.url);
  if(request.method==='GET' && (url.pathname==='/'||url.pathname==='/healthz')) {
    // Absolutely no setWebhook, secrets or firmId here.
    return ok({service:'aperion-owner-telegram',version:VERSION,
      mode:'READ_ONLY_NO_FINANCIAL_POST',telegramConfigured:Boolean(env.TELEGRAM_BOT_TOKEN),
      ownerGuardConfigured:Boolean(env.APERION_TELEGRAM_OWNER_USER_ID&&env.TELEGRAM_WEBHOOK_SECRET),
      auditConfigured:Boolean(env.APERION_DB)});
  }
  if(url.pathname!=='/telegram/webhook')return denied('NOT_FOUND',404);
  if(request.method!=='POST')return denied('METHOD_NOT_ALLOWED',405);
  const token=String(env.TELEGRAM_BOT_TOKEN||'');
  const secret=String(env.TELEGRAM_WEBHOOK_SECRET||'');
  if(!token||!secret||!env.APERION_TELEGRAM_OWNER_USER_ID||!env.APERION_DB)
    return denied('SECURE_CONFIG_REQUIRED',503);
  const provided=request.headers.get('x-telegram-bot-api-secret-token')||'';
  if(!provided || !(await sameSecret(provided,secret)))return denied('WEBHOOK_SECRET_INVALID');
  if(!(request.headers.get('content-type')||'').toLowerCase().includes('application/json'))
    return denied('JSON_REQUIRED',415);
  let raw;try{raw=await request.text();}catch{return denied('READ_FAILED',400);}
  if(raw.length>16384)return denied('PAYLOAD_TOO_LARGE',413);
  let update;try{update=JSON.parse(raw);}catch{return denied('INVALID_JSON',400);}
  if(!Number.isSafeInteger(update?.update_id))return denied('UPDATE_ID_REQUIRED',400);
  const identity=authIdentity(update,env);
  if(!identity)return denied('OWNER_PRIVATE_CHAT_REQUIRED');
  const command=parseCommand(identity.text);
  let claimed=false;
  try{claimed=await claimReadOnlyEvent(env.APERION_DB,update.update_id,identity.chatId,identity.messageId,command);}
  catch{return denied('AUDIT_UNAVAILABLE',503);}
  if(!claimed)return ok({duplicate:true,financeWrites:0});
  try {
    const reply=await responseFor(command,env);
    await sendTelegram(env,identity.chatId,reply);
    await markReadOnlyEvent(env.APERION_DB,update.update_id,'delivered');
    return ok({delivered:true,financeWrites:0});
  }catch{
    try{await markReadOnlyEvent(env.APERION_DB,update.update_id,'failed');}catch{}
    return denied('TELEGRAM_DELIVERY_UNCONFIRMED',502);
  }
}
export default {fetch:handleTelegramRequest};
