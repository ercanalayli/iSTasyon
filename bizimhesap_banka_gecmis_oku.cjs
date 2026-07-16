const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { launchOptions, loginBizimHesap, selectFirma } = require('./bizimhesap_common.cjs');

const args = process.argv.slice(2);
const account = value('--account', '*IS BANKASI');
const maxPages = Math.max(1, Math.min(250, Number(value('--max-pages', '25')) || 25));
const output = value('--out', `bank_exports/bizimhesap_banka_gecmis_${safeName(account)}.json`);
const inspectId = value('--inspect-id', '');

function value(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function safeName(value) {
  return String(value || 'hesap').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();
}

function log(message) { console.log(`[BANKA GECMIS] ${message}`); }

async function openAccount(page, wanted) {
  await page.goto(process.env.BIZIMHESAP_ACCOUNTS_URL || 'https://bizimhesap.com/web/ngn/acc/ngnaccounts', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('body', { timeout: 12000 });
  const found = await page.evaluate(needle => {
    const normalize = value => String(value || '').toLocaleUpperCase('tr-TR').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
    const visible = node => !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length);
    const wantedText = normalize(needle);
    const candidates = [...document.querySelectorAll('a,button,div,span')].filter(visible)
      .map(node => ({ node, text: String(node.innerText || '').replace(/\s+/g, ' ').trim() }))
      .filter(item => item.text && item.text.length < 180);
    const match = candidates
      .map(item => {
        const text = normalize(item.text);
        let score = -1;
        if (text === wantedText) score = 1000;
        else if (text.startsWith(wantedText)) score = 900;
        else if (text.includes(` ${wantedText} `)) score = 500;
        // Do not let a credit-card card (e.g. "KK VAKIF SIRKET") win over
        // the actual bank account when both contain the same bank name.
        if (/^(KK|KREDI KARTI|KMH)\b/.test(text) && !/^(KK|KREDI KARTI|KMH)\b/.test(wantedText)) score -= 700;
        return { ...item, score };
      })
      .filter(item => item.score >= 0)
      .sort((a, b) => b.score - a.score)[0];
    if (!match) return { ok: false, candidates: candidates.map(item => item.text).slice(0, 120) };
    (match.node.closest('a') || match.node.closest('button') || match.node).click();
    return { ok: true, selected: match.text };
  }, wanted);
  if (!found.ok) throw new Error(`Banka hesabi bulunamadi: ${wanted}. Gorunenler: ${found.candidates.join(' | ')}`);
  await Promise.race([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {}),
    page.waitForFunction(() => document.querySelectorAll('table tbody tr').length > 0, { timeout: 20000 }).catch(() => {}),
  ]);
  await new Promise(resolve => setTimeout(resolve, 900));
  return found.selected;
}

async function readPage(page) {
  return page.evaluate(() => {
    const visible = node => !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length);
    const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
    const tables = [...document.querySelectorAll('table')].filter(visible).map(table => {
      const headers = [...table.querySelectorAll('thead th')].map(cell => clean(cell.innerText));
      const rowNodes = [...table.querySelectorAll('tbody tr')];
      const rows = rowNodes.map(row => [...row.querySelectorAll('td')].map(cell => clean(cell.innerText))).filter(row => row.some(Boolean));
      const rowActions = rowNodes.map((row, index) => ({
        index,
        row_text: clean([...row.querySelectorAll('td')].map(cell => cell.innerText).join(' ')),
        controls: [...row.querySelectorAll('a,button,select,input')].map(node => ({
          tag: node.tagName,
          id: node.id || '',
          name: node.name || '',
          text: clean(node.innerText || node.value || node.title),
          href: node.href || '',
          onclick: node.getAttribute('onclick') || '',
          options: node.tagName === 'SELECT' ? [...node.options].map(option => clean(option.text)) : [],
        })),
      })).filter(row => row.row_text);
      return { headers, rows, row_actions: rowActions };
    }).filter(table => table.rows.length);
    const primary = tables.sort((a, b) => b.rows.length - a.rows.length)[0] || { headers: [], rows: [] };
    const pagination = [...document.querySelectorAll('a,button')].filter(visible).map(node => ({
      text: clean(node.innerText || node.value || node.title),
      disabled: Boolean(node.disabled) || /disabled/.test(node.className || ''),
      className: String(node.className || ''),
    })).filter(item => item.text && item.text.length < 80);
    const resources = performance.getEntriesByType('resource').map(item => item.name)
      .filter(name => /account|cash|bank|movement|transaction|ngn/i.test(name)).slice(-120);
    return { url: location.href, title: document.title, headers: primary.headers, rows: primary.rows, row_actions: primary.row_actions || [], pagination, resources, body_hint: clean(document.body.innerText).slice(0, 1500) };
  });
}

async function nextPage(page) {
  const clicked = await page.evaluate(() => {
    const visible = node => !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length);
    const normalize = value => String(value || '').toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ').trim();
    const next = [...document.querySelectorAll('a,button')].filter(visible).find(node => {
      const text = normalize(node.innerText || node.value || node.title);
      const disabled = node.disabled || /disabled/.test(node.className || '');
      return !disabled && (text === 'SONRAKI' || text === 'NEXT' || text === '>' || text === '›');
    });
    if (!next) return false;
    next.click();
    return true;
  });
  if (!clicked) return false;
  await new Promise(resolve => setTimeout(resolve, 900));
  return true;
}

async function inspectTransactionEditForm(page, transactionId) {
  if (!transactionId) return null;
  const opened = await page.evaluate((id) => {
    if (typeof window.UpdateTrx === 'function') {
      window.UpdateTrx(id);
      return true;
    }
    const link = [...document.querySelectorAll('a')].find(node => String(node.href || '').includes(id));
    if (!link) return false;
    link.click();
    return true;
  }, transactionId);
  if (!opened) return { transaction_id: transactionId, opened: false };
  await new Promise(resolve => setTimeout(resolve, 1200));
  return page.evaluate((id) => ({
    transaction_id: id,
    opened: true,
    url: location.href,
    modals: [...document.querySelectorAll('.modal,[role="dialog"]')].map(node => ({
      id: node.id || '',
      visible: Boolean(node.offsetWidth || node.offsetHeight || node.getClientRects().length),
      text: String(node.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1200),
    })),
    fields: [...document.querySelectorAll('input,textarea,select,button')].map(node => ({
      tag: node.tagName,
      id: node.id || '',
      name: node.name || '',
      type: node.type || '',
      value: String(node.value || '').slice(0, 300),
      text: String(node.innerText || node.title || '').replace(/\s+/g, ' ').trim().slice(0, 200),
      onclick: String(node.getAttribute('onclick') || '').slice(0, 500),
      form_action: String(node.form?.action || '').slice(0, 500),
      visible: Boolean(node.offsetWidth || node.offsetHeight || node.getClientRects().length),
    })).filter(node => node.visible),
  }), transactionId);
}

async function main() {
  const browser = await puppeteer.launch(launchOptions({ headless: true, width: 1440, height: 950 }));
  const page = await browser.newPage();
  const cashRequests = [];
  page.on('response', async response => {
    if (!/\/GetCashTrx(?:\?|$)/i.test(response.url())) return;
    try {
      const request = response.request();
      const body = await response.text();
      cashRequests.push({ url: response.url(), method: request.method(), post_data: request.postData() || '', status: response.status(), body: body.slice(0, 250000) });
    } catch {}
  });
  try {
    await loginBizimHesap(page, log);
    await selectFirma(page, { id: 'alayli', adi: 'ALAYLI MEDIKAL', sektor: 'ALAYLI', arama: 'ALAYLI' }, log);
    const selected = await openAccount(page, account);
    const pages = [];
    const fingerprints = new Set();
    for (let index = 1; index <= maxPages; index += 1) {
      const current = await readPage(page);
      const fingerprint = JSON.stringify(current.rows.slice(0, 2));
      if (fingerprints.has(fingerprint)) break;
      fingerprints.add(fingerprint);
      pages.push({ page: index, ...current });
      if (!(await nextPage(page))) break;
    }
    const inspection = await inspectTransactionEditForm(page, inspectId);
    const report = {
      created_at: new Date().toISOString(), mode: 'read_only', company_id: 'alayli', requested_account: account,
      selected_account: selected, pages_read: pages.length, row_count: pages.reduce((sum, item) => sum + item.rows.length, 0), pages, inspection, cash_transaction_requests: cashRequests,
    };
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    log(`OK - ${selected}: ${report.pages_read} sayfa, ${report.row_count} hareket. ${output}`);
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error.stack || error.message || error); process.exitCode = 1; });
