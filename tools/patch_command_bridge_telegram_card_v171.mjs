import fs from 'node:fs';

const file='C:\\Users\\HP\\Documents\\Codex\\2026-08-27\\referenced-chatgpt-conversation-this-is-an\\work\\aperion-command-bridge\\src\\index.js';
const src=fs.readFileSync(file,'utf8');
const backup=file+'.bak-v171-'+Date.now();
fs.copyFileSync(file,backup);
let out=src;

const startMarker="  const namespace = String(body?.idempotency_namespace || '').trim();";
if(!out.includes(startMarker)) throw new Error('prepare_start_marker_not_found');
out=out.replace(startMarker,"  const prepareStartedAtMs = Date.now();\n"+startMarker);

const taskMarker="  const task = await response.json();";
if(!out.includes(taskMarker)) throw new Error('task_marker_not_found');
out=out.replace(taskMarker,taskMarker+"\n  const prepareMs = Math.max(0, Date.now() - prepareStartedAtMs);\n  const operationId = String(task?.id || '').slice(0,8).toUpperCase();\n  const createdAtTr = new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date()).replace(',', '') + ' TRT';");

const cardTitleNeedle="      isTransfer ? 'ğŸŸ¡ BÄ°ZÄ°MHESAP TRANSFER ONAYI' : 'ğŸŸ¡ BÄ°ZÄ°MHESAP KAYIT ONAYI',";
if(!out.includes(cardTitleNeedle)) throw new Error('approval_card_title_marker_not_found');
out=out.replace(cardTitleNeedle,cardTitleNeedle+"\n      'İşlem ID: '+operationId,\n      'Oluşturuldu: '+createdAtTr,\n      'Hazırlama: '+prepareMs+' ms',");

const payloadRefNeedle="        const payloadWithTelegramRef = {\n          ...payload,\n          telegramMessageId:Number(telegramApproval.messageId)\n        };";
if(!out.includes(payloadRefNeedle)) throw new Error('telegram_ref_payload_marker_not_found');
out=out.replace(payloadRefNeedle,"        const payloadWithTelegramRef = {\n          ...payload,\n          telegramMessageId:Number(telegramApproval.messageId),\n          operationId,\n          createdAtTr,\n          prepareMs\n        };");

const statusFnStart="function telegramApprovalStatusText(payload, state, channel = null) {";
const statusFnEnd="\n}\n\nasync function updateTelegramApprovalCard";
const s1=out.indexOf(statusFnStart);
const s2=out.indexOf(statusFnEnd,s1);
if(s1<0||s2<0) throw new Error('status_function_bounds_not_found');
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
"  if (state === 'cancelled') return '❌ '+origin+'İPTAL EDİLDİ\\n'+head+summary+'\\n\\nBizimHesap\\'a kayıt gönderilmeyecek.';",
"  if (state === 'completed_verified') return '✅ TAMAMLANDI VE DOĞRULANDI\\n'+head+summary+'\\n\\nBizimHesap geri-okuması başarılı.';",
"  if (state === 'duplicate_prevented') return '✅ TAMAMLANDI — MÜKERRER ÖNLENDİ\\n'+head+summary+'\\n\\nYeni kayıt oluşturulmadı.';",
"  if (state === 'needs_review') return '⚠️ İNCELEMEYE ALINDI\\n'+head+summary+'\\n\\nYeni finansal kayıt oluşturulmayacak.';",
"  return '⛔ GÜVENLİ BİÇİMDE DURDURULDU\\n'+head+summary+'\\n\\nFinansal kayıt doğrulanamadı.';",
"}"
].join('\n');
out=out.slice(0,s1)+newStatus+out.slice(s2+2);

fs.writeFileSync(file,out,'utf8');
console.log(JSON.stringify({ok:true,status:'PATCHED',file,backup,checks:{operation_id:out.includes('İşlem ID: '),created_at_tr:out.includes('Oluşturuldu: '),prepare_ms:out.includes('Hazırlama: '),status_meta:out.includes('payload?.operationId')}},null,2));