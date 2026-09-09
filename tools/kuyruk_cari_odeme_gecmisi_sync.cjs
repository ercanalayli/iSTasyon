// Queues the read-only BizimHesap payment-history sync.
// The common helper prevents duplicate pending jobs and can verify Hermes pickup.
const { queueReadSync } = require('./kuyruk_bizimhesap_read_sync_common.cjs');

const limit = Number(process.argv[2] || 30);

queueReadSync({
  command: 'bizimhesap_cari_odeme_gecmisi_sync',
  params: { limit },
}).catch(error => {
  console.error('HATA:', error.message);
  process.exitCode = 1;
});
