// Queues the read-only BizimHesap supplier purchase summary sync.
// The common helper prevents duplicate pending jobs and can verify Hermes pickup.
const { queueReadSync } = require('./kuyruk_bizimhesap_read_sync_common.cjs');

queueReadSync({
  command: 'bizimhesap_tedarikci_ozet_sync',
}).catch(error => {
  console.error('HATA:', error.message);
  process.exitCode = 1;
});
