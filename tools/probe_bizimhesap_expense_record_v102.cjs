const fs = require('fs');
const puppeteer = require('puppeteer');
const { launchOptions, loginBizimHesap, selectFirma } = require('../bizimhesap_common.cjs');

const queueId = process.argv[2] || '';
if (!queueId) throw new Error('Queue kimligi gerekli.');

async function main() {
  const browser = await puppeteer.launch(launchOptions({ headless: true, width: 1440, height: 950 }));
  const page = await browser.newPage();
  try {
    await loginBizimHesap(page, message => console.log(`[PROBE] ${message}`));
    await selectFirma(page, { id: 'alayli', adi: 'ALAYLI MEDIKAL', sektor: 'ALAYLI', arama: 'ALAYLI' }, message => console.log(`[PROBE] ${message}`));
    await page.goto('https://bizimhesap.com/web/ngn/acc/ngncosts', { waitUntil: 'networkidle2', timeout: 30000 });
    const search = await page.$('input[type="search"]');
    if (!search) throw new Error('Masraf listesi arama kutusu bulunamadi.');
    await search.click({ clickCount: 3 });
    await search.type(`APERION QUEUE:${queueId}`);
    await new Promise(resolve => setTimeout(resolve, 1200));
    const row = await page.evaluate(id => {
      const norm = value => String(value || '').toLowerCase();
      const found = [...document.querySelectorAll('tr')].find(node => norm(node.innerText).includes(norm(id)));
      if (!found) return null;
      const button = [...found.querySelectorAll('button,a')].find(node => /işlem|islem/i.test(node.innerText || node.value || ''));
      return { text: found.innerText, html: found.outerHTML, hasAction: Boolean(button) };
    }, queueId);
    if (!row) throw new Error('AperiON kuyruk notlu masraf satiri bulunamadi.');
    const clicked = await page.evaluate(id => {
      const found = [...document.querySelectorAll('tr')].find(node => String(node.innerText || '').includes(id));
      const button = found && [...found.querySelectorAll('button,a')].find(node => /işlem|islem/i.test(node.innerText || node.value || ''));
      if (!button) return false;
      button.click();
      return true;
    }, queueId);
    await new Promise(resolve => setTimeout(resolve, 500));
    const actions = await page.evaluate(() => [...document.querySelectorAll('a,button')]
      .filter(node => /düzenle|duzenle|sil|detay/i.test(node.innerText || node.value || ''))
      .filter(node => node.offsetWidth || node.offsetHeight || node.getClientRects().length)
      .map(node => ({ text: (node.innerText || node.value || '').trim(), href: node.href || '', onclick: node.getAttribute('onclick') || '', html: node.outerHTML.slice(0, 1000) })));
    fs.mkdirSync('diagnostics', { recursive: true });
    fs.writeFileSync('diagnostics/bizimhesap_expense_record_probe_v102.json', JSON.stringify({ queue_id: queueId, row, clicked, actions }, null, 2));
    await page.screenshot({ path: 'diagnostics/bizimhesap_expense_record_probe_v102.png', fullPage: true });
    console.log('RESULT: OK');
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error.message || error); process.exitCode = 1; });
