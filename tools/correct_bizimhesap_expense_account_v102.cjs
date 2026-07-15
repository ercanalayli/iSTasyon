const fs = require('fs');
const puppeteer = require('puppeteer');
const { launchOptions, loginBizimHesap, selectFirma, savePageDiagnostics } = require('../bizimhesap_common.cjs');

const queueId = process.argv[2] || '';
const save = process.argv.includes('--save');
if (!queueId) throw new Error('Queue kimligi gerekli.');

async function main() {
  // Use the persistent profile headlessly for this single-record correction.
  // The visible profile may be locked by an interactive Chrome session.
  process.env.BIZIMHESAP_HEADLESS = 'true';
  const browser = await puppeteer.launch(launchOptions({ headless: true, width: 1440, height: 950 }));
  const page = await browser.newPage();
  try {
    await loginBizimHesap(page, message => console.log(`[FIX] ${message}`));
    await selectFirma(page, { id: 'alayli', adi: 'ALAYLI MEDIKAL', sektor: 'ALAYLI', arama: 'ALAYLI' }, message => console.log(`[FIX] ${message}`));
    await page.goto('https://bizimhesap.com/web/ngn/acc/ngncosts', { waitUntil: 'networkidle2', timeout: 30000 });
    const search = await page.$('input[type="search"]');
    if (!search) throw new Error('Masraf listesi arama kutusu bulunamadi.');
    await search.type(`APERION QUEUE:${queueId}`);
    await new Promise(resolve => setTimeout(resolve, 900));
    const editGuid = await page.evaluate(id => {
      const row = [...document.querySelectorAll('tr')].find(node => String(node.innerText || '').includes(id));
      const link = row && [...row.querySelectorAll('a')].find(node => /ngncostentry\?/.test(node.href || ''));
      const source = link ? `${link.getAttribute('href') || ''} ${link.href || ''}` : '';
      const match = source.match(/guid=([A-F0-9]{32})/i);
      return match ? match[1] : '';
    }, queueId);
    if (!editGuid) throw new Error('Duzeltilecek masraf kaydinin BizimHesap duzenleme baglantisi bulunamadi.');
    await page.goto(`https://bizimhesap.com/web/ngn/acc/ngncostentry?rc=1&guid=${editGuid}`, { waitUntil: 'networkidle2', timeout: 30000 });
    const selected = await page.evaluate(() => {
      const select = document.getElementById('ddlCashierNew');
      if (!select) return { found: false, selected: '' };
      const option = [...select.options].find(item => /VAKIF/i.test(item.text) && !/ERCAN|KK\s*VAKIF/i.test(item.text));
      if (!option) return { found: false, selected: '' };
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { found: true, selected: option.text };
    });
    if (!selected.found) throw new Error('*VAKIF SIRKET hesap secenegi bulunamadi.');
    await savePageDiagnostics(page, `bizimhesap_queue_${queueId}_expense_correction_form`);
    if (!save) {
      console.log(`RESULT: FORM_READY ${selected.selected}`);
      return;
    }
    const button = await page.$('#btnSave, button[type="submit"]');
    if (!button) throw new Error('Masraf kaydi kaydet butonu bulunamadi.');
    await button.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 1500));
    await savePageDiagnostics(page, `bizimhesap_queue_${queueId}_expense_correction_saved`);
    console.log(`RESULT: SAVED ${selected.selected}`);
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error.message || error); process.exitCode = 1; });
