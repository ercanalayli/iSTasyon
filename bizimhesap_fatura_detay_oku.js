import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer';

const require = createRequire(import.meta.url);
const { loadAperionMemory, appendTransactionLog } = require('./tools/aperion_memory.cjs');
const {
  launchOptions,
  loginBizimHesap,
  selectFirma,
  savePageDiagnostics,
  normalizeText,
} = require('./bizimhesap_common.cjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const has = flag => args.includes(flag);
const val = (flag, fallback) => has(flag) ? args[args.indexOf(flag) + 1] : fallback;

const FIRMA_ARG = val('--firma', 'alayli');
const SHOW = has('--show');
const RESUME = has('--resume');
const LIMIT = Number(val('--limit', process.env.INVOICE_DETAIL_LIMIT || 200));
const QUEUE_PATH = val('--queue', path.join(__dirname, 'data', 'bizimhesap_fatura_acma_kuyrugu.json'));
const OUT_PATH = val('--out', path.join(__dirname, 'data', 'bizimhesap_fatura_detaylari_raw.json'));
const MEMORY = loadAperionMemory();

const FIRMALAR = {
  alayli: { id: 'alayli', adi: 'ALAYLI MEDIKAL', arama: 'ALAYLI' },
  elit: { id: 'elit', adi: 'ELIT ET URUNLERI', arama: 'ELIT' },
  odyoform: { id: 'odyoform', adi: 'ODYOFORM ISITME CIHAZLARI', arama: 'ODYOFORM' },
};

const DETAIL_TARGETS = [
  { url: 'https://bizimhesap.com/web/ngn/newportal', labels: [] },
  { url: 'https://bizimhesap.com/web/ngn/acc/ngncostss', labels: ['Masraflar'] },
  { url: 'https://bizimhesap.com/web/ngn/buy/ngnpurchaseinvoices', labels: ['Alislar', 'Alışlar'] },
  { url: 'https://bizimhesap.com/web/ngn/inv/ngninvoices', labels: ['Gelen E-Faturalar', 'E-Faturalar'] },
  { url: 'https://bizimhesap.com/web/ngn/acc/ngncurrentaccounts', labels: ['Tedarikciler', 'Tedarikçiler', 'Musteriler', 'Müşteriler'] },
];

const ACTIVE_DETAIL_TARGETS = [
  { url: 'https://bizimhesap.com/web/ngn/newportal', labels: [] },
  { url: 'https://bizimhesap.com/web/ngn/acc/ngncosts', labels: ['Masraflar'] },
  { url: 'https://bizimhesap.com/web/ngn/doc/ngnretailpurchases', labels: ['Alislar', 'Alislar'] },
  { url: 'https://bizimhesap.com/web/ngn/app/ngneinvoices', labels: ['Gelen E-Faturalar', 'E-Faturalar'] },
  { url: 'https://bizimhesap.com/web/ngn/org/ngnsuppliers', labels: ['Tedarikciler'] },
  { url: 'https://bizimhesap.com/web/ngn/pos/ngncustomers', labels: ['Musteriler'] },
];

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return fallback;
  }
}

function tasksFromQueue(queue) {
  const rows = Array.isArray(queue) ? queue : queue?.tasks || queue?.details || [];
  return rows.slice(0, LIMIT || rows.length).map((task, index) => ({
    ...task,
    task_id: task.task_id || task.id || `invoice-task-${index + 1}`,
    firma_id: task.firma_id || FIRMA_ARG || 'alayli',
    fatura_no_adayi: task.fatura_no_adayi || task.fatura_no || task.invoice_no_candidate || '',
    tarih: task.tarih || task.fatura_tarihi || task.date_candidate || '',
    tutar: Number(task.tutar || task.amount_candidate || task.genel_toplam || 0),
    tedarikci: task.tedarikci || task.cari_unvan || task.vendor_candidate || '',
    aciklama: task.aciklama || task.summary_text || '',
    arama_anahtari: task.arama_anahtari || task.search_key || '',
  }));
}

function emptyDetail(task, status = 'failed', error = '', extra = {}) {
  const searchKey = buildSearchKeys(task)[0] || '';
  return {
    task_id: task.task_id || '',
    read_status: status,
    search_key: searchKey,
    fatura_tipi: task.fatura_tipi_adayi || '',
    fatura_no: task.fatura_no_adayi || '',
    fatura_tarihi: task.tarih || '',
    vade_tarihi: '',
    cari_unvan: task.tedarikci || '',
    vergi_no: '',
    aciklama: task.aciklama || '',
    ara_toplam: 0,
    kdv_toplam: 0,
    genel_toplam: Number(task.tutar || 0),
    odeme_durumu: '',
    cari_durum: '',
    belge_pdf: '',
    belge_xml: '',
    kalemler: [],
    raw_text: '',
    error,
    diagnostics: extra.diagnostics || [],
  };
}

function buildReport(tasks, details) {
  return {
    created_at: nowIso(),
    source: 'bizimhesap',
    firma_id: FIRMA_ARG,
    memory: {
      dir: MEMORY.dir,
      active_company: MEMORY.config.active_company || 'ALAYLI Medikal',
      rule_note: 'Ozet satir on bilgidir; kesin karar fatura detayi okununca verilir.',
      gotcha_rules: MEMORY.gotchaRules.length
    },
    summary: {
      queue_count: tasks.length,
      read_success: details.filter(x => x.read_status === 'ok').length,
      read_failed: details.filter(x => x.read_status === 'failed').length,
      needs_review: details.filter(x => x.read_status === 'needs_review').length,
      not_found: details.filter(x => x.read_status === 'not_found').length,
    },
    details,
  };
}

function writeReport(tasks, details) {
  ensureDir(OUT_PATH);
  const report = buildReport(tasks, details);
  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2), 'utf8');
  return report;
}

function buildSearchKeys(task) {
  const keys = [];
  if (task.fatura_no_adayi) keys.push(String(task.fatura_no_adayi).trim());
  const fallback = [task.tedarikci, task.tutar ? String(task.tutar) : '', task.tarih].filter(Boolean).join(' ');
  if (fallback) keys.push(fallback);
  if (task.arama_anahtari) keys.push(String(task.arama_anahtari));
  return [...new Set(keys.map(x => x.trim()).filter(Boolean))];
}

function parseMoney(value) {
  const raw = String(value || '').replace(/\s/g, '');
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d,.-]/g, '');
  if (!cleaned) return 0;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const normalized = lastComma > lastDot ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.abs(n) : 0;
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const m = String(text || '').match(pattern);
    if (m) return String(m[1] || '').trim();
  }
  return '';
}

async function startBrowser() {
  let browser;
  try {
    browser = await puppeteer.launch(launchOptions({ headless: !SHOW, width: 1440, height: 900 }));
  } catch (error) {
    const fallbackProfile = path.join(__dirname, '.bizimhesap-profile-invoice-reader');
    browser = await puppeteer.launch({
      ...launchOptions({ headless: !SHOW, width: 1440, height: 900 }),
      userDataDir: fallbackProfile,
    });
  }
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'tr-TR,tr;q=0.9' });
  page.setDefaultTimeout(12000);
  return { browser, page };
}

async function searchOnPage(page, key) {
  await page.waitForSelector('body', { timeout: 12000 });
  return page.evaluate(async (needle) => {
    const norm = value => String(value || '')
      .toLocaleUpperCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim();
    const text = value => String(value || '').replace(/\s+/g, ' ').trim();
    const visible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const searchText = norm(needle);

    const openExistingCandidate = () => {
      const candidates = [...document.querySelectorAll('tr,a,button,div,span')]
        .filter(visible)
        .map(el => ({ el, text: String(el.innerText || el.value || el.title || '').replace(/\s+/g, ' ').trim() }))
        .filter(x => x.text && x.text.length < 900);

      const searchTokens = searchText.split(' ').filter(token => token.length >= 2);
      const exact = candidates.find(x => {
        const candidateText = norm(x.text);
        return candidateText.includes(searchText) || searchTokens.every(token => candidateText.includes(token));
      });
      if (!exact) return { opened: false, candidates: candidates.map(x => x.text).slice(0, 30) };
      const row = exact.el.closest('tr');
      const rowAction = row
        ? [...row.querySelectorAll('a,button,[role="button"]')]
          .filter(visible)
          .find(el => /ISLEM|DETAY|AC|GOR|DUZENLE|FATURA/.test(norm(el.innerText || el.value || el.title || el.getAttribute('aria-label'))))
        : null;
      const directAction = exact.el.matches('a,button,[role="button"]') ? exact.el : exact.el.closest('a,button,[role="button"]');
      const clickable = rowAction || directAction;
      if (!clickable) {
        return { opened: true, matched_text: exact.text, clicked_text: '', no_action: true };
      }
      clickable.click();
      return { opened: true, matched_text: exact.text, clicked_text: text(clickable.innerText || clickable.value || clickable.title || '') };
    };

    const ready = openExistingCandidate();
    if (ready.opened) return ready;

    const inputs = [...document.querySelectorAll('input[type="search"],input[type="text"],input:not([type]),textarea')]
      .filter(visible)
      .filter(el => !/password|email|date/i.test(el.type || ''));

    for (const input of inputs.slice(0, 5)) {
      input.focus();
      input.value = needle;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await sleep(300);
    }

    const buttons = [...document.querySelectorAll('button,a')].filter(visible);
    const searchButton = buttons.find(el => /ARA|FILFRE|LISTELE|GOSTER|BUL/.test(norm(el.innerText || el.value || el.title)));
    if (searchButton) {
      searchButton.click();
      await sleep(900);
    }

    return openExistingCandidate();
  }, key);
}

async function findAndOpenInvoice(page, task) {
  const keys = buildSearchKeys(task);
  const candidates = [];
  for (const target of targetsForTask(task)) {
    await openDetailTarget(page, target);
    await new Promise(resolve => setTimeout(resolve, 900));
    for (const key of keys) {
      const result = await searchOnPage(page, key).catch(error => ({ opened: false, error: error.message }));
      if (result.no_action) {
        candidates.push({ url: page.url(), key, result });
        if (!task.fatura_no_adayi) {
          return { ok: false, noAction: true, key, url: page.url(), result, candidates };
        }
        continue;
      }
      if (result.opened) {
        await Promise.race([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}),
          new Promise(resolve => setTimeout(resolve, 1600)),
        ]);
        return { ok: true, key, url: page.url(), result };
      }
      candidates.push({ url: page.url(), key, result });
    }
  }
  return { ok: false, key: keys[0] || '', candidates };
}

function targetsForTask(task) {
  const text = normalizeText([task.fatura_tipi_adayi, task.kaynak_kategori, task.aciklama].filter(Boolean).join(' '));
  if (/GIDER|MASRAF|IADE|KARGO|MARKET|BANKA|FATURA|ALIS/.test(text)) {
    return [
      ACTIVE_DETAIL_TARGETS.find(target => target.url.includes('/acc/ngncosts')),
      ACTIVE_DETAIL_TARGETS.find(target => target.url.includes('/doc/ngnretailpurchases')),
      ACTIVE_DETAIL_TARGETS.find(target => target.url.includes('/app/ngneinvoices')),
      ACTIVE_DETAIL_TARGETS[0],
    ].filter(Boolean);
  }
  return ACTIVE_DETAIL_TARGETS;
}

async function openDetailTarget(page, target) {
  await page.goto(target.url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await new Promise(resolve => setTimeout(resolve, 700));
  await clearPageSearchFilters(page);
  if (!(await isPublicLanding(page)) || !target.labels.length) return;

  await page.goto('https://bizimhesap.com/web/ngn/newportal', { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await new Promise(resolve => setTimeout(resolve, 700));
  await clearPageSearchFilters(page);
  for (const label of target.labels) {
    const clicked = await clickMenuLabel(page, label).catch(() => false);
    if (clicked) {
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}),
        new Promise(resolve => setTimeout(resolve, 1400)),
      ]);
      return;
    }
  }
}

async function clearPageSearchFilters(page) {
  await page.evaluate(async () => {
    const visible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const inputs = [...document.querySelectorAll('input[type="search"], input[aria-controls][type="text"]')]
      .filter(visible);
    for (const input of inputs) {
      if (!input.value) continue;
      input.focus();
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Backspace', bubbles: true }));
    }
    if (inputs.length) await sleep(400);
  }).catch(() => {});
}

async function isPublicLanding(page) {
  return page.evaluate(() => {
    const n = String(document.body?.innerText || '')
      .toLocaleUpperCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return n.includes('HAKKINDA') && n.includes('OZELLIKLER') && n.includes('FIYAT') && n.includes('GIRIS');
  }).catch(() => false);
}

async function clickMenuLabel(page, label) {
  return page.evaluate((wanted) => {
    const norm = value => String(value || '')
      .toLocaleUpperCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim();
    const visible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const wantedNorm = norm(wanted);
    const el = [...document.querySelectorAll('a,button,li,span,div')]
      .filter(visible)
      .find(node => norm(node.innerText || node.title || node.getAttribute('aria-label')).includes(wantedNorm));
    if (!el) return false;
    const clickable = el.closest('a,button,[role="button"]') || el;
    clickable.click();
    return true;
  }, label);
}

async function readDetailPage(page, task, search) {
  const data = await page.evaluate(() => {
    const text = value => String(value || '').replace(/\s+/g, ' ').trim();
    const rawText = String(document.body?.innerText || '')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line => line.replace(/[ \t]+/g, ' ').trim())
      .filter(Boolean)
      .join('\n');
    const links = [...document.querySelectorAll('a[href]')].map(a => ({
      text: text(a.innerText || a.title || ''),
      href: a.href || '',
    }));
    const tables = [...document.querySelectorAll('table')].map(table => {
      const headers = [...table.querySelectorAll('thead th,tr th')].map(th => text(th.innerText));
      const rows = [...table.querySelectorAll('tbody tr,tr')].map(tr => [...tr.querySelectorAll('td')].map(td => text(td.innerText))).filter(cells => cells.length);
      return { headers, rows };
    });
    return { rawText, links, tables, url: location.href, title: document.title };
  });

  const raw = data.rawText || '';
  const pdf = data.links.find(x => /\.pdf(\?|$)/i.test(x.href) || /PDF/i.test(x.text))?.href || '';
  const xml = data.links.find(x => /\.xml(\?|$)/i.test(x.href) || /XML|UBL/i.test(x.text))?.href || '';
  const kalemler = extractLineItems(data.tables);
  const expectedNo = String(task.fatura_no_adayi || '').trim();
  const expectedNoFound = expectedNo && normalizeText(raw).includes(normalizeText(expectedNo));
  const faturaNo = expectedNoFound ? expectedNo : firstMatch(raw, [
    /Fatura\s*No\s*:\s*([A-Z0-9-]+)/i,
    /Belge\s*No\s*:\s*([A-Z0-9-]+)/i,
    /\b([A-Z]{1,5}\d{10,})\b/i,
  ]);
  const genelToplam = firstMoneyAfter(raw, ['Genel Toplam', 'Odenecek Tutar', 'Toplam Tutar']) || Number(task.tutar || 0);
  const kdvToplam = firstMoneyAfter(raw, ['KDV Toplam', 'Hesaplanan KDV', 'KDV']) || kalemler.reduce((sum, item) => sum + item.kdv_tutari, 0);
  const araToplam = firstMoneyAfter(raw, ['Ara Toplam', 'Mal Hizmet Toplam', 'Matrah']) || Math.max(0, genelToplam - kdvToplam);
  const validation = validateDetailRead(raw, task, { faturaNo, kalemler, genelToplam });

  return {
    task_id: task.task_id || '',
    read_status: validation.ok ? 'ok' : 'needs_review',
    search_key: search.key || buildSearchKeys(task)[0] || '',
    fatura_tipi: firstMatch(raw, [/Fatura\s*Tipi[:\s]+([^\n]+)/i]) || task.fatura_tipi_adayi || '',
    fatura_no: faturaNo,
    fatura_tarihi: firstDate(raw, ['Fatura Tarihi', 'Duzenleme Tarihi', 'Tarih']) || task.tarih || '',
    vade_tarihi: firstDate(raw, ['Vade Tarihi', 'Vade']) || '',
    cari_unvan: firstMatch(raw, [/Cari\s*(?:Unvan|Adi)?[:\s]+([^\n]+)/i, /Tedarikci[:\s]+([^\n]+)/i, /Alici[:\s]+([^\n]+)/i]) || task.tedarikci || '',
    vergi_no: firstMatch(raw, [/(?:Vergi|VKN|TCKN)\s*(?:No|Numarasi)?[:\s]+(\d{10,11})/i]),
    aciklama: firstMatch(raw, [/Aciklama[:\s]+([^\n]+)/i]) || task.aciklama || '',
    ara_toplam: araToplam,
    kdv_toplam: kdvToplam,
    genel_toplam: genelToplam,
    odeme_durumu: firstMatch(raw, [/Odeme\s*Durumu[:\s]+([^\n]+)/i]) || inferPaymentStatus(raw),
    cari_durum: firstMatch(raw, [/Cari\s*Durum[:\s]+([^\n]+)/i]) || inferCurrentStatus(raw),
    belge_pdf: pdf,
    belge_xml: xml,
    kalemler,
    raw_text: raw.slice(0, 20000),
    error: validation.error,
  };
}

function validateDetailRead(raw, task, parsed) {
  const n = normalizeText(raw);
  if (!raw || raw.length < 80) return { ok: false, error: 'Detay sayfasi metni bos veya cok kisa' };

  const isListPage = (
    (n.includes('YENI MASRAF GIR') || n.includes('MASRAF KALEMLERI') || n.includes('ODENMISLER ODENECEKLER'))
    && (n.match(/\bISLEM\b/g) || []).length > 8
  );
  if (isListPage) return { ok: false, error: 'Liste ekrani okundu; fatura/masraf detay ekrani acilmadi' };

  const isPurchaseListPage = (
    n.includes('KAYITLI TEDARIKCIDEN ALIS GIR')
    && n.includes('TARIH ISIM UNVAN BELGE NO TUTAR DURUMU')
  );
  if (isPurchaseListPage) return { ok: false, error: 'Alis listesi okundu; fatura detayi acilmadi' };

  const expectedNo = String(task.fatura_no_adayi || '').trim();
  if (expectedNo && !n.includes(normalizeText(expectedNo))) {
    return { ok: false, error: `Aday fatura no detayda dogrulanamadi: ${expectedNo}` };
  }

  const markers = ['FATURA', 'BELGE', 'CARI', 'TEDARIKCI', 'GENEL TOPLAM', 'ARA TOPLAM', 'KDV']
    .filter(marker => n.includes(marker)).length;
  if (!parsed.faturaNo && !parsed.kalemler.length && markers < 2) {
    return { ok: false, error: 'Fatura detayi icin yeterli alan bulunamadi' };
  }

  return { ok: true, error: '' };
}

function firstMoneyAfter(raw, labels) {
  const text = String(raw || '');
  for (const label of labels) {
    const rx = new RegExp(`${label}[^\\d-]{0,80}(-?\\d{1,3}(?:\\.\\d{3})*,\\d{2}|-?\\d+[,\\.]\\d{2})`, 'i');
    const m = text.match(rx);
    if (m) return parseMoney(m[1]);
  }
  return 0;
}

function firstDate(raw, labels) {
  const text = String(raw || '');
  for (const label of labels) {
    const rx = new RegExp(`${label}[^\\d]{0,40}(\\d{2}[./-]\\d{2}[./-]\\d{4}|\\d{4}[./-]\\d{2}[./-]\\d{2})`, 'i');
    const m = text.match(rx);
    if (m) return normalizeDate(m[1]);
  }
  return '';
}

function normalizeDate(value) {
  const s = String(value || '').trim();
  let m = s.match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})[./-](\d{2})[./-](\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : s;
}

function inferPaymentStatus(raw) {
  const n = normalizeText(raw);
  if (n.includes('ODENDI') || n.includes('TAHSIL EDILDI') || n.includes('KAPALI')) return 'odendi';
  if (n.includes('ODENMEDI') || n.includes('ACIK')) return 'odenmedi';
  return '';
}

function inferCurrentStatus(raw) {
  const n = normalizeText(raw);
  if (n.includes('CARI ACIK') || n.includes('ACIK HESAP')) return 'acik';
  if (n.includes('CARI KAPALI') || n.includes('KAPALI')) return 'kapali';
  return '';
}

function extractLineItems(tables) {
  const items = [];
  for (const table of tables || []) {
    const headerText = [...(table.headers || [])].join(' ');
    const headerNorm = normalizeText(headerText);
    const likely = /MAL|HIZMET|MIKTAR|BIRIM|KDV|TUTAR|FIYAT/.test(headerNorm);
    if (!likely && (table.rows || []).length < 2) continue;
    for (const cells of table.rows || []) {
      const rowText = cells.join(' ');
      if (!/[A-Za-z0-9]/.test(rowText) || !/\d/.test(rowText)) continue;
      if (/TOPLAM|ISKONTO|KDV TOPLAM|GENEL TOPLAM/i.test(rowText)) continue;
      const moneyValues = cells.map(parseMoney).filter(Boolean);
      const kdvCell = cells.find(c => /%\s*\d+|\b\d{1,2}\s*%/.test(c));
      const miktarCell = cells.find(c => /^\d+(?:[,.]\d+)?$/.test(String(c).trim()));
      const desc = cells.find(c => normalizeText(c).length > 2 && !parseMoney(c) && !/%/.test(c)) || cells[0] || '';
      items.push({
        sira: items.length + 1,
        mal_hizmet: desc,
        miktar: miktarCell ? parseMoney(miktarCell) : 0,
        birim: firstMatch(rowText, [/\b(ADET|KG|LT|M|PAKET|KUTU|AY)\b/i]),
        birim_fiyat: moneyValues.length > 1 ? moneyValues[0] : 0,
        kdv_orani: kdvCell ? parseMoney(kdvCell) : 0,
        kdv_tutari: moneyValues.length > 2 ? moneyValues[moneyValues.length - 2] : 0,
        satir_toplami: moneyValues.length ? moneyValues[moneyValues.length - 1] : 0,
      });
    }
    if (items.length) break;
  }
  return items.slice(0, 200);
}

async function main() {
  const queue = readJson(QUEUE_PATH, { tasks: [] });
  const tasks = tasksFromQueue(queue);
  const existingDetails = RESUME ? readJson(OUT_PATH, { details: [] }).details || [] : [];
  const taskIds = new Set(tasks.map(task => task.task_id));
  const details = existingDetails.filter(detail => taskIds.has(detail.task_id));
  const doneIds = new Set(details.map(detail => detail.task_id));
  writeReport(tasks, details);

  if (!tasks.length) {
    const report = writeReport(tasks, details);
    console.log(JSON.stringify(report.summary, null, 2));
    console.log(OUT_PATH);
    return;
  }

  const firma = FIRMALAR[FIRMA_ARG] || FIRMALAR.alayli;
  const { browser, page } = await startBrowser();
  try {
    await loginBizimHesap(page, message => console.log(message));
    await selectFirma(page, firma, message => console.log(message));

    for (const task of tasks) {
      if (doneIds.has(task.task_id)) continue;
      try {
        const search = await findAndOpenInvoice(page, task);
        if (search.noAction) {
          details.push(emptyDetail(task, 'needs_review', 'Satir bulundu ama detay/duzenle aksiyonu yok', {
            diagnostics: summarizeSearchDiagnostics(search),
          }));
        } else if (!search.ok) {
          details.push(emptyDetail(task, 'not_found', 'BizimHesap icinde fatura/cari hareket bulunamadi', {
            diagnostics: summarizeSearchDiagnostics(search),
          }));
        } else {
          const detail = await readDetailPage(page, task, search);
          details.push(detail);
        }
      } catch (error) {
        await savePageDiagnostics(page, `fatura_detay_${task.task_id}`.replace(/[^a-z0-9_-]+/gi, '_')).catch(() => {});
        details.push(emptyDetail(task, 'failed', error.message));
      }
      doneIds.add(task.task_id);
      writeReport(tasks, details);
    }
  } finally {
    if (!SHOW) await browser.close();
  }

  const report = writeReport(tasks, details);
  appendTransactionLog(`${new Date().toISOString().slice(0, 10)} | ALAYLI | bizimhesap | fatura_detay_okuma | ${tasks.length} kuyruk | ${report.summary.read_success} ok | 0.00 | ${report.summary.read_failed ? 'kontrol' : 'ok'}`);
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(OUT_PATH);
}

function summarizeSearchDiagnostics(search) {
  return (search.candidates || []).slice(-8).map(item => ({
    url: item.url,
    key: item.key,
    opened: Boolean(item.result?.opened),
    error: item.result?.error || '',
    candidates: (item.result?.candidates || []).slice(0, 5),
  }));
}

main().catch(error => {
  const queue = readJson(QUEUE_PATH, { tasks: [] });
  const tasks = tasksFromQueue(queue);
  const report = writeReport(tasks, tasks.map(task => emptyDetail(task, 'failed', error.message)));
  console.error(error.message);
  console.log(JSON.stringify(report.summary, null, 2));
  process.exitCode = 1;
});
