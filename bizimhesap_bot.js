/**
 * AperiON Veri Motoru v7
 * - Çok firma desteği (ALAYLI, ELİT, ODYOFORM)
 * - Geçmiş veri modu: node bot.js --gecmis 2026-01-01 2026-03-20
 * - Normal mod: her gün dünü + saatlik bugünü çeker
 */

const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// ── ARGÜMAN PARSE ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const GECMIS_MOD = args.includes('--gecmis');
const GECMIS_BASLANGIC = GECMIS_MOD ? args[args.indexOf('--gecmis')+1] : null;
const GECMIS_BITIS     = GECMIS_MOD ? args[args.indexOf('--gecmis')+2] : null;

// ── TARİH HESAPLA ──────────────────────────────────────────────────────────
function fmtTR(d) { return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`; }
function fmtISO(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

const simdi  = new Date();
const bugunD = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate());
const dunD   = new Date(bugunD); dunD.setDate(dunD.getDate()-1);

// Her zaman dünü çek (sabah günlük mod)
const TARIH_TR  = GECMIS_MOD ? null : fmtTR(dunD);
const TARIH_ISO = GECMIS_MOD ? null : fmtISO(dunD);

// ── FİRMA TANIMLARI ────────────────────────────────────────────────────────
const FIRMALAR = [
  {
    id:      'alayli',
    adi:     'ALAYLI MEDİKAL',
    sektor:  'ALAYLI',
    aktif:   true,
  },
  {
    id:      'elit',
    adi:     'ELİT ET ÜRÜNLERİ',
    sektor:  'ELİT',
    aktif:   true,
  },
  {
    id:      'odyoform',
    adi:     'ODYOFORM İŞİTME CİHAZLARI',
    sektor:  'ODYOFORM',
    aktif:   true,
  },
];

// ── AYARLAR ────────────────────────────────────────────────────────────────
const CONFIG = {
  email:     'alaylimedikal@gmail.com',
  password:  'aL290900.',
  loginUrl:  'https://bizimhesap.com/bhlogin',
  firmUrl:   'https://bizimhesap.com/web/ngn/sec/ngnmultiaccount',
  reportUrl: 'https://bizimhesap.com/web/ngn/rep/NgnNewSalesReport',
};

const SUPABASE = {
  url:   'https://iilfwosoroflzubkaryj.supabase.co',
  key:   'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW',
  table: 'sales_raw',
};

// ── WHATSAPP KİŞİLER ───────────────────────────────────────────────────────
const WP = [
  { isim:'Patron',    phone:'', apikey:'', alarm:50000, icerik:['ciro','adet','top'] },
  { isim:'Muhasebe',  phone:'', apikey:'', alarm:0,     icerik:['ciro','adet'] },
];

const db = createClient(SUPABASE.url, SUPABASE.key);

// ── LOG ────────────────────────────────────────────────────────────────────
function log(msg) {
  const t = new Date().toLocaleString('tr-TR');
  const line = `[${t}] ${msg}`;
  console.log(line);
  fs.appendFileSync('bot_log.txt', line + '\n');
}

const fmt = n => n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':n.toFixed(0);

// ── BROWSER BAŞLAT ─────────────────────────────────────────────────────────
async function startBrowser() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-blink-features=AutomationControlled'],
    defaultViewport: { width: 1366, height: 768 },
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'tr-TR,tr;q=0.9' });
  return { browser, page };
}

// ── LOGIN ──────────────────────────────────────────────────────────────────
async function login(page) {
  log('[LOGIN] ' + CONFIG.loginUrl);
  await page.goto(CONFIG.loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input[type="email"], input[type="text"]', { timeout: 10000 });

  const emailEl = await page.$('input[type="email"]') || await page.$('input[type="text"]');
  await emailEl.click({ clickCount: 3 });
  await emailEl.type(CONFIG.email, { delay: 60 });

  const pwEl = await page.$('input[type="password"]');
  await pwEl.click({ clickCount: 3 });
  await pwEl.type(CONFIG.password, { delay: 60 });

  const ok = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button,input[type="submit"]')].find(b=>b.innerText?.includes('Giriş')||b.type==='submit');
    if(b){b.click();return true;}return false;
  });
  if (!ok) await page.keyboard.press('Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(()=>{});
  log('  ✓ → ' + page.url());
}

// ── FİRMA SEÇ ──────────────────────────────────────────────────────────────
async function firmaSeç(page, firma) {
  log(`[FİRMA] ${firma.adi}`);
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

  if (!ok) throw new Error('Firma bulunamadı: ' + firma.adi);
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(()=>{});
  await new Promise(r => setTimeout(r, 1000));
}

// ── RAPOR ÇEK ──────────────────────────────────────────────────────────────
async function raporCek(page, tarihTR) {
  log(`  [RAPOR] ${tarihTR}`);
  await page.goto(CONFIG.reportUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 800));

  const inputs = await page.$$('input[type="text"]');
  for (let i = 0; i < Math.min(inputs.length, 2); i++) {
    await inputs[i].click({ clickCount: 3 });
    await inputs[i].type(tarihTR, { delay: 30 });
  }

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b=>b.innerText?.includes('Hazırla'));
    if (btn) btn.click();
  });

  try {
    await page.waitForSelector('table tbody tr', { timeout: 30000 });
  } catch {
    log('  ⚠ Tablo yok');
    return [];
  }
  await new Promise(r => setTimeout(r, 1500));

  return await page.evaluate(() => {
    const rows = [];
    const tbl = document.querySelector('table');
    if (!tbl) return rows;
    const hs = [...tbl.querySelectorAll('thead th')].map(h =>
      h.innerText.trim().toLowerCase().replace(/\s+/g,'_')
        .replace(/ı/g,'i').replace(/ş/g,'s').replace(/ç/g,'c')
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o'));
    for (const tr of tbl.querySelectorAll('tbody tr')) {
      const cells = [...tr.querySelectorAll('td')].map(td=>td.innerText.trim());
      if (!cells.length||cells.every(c=>!c)) continue;
      const o={};hs.forEach((h,i)=>{if(h)o[h]=cells[i]||'';});o._cells=cells;
      rows.push(o);
    }
    return rows;
  });
}

// ── SUPABASE KAYDET ────────────────────────────────────────────────────────
async function kaydet(rows, firma, tarihISO) {
  if (!rows.length) { log('  ⚠ Veri yok'); return 0; }
  log(`  [DB] ${rows.length} satır yazılıyor...`);

  // Saatlik modda bugünü sil ve yeniden yaz
  if (!GECMIS_MOD && saat !== 9) {
    await db.from(SUPABASE.table).delete().eq('firma_id', firma.id).eq('tarih', tarihISO);
  }

  const records = rows.map(r => ({
    urun:     (r.satir_aciklamasi||r.urun||r.aciklama||(r._cells||[]).slice(-1)[0]||'EMPTY').substring(0,500),
    adet:     parseFloat((r.adet||r.miktar||'1').toString().replace(',','.'))||0,
    ciro:     parseFloat((r.tutar||r.ciro||r.toplam||'0').toString().replace(/[^0-9.,-]/g,'').replace(',','.'))||0,
    kaynak:   'bizimhesap',
    tarih:    tarihISO,
    unvan:    (r.musteri||r.cari||firma.adi).substring(0,200),
    kategori: r.kategori||r.sinif1||null,
    firma_id: firma.id,
    firma_adi:firma.adi,
    yil:      parseInt(tarihISO.substring(0,4)),
    ay:       parseInt(tarihISO.substring(5,7)),
  }));

  const { data, error } = await db.from(SUPABASE.table)
    .upsert(records, { onConflict: 'tarih,urun,unvan,firma_id', ignoreDuplicates: true })
    .select();

  if (error) { log('  ✗ DB hatası: ' + error.message); return 0; }
  log(`  ✓ ${data.length} kayıt`);
  return data.length;
}

// ── WHATSAPP ───────────────────────────────────────────────────────────────
async function wpGonder(phone, apikey, msg) {
  const https = require('https');
  return new Promise(resolve => {
    if (!phone||!apikey){resolve(false);return;}
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(msg)}&apikey=${apikey}`;
    https.get(url, res => { log(`  📱 WP → ${phone} (${res.statusCode})`); resolve(true); })
      .on('error', e => { log(`  ✗ WP: ${e.message}`); resolve(false); });
  });
}

async function wpSabahOzeti(tumRows) {
  if (GECMIS_MOD) return;
  const tc = tumRows.reduce((s,r)=>s+(+r.ciro||0),0);
  const ta = tumRows.reduce((s,r)=>s+(+r.adet||0),0);
  const mx = [...tumRows].sort((a,b)=>(+b.ciro||0)-(+a.ciro||0))[0];
  const tarih = fmtTR(dunD);

  for (const k of WP) {
    if (!k.phone||!k.apikey) continue;
    let lines = [`📊 *AperiON Sabah Raporu*\n${tarih}`,''];
    if(k.icerik.includes('ciro'))  lines.push(`💰 Toplam Ciro: ₺${fmt(tc)}`);
    if(k.icerik.includes('adet'))  lines.push(`📦 Adet: ${Math.round(ta).toLocaleString('tr')}`);
    if(k.icerik.includes('top')&&mx) lines.push(`🏆 Top: ${(mx.urun||'').substring(0,30)}`);
    lines.push('','_AperiON · iSTasyon ErpaltH_');
    await wpGonder(k.phone, k.apikey, lines.join('\n'));
    await new Promise(r=>setTimeout(r,2000));
  }
}


// ── BOT LOG ────────────────────────────────────────────────────────────────
async function botLogYaz(tarihISO, firmaId, durum, kayitSayisi, ciroToplam, hataMesaji) {
  try {
    await db.from('bot_logs').insert({
      tarih:        tarihISO,
      firma_id:     firmaId,
      durum:        durum,        // 'basarili', 'bos', 'hata'
      kayit_sayisi: kayitSayisi||0,
      ciro_toplam:  ciroToplam||0,
      hata_mesaji:  hataMesaji||null,
      bot_versiyonu:'v7'
    });
  } catch(e) {
    log('  ⚠ Log yazılamadı: ' + e.message);
  }
}

// ── EKSİK GÜN DURUM RAPORU ─────────────────────────────────────────────────
async function gunlukDurumRaporu() {
  // Son 7 günde her firma için log var mı kontrol et
  const simdi2 = new Date();
  const bugun2 = new Date(simdi2.getFullYear(), simdi2.getMonth(), simdi2.getDate());
  const p = n => String(n).padStart(2,'0');
  const fd = d => `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;

  const gunler = [];
  for (let i=1; i<=7; i++) {
    const d = new Date(bugun2); d.setDate(d.getDate()-i);
    gunler.push(fd(d));
  }

  const firmalar = FIRMALAR.filter(f=>f.aktif);
  const ozet = [];
  let eksikVar = false;

  for (const firma of firmalar) {
    const { data } = await db.from('sales_raw')
      .select('tarih')
      .eq('firma_id', firma.id)
      .in('tarih', gunler);
    const mevcutlar = new Set((data||[]).map(r=>r.tarih));
    const eksikler = gunler.filter(g => !mevcutlar.has(g));

    if (eksikler.length === 0) {
      ozet.push(`✅ ${firma.adi}: Son 7 gün tam`);
    } else {
      eksikVar = true;
      ozet.push(`❌ ${firma.adi}: ${eksikler.length} gün eksik → ${eksikler.join(', ')}`);
    }
  }

  return { ozet, eksikVar };
}

// ── EKSİK GÜN BULUCU ──────────────────────────────────────────────────────
async function eksikGunleriBul(firmaId) {
  // Son 7 günü hesapla (bugün hariç, dün dahil)
  const gunler = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(bugunD);
    d.setDate(d.getDate() - i);
    gunler.push(fmtISO(d));
  }

  // DB'de hangi günler var?
  const { data } = await db
    .from(SUPABASE.table)
    .select('tarih')
    .eq('firma_id', firmaId)
    .in('tarih', gunler);

  const mevcutlar = new Set((data || []).map(r => r.tarih));
  const eksikler = gunler.filter(g => !mevcutlar.has(g));

  if (eksikler.length === 0) {
    log(`  [${firmaId}] Son 7 gün tam ✓`);
  } else {
    log(`  [${firmaId}] Eksik ${eksikler.length} gün: ${eksikler.join(', ')}`);
  }

  return eksikler; // ISO format
}

// ── GEÇMİŞ VERİ MODU ──────────────────────────────────────────────────────
function tarihlerArasındakiGunler(baslangic, bitis) {
  const dates = [];
  const cur = new Date(baslangic);
  const end = new Date(bitis);
  while (cur <= end) {
    dates.push(fmtTR(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// ── MAIN ───────────────────────────────────────────────────────────────────
async function main() {
  log('══════════════════════════════════════════════════');
  log('  AperiON Veri Motoru v7 — iSTasyon ErpaltH      ');
  if (GECMIS_MOD) {
    log(`  MOD: GEÇMİŞ VERİ — ${GECMIS_BASLANGIC} → ${GECMIS_BITIS}`);
  } else {
    log(`  MOD: AKILLI — Son 7 gün eksik kontrol`);
  }
  log('══════════════════════════════════════════════════');

  const { browser, page } = await startBrowser();
  const tumRows = [];

  try {
    await login(page);

    if (GECMIS_MOD) {
      // Geçmiş mod: her firma için tüm günleri çek
      const gunler = tarihlerArasındakiGunler(GECMIS_BASLANGIC, GECMIS_BITIS);
      log(`Toplam ${gunler.length} gün × ${FIRMALAR.filter(f=>f.aktif).length} firma çekilecek`);

      for (const firma of FIRMALAR.filter(f=>f.aktif)) {
        let firmaTop = 0;
        await firmaSeç(page, firma);

        for (const tarihTR of gunler) {
          const tarihISO = tarihTR.split('.').reverse().join('-');
          try {
            const rows = await raporCek(page, tarihTR);
            firmaTop += await kaydet(rows, firma, tarihISO);
          } catch (e) {
            log(`  ✗ ${firma.id} ${tarihTR}: ${e.message}`);
          }
          await new Promise(r => setTimeout(r, 500)); // BizimHesap'a yük verme
        }
        log(`  ✅ ${firma.adi}: ${firmaTop} kayıt`);
      }

    } else {
      // Akıllı mod: son 7 günde eksik günleri bul ve çek
      log('  Eksik günler kontrol ediliyor...');

      for (const firma of FIRMALAR.filter(f=>f.aktif)) {
        try {
          const eksikler = await eksikGunleriBul(firma.id);

          if (eksikler.length === 0) {
            log(`  ✓ ${firma.adi}: Veriler tam, atlandı`);
            continue;
          }

          await firmaSeç(page, firma);

          for (const tarihISO of eksikler) {
            const tarihTR = tarihISO.split('-').reverse().join('.');
            try {
              const rows = await raporCek(page, tarihTR);
              const n = await kaydet(rows, firma, tarihISO);
              tumRows.push(...rows.map(r=>({...r,ciro:parseFloat((r.tutar||r.ciro||'0').replace(/[^0-9.,-]/g,'').replace(',','.'))||0})));
              log(`  ✅ ${firma.adi} ${tarihTR}: ${n} kayıt`);
            } catch (e) {
              log(`  ✗ ${firma.adi} ${tarihTR}: ${e.message}`);
            }
            await new Promise(r => setTimeout(r, 800));
          }

        } catch (e) {
          log(`  ✗ ${firma.adi}: ${e.message}`);
          await page.screenshot({ path: `debug_${firma.id}.png`, fullPage: true }).catch(()=>{});
        }
      }

      await wpSabahOzeti(tumRows);
    }

    log('✅ TAMAMLANDI');

    // Durum raporu - her çalışmada
    const { ozet, eksikVar } = await gunlukDurumRaporu();
    log('');
    log('── DURUM RAPORU ──────────────────────────────');
    ozet.forEach(s => log('  ' + s));
    log('───────────────────────────────────────────────');

    // Eksik varsa WP alarm gönder
    if (eksikVar) {
      const msg = '⚠️ *AperiON UYARI*\n\nEksik veri tespit edildi!\n\n' + ozet.join('\n') + '\n\n_AperiON · ErpaltH_';
      for (const k of WP.filter(k=>k.phone&&k.apikey)) {
        await wpGonder(k.phone, k.apikey, msg);
      }
    }

    // Normal teyit mesajı (sabah)
    const simdi3 = new Date();
    if (simdi3.getHours() >= 8 && simdi3.getHours() <= 10) {
      const msg = '📊 *AperiON Günlük Teyit*\n\n' + ozet.join('\n') + '\n\n_' + simdi3.toLocaleDateString('tr-TR') + ' ' + simdi3.toLocaleTimeString('tr-TR', {hour:'2-digit',minute:'2-digit'}) + '_';
      for (const k of WP.filter(k=>k.phone&&k.apikey)) {
        await wpGonder(k.phone, k.apikey, msg);
      }
    }

  } catch (e) {
    log('✗ KRİTİK HATA: ' + e.message);
    await page.screenshot({ path: 'debug_error.png', fullPage: true }).catch(()=>{});
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
