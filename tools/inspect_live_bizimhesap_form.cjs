const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function main() {
  const profileDir = path.join(__dirname, '..', 'local-secrets', '.bizimhesap-persistent-profile');
  const portFile = path.join(profileDir, 'DevToolsActivePort');
  const port = Number(String(fs.readFileSync(portFile, 'utf8')).split(/\r?\n/)[0]);
  if (!port) throw new Error('AperiON tarayıcı tanı portu okunamadı.');
  const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${port}`, defaultViewport: null });
  try {
    const pages = await browser.pages();
    const page = pages.find(candidate => /bizimhesap\.com\/web\/ngn\//i.test(candidate.url()));
    if (!page) throw new Error('Canlı BizimHesap sayfası bulunamadı.');
    const searchValue = process.argv.slice(2).find(value => !value.startsWith('--')) || '';
    if (process.argv.includes('--edit-first')) {
      await page.click('a[href*="editLine"]');
      await new Promise(resolve => setTimeout(resolve, 800));
      await page.evaluate(() => {
        const price = document.querySelector('#txtPriceUnit');
        if (!price) throw new Error('Fiyat alanı bulunamadı.');
        price.value = '378,9504';
        price.dispatchEvent(new Event('input', { bubbles: true }));
        price.dispatchEvent(new Event('change', { bubbles: true }));
        price.dispatchEvent(new KeyboardEvent('keyup', { key: 'Tab', bubbles: true }));
        if (typeof Calculate === 'function') Calculate();
      });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (searchValue) {
      await page.evaluate(() => {
        const modal = document.querySelector('#myModalProductEntry');
        if (modal && (modal.offsetWidth || modal.offsetHeight || modal.getClientRects().length)) {
          modal.querySelector('[data-dismiss="modal"],button.close')?.click();
        }
      });
      await new Promise(resolve => setTimeout(resolve, 300));
      const selector = 'input[placeholder*="Ürün isminden"]';
      await page.click(selector, { clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.type(selector, searchValue, { delay: 20 });
      await new Promise(resolve => setTimeout(resolve, 1600));
      if (process.argv.includes('--select')) {
        const options = await page.$$('.select2-results__option[role="treeitem"]');
        if (options.length !== 1) throw new Error(`Kesin ürün seçimi için 1 sonuç gerekli; bulunan: ${options.length}`);
        await options[0].click();
        await new Promise(resolve => setTimeout(resolve, 1200));
        if (process.argv.includes('--add')) {
          const fill = async (selector, value) => {
            await page.click(selector, { clickCount: 3 });
            await page.keyboard.press('Backspace');
            await page.type(selector, value, { delay: 15 });
          };
          await fill('#txtQuantity', '60');
          await fill('#txtPriceUnit', '378,9504');
          await fill('#txtDiscount', '0');
          await page.click('#btnAddProduct');
          await new Promise(resolve => setTimeout(resolve, 1400));
        }
      }
    }
    const result = await page.evaluate(() => {
      const visible = element => Boolean(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
      const summarize = element => ({
        tag: element.tagName,
        id: element.id || '',
        name: element.name || '',
        type: element.type || '',
        value: element.value || '',
        text: String(element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240),
        placeholder: element.placeholder || '',
        className: String(element.className || '').slice(0, 180),
        outerHTML: String(element.outerHTML || '').replace(/\s+/g, ' ').slice(0, 700)
      });
      return {
        url: location.href,
        title: document.title,
        inputs: [...document.querySelectorAll('input,textarea')].filter(visible).map(summarize),
        selects: [...document.querySelectorAll('select')].filter(visible).map(summarize),
        buttons: [...document.querySelectorAll('button,a,input[type="button"],input[type="submit"]')].filter(visible).map(summarize).filter(item => item.text || item.value).slice(0, 120),
        options: [...document.querySelectorAll('[role="option"],li,.select2-results__option')].filter(visible).map(summarize).filter(item => item.text).slice(0, 80),
        tables: [...document.querySelectorAll('table')].filter(visible).map(table => String(table.outerHTML || '').replace(/\s+/g, ' ').slice(0, 3000)),
        body: String(document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 6000)
      };
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await browser.disconnect();
  }
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
