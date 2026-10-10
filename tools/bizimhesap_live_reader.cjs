'use strict';

const path = require('node:path');
const fs = require('node:fs');
const puppeteer = require('puppeteer');

const ROOT = process.env.APERION_CANONICAL_ROOT || 'C:\\AperiON\\iSTasyon';
require(path.join(ROOT, 'node_modules', 'dotenv')).config({
  path: path.join(ROOT, 'local-secrets', 'bizimhesap.local.env')
});

const BROWSER_URL = process.env.APERION_BIZIMHESAP_BROWSER_URL || 'http://127.0.0.1:9223';
const BRIDGE_URL = process.env.APERION_BRIDGE_URL || 'https://aperion-istasyon.pages.dev/api/bizimhesap-sales-sync';
const BRIDGE_SECRET = String(process.env.APERION_BRIDGE_SECRET || '').trim();
const POLL_MS = Math.max(15000, Number(process.env.APERION_BIZIMHESAP_READ_MS || 60000));
const REPORT_URL = 'https://bizimhesap.com/web/ngn/rep/NgnNewSalesReport';
const HEALTH_FILE = path.join(ROOT, 'local-secrets', 'bizimhesap_live_reader_health.json');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmtTR = d => new Intl.DateTimeFormat('tr-TR', { timeZone:'Europe/Istanbul', day:'2-digit', month:'2-digit', year:'numeric' }).format(d);
const fmtISO = d => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Europe/Istanbul', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(d);
  const x = Object.fromEntries(parts.map(p => [p.type,p.value]));
  return x.year + '-' + x.month + '-' + x.day;
};
function trNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw=String(value||'').replace(/TL|TRY|₺/gi,'').replace(/\s/g,'').replace(/[^0-9,.-]/g,'');
  if(!raw) return 0;
  const c=raw.lastIndexOf(','), d=raw.lastIndexOf('.');
  let n=raw;
  if(c>=0&&d>=0) n=c>d?raw.replace(/\./g,'').replace(',','.'):raw.replace(/,/g,'');
  else if(c>=0) n=raw.replace(/\./g,'').replace(',','.');
  else if(d>=0){const p=raw.split('.');n=p.length>2||p.at(-1).length===3?raw.replace(/\./g,''):raw;}
  const x=Number(n); return Number.isFinite(x)?x:0;
}
function writeHealth(value) {
  fs.mkdirSync(path.dirname(HEALTH_FILE), { recursive:true });
  fs.writeFileSync(HEALTH_FILE, JSON.stringify({ ...value, updated_at:new Date().toISOString() }, null, 2), 'utf8');
}
function normalizeHeader(s){
  return String(s||'').trim().toLocaleLowerCase('tr-TR').normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/\s+/g,'_');
}
function first(row, keys) {
  for (const key of keys) if (row[key] !== undefined && String(row[key]).trim() !== '') return row[key];
  return '';
}
async function connect() {
  const browser = await puppeteer.connect({ browserURL:BROWSER_URL, defaultViewport:null });
  const pages = await browser.pages();
  const authenticated = [];
  for (const p of pages.filter(p => /bizimhesap\.com/i.test(p.url()))) {
    const ok = await p.evaluate(async () => {
      try { const r=await fetch('/api/AngularControllers/firms/getcurrentfirm',{credentials:'include'}); return r.ok; }
      catch { return false; }
    }).catch(()=>false);
    if (ok) authenticated.push(p);
  }
  if (!authenticated.length) { browser.disconnect(); throw new Error('BIZIMHESAP_SESSION_NOT_READY'); }
  const page = await browser.newPage();
  return { browser, page };
}
async function readToday(page) {
  const now=new Date(), dateTR=fmtTR(now), dateISO=fmtISO(now);
  await page.goto(REPORT_URL,{waitUntil:'networkidle2',timeout:30000});
  await page.waitForSelector('input',{timeout:10000});
  await page.evaluate(() => {
    const norm=s=>String(s||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
    for (const cb of document.querySelectorAll('input[type="checkbox"]')) {
      const label=norm(cb.closest('label')?.innerText||cb.parentElement?.innerText||'');
      if ((label.includes('barkod')||label.includes('urun kodu')) && !cb.checked) cb.click();
    }
  });
  const inputs=await page.$$('input[type="text"]');
  for (let i=0;i<Math.min(inputs.length,2);i++){await inputs[i].click({clickCount:3});await inputs[i].type(dateTR,{delay:10});}
  await page.evaluate(() => {
    const norm=s=>String(s||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
    const b=[...document.querySelectorAll('button')].find(x=>norm(x.innerText).includes('hazirla')); if(b)b.click();
  });
  await page.waitForSelector('table tbody tr',{timeout:20000}).catch(()=>{});
  await sleep(1200);
  const rows=await page.evaluate(() => {
    const t=document.querySelector('table'); if(!t)return [];
    const norm=s=>String(s||'').trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/\s+/g,'_');
    const h=[...t.querySelectorAll('thead th')].map(x=>norm(x.innerText));
    return [...t.querySelectorAll('tbody tr')].map((tr,idx)=>{
      const c=[...tr.querySelectorAll('td')].map(td=>(td.innerText||'').trim());
      const o={_row:idx+1,_cells:c};h.forEach((k,i)=>{if(k)o[k]=c[i]||'';});return o;
    }).filter(r=>r._cells.some(Boolean));
  });
  const records=[];
  for (const r of rows) {
    const status=String(first(r,['durum','durumu','belge_durumu','status'])).toLocaleLowerCase('tr-TR');
    if (status.includes('taslak')) continue;
    const product=String(first(r,['urun','urun_adi','aciklama','mal_hizmet','stok_adi'])||'').trim();
    const customer=String(first(r,['musteri','cari','cari_unvan','unvan','firma'])||'Perakende Satışlar').trim();
    const qty=trNumber(first(r,['adet','miktar','qty']));
    const gross=trNumber(first(r,['toplam','tutar','net','ciro','genel_toplam']));
    if (!product || /no data available/i.test(product) || (!qty && !gross)) continue;
    records.push({
      firma_id:'alayli', firma_adi:'ALAYLI MEDIKAL', tarih:dateISO,
      unvan:customer, urun:product,
      urun_kod:String(first(r,['urun_kodu','urun_kod','stok_kodu','kod'])||'').trim(),
      barkod:String(first(r,['barkod','barcode'])||'').trim(),
      fatura_no:String(first(r,['fatura_no','belge_no','evrak_no','numara'])||'').trim(),
      kategori:String(first(r,['kategori','urun_grubu','grup'])||'').trim(),
      adet:qty || 1, ciro:gross,
      satis_kdv_haric:trNumber(first(r,['kdv_haric','matrah','ara_toplam'])) || gross,
      satis_kdv_dahil:gross, fifo_cost:null, operating_expense_allocated:null,
      estimated_tax:null, negative_stock:false, discount_pct:null,
      kaynak_satir:r._row, source_url:'https://bizimhesap.com/web/ngn/doc/ngnretailsales'
    });
  }
  return records;
}
async function push(records) {
  if (!BRIDGE_SECRET) throw new Error('APERION_BRIDGE_SECRET_MISSING');
  if (!records.length) return { ok:true, accepted:0, empty:true };
  const r=await fetch(BRIDGE_URL,{
    method:'POST',
    headers:{'content-type':'application/json',authorization:'Bearer '+BRIDGE_SECRET},
    body:JSON.stringify({records,evidence_ref:'bizimhesap:live-reader:'+fmtISO(new Date())}),
    signal:AbortSignal.timeout(30000)
  });
  const body=await r.json().catch(()=>({}));
  if(!r.ok||body.ok===false) throw new Error('SYNC_FAILED_'+r.status+'_'+String(body.error||body.message||''));
  return body;
}
async function cycle() {
  let browser,page;
  try {
    ({browser,page}=await connect());
    const records=await readToday(page);
    const result=await push(records);
    writeHealth({ok:true,status:'confirmed',records:records.length,accepted:Number(result.accepted||0),poll_ms:POLL_MS});
    console.log(JSON.stringify({ok:true,records:records.length,accepted:Number(result.accepted||0),at:new Date().toISOString()}));
  } catch (error) {
    writeHealth({ok:false,status:'degraded',error:String(error.message||error),poll_ms:POLL_MS});
    console.error('[AperiON BizimHesap live reader]', error.message||error);
  } finally {
    try { await page?.close(); } catch {}
    try { browser?.disconnect(); } catch {}
  }
}
(async()=>{
  if (!BRIDGE_SECRET) { console.error('APERION_BRIDGE_SECRET eksik.'); process.exit(2); }
  writeHealth({ok:false,status:'starting',poll_ms:POLL_MS});
  for (;;) { const started=Date.now(); await cycle(); await sleep(Math.max(1000,POLL_MS-(Date.now()-started))); }
})().catch(e=>{console.error(e);process.exit(1);});
