const {
  parseAmount,
  parseDate,
  detectScope,
  detectGroup,
  detectKind,
  buildFinanceDraft,
  buildDocumentDraft,
  formatDraftPreview
} = require('./aperion_personal_finance_assistant_v54.cjs');

const baseDate = new Date('2026-05-25T09:00:00');
const text1 = 'Yarin isyeri elektrik faturasi 12500 TL odenecek';
const text2 = '30.05.2026 Murat ticaretten 23800 TL tahsil edilecek';
const text3 = 'Arac kasko 15.06.2026 42000 TL kritik';

const draft1 = buildFinanceDraft(text1, { baseDate });
const draft2 = buildFinanceDraft(text2, { baseDate });
const draft3 = buildFinanceDraft(text3, { baseDate });
const docDraft = buildDocumentDraft({
  message_id: 123,
  document: { file_id: 'FILE123', file_name: 'elektrik.pdf', mime_type: 'application/pdf' },
  caption: 'UEDAS elektrik faturasi'
});

const checks = [
  { name: 'amount parse', ok: parseAmount(text1) === 12500 },
  { name: 'amount ignores dmy date', ok: parseAmount(text2) === 23800 },
  { name: 'amount ignores second dmy date', ok: parseAmount(text3) === 42000 },
  { name: 'relative date parse', ok: parseDate(text1, baseDate) === '2026-05-26' },
  { name: 'dmy date parse', ok: parseDate(text2, baseDate) === '2026-05-30' },
  { name: 'scope isyeri', ok: detectScope(text1) === 'isyeri' },
  { name: 'scope arac', ok: detectScope(text3) === 'arac' },
  { name: 'group faturalar', ok: detectGroup(text1) === 'Faturalar' },
  { name: 'group arac', ok: detectGroup(text3) === 'Arac Giderleri' },
  { name: 'kind payable', ok: detectKind(text1) === 'payable' },
  { name: 'kind receivable', ok: detectKind(text2) === 'receivable' },
  { name: 'draft verification pending', ok: draft1.verification_status === 'kontrol_bekliyor' },
  { name: 'draft2 amount correct', ok: draft2.expected_amount === 23800 },
  { name: 'draft3 amount correct', ok: draft3.expected_amount === 42000 },
  { name: 'critical priority', ok: draft3.priority === 'critical' },
  { name: 'document file id', ok: docDraft.telegram_file_id === 'FILE123' },
  { name: 'preview exists', ok: formatDraftPreview(draft1).includes('AperiON kayit taslagi') }
];

console.log('AperiON Personal Finance Assistant v54 Test');
console.log('------------------------------------------');
let failed = 0;
for(const c of checks){
  console.log(`${c.ok ? 'OK ' : 'ERR'} ${c.name}`);
  if(!c.ok) failed += 1;
}
console.log('------------------------------------------');
console.log(JSON.stringify({ draft1, draft2, draft3, docDraft }, null, 2));
console.log('------------------------------------------');

if(failed){
  console.log(`RESULT: FAILED - ${failed} kontrol eksik.`);
  process.exitCode = 1;
}else{
  console.log('RESULT: OK - personal finance Telegram intake foundation is ready.');
}
