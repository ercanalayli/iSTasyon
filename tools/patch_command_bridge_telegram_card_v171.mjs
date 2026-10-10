import fs from 'node:fs';

const file='C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge\\src\\index.js';
const src=fs.readFileSync(file,'utf8');
const backup=file+'.bak-v172-'+Date.now();
fs.copyFileSync(file,backup);
let out=src;

function replaceOnce(needle,repl,label){
  if(!out.includes(needle)) throw new Error(label+'_marker_not_found');
  out=out.replace(needle,repl);
}

replaceOnce("  const namespace = String(body?.idempotency_namespace || '').trim();","  const prepareStartedAtMs = Date.now();\n  const namespace = String(body?.idempotency_namespace || '').trim();",'prepare_start');

replaceOnce("  const task = await response.json();","  const task = await response.json();\n  const prepareMs = Math.max(0, Date.now() - prepareStartedAtMs);\n  const operationId = String(task?.id || '').slice(0,8).toUpperCase();\n  const createdAtTr = new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date()).replace(',', '') + ' TRT';",'task');

const cardIdx=out.indexOf('    const cardText = [');
if(cardIdx<0) throw new Error('card_array_marker_not_found');
const firstComma=out.indexOf('\n', cardIdx);
const titleLineEnd=out.indexOf('\n', firstComma+1);
if(titleLineEnd<0) throw new Error('card_title_line_end_not_found');
out=out.slice(0,titleLineEnd+1)+"      'İşlem ID: '+operationId,\n      'Oluşturuldu: '+createdAtTr,\n      'Hazırlama: '+prepareMs+' ms',\n"+out.slice(titleLineEnd+1);

const refStart=out.indexOf('        const payloadWithTelegramRef = {');
if(refStart<0) throw new Error('telegram_ref_start_not_found');
const refEnd=out.indexOf('        };',refStart);
if(refEnd<0) throw new Error('telegram_ref_end_not_found');
const refBlock=out.slice(refStart,refEnd+10);
if(!refBlock.includes('telegramMessageId:Number(telegramApproval.messageId)')) throw new Error('telegram_message_id_marker_not_found');
const newRefBlock=refBlock.replace('telegramMessageId:Number(telegramApproval.messageId)','telegramMessageId:Number(telegramApproval.messageId),\n          operationId,\n          createdAtTr,\n          prepareMs');
out=out.slice(0,refStart)+newRefBlock+out.slice(refEnd+10);

const statusStart=out.indexOf('function telegramApprovalStatusText(payload, state, channel = null) {');
const statusEnd=out.indexOf('\n}\n\nasync function updateTelegramApprovalCard',statusStart);
if(statusStart<0||statusEnd<0) throw new Error('status_function_bounds_not_found');
const newStatus=[
"function telegramApprovalStatusText(payload, state, channel = null) {",
"  const summary = String(payload?.summary || 'Finansal işlem').trim();",
"  const origin = channel === 'local_ui' ? 'Bilgisayardan ' : channel === 'telegram_inline' ? 'Telegram’dan ' : '';",
"  const op = String(payload?.operationId || '').trim();",
"  const created = String(payload?.createdAtTr || '').trim();",
"  const prep = Number(payload?.prepareMs);",
"  const meta = [",
"    op ? 'İşlem ID: '+op : '',",
"    created ? 'Oluşturuldu: '+created : '',",
"    Number.isFinite(prep) ? 'Hazırlama: '+prep+' ms' : ''",
"  ].filter(Boolean).join('\\n');",
"  const head = meta ? meta+'\\n\\n' : '';",
"  if (state === 'approved') return '✅ '+origin+'ONAYLANDI\\n'+head+summary+'\\n\\nKarar kesinleşti; mükerrer kontrolü, BizimHesap kaydı ve geri-okuma sürüyor.';",
"  if (state === 'cancelled') return '❌ '+origin+'İPTAL EDİLDİ\\n'+head+summary+'\\n\\nBizimHesap’a kayıt gönderilmeyecek.';",
"  if (state === 'completed_verified') return '✅ TAMAMLANDI VE DOĞRULANDI\\n'+head+summary+'\\n\\nBizimHesap geri-okuması başarılı.';",
"  if (state === 'duplicate_prevented') return '✅ TAMAMLANDI — MÜKERRER ÖNLENDİ\\n'+head+summary+'\\n\\nYeni kayıt oluşturulmadı.';",
"  if (state === 'needs_review') return '⚠️ İNCELEMEYE ALINDI\\n'+head+summary+'\\n\\nYeni finansal kayıt oluşturulmayacak.';",
"  return '⛔ GÜVENLİ BİÇİMDE DURDURULDU\\n'+head+summary+'\\n\\nFinansal kayıt doğrulanamadı.';",
"}"
].join('\n');
out=out.slice(0,statusStart)+newStatus+out.slice(statusEnd+2);

fs.writeFileSync(file,out,'utf8');
console.log(JSON.stringify({ok:true,status:'PATCHED_V172',file,backup,checks:{
  operation_id:out.includes("'İşlem ID: '+operationId"),
  created_at_tr:out.includes("'Oluşturuldu: '+createdAtTr"),
  prepare_ms:out.includes("'Hazırlama: '+prepareMs+' ms'"),
  payload_meta:out.includes('operationId,\n          createdAtTr,\n          prepareMs'),
  status_meta:out.includes('payload?.operationId')
}},null,2));