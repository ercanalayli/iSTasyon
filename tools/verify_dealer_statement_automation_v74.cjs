const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const workflow = path.join(root, '.github', 'workflows', 'dealer-statement-receivables.yml');
const worker = path.join(root, 'tools', 'dealer_statement_gmail_worker_v74.mjs');
const pkg = path.join(root, 'package.json');

function must(condition, message) {
  if (!condition) throw new Error(message);
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

try {
  must(fs.existsSync(workflow), 'dealer-statement workflow yok');
  must(fs.existsSync(worker), 'dealer statement gmail worker yok');

  const workflowText = read(workflow);
  const workerText = read(worker);
  const packageJson = JSON.parse(read(pkg));

  must(workflowText.includes('GMAIL_MAILBOX: alaylimedikal@gmail.com'), 'workflow dogru mailbox ile kilitli degil');
  must(workflowText.includes('dealer-statement:gmail:dry'), 'workflow dry worker komutunu calistirmiyor');
  must(workflowText.includes('continue-on-error: true'), 'workflow dry-run hatasinda artifact raporu birakacak sekilde devam etmeli');
  must(workflowText.includes('Report DealerStatement dry-run'), 'workflow dry-run sonucunu raporlamali');
  must(workflowText.includes('Gate DealerStatement result'), 'workflow artifact sonrasi gercek sonucu gate etmeli');
  must(workflowText.includes("result.endsWith('_failed')"), 'workflow failed sonucu yesil birakmamali');
  must(!workflowText.includes('finance-calendar:dealer-statement:import --'), 'workflow canli import komutu icermemeli');
  must(!workflowText.includes('--commit'), 'workflow icinde --commit bulunmamali');
  must(workflowText.includes('upload-artifact'), 'workflow plan/kanit artifact yuklemeli');

  must(workerText.includes("REQUIRED_MAILBOX = 'alaylimedikal@gmail.com'"), 'worker mailbox guard eksik');
  must(workerText.includes('import_dealer_statement_receivables_v73.cjs'), 'worker dry import baglantisi eksik');
  must(workerText.includes("report.result = 'gmail_failed'"), 'worker Gmail hatasini rapora yazmali');
  must(workerText.includes('withRetry'), 'worker gecici Gmail/OAuth kopmalarinda retry yapmali');
  must(workerText.includes('premature close'), 'worker Premature close hatasini gecici kabul etmeli');
  must(!workerText.includes('--commit'), 'worker canli commit argumani icermemeli');

  must(packageJson.scripts['dealer-statement:gmail:dry'], 'package script dealer-statement:gmail:dry eksik');
  must(packageJson.scripts['verify:dealer-statement-automation'], 'package verify script eksik');

  console.log('DealerStatement otomasyon dogrulamasi');
  console.log('Mailbox: alaylimedikal@gmail.com');
  console.log('Canli insert: kilitli / yok');
  console.log('SONUC: BASARILI');
} catch (error) {
  console.error('SONUC: BASARISIZ');
  console.error(error.message || error);
  process.exit(1);
}
