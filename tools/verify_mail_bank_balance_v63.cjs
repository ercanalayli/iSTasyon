const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/mail-ekstre-pipeline.yml'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'automation/mail-ekstre-worker-lite.js'), 'utf8');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'automation/mail-ekstre-config.json'), 'utf8'));

const checks = [
  ['correct mailbox locked', cfg.mailbox === 'alaylimedikal@gmail.com' && workflow.includes('GMAIL_MAILBOX: alaylimedikal@gmail.com')],
  ['morning evening cron exists', workflow.includes('cron: "5 5,16 * * *"')],
  ['intraday follow-up remains', workflow.includes('cron: "*/15 5-17 * * *"')],
  ['gmail and drive secrets used', ['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REFRESH_TOKEN','GDRIVE_EKSTRE_FOLDER_ID'].every(k => workflow.includes(k))],
  ['pending ingest live path', workflow.includes('Live ingest to pending_bank_movements') && worker.includes('ingest_mail_bank_movements')],
  ['bank balance parser fields', html.includes('balance_after') && html.includes('bakiye') && html.includes('latestBankBalances')],
  ['wide bank balance query', html.includes('bankBalanceRows') && html.includes(".not('balance_after','is',null)") && html.includes(".not('bakiye','is',null)")],
  ['home current bank money card', html.includes('Güncel Banka Parası') && html.includes('Banka Bakiye Kaynağı')],
  ['approved/onay flow preserved', html.includes('pending_bank_movements') && html.includes('approve_pending_bank_movement')],
  ['bank money styling', html.includes('.finance-home-kpi.bank-money')]
];

console.log('AperiON Mail Bank Balance v63 Verify');
console.log('------------------------------------');
let ok = true;
for (const [label, pass] of checks) {
  console.log(`${pass ? 'OK ' : 'ERR'} - ${label}`);
  if (!pass) ok = false;
}
console.log('------------------------------------');
if (!ok) {
  console.error('RESULT: FAIL - Mail ekstre / guncel banka parasi hatti eksik.');
  process.exit(1);
}
console.log('RESULT: OK - Sabah/aksam mail ekstre kontrolu ve guncel banka parasi ekrani bagli.');
