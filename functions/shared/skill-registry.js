import { recallMemory } from './memory-recall.js';
import { istanbulDate } from './attention-engine.js';

export const SKILL_REGISTRY_V1 = Object.freeze({
  'BizimHesap.GiderKaydet': Object.freeze({
    skill_id:'BizimHesap.GiderKaydet',version:1,status:'candidate',scope:'ALAYLI MEDİKAL',
    evidence:['AI-0646','evt:ai0646:verified'],verified_examples:1,
    intent_examples:['75 TL çay Ercan nakit','120 TL otopark Ercan nakit','50 TL MARKET gideri'],
    required_fields:['amount','currency','category','payment_account','date','paid_status'],
    entity_resolution:{account:'Match canonical cash account in Memory OS and confirm in BizimHesap before save',category:'Use only scoped, verified category rule; otherwise ask minimum missing detail'},
    duplicate_check:'Before preparation and immediately before save, search same date/amount/category/account and document number in live BizimHesap',
    risk_class:'FINANCIAL',approval_policy:'Action-time user confirmation for exact values; no save without approval',
    execution_engine:'Existing production Computer Use/BizimHesap line; registry never invokes it automatically',
    verification_policy:'Read the created record back from BizimHesap; compare amount, category, account, date, paid state and duplicate count',
    failure_recovery:'If save or read-back is uncertain, stop; recheck live record and duplicate key before any retry. Never blindly submit again.',
    memory_learning_policy:'Verified TASK→RESULT→VERIFICATION→EVENT; new rule only with explicit correction or corroboration, provenance and independent retrieval test',
    generalization_limit:'One verified expense is a candidate, not blanket category or payment authorization'
  })
});

const clean = value => String(value||'').trim();
const normalized = value => clean(value).toLocaleLowerCase('tr-TR');

export async function resolveNaturalCommand(db, command, todayItems = []) {
  const text=clean(command);
  const q=normalized(text);
  if (!text) return {intent:'unknown',action_class:'BILGI_GEREKLI',missing:['command']};
  const ordinal=q.match(/(ilkini|birincisini|ikincisini|üçüncüsünü)/);
  if (ordinal) {
    const index=ordinal[1]==='ilkini'||ordinal[1]==='birincisini'?0:ordinal[1]==='ikincisini'?1:2;
    const item=todayItems[index];
    return item?{intent:/ertele/.test(q)?'defer_item':'select_item',item_id:item.id,item,action_class:/ertele/.test(q)?'OTOMATIK':item.action_class,execution_authorized:false}
      :{intent:'select_item',action_class:'BILGI_GEREKLI',missing:['today_item'],execution_authorized:false};
  }
  if (/kaynağ|kaynak|nereden bili/.test(q)) return {intent:'explain_source',action_class:'OTOMATIK',execution_authorized:false};
  if (/bunu unutma|hatırla|hatirla/.test(q)) return {intent:'remember_or_remind',action_class:'BILGI_GEREKLI',execution_authorized:false};
  if (/bu dosyayı öğren|bu dosyayi ogren/.test(q)) return {intent:'ingest_file',action_class:'BILGI_GEREKLI',execution_authorized:false};
  const expense=q.match(/(?:^|\s)(\d+(?:[.,]\d{1,2})?)\s*(?:tl|₺|try)\s+(.+)/i);
  if (expense) {
    const amount=Number(expense[1].replace(',','.'));
    const tail=expense[2];
    let account=null,accountProvenance=[];
    if (/ercan\s+nakit/.test(tail)) {
      try {
        const row=await db.prepare("SELECT canonical_name,provenance_ref FROM memory_entities WHERE entity_type='cash_account' AND scope='ALAYLI MEDİKAL' AND canonical_name='Ercan Nakit Kasa' LIMIT 1").first();
        if (row) { account=row.canonical_name;accountProvenance=[row.provenance_ref]; }
      } catch { /* Unavailable memory is not proof of an account mapping. */ }
    }
    const tea=/(?:çay|cay)/.test(tail);
    const explicitMarket=/\bmarket\b/.test(tail);
    let recalled=null;
    if (tea) { try { recalled=await recallMemory(db,'Çay giderlerini nereye kaydediyoruz?'); } catch { /* Missing memory must not authorize classification. */ } }
    const verifiedRule=tea&&recalled?.found&&recalled?.data?.category==='MARKET'&&recalled?.provenance?.length&&Number(recalled.confidence)>=.9;
    const category=explicitMarket||verifiedRule?'MARKET':null;
    const missing=[...(!category?['category']:[]),...(!account?['payment_account']:[])];
    return {intent:'expense',skill_id:'BizimHesap.GiderKaydet',status:'draft_only',scope:'ALAYLI MEDİKAL',amount,currency:'TRY',category,payment_account:account,date:istanbulDate(),paid_status:null,
      category_provenance:verifiedRule?recalled.provenance:[],category_confidence:verifiedRule?recalled.confidence:explicitMarket?1:null,
      account_provenance:accountProvenance,
      action_class:missing.length?'BILGI_GEREKLI':'ONAY_GEREKLI',missing,execution_authorized:false,financial_write:false};
  }
  if (/bugünkü satış|bugunku satis/.test(q)) return {intent:'sales_today',action_class:'OTOMATIK',execution_authorized:false};
  if (/haber var mı|haber var mi/.test(q)) return {intent:'message_lookup',action_class:'OTOMATIK',execution_authorized:false};
  if (/geçen sene|gecen sene/.test(q)) return {intent:'memory_recall',action_class:'OTOMATIK',execution_authorized:false};
  return {intent:'unknown',action_class:'BILGI_GEREKLI',execution_authorized:false};
}
