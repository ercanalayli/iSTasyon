const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const profileDir = process.env.APSIYON_PROFILE_DIR || path.join(root, '.apsiyon-profile');
const sessionFile = path.join(root, 'data', 'apsiyon_session_status.json');
const defaultOut = path.join(root, 'finance_imports', 'apsiyon', 'apsiyon_personal_accruals_latest.json');

function valueArg(name, fallback = '') {
  const prefix = `--${name}=`;
  const item = process.argv.find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : fallback;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function normalize(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function parseAmount(text) {
  const match = String(text || '').match(/(?:TL|TRY|₺)\s*([\d.]+(?:,\d{1,2})?)|([\d.]+(?:,\d{1,2})?)\s*(?:TL|TRY|₺)/i);
  if (!match) return null;
  const value = (match[1] || match[2]).replace(/\./g, '').replace(',', '.');
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function parseDate(text) {
  const match = String(text || '').match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function classify(text) {
  if (/aidat/i.test(text)) return { obligation_id: 'personal-batikent-ercan-ev-aidat', category: 'Ev / Aidat', title: 'Batikent Ercan Ev Aidati' };
  if (/yak.t|yakit|akaryak.t|benzin|mazot/i.test(text)) return { obligation_id: 'personal-batikent-ercan-ev-yakit', category: 'Ev / Yakit', title: 'Batikent Ercan Ev Yakit Tahakkuku' };
  return null;
}

function parseAccruals(pageText) {
  const lines = String(pageText || '').split(/\r?\n/).map(normalize).filter(Boolean);
  const found = [];
  const seen = new Set();
  for (let index = 0; index < lines.length; index += 1) {
    const item = classify(lines[index]);
    if (!item) continue;
    const excerpt = lines.slice(Math.max(0, index - 3), Math.min(lines.length, index + 5)).join(' | ');
    const amount = parseAmount(excerpt);
    const dueDate = parseDate(excerpt);
    const key = crypto.createHash('sha256').update(`${item.obligation_id}|${dueDate || ''}|${amount || ''}|${excerpt}`).digest('hex').slice(0, 20);
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({
      source_id: `apsiyon-${key}`,
      ...item,
      amount,
      currency: 'TRY',
      due_date: dueDate,
      status: amount !== null && dueDate ? 'ready_for_calendar_review' : 'needs_review',
      evidence_excerpt: excerpt,
      evidence_line: lines[index],
    });
  }
  return found;
}

// The personal financial status page initially exposes category balances for
// the selected period, not necessarily a single monthly invoice. Keep these
// separately from payable accrual candidates so a yearly balance is never
// presented as this month's scheduled payment.
function parseCategoryBalances(pageText) {
  const lines = String(pageText || '').split(/\r?\n/).map(normalize).filter(Boolean);
  const categories = [];
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const name = raw.toLocaleUpperCase('tr-TR');
    const kind = name === 'AİDAT' ? 'aidat' : (name === 'DOĞALGAZ' ? 'dogalgaz' : '');
    if (!kind) continue;
    const values = lines.slice(index + 1, index + 5).map(parseAmount);
    if (values.length !== 4 || values.some((value) => value === null)) continue;
    categories.push({
      source_id: `apsiyon-balance-${kind}-${crypto.createHash('sha256').update(raw + values.join('|')).digest('hex').slice(0, 16)}`,
      kind,
      title: kind === 'aidat' ? 'Batikent Ercan Ev Aidat Bakiyesi' : 'Batikent Ercan Ev Dogalgaz Bakiyesi',
      period_type: 'source_summary_balance',
      debt_total: values[0], penalty_total: values[1], credit_total: values[2], balance: values[3],
      currency: 'TRY',
      status: 'source_balance_only',
      evidence_excerpt: [raw, ...lines.slice(index + 1, index + 5)].join(' | '),
    });
  }
  return categories;
}

async function main() {
  const out = valueArg('out', defaultOut);
  const headless = process.argv.includes('--headless') || process.env.APSIYON_HEADLESS === 'true';
  const session = fs.existsSync(sessionFile) ? JSON.parse(fs.readFileSync(sessionFile, 'utf8')) : null;
  const url = valueArg('url', process.env.APSIYON_ACCRUALS_URL || session?.url || 'https://apsiyon.com/account/login');
  const result = {
    created_at: new Date().toISOString(), source: 'apsiyon_personal_accruals', scope: 'personal', owner: 'Ercan Alayli', location: 'Batikent', mode: 'dry_run', source_url: url,
    summary: { found: 0, ready_for_calendar_review: 0, needs_review: 0, source_balance_categories: 0 }, accruals: [], source_balance_categories: [], discovered_links: [],
  };
  if (!fs.existsSync(profileDir)) {
    result.session = { ok: false, reason: 'profile_missing' };
    result.message = 'Apsiyon yerel oturumu bulunamadi. Once apsiyon_oturum_kur.cjs ile giris yapin.';
    writeJson(out, result);
    console.log('SONUC: OTURUM_GEREKLI');
    return;
  }
  const browser = await puppeteer.launch({ headless, userDataDir: profileDir, defaultViewport: { width: 1440, height: 920 }, args: ['--no-first-run', '--disable-blink-features=AutomationControlled'] });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const snapshot = await page.evaluate(() => ({
      url: location.href, title: document.title, text: document.body?.innerText || '',
      links: [...document.querySelectorAll('a')].map((anchor) => ({ text: (anchor.innerText || anchor.textContent || '').trim(), href: anchor.href })).filter((item) => /borc|tahakkuk|aidat|yakit|yak.t|odeme/i.test(item.text)),
    }));
    const loginRequired = /giris yap|sifreniz|hesabiniz yok/i.test(snapshot.text) && !/aidat|tahakkuk|borc/i.test(snapshot.text);
    result.session = { ok: !loginRequired, url: snapshot.url, title: snapshot.title };
    result.discovered_links = snapshot.links.slice(0, 20);
    if (loginRequired) {
      result.message = 'Apsiyon oturumu gecersiz veya tahakkuk ekranina ulasilamadi. Kalici oturumu yeniden kurun.';
      writeJson(out, result);
      console.log('SONUC: OTURUM_GEREKLI');
      return;
    }
    result.accruals = parseAccruals(snapshot.text);
    result.source_balance_categories = parseCategoryBalances(snapshot.text);
    result.summary.found = result.accruals.length;
    result.summary.ready_for_calendar_review = result.accruals.filter((item) => item.status === 'ready_for_calendar_review').length;
    result.summary.needs_review = result.accruals.filter((item) => item.status === 'needs_review').length;
    result.summary.source_balance_categories = result.source_balance_categories.length;
    result.message = result.accruals.length
      ? 'Tahakkuk adaylari kaynak kanitiyla okundu. Finans Takvimi importu ayri onay adimidir.'
      : (result.source_balance_categories.length
        ? 'Apsiyon hesap ozeti aidat/dogalgaz bakiye kirilimini verdi; aylik vade satiri olmadigi icin Finans Takvimi ne kesin odeme eklenmedi.'
        : 'Tahakkuk satiri bulunamadi. Borclarim veya tahakkuk ekrani URLsi APSIYON_ACCRUALS_URL olarak ayarlanmalidir.');
    writeJson(out, result);
    console.log(`Apsiyon dry-run: ${result.summary.found} tahakkuk adayi, ${result.summary.ready_for_calendar_review} takvim incelemesine hazir.`);
    console.log('SONUC: BASARILI');
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error('SONUC: BASARISIZ'); console.error(error.message || error); process.exitCode = 1; });
