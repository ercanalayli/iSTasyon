const fs = require('fs');
const puppeteer = require('puppeteer');
const { launchOptions, loginBizimHesap, selectFirma } = require('../bizimhesap_common.cjs');

const output = 'diagnostics/bizimhesap_transfer_form_probe_v101.json';
const sourceAccount = 'POS POS POS';

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
      const text = value => String(value || '').toLocaleUpperCase('tr-TR').replace(/Ä°/g, 'İ').replace(/Ä±/g, 'ı');
      const nodes = [...document.querySelectorAll('a,button,div,span')].filter(visible);
      const item = nodes.find(node => text(node.innerText).includes(needle) && String(node.innerText || '').length < 160);
      if (!item) return false;
      (item.closest('a') || item.closest('button') || item).click();
      return true;
    }, sourceAccount);
    if (!opened) throw new Error('POS kaynak hesap karti bulunamadi.');
    await new Promise(resolve => setTimeout(resolve, 1500));
    const before = await page.evaluate(() => ({
      url: location.href,
      transfer_candidates: [...document.querySelectorAll('a,button,input[type="button"],input[type="submit"],span,div')]
        .filter(node => /hesaplar|transfer/i.test(node.innerText || node.value || node.title || '') && String(node.innerText || node.value || '').length < 160)
        .map(node => ({ tag: node.tagName, text: (node.innerText || node.value || node.title || '').trim(), href: node.href || '', onclick: node.getAttribute('onclick') || '', html: node.outerHTML.slice(0, 1000) })),
    }));
    // Bootstrap's dropdown binds to pointer events. Use Puppeteer's real click,
    // not HTMLElement.click(), so the hidden transfer modal is actually opened.
    const toggleHandle = await page.$('button.dropdown-toggle');
    const toggle = Boolean(toggleHandle);
    if (toggleHandle) await toggleHandle.click();
    if (toggle) await new Promise(resolve => setTimeout(resolve, 450));
    const transferHandle = toggle ? await page.$('#btnTransfer') : null;
    const clicked = Boolean(transferHandle);
    if (transferHandle) await transferHandle.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 1200));
    const after = await page.evaluate(() => ({
      url: location.href,
      transfer_modals: [...document.querySelectorAll('[id*="Transfer"], [id*="transfer"]')].map(node => ({
        id: node.id,
        className: node.className,
        style: node.getAttribute('style') || '',
        text: (node.innerText || '').trim().slice(0, 1500),
        html: node.outerHTML.slice(0, 12000),
      })),
      fields: [...document.querySelectorAll('input,textarea,select,button')].map(node => ({ tag: node.tagName, id: node.id, name: node.name, type: node.type, placeholder: node.placeholder, text: (node.innerText || node.value || '').trim().slice(0, 120) })).slice(0, 80),
      text: document.body.innerText.slice(0, 4000),
    }));
    fs.mkdirSync('diagnostics', { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify({ created_at: new Date().toISOString(), opened, clicked, before, after }, null, 2)}\n`, 'utf8');
    console.log(`RESULT: OK - ${output}`);
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error.message || error); process.exitCode = 1; });
