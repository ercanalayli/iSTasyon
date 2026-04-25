const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const args = process.argv.slice(2);
const COMMIT = args.includes('--commit');
const SAVE = args.includes('--save');
const LIMIT = Number(args[args.indexOf('--limit') + 1] || process.env.BANK_LIMIT || 10);
const FIRMA_ARG = args.includes('--firma') ? args[args.indexOf('--firma') + 1] : null;
const ID_ARG = args.includes('--id') ? Number(args[args.indexOf('--id') + 1]) : null;

const CONFIG = {
  email: process.env.BIZIMHESAP_EMAIL || 'alaylimedikal@gmail.com',
  password: process.env.BIZIMHESAP_PASSWORD || 'aL290900.',
  loginUrl: 'https://bizimhesap.com/bhlogin',
  firmUrl: 'https://bizimhesap.com/web/ngn/sec/ngnmultiaccount',
  tahsilatUrl: process.env.BIZIMHESAP_TAHSILAT_URL || 'https://bizimhesap.com/web/ngn/acc/ngnaccounts',
  giderUrl: process.env.BIZIMHESAP_GIDER_URL || 'https://bizimhesap.com/web/ngn/acc/ngncostss',
  cariUrl: process.env.BIZIMHESAP_CARI_URL || 'https://bizimhesap.com/web/ngn/pos/ngncustomers',
  cariTahsilatPath: '/web/ngn/acc/ngncollectioncash',
};

const SUPABASE = {
  url: process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co',
  key: process.env.SUPABASE_KEY || 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW',
  table: process.env.BANK_TABLE || 'bank_transactions',
};

const FIRMALAR = [
  { id: 'alayli', adi: 'ALAYLI MEDIKAL', sektor: 'ALAYLI' },
  { id: 'elit', adi: 'ELIT ET URUNLERI', sektor: 'ELIT' },
  { id: 'odyoform', adi: 'ODYOFORM ISITME CIHAZLARI', sektor: 'ODYOFORM' },
];

const db = createClient(SUPABASE.url, SUPABASE.key);

function log(msg) {
  const line = `[${new Date().toLocaleString('tr-TR')}] ${msg}`;
  console.log(line);
  fs.appendFileSync('banka_bot_log.txt', line + '\n');
}

function para(n) {
  return Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sade(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
}

async function startBrowser() {
  const browser = await puppeteer.launch({
    headless: !COMMIT,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    defaultViewport: { width: 1366, height: 768 },
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'tr-TR,tr;q=0.9' });
  return { browser, page };
}

async function login(page) {
  log('[LOGIN] BizimHesap');
  await page.goto(CONFIG.loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input[type="email"], input[type="text"]', { timeout: 10000 });
  const emailEl = await page.$('input[type="email"]') || await page.$('input[type="text"]');
  await emailEl.click({ clickCount: 3 });
  await emailEl.type(CONFIG.email, { delay: 30 });
  const pwEl = await page.$('input[type="password"]');
  await pwEl.click({ clickCount: 3 });
  await pwEl.type(CONFIG.password, { delay: 30 });
  const clicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button,input[type="submit"]')]
      .find(b => (b.innerText || '').includes('Giriş') || (b.innerText || '').includes('Giris') || b.type === 'submit');
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (!clicked) await page.keyboard.press('Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  log('  -> ' + page.url());
}

async function firmaSec(page, firma) {
  log(`[FIRMA] ${firma.adi}`);
  await page.goto(CONFIG.firmUrl, { waitUntil: 'networkidle2', timeout: 20000 });
  await page.waitForSelector('a,button,div,span', { timeout: 10000 });
  let ok = false;
  const buttons = await page.$$('button,a');
  for (const el of buttons) {
    const txt = await el.evaluate(x => (x.innerText || '').toUpperCase());
    if (txt.includes(firma.sektor) && txt.length < 120) {
      await el.click();
      ok = true;
      break;
    }
  }
  if (!ok) throw new Error('Firma bulunamadi: ' + firma.adi);
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));
  if (page.url().includes('/sec/ngnmultiaccount')) {
    throw new Error('Firma secildi ama BizimHesap ana ekrana gecmedi');
  }
}

async function onayliHareketleriAl() {
  let q = db.from(SUPABASE.table)
    .select('*')
    .eq('onay_durumu', 'onaylandi')
    .eq('sinif_guven', 100)
    .or('bizimhesap_durumu.is.null,bizimhesap_durumu.neq.kaydedildi')
    .order('tarih', { ascending: true })
    .limit(LIMIT);

  if (FIRMA_ARG) q = q.eq('firma_id', FIRMA_ARG);
  if (ID_ARG) q = q.eq('id', ID_ARG);

  const { data, error } = await q;
  if (error) throw new Error(`Supabase ${SUPABASE.table}: ${error.message}`);
  return data || [];
}

function hareketTipi(h) {
  const tur = sade(h.tur || h.tip || h.islem_tipi || '');
  const tutar = Number(h.tutar || h.amount || 0);
  if (['transfer', 'virman', 'hesaplar_arasi_transfer', 'hesaplar arasi transfer'].includes(tur)) return 'transfer';
  if (['cari_tahsilat', 'cari tahsilat', 'musteri_tahsilat', 'musteri tahsilat'].includes(tur)) return 'cari_tahsilat';
  if (['banka_gider', 'banka gider', 'gider', 'expense', 'odeme'].includes(tur) || tutar < 0) return 'banka_gider';
  return 'tahsilat';
}

function aperionAciklama(h, tip) {
  const parcalar = [
    'APERION AUTO',
    `ID:${h.id || '-'}`,
    `TIP:${tip}`,
    h.firma_id ? `FIRMA:${h.firma_id}` : '',
    h.aciklama || h.description || h.banka_aciklama || '',
    h.karsi_taraf || h.cari_unvan || h.musteri || '',
  ].filter(Boolean);
  return parcalar.join(' | ').substring(0, 250);
}

async function formuDoldur(page, h) {
  const tip = hareketTipi(h);
  if (tip === 'cari_tahsilat') {
    await cariTahsilatFormuAc(page, h);
  } else if (tip === 'transfer') {
    await hesapFormuAc(page, h, 'transfer');
  } else if (tip === 'banka_gider') {
    await hesapFormuAc(page, h, 'cikis');
  } else {
    await hesapFormuAc(page, h, 'giris');
  }
  await page.waitForSelector('input,textarea,select,button', { timeout: 15000 });

  const result = await page.evaluate((hareket, tip) => {
    const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const setByHint = (hints, value) => {
      const fields = [...document.querySelectorAll('input,textarea')];
      const el = fields
      .filter(x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length))
      .find(x => {
        const txt = norm([x.name, x.id, x.placeholder, x.getAttribute('aria-label'), x.closest('label')?.innerText].join(' '));
        return hints.some(h => txt.includes(h));
      }) || fields.find(x => {
        const txt = norm([x.name, x.id, x.placeholder, x.getAttribute('aria-label'), x.closest('label')?.innerText].join(' '));
        return hints.some(h => txt.includes(h));
      });
      if (!el) return false;
      el.focus();
      el.value = value == null ? '' : String(value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };

    const tutar = Math.abs(Number(hareket.tutar || hareket.amount || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const aciklama = hareket.aperion_aciklama || hareket.aciklama || hareket.description || hareket.banka_aciklama || '';
    const cari = hareket.cari_unvan || hareket.musteri || hareket.eslesen_cari || hareket.karsi_taraf || '';
    const tarih = hareket.tarih || hareket.date || '';

    const kasa = hareket.hesap || hareket.kasa_hesap || '';
    const kasaOk = (() => {
      if (!kasa) return true;
      const selects = [...document.querySelectorAll('select')]
        .filter(x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length));
      for (const s of selects) {
        const opt = [...s.options].find(o => norm(o.text).includes(norm(kasa)));
        if (opt) {
          s.value = opt.value;
          s.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    })();

    return {
      tarih: setByHint(['tarih', 'date'], tarih),
      cari: setByHint(['cari', 'musteri', 'tedarikci', 'unvan'], cari),
      tutar: setByHint(['tutar', 'amount', 'meblag'], tutar),
      aciklama: setByHint(['aciklama', 'definition', 'not', 'description'], aciklama),
      kasa: kasaOk,
    };
  }, { ...h, aperion_aciklama: aperionAciklama(h, tip) }, tip);

  await page.screenshot({ path: `banka_${h.id || Date.now()}_form.png`, fullPage: true }).catch(() => {});
  await sayfaHaritasiKaydet(page, h.id || Date.now()).catch(e => log('  Sayfa haritasi alinamadi: ' + e.message));
  return result;
}

async function formuDoldur2(page, h) {
  const tip = hareketTipi(h);
  if (tip === 'cari_tahsilat') {
    await cariTahsilatFormuAc(page, h);
  } else if (tip === 'transfer') {
    await hesapFormuAc(page, h, 'transfer');
  } else if (tip === 'banka_gider') {
    await hesapFormuAc(page, h, 'cikis');
  } else {
    await hesapFormuAc(page, h, 'giris');
  }
  await page.waitForSelector('input,textarea,select,button', { timeout: 15000 });

  const result = await page.evaluate((hareket, tip) => {
    const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/Ä±/g, 'i').replace(/ÅŸ/g, 's').replace(/Ã§/g, 'c').replace(/ÄŸ/g, 'g').replace(/Ã¼/g, 'u').replace(/Ã¶/g, 'o');
    const visible = x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length);
    const fieldText = x => {
      const box = x.getBoundingClientRect();
      const labels = [...document.querySelectorAll('label,.control-label,td,th,div,span')]
        .filter(visible)
        .filter(y => {
          const b = y.getBoundingClientRect();
          const nearLeft = b.right <= box.left + 10 && Math.abs((b.top + b.bottom) / 2 - (box.top + box.bottom) / 2) < 35;
          const nearAbove = b.bottom <= box.top + 10 && Math.abs((b.left + b.right) / 2 - (box.left + box.right) / 2) < 180;
          return nearLeft || nearAbove;
        })
        .map(y => y.innerText || '')
        .join(' ');
      return norm([x.name, x.id, x.placeholder, x.getAttribute('aria-label'), x.closest('label')?.innerText, labels].join(' '));
    };
    const setValue = (el, value) => {
      el.focus();
      el.value = value == null ? '' : String(value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.blur();
      return true;
    };
    const setByHint = (hints, value) => {
      const fields = [...document.querySelectorAll('input,textarea')];
      const el = fields.filter(visible).find(x => hints.some(h => fieldText(x).includes(h)))
        || fields.find(x => hints.some(h => fieldText(x).includes(h)));
      return el ? setValue(el, value) : false;
    };
    const setByOrder = (index, value) => {
      const fields = [...document.querySelectorAll('input,textarea')].filter(visible);
      const el = fields[index];
      return el ? setValue(el, value) : false;
    };

    const tutar = Math.abs(Number(hareket.tutar || hareket.amount || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const aciklama = hareket.aperion_aciklama || hareket.aciklama || hareket.description || hareket.banka_aciklama || '';
    const cari = hareket.cari_unvan || hareket.musteri || hareket.eslesen_cari || hareket.karsi_taraf || '';
    const tarih = hareket.tarih || hareket.date || '';

    const kasa = hareket.hesap || hareket.kasa_hesap || '';
    const kasaOk = (() => {
      if (!kasa) return true;
      const selects = [...document.querySelectorAll('select')].filter(visible);
      for (const s of selects) {
        const opt = [...s.options].find(o => norm(o.text).includes(norm(kasa)));
        if (opt) {
          s.value = opt.value;
          s.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    })();

    const tarihOk = setByHint(['tarih', 'date'], tarih) || setByOrder(0, tarih);
    const aciklamaOk = setByHint(['aciklama', 'definition', 'not', 'description'], aciklama) || setByOrder(1, aciklama);
    const tutarOk = setByHint(['tutar', 'amount', 'meblag'], tutar) || setByOrder(3, tutar) || setByOrder(2, tutar);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    document.body.click();

    return {
      tarih: tarihOk,
      cari: tip !== 'cari_tahsilat' ? setByHint(['cari', 'musteri', 'tedarikci', 'unvan'], cari) : true,
      tutar: tutarOk,
      aciklama: aciklamaOk,
      kasa: kasaOk,
    };
  }, { ...h, aperion_aciklama: aperionAciklama(h, tip) }, tip);

  await page.keyboard.press('Escape').catch(() => {});
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: `banka_${h.id || Date.now()}_form.png`, fullPage: true }).catch(() => {});
  await sayfaHaritasiKaydet(page, h.id || Date.now()).catch(e => log('  Sayfa haritasi alinamadi: ' + e.message));
  return result;
}

async function hesapFormuAc(page, h, islem) {
  await page.goto(CONFIG.tahsilatUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await hesapSec(page, h.hesap || process.env.BIZIMHESAP_ACCOUNT || '*İŞ BANKASI', islem === 'giris');

  if (islem === 'giris') return;

  if (islem === 'cikis' || islem === 'transfer') {
    await page.evaluate(islem => {
      const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
      const aranan = islem === 'cikis'
        ? ['hesaptan para cikisi yap', 'hesaptan para çıkışı yap', 'para cikisi', 'para çıkışı']
        : ['hesaplar arasi transfer', 'hesaplar arası transfer'];
      const el = [...document.querySelectorAll('a,button')]
        .find(x => aranan.some(k => norm(x.innerText).includes(norm(k))));
      if (el) el.click();
    }, islem);
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
  }

  if (islem === 'transfer') {
    await page.evaluate(hedef => {
      const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
      const hedefNorm = norm(hedef || '');
      const menu = [...document.querySelectorAll('a,button')]
        .find(x => norm(x.innerText).includes('buradan baska hesaba transfer') || norm(x.innerText).includes('baska hesaptan buraya transfer'));
      if (menu) menu.click();
      const selects = [...document.querySelectorAll('select')].filter(x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length));
      for (const s of selects) {
        const opt = [...s.options].find(o => hedefNorm && norm(o.text).includes(hedefNorm));
        if (opt) {
          s.value = opt.value;
          s.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    }, h.hedef_hesap || h.karsi_hesap || h.raw?.hedef_hesap || h.raw?.karsi_hesap || '');
    await new Promise(r => setTimeout(r, 1000));
  }
}

async function cariTahsilatFormuAc(page, h) {
  const cari = h.cari_unvan || h.musteri || h.eslesen_cari || h.karsi_taraf || '';
  await page.goto(CONFIG.cariUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input,a,button,table', { timeout: 15000 });
  await page.evaluate(cariText => {
    const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const hedef = norm(cariText);
    const search = [...document.querySelectorAll('input[type="search"],input[type="text"]')]
      .find(x => !!(x.offsetWidth || x.offsetHeight || x.getClientRects().length));
    if (search && hedef) {
      search.value = cariText;
      search.dispatchEvent(new Event('input', { bubbles: true }));
      search.dispatchEvent(new Event('keyup', { bubbles: true }));
    }
  }, cari);
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(cariText => {
    const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const hedef = norm(cariText);
    const links = [...document.querySelectorAll('a,button')];
    const match = links.find(x => hedef && norm(x.innerText).includes(hedef)) || links.find(x => norm(x.innerText).includes('detay')) || links[0];
    if (match) match.click();
  }, cari);
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1200));
  await page.evaluate(() => {
    const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const aranan = ['tahsilat', 'odeme al', 'ödeme al', 'para girisi', 'para girişi'];
    const el = [...document.querySelectorAll('a,button')].find(x => aranan.some(k => norm(x.innerText).includes(norm(k))));
    if (el) el.click();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));

  if (!page.url().includes('/acc/ngncollectioncash') && page.url().includes('/pos/ngncustomer')) {
    const url = new URL(page.url());
    const guid = url.searchParams.get('guid');
    const rc = url.searchParams.get('rc') || '1';
    if (guid) {
      await page.goto(`https://bizimhesap.com${CONFIG.cariTahsilatPath}?rc=${rc}&identity=${guid}`, { waitUntil: 'networkidle2', timeout: 30000 });
    }
  }
}

async function hesapSec(page, hesapAdi, openGiris = true) {
  await page.waitForSelector('a', { timeout: 15000 });
  const ok = await page.evaluate(aranan => {
    const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const hedef = norm(aranan);
    const links = [...document.querySelectorAll('a[href*="ngnaccount"]')];
    const el = links.find(a => norm(a.innerText).includes(hedef)) || links[0];
    if (!el) return false;
    el.click();
    return true;
  }, hesapAdi);
  if (!ok) throw new Error('Tahsilat hesabi bulunamadi');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));
  if (!openGiris) return;

  await page.evaluate(() => {
    const norm = s => (s || '').toLowerCase()
      .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const aranan = ['hesaba para girisi yap', 'hesaba para girişi yap', 'para girisi', 'para girişi', 'tahsilat'];
    const el = [...document.querySelectorAll('a,button')]
      .find(x => aranan.some(k => norm(x.innerText).includes(norm(k))));
    if (el) el.click();
  });
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));
}

async function sayfaHaritasiKaydet(page, id) {
  const data = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    text: document.body.innerText.substring(0, 4000),
    links: [...document.querySelectorAll('a,button')]
      .map((el, i) => ({
        i,
        text: (el.innerText || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ').substring(0, 120),
        href: el.href || '',
        tag: el.tagName,
      }))
      .filter(x => x.text || x.href)
      .slice(0, 300),
    fields: [...document.querySelectorAll('input,textarea,select')]
      .map((el, i) => ({
        i,
        tag: el.tagName,
        type: el.type || '',
        name: el.name || '',
        id: el.id || '',
        placeholder: el.placeholder || '',
        aria: el.getAttribute('aria-label') || '',
        value: el.value || '',
        text: el.closest('label')?.innerText || '',
        visible: !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length),
      })),
  }));
  fs.writeFileSync(`banka_${id}_page.json`, JSON.stringify(data, null, 2));
}

async function formSayfasiniBul(page, tip) {
  const kelimeler = tip === 'gider'
    ? ['Masraf', 'Gider', 'Odeme', 'Ödeme', 'Para Cikisi', 'Para Çıkışı']
    : ['Tahsilat', 'Para Girisi', 'Para Girişi', 'Gelir', 'Kasa Banka'];

  for (const kelime of ['Nakit Yönetimi', 'Nakit Yonetimi', 'Kasa', 'Banka', ...kelimeler]) {
    const tiklandi = await page.evaluate(k => {
      const norm = s => (s || '').toLowerCase()
        .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
      const hedef = norm(k);
      const el = [...document.querySelectorAll('a,button,span,div')]
        .find(x => norm(x.innerText).includes(hedef) && (x.innerText || '').length < 80);
      if (!el) return false;
      (el.closest('a') || el.closest('button') || el).click();
      return true;
    }, kelime);
    if (tiklandi) {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 800));
    }
  }

  const yeniTiklandi = await page.evaluate(tip => {
    const norm = s => (s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
    const aranan = tip === 'gider'
      ? ['yeni masraf', 'yeni gider', 'odeme ekle', 'gider ekle', 'ekle']
      : ['yeni tahsilat', 'tahsilat ekle', 'gelir ekle', 'ekle'];
    const el = [...document.querySelectorAll('a,button')]
      .find(x => aranan.some(k => norm(x.innerText).includes(k)));
    if (!el) return false;
    el.click();
    return true;
  }, tip);
  if (yeniTiklandi) {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1000));
  }
}

async function hareketiIsle(page, h) {
  const tip = hareketTipi(h);
  const aciklama = aperionAciklama(h, tip);
  log(`[${h.id || '-'}] ${h.firma_id || '?'} ${h.tarih || ''} ${tip} ${para(Math.abs(Number(h.tutar || h.amount || 0)))} ${aciklama}`);

  if (!COMMIT) return { dry: true };

  const result = await formuDoldur2(page, h);
  const zorunlu = ['tarih', 'tutar', 'aciklama'];
  const eksik = zorunlu.filter(k => !result[k]);
  if (eksik.length) throw new Error('Form alanlari bulunamadi: ' + eksik.join(', '));

  if (!SAVE) {
    log('  Form dolduruldu. Guvenlik icin kaydet butonuna otomatik basilmadi.');
    return { form: result };
  }

  const saved = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button,a,input[type="submit"]')]
      .find(x => (x.innerText || x.value || '').toLowerCase().includes('kaydet'));
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!saved) throw new Error('Kaydet butonu bulunamadi');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  log('  Kaydet butonuna basildi.');
  return { form: result, saved: true };
}

async function isaretle(h, durum, mesaj) {
  if (!h.id || !COMMIT) return;
  const update = {
    bizimhesap_durumu: durum,
    bizimhesap_mesaj: mesaj || null,
    bizimhesap_islem_tarihi: new Date().toISOString(),
  };
  const { error } = await db.from(SUPABASE.table).update({
    ...update,
    aperion_not: aperionAciklama(h, hareketTipi(h)),
  }).eq('id', h.id);
  if (error && (error.message || '').includes('aperion_not')) {
    const retry = await db.from(SUPABASE.table).update(update).eq('id', h.id);
    if (retry.error) log(`  Isaretleme hatasi: ${retry.error.message}`);
    return;
  }
  if (error) log(`  Isaretleme hatasi: ${error.message}`);
}

async function main() {
  log(`AperiON banka botu - ${COMMIT ? 'COMMIT' : 'DRY RUN'} - limit ${LIMIT}`);
  const hareketler = await onayliHareketleriAl();
  if (!hareketler.length) {
    log('Onaylanmis bekleyen banka hareketi yok.');
    return;
  }

  log(`${hareketler.length} onayli hareket bulundu.`);
  if (!COMMIT) {
    for (const h of hareketler) await hareketiIsle(null, h);
    log('Dry-run bitti. Gercek deneme icin: node bizimhesap_banka_bot.js --commit --limit 1');
    return;
  }

  const { browser, page } = await startBrowser();
  try {
    await login(page);
    for (const h of hareketler) {
      try {
        const firma = FIRMALAR.find(f => f.id === h.firma_id);
        if (firma) await firmaSec(page, firma);
        await hareketiIsle(page, h);
        await isaretle(h, SAVE ? 'kaydedildi' : 'form_dolduruldu', SAVE ? 'BizimHesap kaydet butonuna basildi.' : 'Kaydet butonuna basilmadi; form kontrol bekliyor.');
      } catch (e) {
        log(`  Hata: ${e.message}`);
        await isaretle(h, 'hata', e.message);
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch(e => {
  log('GENEL HATA: ' + e.message);
  process.exitCode = 1;
});
