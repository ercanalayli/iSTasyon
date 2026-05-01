const puppeteer = require('puppeteer');
const fs = require('fs');

const args = process.argv.slice(2);
const FIRMA_ARG = args.includes('--firma') ? args[args.indexOf('--firma') + 1] : 'alayli';
const TARGET_CARI = args.includes('--cari') ? args[args.indexOf('--cari') + 1] : 'MURAT TICARET';
const OUT = 'bizimhesap_ogrenme_haritasi.json';

const CONFIG = {
  email: process.env.BIZIMHESAP_EMAIL || 'alaylimedikal@gmail.com',
  password: process.env.BIZIMHESAP_PASSWORD || 'aL290900.',
  loginUrl: 'https://bizimhesap.com/bhlogin',
  firmUrl: 'https://bizimhesap.com/web/ngn/sec/ngnmultiaccount',
  accountsUrl: 'https://bizimhesap.com/web/ngn/acc/ngnaccounts',
  expensesUrl: 'https://bizimhesap.com/web/ngn/acc/ngncostss',
  customersUrl: 'https://bizimhesap.com/web/ngn/pos/ngncustomers',
};

const FIRMALAR = {
  alayli: { adi: 'ALAYLI MEDIKAL', sektor: 'ALAYLI' },
  elit: { adi: 'ELIT ET URUNLERI', sektor: 'ELIT' },
  odyoform: { adi: 'ODYOFORM ISITME CIHAZLARI', sektor: 'ODYOFORM' },
};

const map = {
  started_at: new Date().toISOString(),
  firma: FIRMA_ARG,
  target_cari: TARGET_CARI,
  steps: [],
};

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o')
    .replace(/İ/g, 'i').replace(/Ş/g, 's').replace(/Ç/g, 'c').replace(/Ğ/g, 'g').replace(/Ü/g, 'u').replace(/Ö/g, 'o');
}

function log(msg) {
  const line = `[${new Date().toLocaleString('tr-TR')}] ${msg}`;
  console.log(line);
  fs.appendFileSync('bizimhesap_ogren_log.txt', line + '\n');
}

async function startBrowser() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    defaultViewport: { width: 1366, height: 768 },
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'tr-TR,tr;q=0.9' });
  return { browser, page };
}

async function capture(page, name) {
  await page.waitForSelector('body', { timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 700));
  const data = await page.evaluate(() => {
    const visible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const rect = el => {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const textNear = el => {
      const box = el.getBoundingClientRect();
      const labels = [...document.querySelectorAll('label,.control-label,td,th,div,span')]
        .filter(visible)
        .filter(x => {
          const b = x.getBoundingClientRect();
          return Math.abs((b.y + b.height / 2) - (box.y + box.height / 2)) < 26 && b.x < box.x;
        })
        .map(x => (x.innerText || '').trim().replace(/\s+/g, ' '))
        .filter(Boolean);
      return labels.slice(-2).join(' | ');
    };
    return {
      url: location.href,
      title: document.title,
      text: (document.body.innerText || '').substring(0, 3000),
      buttons: [...document.querySelectorAll('a,button,input[type=button],input[type=submit]')]
        .filter(visible)
        .map((el, i) => ({
          i,
          tag: el.tagName,
          text: (el.innerText || el.value || el.title || '').trim().replace(/\s+/g, ' ').substring(0, 120),
          href: el.href || '',
          rect: rect(el),
        }))
        .filter(x => x.text || x.href)
        .slice(0, 250),
      fields: [...document.querySelectorAll('input,textarea,select')]
        .filter(visible)
        .map((el, i) => ({
          i,
          tag: el.tagName,
          type: el.type || '',
          name: el.name || '',
          id: el.id || '',
          placeholder: el.placeholder || '',
          aria: el.getAttribute('aria-label') || '',
          label: textNear(el),
          value: el.tagName === 'SELECT' ? [...el.options].slice(0, 20).map(o => o.text).join(' | ') : (el.value || '').substring(0, 80),
          rect: rect(el),
        }))
        .slice(0, 250),
    };
  });
  const screenshot = `ogren_${name}.png`;
  await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
  map.steps.push({ name, screenshot, ...data });
  fs.writeFileSync(OUT, JSON.stringify(map, null, 2));
  log(`OK ${name}`);
}

async function clickText(page, words) {
  const found = await page.evaluate(words => {
    const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const wants = words.map(norm);
    const action = [...document.querySelectorAll('a,button,input[type=button],input[type=submit]')]
      .filter(el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
    let el = action.find(x => wants.some(w => norm(x.innerText || x.value || x.title).includes(w)));
    if (!el) {
      const broad = [...document.querySelectorAll('div,span,td')]
        .filter(x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length))
        .find(x => wants.some(w => norm(x.innerText || x.value || x.title).includes(w)));
      el = broad?.closest('a,button') || broad;
    }
    if (el && !['HTML', 'BODY'].includes(el.tagName)) {
      el.click();
      return (el.innerText || el.value || el.title || '').trim();
    }
    return '';
  }, words);
  if (found) {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 800));
  }
  return found;
}

async function selectByText(page, words) {
  return page.evaluate(words => {
    const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const wants = words.map(norm);
    for (const s of [...document.querySelectorAll('select')].filter(x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length))) {
      const opt = [...s.options].find(o => wants.some(w => norm(o.text).includes(w)));
      if (opt) {
        s.value = opt.value;
        s.dispatchEvent(new Event('input', { bubbles: true }));
        s.dispatchEvent(new Event('change', { bubbles: true }));
        return opt.text;
      }
    }
    return '';
  }, words);
}

async function login(page) {
  await page.goto(CONFIG.loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await capture(page, '01_login');
  const emailEl = await page.$('input[type="email"]') || await page.$('input[type="text"]');
  if (emailEl) {
    await emailEl.click({ clickCount: 3 });
    await emailEl.type(CONFIG.email, { delay: 15 });
  }
  const pwEl = await page.$('input[type="password"]');
  if (pwEl) {
    await pwEl.click({ clickCount: 3 });
    await pwEl.type(CONFIG.password, { delay: 15 });
  }
  const clicked = await clickText(page, ['Giriş Yap', 'Giris Yap', 'Giriş']);
  if (!clicked) await page.keyboard.press('Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await capture(page, '02_login_sonrasi');
}

async function firmaSec(page) {
  const firma = FIRMALAR[FIRMA_ARG] || FIRMALAR.alayli;
  await page.goto(CONFIG.firmUrl, { waitUntil: 'networkidle2', timeout: 20000 });
  await capture(page, '03_firma_sec');
  const ok = await clickText(page, [firma.sektor, firma.adi]);
  if (!ok) throw new Error('Firma secilemedi');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1800));
  await capture(page, '04_ana_sayfa');
}

async function accounts(page) {
  await page.goto(CONFIG.accountsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await capture(page, '10_hesaplar');
  await clickText(page, ['İŞ BANKASI', 'IS BANKASI']);
  await capture(page, '11_is_bankasi');
  await clickText(page, ['Hesaba Para Girişi Yap', 'Para Girişi']);
  await capture(page, '12_banka_para_girisi_formu');
  await page.goto(CONFIG.accountsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await clickText(page, ['İŞ BANKASI', 'IS BANKASI']);
  await clickText(page, ['Hesaplar Arası Transfer']);
  await capture(page, '13_transfer_menu');
  await clickText(page, ['Buradan Başka Hesaba Transfer Et', 'Buradan Baska Hesaba Transfer Et']);
  await capture(page, '14_transfer_formu');
}

async function expenses(page) {
  await page.goto(CONFIG.expensesUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await capture(page, '20_masraflar');
  await clickText(page, ['Yeni Masraf Gir', 'Yeni Masraf', 'Masraf Gir']);
  await capture(page, '21_yeni_masraf_formu');
  await selectByText(page, ['Banka Masrafları', 'Banka Masrafı', 'Banka Masraf']);
  await selectByText(page, ['Ödendi', 'Odendi']);
  await new Promise(r => setTimeout(r, 900));
  await selectByText(page, ['İŞ BANKASI', 'IS BANKASI']);
  await capture(page, '22_banka_masraf_odendi_formu');
}

async function customers(page) {
  await page.goto(CONFIG.customersUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await capture(page, '30_musteriler');
  const search = await page.$('#searchInput') || (await page.$$('input[type=search],input[type=text]')).pop();
  if (search) {
    await search.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await search.type(TARGET_CARI.toLowerCase(), { delay: 40 });
  }
  await new Promise(r => setTimeout(r, 1300));
  await capture(page, '31_musteri_arama');
  const opened = await page.evaluate(cari => {
    const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const want = norm(cari);
    const el = [...document.querySelectorAll('a,button,td,div')]
      .filter(x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length))
      .find(x => want && norm(x.innerText).includes(want));
    if (el) {
      el.click();
      return true;
    }
    return false;
  }, TARGET_CARI);
  if (opened) {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
    await capture(page, '32_musteri_karti');
    await clickText(page, ['Tahsilat/Ödeme', 'Tahsilat']);
    await capture(page, '33_cari_tahsilat_formu');
  }
}

function writeSummary() {
  const lines = [
    '# BizimHesap Otomatik Ogrenme Haritasi',
    '',
    `Tarih: ${new Date().toLocaleString('tr-TR')}`,
    `Firma: ${FIRMA_ARG}`,
    `Cari arama: ${TARGET_CARI}`,
    '',
    '## Ogrenilen Ekranlar',
    ...map.steps.map(s => `- ${s.name}: ${s.url} (${s.fields.length} alan, ${s.buttons.length} buton)`),
    '',
    '## Sonraki Bot Kurallari',
    '- Cari tahsilat: musteri ara > kart > tahsilat/odeme > banka hesabi > tutar > kaydet.',
    '- Banka masrafi: masraflar > yeni masraf > mali giderler/banka masrafi > odendi > is bankasi > tutar > kaydet.',
    '- Transfer: hesaplar > banka hesabi > hesaplar arasi transfer > hedef hesap > tutar > kaydet.',
  ];
  fs.writeFileSync('bizimhesap_ogrenme_ozeti.md', lines.join('\n'));
}

async function main() {
  log('BizimHesap ogrenme botu basladi');
  const { browser, page } = await startBrowser();
  try {
    await login(page);
    await firmaSec(page);
    await accounts(page);
    await expenses(page);
    await customers(page);
    writeSummary();
    log('Ogrenme tamamlandi');
  } finally {
    await browser.close();
  }
}

main().catch(e => {
  log('GENEL HATA: ' + e.message);
  writeSummary();
  process.exit(1);
});
