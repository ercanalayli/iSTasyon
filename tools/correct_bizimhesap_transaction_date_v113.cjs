const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { launchOptions, loginBizimHesap, selectFirma } = require('../bizimhesap_common.cjs');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const CONFIRMATION = value('--confirm');
const OUTPUT = value('--out', 'bank_exports/bizimhesap_vakif_tarih_duzeltme_v113.json');
const ACCOUNT = '*VAKIF SIRKET';
const CORRECTIONS = [
  { transaction_id: '4022E6BA9B054298AA9B988EDB98FC7A', queue_id: '7d269b6a-a80c-4cab-b84e-eb31ce85c154', amount: 902.81, expected_date: '2026-07-14', force_persist: true },
  { transaction_id: '06BCF8BEF7F04FB6BCC4D12D8635182E', queue_id: 'a4bb5122-798c-4d12-8354-507216c5b9cf', amount: 46540, expected_date: '2026-07-14' },
];

function value(name, fallback = '') {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function canonicalDate(input) {
  const text = String(input || '').trim();
  let match = text.match(/^(\d{4})[-./](\d{2})[-./](\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  match = text.match(/^(\d{2})[-./](\d{2})[-./](\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}

function portalDate(iso) {
  const [year, month, day] = iso.split('-');
  return `${day}.${month}.${year}`;
}

function log(message) { console.log(`[TARIH DUZELTME] ${message}`); }

async function openAccount(page) {
  await page.goto(process.env.BIZIMHESAP_ACCOUNTS_URL || 'https://bizimhesap.com/web/ngn/acc/ngnaccounts', { waitUntil: 'networkidle2', timeout: 30000 });
  const selected = await page.evaluate((wanted) => {
    const normalize = text => String(text || '').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
    const visible = node => Boolean(node.offsetWidth || node.offsetHeight || node.getClientRects().length);
    const candidates = [...document.querySelectorAll('a,button,div,span')].filter(visible)
      .map(node => ({ node, text: String(node.innerText || '').replace(/\s+/g, ' ').trim() }))
      .filter(item => item.text && item.text.length < 180)
      .map(item => {
        const text = normalize(item.text);
        const target = normalize(wanted);
        return { ...item, score: text === target ? 1000 : (text.startsWith(target) ? 900 : -1) };
      })
      .filter(item => item.score >= 0);
    const match = candidates[0];
    if (!match) return '';
    (match.node.closest('a') || match.node.closest('button') || match.node).click();
    return match.text;
  }, ACCOUNT);
  if (!selected) throw new Error(`${ACCOUNT} banka hesabi bulunamadi.`);
  await new Promise(resolve => setTimeout(resolve, 1200));
  return selected;
}

async function openEditor(page, transactionId) {
  await page.evaluate(() => {
    const modal = document.querySelector('#myModalUpdateSingleTrx');
    if (!modal || !(modal.offsetWidth || modal.offsetHeight || modal.getClientRects().length)) return;
    if (window.jQuery) window.jQuery(modal).modal('hide');
    else modal.style.display = 'none';
  });
  await new Promise(resolve => setTimeout(resolve, 250));
  const opened = await page.evaluate((id) => {
    if (typeof window.UpdateTrx !== 'function') return false;
    window.UpdateTrx(id);
    return true;
  }, transactionId);
  if (!opened) throw new Error(`${transactionId}: düzenleme formu acilamadi.`);
  // UpdateTrx hydrates the same modal through an async request. The field can
  // still contain the preceding transaction for a short moment.
  await new Promise(resolve => setTimeout(resolve, 1100));
  await page.waitForSelector('#myModalUpdateSingleTrx #txtUpdatedTrxDate', { visible: true, timeout: 12000 });
}

async function readEditor(page) {
  return page.evaluate(() => ({
    date: String(document.querySelector('#txtUpdatedTrxDate')?.value || '').trim(),
    amount: String(document.querySelector('#txtUpdatedAmount')?.value || '').trim(),
    description: String(document.querySelector('#txtUpdatedDescription')?.value || '').trim(),
    save_exists: Boolean(document.querySelector('#btnUpdateTransaction')),
  }));
}

async function setDate(page, date) {
  await page.evaluate((nextDate) => {
    const field = document.querySelector('#txtUpdatedTrxDate');
    if (!field) throw new Error('Tarih alani bulunamadi.');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(field, nextDate);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }, date);
}

async function saveEditor(page) {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => null),
    page.click('#btnUpdateTransaction'),
  ]);
  await new Promise(resolve => setTimeout(resolve, 900));
}

async function main() {
  if (args.includes('--self-test')) {
    const passed = canonicalDate('14.07.2026') === '2026-07-14' && portalDate('2026-07-14') === '14.07.2026';
    console.log(passed ? 'SONUC: TARIH_DUZELTME_GUARD_BASARILI' : 'SONUC: BASARISIZ');
    process.exitCode = passed ? 0 : 1;
    return;
  }
  if (APPLY && CONFIRMATION !== 'BANKA_TARIHI_14072026') {
    throw new Error('Canli duzeltme icin --confirm BANKA_TARIHI_14072026 zorunludur.');
  }

  const report = { created_at: new Date().toISOString(), account: ACCOUNT, mode: APPLY ? 'apply' : 'preview', corrections: [] };
  const browser = await puppeteer.launch(launchOptions({ headless: true, width: 1440, height: 950 }));
  try {
    const page = await browser.newPage();
    await loginBizimHesap(page, log);
    await selectFirma(page, { id: 'alayli', adi: 'ALAYLI MEDIKAL', sektor: 'ALAYLI', arama: 'ALAYLI' }, log);
    report.selected_account = await openAccount(page);
    for (const correction of CORRECTIONS) {
      await openEditor(page, correction.transaction_id);
      const before = await readEditor(page);
      const expectedPortalDate = portalDate(correction.expected_date);
      const record = { ...correction, before, expected_portal_date: expectedPortalDate, changed: false, verified: false };
      if (!before.save_exists) throw new Error(`${correction.transaction_id}: kaydetme dugmesi bulunamadi.`);
      if (canonicalDate(before.date) !== correction.expected_date) await setDate(page, expectedPortalDate);
      const prepared = await readEditor(page);
      record.prepared = prepared;
      if (canonicalDate(prepared.date) !== correction.expected_date) {
        throw new Error(`${correction.transaction_id}: form tarihi kaynak banka tarihiyle eslesmedi.`);
      }
      // The account grid can retain an older date even when the modal was
      // hydrated with the correct source date. force_persist is restricted to
      // this audited record and makes the official save path reconcile it.
      if (APPLY && (canonicalDate(before.date) !== correction.expected_date || correction.force_persist)) {
        await saveEditor(page);
        record.changed = true;
        await openEditor(page, correction.transaction_id);
        const verified = await readEditor(page);
        record.after = verified;
        record.verified = canonicalDate(verified.date) === correction.expected_date;
        if (!record.verified) throw new Error(`${correction.transaction_id}: kaydetme sonrasi tarih kaniti basarisiz.`);
      } else {
        record.verified = canonicalDate(prepared.date) === correction.expected_date;
      }
      report.corrections.push(record);
    }
  } finally {
    await browser.close();
    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  log(`SONUC: ${APPLY ? 'DUZELTME_TAMAMLANDI' : 'ONIZLEME_TAMAMLANDI'} - ${OUTPUT}`);
}

main().catch(error => { console.error(error.stack || error.message || error); process.exitCode = 1; });
