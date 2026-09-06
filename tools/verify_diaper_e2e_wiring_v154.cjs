'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const webhook = read('functions/telegram/webhook.js');
const listener = read('tools/aperion_command_listener.cjs');
const notifier = read('functions/api/telegram-business-notify.js');
const migration = read('migrations/0019_diaper_operations.sql');
const shared = read('functions/shared/diaper-operations.js');

const diaperRoute = webhook.indexOf('if (looksLikeDiaperOrder(text))');
const universalRoute = webhook.indexOf('const universalIntent = parseUniversalCommand(text);');
if (diaperRoute < 0 || universalRoute < 0 || diaperRoute > universalRoute) throw new Error('Hasta bezi siparişi evrensel mali emir yönlendiricisinden önce çalışmıyor.');
for (const token of ['diaper_orders', 'diaper_order_lines', 'diaper_operation_events', 'diaper_proforma_jobs']) {
  if (!migration.includes(token)) throw new Error(`D1 şeması eksik: ${token}`);
}
for (const source of [webhook, listener]) {
  if (!source.includes('bizimhesap_diaper_proforma')) throw new Error('Proforma komutu uçtan uca bağlı değil.');
}
if (!listener.includes("params.approved !== true")) throw new Error('Yerel işçi Telegram onayını zorunlu tutmuyor.');
if (!webhook.includes('await queueDiaperProforma(env, storedOrder, saved.orderId, chatId)')) throw new Error('Eksiksiz hasta bezi siparişi otomatik taslak kuyruğuna bağlı değil.');
if (!listener.includes('resolveDiaperCustomerName')) throw new Error('Telegram kısa cari adı BizimHesap ticari unvanına çözümlenmiyor.');
if (!listener.includes('sendHermesBusinessNotification')) throw new Error('BizimHesap kanıtı doğru Hermes bulut kanalına bağlı değil.');
if (!notifier.includes("kind === 'diaper_proforma_ready'")) throw new Error('Hermes hasta bezi taslak bildirimi tanımlı değil.');
if (!notifier.includes('x-aperion-signature')) throw new Error('Hermes bildirim uç noktası imzalı yerel işçi isteklerini doğrulamıyor.');
if (!listener.includes('mükerrer') && !listener.includes('Mukerrer')) throw new Error('Yerel işçi mükerrerlik denetimi içermiyor.');
if (!shared.includes('CREATE TABLE IF NOT EXISTS diaper_orders')) throw new Error('İlk istekte güvenli D1 şema kurulumu yok.');
if (!webhook.includes('await ensureDiaperSchema(env.APERION_DB)')) throw new Error('Durum ve yaşam döngüsü yolları ilk D1 şema kurulumunu çalıştırmıyor.');

console.log('Hasta bezi Telegram → D1 → otomatik taslak kuyruğu → masaüstü BizimHesap → kanıt hattı statik olarak doğrulandı.');
