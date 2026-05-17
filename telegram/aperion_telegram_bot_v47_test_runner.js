const bot = require('./aperion_telegram_bot_v47.js');

const sampleRows = [
  {
    id: 1,
    company: 'ALAYLI',
    calendar_date: '2026-05-16',
    item_type: 'payable',
    direction: 'out',
    title: 'Bugün ödenecek test kaydı',
    remaining_amount: 125000,
    period_status: 'today',
    status: 'open'
  },
  {
    id: 2,
    company: 'ALAYLI',
    calendar_date: '2026-05-16',
    item_type: 'receivable',
    direction: 'in',
    title: 'Bugün tahsil edilecek test kaydı',
    remaining_amount: 155000,
    period_status: 'today',
    status: 'open'
  },
  {
    id: 3,
    company: 'ALAYLI',
    calendar_date: '2026-05-14',
    item_type: 'credit_card',
    direction: 'out',
    title: 'Geciken kredi kartı test kaydı',
    remaining_amount: 48500,
    period_status: 'overdue',
    status: 'open'
  },
  {
    id: 4,
    company: 'ALAYLI',
    calendar_date: '2026-05-16',
    item_type: 'task',
    direction: 'neutral',
    title: 'Banka ekstresi kontrol görevi',
    remaining_amount: 0,
    period_status: 'today',
    status: 'open'
  },
  {
    id: 5,
    company: 'ALAYLI',
    calendar_date: '2026-05-16',
    item_type: 'approval',
    direction: 'neutral',
    title: 'Fiyat listesi onayı',
    remaining_amount: 0,
    period_status: 'today',
    status: 'waiting_approval'
  }
];

const requiredExports = [
  'handleCommand',
  'handleUpdate',
  'handleCallback',
  'commandBugun',
  'commandNakit',
  'commandOdenecekler',
  'commandTahsilatlar',
  'commandGecikenler',
  'commandYapilacak',
  'commandOnay',
  'commandRapor',
  'formatCalendarRows',
  'formatOneRow',
  'actionButtons',
  'supabaseRpc',
  'telegramAnswerCallback'
];

console.log('AperiON Telegram Bot v48 Action Test');
console.log('------------------------------------');

let failed = 0;
for (const key of requiredExports) {
  const ok = typeof bot[key] === 'function';
  console.log(`${ok ? 'OK ' : 'ERR'} export ${key}`);
  if (!ok) failed++;
}

const formatted = bot.formatCalendarRows(sampleRows, 'Test Finans Takvimi');
const checks = [
  { name: 'includes title', ok: formatted.includes('Test Finans Takvimi') },
  { name: 'includes payable record', ok: formatted.includes('Bugün ödenecek test kaydı') },
  { name: 'includes receivable record', ok: formatted.includes('Bugün tahsil edilecek test kaydı') },
  { name: 'includes credit card record', ok: formatted.includes('Geciken kredi kartı test kaydı') },
  { name: 'includes Turkish money format', ok: formatted.includes('₺') || formatted.includes('TRY') },
  { name: 'includes translated item type', ok: formatted.includes('Ödenecek') && formatted.includes('Tahsil') },
  { name: 'includes period status', ok: formatted.includes('Bugün') && formatted.includes('Geciken') }
];

const payableButtons = bot.actionButtons(sampleRows[0]);
const receivableButtons = bot.actionButtons(sampleRows[1]);
const taskButtons = bot.actionButtons(sampleRows[3]);
const approvalButtons = bot.actionButtons(sampleRows[4]);

checks.push(
  { name: 'payable has paid button', ok: JSON.stringify(payableButtons).includes('fc:paid:1') },
  { name: 'payable has postpone button', ok: JSON.stringify(payableButtons).includes('fc:postpone:1') },
  { name: 'receivable has collected button', ok: JSON.stringify(receivableButtons).includes('fc:collected:2') },
  { name: 'task has done button', ok: JSON.stringify(taskButtons).includes('fc:done:4') },
  { name: 'approval has approve button', ok: JSON.stringify(approvalButtons).includes('fc:approve:5') },
  { name: 'approval has reject button', ok: JSON.stringify(approvalButtons).includes('fc:reject:5') },
  { name: 'detail button exists', ok: JSON.stringify(payableButtons).includes('fc:detail:1') }
);

console.log('------------------------------------');
for (const c of checks) {
  console.log(`${c.ok ? 'OK ' : 'ERR'} ${c.name}`);
  if (!c.ok) failed++;
}

console.log('------------------------------------');
console.log(formatted);
console.log('------------------------------------');
console.log('Sample payable buttons');
console.log(JSON.stringify(payableButtons, null, 2));
console.log('------------------------------------');

if (failed) {
  console.log(`RESULT: FAILED - ${failed} kontrol eksik.`);
  process.exitCode = 1;
} else {
  console.log('RESULT: OK - Telegram v48 formatter, exports and action buttons are ready.');
}
