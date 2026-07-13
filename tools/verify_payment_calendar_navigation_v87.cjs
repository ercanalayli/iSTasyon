const fs = require('fs');

const registry = JSON.parse(fs.readFileSync('data/aperion_payment_obligation_registry.json', 'utf8'));
const launcher = fs.readFileSync('aperion-ust-akil.html', 'utf8');
const calendar = fs.readFileSync('aperion-finans-takvimi-live.html', 'utf8');
const entry = registry.obligations.find(item => item.id === 'personal-batikent-ercan-ev-aidat');

const checks = [
  ['Batıkent aidat kartı', entry?.scope === 'personal' && entry?.frequency === 'monthly' && entry?.due_day === 16],
  ['Tutar uydurmama koruması', entry?.amount === null && entry?.status === 'amount_required'],
  ['Bildirim politikası', JSON.stringify(registry.notification_policy?.reminder_days_before) === JSON.stringify([7, 3, 1, 0])],
  ['Doğru güncelleme formatı', launcher.includes('HHmmYYMMdd') && launcher.includes("querySelectorAll('.status .chip')[1]") && launcher.includes('const code')],
  ['Ana ekrandan finans takvimi', launcher.includes('./finans-takvimi.html')],
  ['Takvimde ana ekran dönüşü', calendar.includes('AperiON Ana Ekran') && calendar.includes('./aperion-ust-akil.html')],
  ['Takvim ödeme hafızasını okuyor', calendar.includes('loadObligationRegistry') && calendar.includes('aperion_payment_obligation_registry.json')],
  ['Takvim gerçek güne göre filtreleniyor', calendar.includes('today.setTime(Date.now())')],
  ['Eski demo yerine ödeme hafızası fallbacki', calendar.includes('reloadPaymentAwareData') && calendar.includes('localPaymentRecords') && calendar.includes('ÖDEME HAFIZASI')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'OK ' : 'ERR'} ${name}`);
  if (!ok) failed += 1;
}
if (failed) process.exit(1);
console.log('Payment calendar navigation verification passed.');
