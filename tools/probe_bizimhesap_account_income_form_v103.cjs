const fs = require('fs');
const puppeteer = require('puppeteer');
const { launchOptions, loginBizimHesap, selectFirma } = require('../bizimhesap_common.cjs');

const output = 'diagnostics/bizimhesap_account_income_form_probe_v103.json';
const accountNeedle = process.env.BIZIMHESAP_UNMATCHED_PROBE_ACCOUNT || '*VAKIF SIRKET';

function log(message) { console.log(`[PROBE] ${message}`); }

async function main() {
  const browser = await puppeteer.launch(launchOptions({ headless: true, width: 1440, height: 950 }));
  const page = await browser.newPage();
  try {
    await loginBizimHesap(page, log);
    await selectFirma(page, { id: 'alayli', adi: 'ALAYLI MEDIKAL', sektor: 'ALAYLI', arama: 'ALAYLI' }, log);
    await page.goto(process.env.BIZIMHESAP_ACCOUNTS_URL || 'https://bizimhesap.com/web/ngn/acc/ngnaccounts', { waitUntil: 'networkidle2', timeout: 30000 });
    const opened = await page.evaluate((needle) => {
      const visible = node => !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length);
      const fold = value => String(value || '').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const item = [...document.querySelectorAll('a,button,div,span')]
        .filter(visible)
        .find(node => fold(node.innerText).includes(fold(needle)) && String(node.innerText || '').length < 180);
      if (!item) return false;
      (item.closest('a') || item.closest('button') || item).click();
      return true;
    }, accountNeedle);
    if (!opened) throw new Error(`Banka hesap karti bulunamadi: ${accountNeedle}`);
    await new Promise(resolve => setTimeout(resolve, 1300));
    const clicked = await page.evaluate(() => {
      const fold = value => String(value || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const button = [...document.querySelectorAll('a,button,input[type="button"],input[type="submit"]')]
        .find(node => /hesaba para girisi yap/.test(fold(node.innerText || node.value || node.title)));
      if (!button) return false;
      button.click();
      return true;
    });
    if (!clicked) throw new Error('BizimHesap Hesaba Para Girisi Yap dugmesi bulunamadi.');
    await new Promise(resolve => setTimeout(resolve, 900));
    const result = await page.evaluate(() => ({
      url: location.href,
      visible_modals: [...document.querySelectorAll('.modal,[role="dialog"]')]
        .filter(node => node.offsetWidth || node.offsetHeight || node.getClientRects().length)
        .map(node => ({ id: node.id, text: (node.innerText || '').trim().slice(0, 1400), html: node.outerHTML.slice(0, 16000) })),
      fields: [...document.querySelectorAll('input,textarea,select,button')]
        .filter(node => node.offsetWidth || node.offsetHeight || node.getClientRects().length)
        .map(node => ({ tag: node.tagName, id: node.id, name: node.name, type: node.type, placeholder: node.placeholder, text: (node.innerText || node.value || '').trim().slice(0, 150) })),
    }));
    await page.screenshot({ path: 'diagnostics/bizimhesap_account_income_form_probe_v103.png', fullPage: true });
    fs.mkdirSync('diagnostics', { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify({ created_at: new Date().toISOString(), account: accountNeedle, opened, clicked, result }, null, 2)}\n`, 'utf8');
    console.log(`RESULT: OK - ${output}`);
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error.message || error); process.exitCode = 1; });
