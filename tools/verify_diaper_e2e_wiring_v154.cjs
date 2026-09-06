'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const webhook = read('functions/telegram/webhook.js');
const listener = read('tools/aperion_command_listener.cjs');
const migration = read('migrations/0019_diaper_operations.sql');
const workflow = read('.github/workflows/cloudflare-pages-deploy.yml');

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
if (!listener.includes('mükerrer') && !listener.includes('Mukerrer')) throw new Error('Yerel işçi mükerrerlik denetimi içermiyor.');
if (!workflow.includes('d1 migrations apply aperion-control-plane --remote')) throw new Error('Üretim dağıtımı D1 göçlerini uygulamıyor.');

console.log('Hasta bezi Telegram → D1 → onay → masaüstü BizimHesap → kanıt hattı statik olarak doğrulandı.');
