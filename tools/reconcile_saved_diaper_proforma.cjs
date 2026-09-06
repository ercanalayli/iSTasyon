'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const canonicalRoot = process.env.APERION_CANONICAL_ROOT || 'C:\\AperiON\\iSTasyon';
require(path.join(canonicalRoot, 'node_modules', 'dotenv')).config({
  path: path.join(canonicalRoot, 'local-secrets', 'bizimhesap.local.env')
});
const puppeteer = require(path.join(canonicalRoot, 'node_modules', 'puppeteer'));
const { createClient } = require(path.join(canonicalRoot, 'node_modules', '@supabase', 'supabase-js'));

const commandId = Number(process.argv[2]);
if (!Number.isInteger(commandId) || commandId <= 0) throw new Error('Geçerli bot_commands kimliği gerekli.');
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Yerel Supabase kasası eksik.');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function fold(value) {
  return String(value || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
}

async function sendHermes(payload) {
  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const signature = crypto.createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY)
    .update(`${timestamp}\n${body}`).digest('hex');
  const endpoint = process.env.APERION_TELEGRAM_NOTIFY_URL || 'https://aperion-istasyon.pages.dev/api/telegram-business-notify';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-aperion-timestamp': timestamp,
      'x-aperion-signature': signature
    },
    body
  });
  const result = await response.json();
  if (!response.ok || !result?.ok) throw new Error(`Hermes bulut bildirimi başarısız: HTTP ${response.status} ${result?.error || ''}`);
  return result.telegram_message_id || null;
}

(async () => {
  const { data: command, error: readError } = await db.from('bot_commands')
    .select('id,command,status,params,result').eq('id', commandId).single();
  if (readError) throw readError;
  if (command.command !== 'bizimhesap_diaper_proforma') throw new Error(`Komut türü uygun değil: ${command.command}`);
  if (!['failed', 'completed'].includes(command.status)) throw new Error(`Uzlaştırma için komut sonuçlanmış olmalı: ${command.status}`);

  const params = command.params || {};
  const profileDir = path.join(canonicalRoot, 'local-secrets', '.bizimhesap-persistent-profile');
  const portFile = path.join(profileDir, 'DevToolsActivePort');
  const port = Number(String(fs.readFileSync(portFile, 'utf8')).split(/\r?\n/)[0]);
  if (!port) throw new Error('AperiON tarayıcı tanı portu okunamadı.');
  const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${port}`, defaultViewport: null });
  let proof;
  try {
    const pages = await browser.pages();
    const page = pages.find(candidate => /bizimhesap\.com\/web\/ngn\/doc\/ngnproposal/i.test(candidate.url()));
    if (!page) throw new Error('Kaydedilmiş BizimHesap teklif ayrıntısı bulunamadı.');
    proof = await page.evaluate((input) => {
      const text = document.body?.innerText || '';
      const rows = [...document.querySelectorAll('#editable-sample tbody tr')];
      const rowText = rows.map(row => row.innerText || '');
      const codes = input.items.map(item => item.code);
      const quantities = input.items.map(item => item.quantity);
      const codeChecks = codes.map(code => rowText.some(textValue => textValue.includes(code)));
      const quantityChecks = codes.map((code, index) => rowText.some(textValue => textValue.includes(code) && textValue.includes(`${quantities[index]} ad`)));
      return {
        url: location.href,
        saved: /[?&]saved=1(?:&|$)/.test(location.search),
        reference: text.includes(input.orderRef),
        auditTag: text.includes(`APERION HASTA BEZI | ${input.orderRef}`),
        customer: text.toLocaleLowerCase('tr-TR').includes(input.customer.toLocaleLowerCase('tr-TR')),
        draft: /durumu\s+taslak/.test(text.toLocaleLowerCase('tr-TR')),
        lineCount: rows.length,
        codeChecks,
        quantityChecks,
        totalQuantity: document.querySelector('#lblTotalQuantity')?.innerText?.trim() || '',
        total: document.querySelector('#lblTotal')?.innerText?.trim() || ''
      };
    }, {
      orderRef: String(params.order_reference || ''),
      customer: 'SERCAN GRUP TIBBI GERECLER SAN. VE TIC. LTD. STI.',
      items: [
        { code: 'MAM.01128', quantity: 60 },
        { code: 'MAM.01240', quantity: 4 },
        { code: 'MAM.00389', quantity: 4 },
        { code: 'MAM.00390', quantity: 4 },
        { code: 'MAM.01007', quantity: 4 },
        { code: 'MAM.01135', quantity: 6 }
      ]
    });
  } finally {
    await browser.disconnect();
  }

  const proofOk = proof.saved && proof.reference && proof.auditTag && proof.customer && proof.draft && proof.lineCount === 6 &&
    proof.codeChecks.every(Boolean) && proof.quantityChecks.every(Boolean) && proof.totalQuantity === '82 ad' && proof.total === '30.476,77 TL';
  if (!proofOk) throw new Error(`Canlı taslak kanıtı uyuşmadı: ${JSON.stringify(proof)}`);

  const resultText = `${params.order_reference} BizimHesap proforma taslağı canlı ekrandan uzlaştırıldı: 6 ürün, 82 paket, toplam 30.476,77 TL, durum Taslak.`;
  if (command.status !== 'completed') {
    const { error: updateError } = await db.from('bot_commands').update({
      status: 'completed', result: resultText, completed_at: new Date().toISOString()
    }).eq('id', commandId).eq('status', 'failed');
    if (updateError) throw updateError;
  }
  const messageId = await sendHermes({
    kind: 'diaper_proforma_ready',
    event_key: `diaper:proforma:${params.order_reference}:ready`,
    order_reference: params.order_reference,
    customer_name: params.customer_name,
    line_count: 6,
    package_quantity: 82,
    amount: 30476.77,
    status: 'BizimHesap taslağı kaydedildi'
  });
  console.log(JSON.stringify({ ok: true, commandId, messageId, proof }, null, 2));
})().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
