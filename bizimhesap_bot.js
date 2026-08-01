/**
 * AperiON Veri Motoru v6
 * - Ã‡ok firma desteÄŸi (ALAYLI, ELÄ°T, ODYOFORM)
 * - GeÃ§miÅŸ veri modu: node bot.js --gecmis 2026-01-01 2026-03-20
 * - Normal mod: her gÃ¼n dÃ¼nÃ¼ + saatlik bugÃ¼nÃ¼ Ã§eker
 */

const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { getBizimHesapConfig, launchOptions, loginBizimHesap, selectFirma } = require('./bizimhesap_common.cjs');

// â”€â”€ ARGÃœMAN PARSE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const args = process.argv.slice(2);
const GECMIS_MOD = args.includes('--gecmis');
const GECMIS_BASLANGIC = GECMIS_MOD ? args[args.indexOf('--gecmis')+1] : null;
const GECMIS_BITIS     = GECMIS_MOD ? args[args.indexOf('--gecmis')+2] : null;
const FIRMA_ARG = args.includes('--firma') ? args[args.indexOf('--firma') + 1] : null;
const DRY_RUN = args.includes('--dry-run');
const RAW_OUT = args.includes('--raw-out')
  ? args[args.indexOf('--raw-out') + 1]
  : 'data/bizimhesap_sales_report_raw.json';
const capturedSales = [];

// â”€â”€ TARÄ°H HESAPLA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function fmtTR(d) { return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`; }
function fmtISO(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

const simdi  = new Date();
const bugunD = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate());
const dunD   = new Date(bugunD); dunD.setDate(dunD.getDate()-1);

// Her zaman dÃ¼nÃ¼ Ã§ek (sabah gÃ¼nlÃ¼k mod)
const TARIH_TR  = GECMIS_MOD ? null : fmtTR(dunD);
const TARIH_ISO = GECMIS_MOD ? null : fmtISO(dunD);

// â”€â”€ FÄ°RMA TANIMLARI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FIRMALAR = [
  {
    id:      'alayli',
    adi:     'ALAYLI MEDÄ°KAL',
    sektor:  'ALAYLI',
    aktif:   true,
  },
  {
    id:      'elit',
    adi:     'ELÄ°T ET ÃœRÃœNLERÄ°',
    sektor:  'ELÄ°T',
    aktif:   true,
  },
  {
    id:      'odyoform',
    adi:     'ODYOFORM Ä°ÅÄ°TME CÄ°HAZLARI',
    sektor:  'ODYOFORM',
    aktif:   true,
  },
];
const AKTIF_FIRMALAR = FIRMA_ARG
  ? FIRMALAR.filter(f => f.aktif && f.id === FIRMA_ARG)
  : FIRMALAR.filter(f => f.aktif);

// â”€â”€ AYARLAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CONFIG = {
  ...getBizimHesapConfig(),
  reportUrl: 'https://bizimhesap.com/web/ngn/rep/NgnNewSalesReport',
};

const SUPABASE = {
  url:   process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co',
  key:   process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW',
  table: 'sales_raw',
};

// â”€â”€ WHATSAPP KÄ°ÅÄ°LER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const WP = [
  { isim:'Patron',    phone:'', apikey:'', alarm:50000, icerik:['ciro','adet','top'] },
  { isim:'Muhasebe',  phone:'', apikey:'', alarm:0,     icerik:['ciro','adet'] },
];

const db = createClient(SUPABASE.url, SUPABASE.key, { auth: { persistSession: false } });

// â”€â”€ LOG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function log(msg) {
  const t = new Date().toLocaleString('tr-TR');
  const line = `[${t}] ${msg}`;
  console.log(line);
  fs.appendFileSync('bot_log.txt', line + '\n');
}

const fmt = n => n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':n.toFixed(0);

function trNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value || '').replace(/TL|TRY|â‚º/gi, '').replace(/\s/g, '').replace(/[^0-9,.-]/g, '');
  if (!raw) return 0;
  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');
  let normalized = raw;
  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
  } else if (lastComma >= 0) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if (lastDot >= 0) {
    const parts = raw.split('.');
    normalized = parts.length > 2 || parts.at(-1).length === 3 ? raw.replace(/\./g, '') : raw;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

// â”€â”€ BROWSER BAÅLAT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function startBrowser() {
  const browser = await puppeteer.launch(launchOptions({ headless: true, width: 1366, height: 768 }));
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'tr-TR,tr;q=0.9' });
  return { browser, page };
}

// â”€â”€ LOGIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function login(page) {
  return loginBizimHesap(page, log);
  log('[LOGIN] ' + CONFIG.loginUrl);
  await page.goto(CONFIG.loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('body', { timeout: 10000 });
  let pwEl = await page.$('input[type="password"]');
  if (!pwEl) {
    await page.evaluate(() => {
      const norm = s => String(s || '').toLocaleLowerCase('tr-TR');
      const el = [...document.querySelectorAll('a,button')]
        .find(x => norm(x.innerText || x.value || x.title).includes('giriÅŸ yap') || norm(x.innerText || x.value || x.title).includes('giris yap'));
      if (el) el.click();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(()=>{});
  }
  await page.waitForSelector('input[type="password"]', { timeout: 12000 });

  const emailEl = await page.$('input[type="email"]') || await page.$('input[type="text"]');
  await emailEl.click({ clickCount: 3 });
  await emailEl.type(CONFIG.email, { delay: 60 });

  pwEl = await page.$('input[type="password"]');
  await pwEl.click({ clickCount: 3 });
  await pwEl.type(CONFIG.password, { delay: 60 });

  const ok = await page.evaluate(() => {
    const norm = s => String(s || '').toLocaleLowerCase('tr-TR');
    const b = document.querySelector('#btnLogin')
      || [...document.querySelectorAll('button')].find(b => norm(b.innerText || b.value).includes('giriÅŸ yap'));
    if(b){b.click();return true;}return false;
  });
  if (!ok) throw new Error('BizimHesap giris butonu bulunamadi');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(()=>{});
  log('  âœ“ â†’ ' + page.url());
}

// â”€â”€ FÄ°RMA SEÃ‡ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function firmaSec(page, firma) {
  return selectFirma(page, firma, log);
  log(`[FÄ°RMA] ${firma.adi}`);
  await page.goto(CONFIG.firmUrl, { waitUntil: 'networkidle2', timeout: 20000 });
  await page.waitForSelector('a,div', { timeout: 10000 });

  const ok = await page.evaluate(aranan => {
    for (const el of document.querySelectorAll('a,button,div,h4,h3,span')) {
      if ((el.innerText||'').toUpperCase().includes(aranan) && (el.innerText||'').length < 100) {
        (el.closest('a')||el.closest('button')||el).click(); return true;
      }
    }
    return false;
  }, firma.sektor);

  if (!ok) throw new Error('Firma bulunamadÄ±: ' + firma.adi);
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(()=>{});
  await new Promise(r => setTimeout(r, 1000));
}

// â”€â”€ RAPOR Ã‡EK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function raporCek(page, tarihTR) {
  log(`  [RAPOR] ${tarihTR}`);
  await page.goto(CONFIG.reportUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 800));

  // Kolonlar secimi hesap bazinda kaydediliyor - bazi BizimHesap kullanicilarinda
  // "Barkod"/"Urun Kodu" kolonlari secili degil, bu yuzden urun_kod hep bos geliyordu.
  // Rapor uretmeden once bu iki kolonu her ihtimale karsi zorla isaretliyoruz.
  await page.evaluate(() => {
    const wanted = ['Barkod', 'Ürün Kodu'];
    const boxes = [...document.querySelectorAll('input[type="checkbox"]')];
    wanted.forEach(label => {
      const cb = boxes.find(c => (c.closest('label')?.innerText || c.parentElement?.innerText || '').trim() === label);
      if (cb && !cb.checked) cb.click();
    });
  });

  const inputs = await page.$$('input[type="text"]');
  for (let i = 0; i < Math.min(inputs.length, 2); i++) {
    await inputs[i].click({ clickCount: 3 });
    await inputs[i].type(tarihTR, { delay: 30 });
  }

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b=>b.innerText?.includes('HazÄ±rla'));
    if (btn) btn.click();
  });

  try {
    await page.waitForSelector('table tbody tr', { timeout: 30000 });
  } catch {
    log('  âš  Tablo yok');
    return [];
  }
  await new Promise(r => setTimeout(r, 1500));

  return await page.evaluate(() => {
    const rows = [];
    const tbl = document.querySelector('table');
    if (!tbl) return rows;
    const hs = [...tbl.querySelectorAll('thead th')].map(h =>
      h.innerText.trim().toLowerCase().replace(/\s+/g,'_')
        .replace(/Ä±/g,'i').replace(/ÅŸ/g,'s').replace(/Ã§/g,'c')
        .replace(/ÄŸ/g,'g').replace(/Ã¼/g,'u').replace(/Ã¶/g,'o'));
    for (const tr of tbl.querySelectorAll('tbody tr')) {
      const cells = [...tr.querySelectorAll('td')].map(td=>td.innerText.trim());
      if (!cells.length||cells.every(c=>!c)) continue;
      const o={};hs.forEach((h,i)=>{if(h)o[h]=cells[i]||'';});o._cells=cells;
      rows.push(o);
    }
    return rows;
  });
}

// â”€â”€ SUPABASE KAYDET â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function kaydet(rows, firma, tarihISO) {
  if (!rows.length) { log('  âš  Veri yok'); return 0; }
  if (DRY_RUN) {
    log(`  [DRY-RUN] ${rows.length} satir yazilmayacak (${firma.id} ${tarihISO})`);
    return rows.length;
  }
  log(`  [DB] ${rows.length} satÄ±r yazÄ±lÄ±yor...`);

  // Gun/firma bazinda raporu yenile
  await db.from(SUPABASE.table).delete().eq('firma_id', firma.id).eq('tarih', tarihISO);

  const enrichedRecords = rows.map((r, index) => ({
    urun:     (r.satir_aciklamasi||r.urun||r.aciklama||(r._cells||[]).slice(-1)[0]||'EMPTY').substring(0,500),
    adet:     trNumber(r.adet||r.miktar||'1'),
    ciro:     trNumber(r.toplam||r.tutar||r.net||r.ciro||'0'),
    kaynak:   'bizimhesap',
    tarih:    tarihISO,
    unvan:    (r.musteri||r.cari||firma.adi).substring(0,200),
    kategori: r.kategori||r.sinif1||null,
    firma_id: firma.id,
    firma_adi:firma.adi,
    yil:      parseInt(tarihISO.substring(0,4)),
    ay:       parseInt(tarihISO.substring(5,7)),
    fatura_no: r.fatura_no || r.fatura || r.belge_no || r.evrak_no || r.fis_no || '',
    // Satis raporu kolonlari "Kod" ve "Barkod" (ASCII basliklar, Turkce karakter sorunu yok) -
    // eskiden urun_kod hep bos kayit ediliyordu cunku asagidaki destructuring bunu kasitli
    // disliyordu (satis<->urun eslestirmesi hic calismiyordu). Simdi hem yakalaniyor hem kaydediliyor.
    urun_kod: r.kod || r.urun_kodu || r.stok_kodu || '',
    barkod: r.barkod || '',
    satis_kdv_haric: trNumber(r.kdv_haric || r.net_tutar || r.matrah || r.net || r.toplam || r.tutar || r.ciro || '0'),
    satis_kdv_dahil: trNumber(r.kdv_dahil || r.genel_toplam || r.toplam || r.tutar || r.ciro || '0'),
    kaynak_satir: index + 1,
    raw: r,
  }));
  capturedSales.push(...enrichedRecords);
  const records = enrichedRecords.map(({
    satis_kdv_haric, satis_kdv_dahil, kaynak_satir, raw, ...record
  }) => record);

  const { data, error } = await db.from(SUPABASE.table).insert(records).select();

  if (error) { log('  âœ— DB hatasÄ±: ' + error.message); return 0; }
  log(`  âœ“ ${data.length} kayÄ±t`);
  return data.length;
}

// â”€â”€ WHATSAPP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function wpGonder(phone, apikey, msg) {
  const https = require('https');
  return new Promise(resolve => {
    if (!phone||!apikey){resolve(false);return;}
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(msg)}&apikey=${apikey}`;
    https.get(url, res => { log(`  ğŸ“± WP â†’ ${phone} (${res.statusCode})`); resolve(true); })
      .on('error', e => { log(`  âœ— WP: ${e.message}`); resolve(false); });
  });
}

async function wpSabahOzeti(tumRows) {
  if (simdi.getHours() !== 9 || GECMIS_MOD) return;
  const tc = tumRows.reduce((s,r)=>s+(+r.ciro||0),0);
  const ta = tumRows.reduce((s,r)=>s+(+r.adet||0),0);
  const mx = [...tumRows].sort((a,b)=>(+b.ciro||0)-(+a.ciro||0))[0];
  const tarih = fmtTR(dunD);

  for (const k of WP) {
    if (!k.phone||!k.apikey) continue;
    let lines = [`ğŸ“Š *AperiON Sabah Raporu*\n${tarih}`,''];
    if(k.icerik.includes('ciro'))  lines.push(`ğŸ’° Toplam Ciro: â‚º${fmt(tc)}`);
    if(k.icerik.includes('adet'))  lines.push(`ğŸ“¦ Adet: ${Math.round(ta).toLocaleString('tr')}`);
    if(k.icerik.includes('top')&&mx) lines.push(`ğŸ† Top: ${(mx.urun||'').substring(0,30)}`);
    lines.push('','_AperiON Â· iSTasyon ErpaltH_');
    await wpGonder(k.phone, k.apikey, lines.join('\n'));
    await new Promise(r=>setTimeout(r,2000));
  }
}

// â”€â”€ EKSÄ°K GÃœN BULUCU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function eksikGunleriBul(firmaId) {
  // Son 7 gÃ¼nÃ¼ hesapla (bugÃ¼n hariÃ§, dÃ¼n dahil)
  const gunler = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(bugunD);
    d.setDate(d.getDate() - i);
    gunler.push(fmtISO(d));
  }

  // DB'de hangi gÃ¼nler var?
  const { data } = await db
    .from(SUPABASE.table)
    .select('tarih')
    .eq('firma_id', firmaId)
    .in('tarih', gunler);

  const mevcutlar = new Set((data || []).map(r => r.tarih));
  const eksikler = gunler.filter(g => !mevcutlar.has(g));

  if (eksikler.length === 0) {
    log(`  [${firmaId}] Son 7 gÃ¼n tam âœ“`);
  } else {
    log(`  [${firmaId}] Eksik ${eksikler.length} gÃ¼n: ${eksikler.join(', ')}`);
  }

  return eksikler; // ISO format
}

// â”€â”€ GEÃ‡MÄ°Å VERÄ° MODU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function tarihlerArasindakiGunler(baslangic, bitis) {
  const dates = [];
  const cur = new Date(baslangic);
  const end = new Date(bitis);
  while (cur <= end) {
    dates.push(fmtTR(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// â”€â”€ MAIN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function main() {
  log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  log('  AperiON Veri Motoru v6 â€” iSTasyon ErpaltH      ');
  if (GECMIS_MOD) {
    log(`  MOD: GEÃ‡MÄ°Å VERÄ° â€” ${GECMIS_BASLANGIC} â†’ ${GECMIS_BITIS}`);
  } else {
    log(`  MOD: AKILLI â€” Son 7 gÃ¼n eksik kontrol`);
  }
  log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');

  const { browser, page } = await startBrowser();
  const tumRows = [];

  try {
    await login(page);

    if (GECMIS_MOD) {
      // GeÃ§miÅŸ mod: her firma iÃ§in tÃ¼m gÃ¼nleri Ã§ek
      const gunler = tarihlerArasindakiGunler(GECMIS_BASLANGIC, GECMIS_BITIS);
      log(`Toplam ${gunler.length} gÃ¼n Ã— ${FIRMALAR.filter(f=>f.aktif).length} firma Ã§ekilecek`);

      for (const firma of AKTIF_FIRMALAR) {
        let firmaTop = 0;
        await firmaSec(page, firma);

        for (const tarihTR of gunler) {
          const tarihISO = tarihTR.split('.').reverse().join('-');
          try {
            const rows = await raporCek(page, tarihTR);
            firmaTop += await kaydet(rows, firma, tarihISO);
          } catch (e) {
            log(`  âœ— ${firma.id} ${tarihTR}: ${e.message}`);
          }
          await new Promise(r => setTimeout(r, 500)); // BizimHesap'a yÃ¼k verme
        }
        log(`  âœ… ${firma.adi}: ${firmaTop} kayÄ±t`);
      }

    } else {
      // AkÄ±llÄ± mod: son 7 gÃ¼nde eksik gÃ¼nleri bul ve Ã§ek
      log('  Eksik gÃ¼nler kontrol ediliyor...');

      for (const firma of AKTIF_FIRMALAR) {
        try {
          const eksikler = await eksikGunleriBul(firma.id);

          if (eksikler.length === 0) {
            log(`  âœ“ ${firma.adi}: Veriler tam, atlandÄ±`);
            continue;
          }

          await firmaSec(page, firma);

          for (const tarihISO of eksikler) {
            const tarihTR = tarihISO.split('-').reverse().join('.');
            try {
              const rows = await raporCek(page, tarihTR);
              const n = await kaydet(rows, firma, tarihISO);
              tumRows.push(...rows.map(r=>({...r,ciro:trNumber(r.toplam||r.tutar||r.net||r.ciro||'0')})));
              log(`  âœ… ${firma.adi} ${tarihTR}: ${n} kayÄ±t`);
            } catch (e) {
              log(`  âœ— ${firma.adi} ${tarihTR}: ${e.message}`);
            }
            await new Promise(r => setTimeout(r, 800));
          }

        } catch (e) {
          log(`  âœ— ${firma.adi}: ${e.message}`);
          await page.screenshot({ path: `debug_${firma.id}.png`, fullPage: true }).catch(()=>{});
        }
      }

      await wpSabahOzeti(tumRows);
    }

    fs.mkdirSync(require('path').dirname(RAW_OUT), { recursive: true });
    fs.writeFileSync(RAW_OUT, JSON.stringify({
      created_at: new Date().toISOString(),
      source: 'bizimhesap_satis_raporu',
      firma_id: FIRMA_ARG || 'coklu',
      rows: capturedSales,
    }, null, 2), 'utf8');
    log(`  Ham satis raporu: ${capturedSales.length} satir -> ${RAW_OUT}`);
    log('âœ… TAMAMLANDI');

  } catch (e) {
    log('âœ— KRÄ°TÄ°K HATA: ' + e.message);
    await page.screenshot({ path: 'debug_error.png', fullPage: true }).catch(()=>{});
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
