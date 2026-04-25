const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const crypto = require('crypto');

const args = process.argv.slice(2);
const GECMIS_MOD = args.includes('--gecmis');
const GECMIS_BASLANGIC = GECMIS_MOD ? args[args.indexOf('--gecmis') + 1] : null;
const GECMIS_BITIS = GECMIS_MOD ? args[args.indexOf('--gecmis') + 2] : null;
const DRY_RUN = args.includes('--dry-run');

function fmtTR(d) {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
function fmtISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const simdi = new Date();
const saat = simdi.getHours();
const bugunD = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate());
const dunD = new Date(bugunD);
dunD.setDate(dunD.getDate() - 1);

const TARIH_TR = GECMIS_MOD ? null : fmtTR(dunD);
const TARIH_ISO = GECMIS_MOD ? null : fmtISO(dunD);

const FIRMALAR = [
  { id: 'alayli', adi: 'ALAYLI MEDİKAL', sektor: 'ALAYLI', aktif: true },
  { id: 'elit', adi: 'ELİT ET ÜRÜNLERİ', sektor: 'ELİT', aktif: true },
  { id: 'odyoform', adi: 'ODYOFORM İŞİTME CİHAZLARI', sektor: 'ODYOFORM', aktif: true },
];

const CONFIG = {
  email: 'alaylimedikal@gmail.com',
  password: 'aL290900.',
  loginUrl: 'https://bizimhesap.com/bhlogin',
  firmUrl: 'https://bizimhesap.com/web/ngn/sec/ngnmultiaccount',
  reportUrl: 'https://bizimhesap.com/web/ngn/rep/NgnNewSalesReport',
  masrafUrl: 'https://bizimhesap.com/web/ngn/rep/ngncostreport',
};

const SUPABASE = {
  url: 'https://iilfwosoroflzubkaryj.supabase.co',
  key: 'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW',
  table: 'sales_raw',
  masrafTbl: 'masraf_raw',
};

const WP = [
  { isim: 'Patron', phone: '', apikey: '', alarm: 50000, icerik: ['ciro', 'adet', 'top'] },
  { isim: 'Muhasebe', phone: '', apikey: '', alarm: 0, icerik: ['ciro', 'adet'] },
];

const db = createClient(SUPABASE.url, SUPABASE.key);

function hashSatir(r) {
  return crypto.createHash('sha1').update(JSON.stringify(r)).digest('hex');
}

function parseTRNumber(value) {
  if (value === null || value === undefined) return 0;
  const raw = String(value).trim();
  if (!raw) return 0;
  let s = raw.replace(/[^0-9.,-]/g, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > -1 && lastComma > -1) {
    s = s.replace(/,/g, '');
  } else if ((s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function log(msg) {
  const t = new Date().toLocaleString('tr-TR');
  const line = `[${t}] ${msg}`;
  console.log(line);
  fs.appendFileSync('bot_log.txt', line + '\n');
}

const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n.toFixed(0);

async function wpGonder(kisi, mesaj) {
  if (!kisi.phone || !kisi.apikey) return false;
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(kisi.phone)}&text=${encodeURIComponent(mesaj)}&apikey=${encodeURIComponent(kisi.apikey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CallMeBot HTTP ${res.status}`);
  return true;
}

async function wpSabahOzeti(rows) {
  const toplamCiro = rows.reduce((t, r) => {
    const raw = r.toplam || r.ciro || r.tutar || r.net || '0';
    return t + parseTRNumber(raw);
  }, 0);
  const mesaj = [
    'AperiON gunluk bot ozeti',
    `Tarih: ${TARIH_ISO || GECMIS_BITIS || fmtISO(new Date())}`,
    `Satir: ${rows.length}`,
    `Ciro: ${fmt(toplamCiro)} TL`,
  ].join('\n');

  let gonderilen = 0;
  for (const kisi of WP) {
    try {
      if (await wpGonder(kisi, mesaj)) gonderilen++;
    } catch (e) {
      log(`  WhatsApp gonderilemedi (${kisi.isim}): ${e.message}`);
    }
  }
  if (!gonderilen) log(`  [WP] Alici ayarli degil, ozet atlandi: ${mesaj.replace(/\n/g, ' | ')}`);
}

async function startBrowser() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    defaultViewport: { width: 1366, height: 768 },
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'tr-TR,tr;q=0.9' });
  return { browser, page };
}

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
    const b = [...document.querySelectorAll('button,input[type="submit"]')].find(b => b.innerText?.includes('Giriş') || b.type === 'submit');
    if (b) { b.click(); return true; }
    return false;
  });

  if (!ok) await page.keyboard.press('Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  log('  ✓ → ' + page.url());
}

async function firmaSec(page, firma) {
  log(`[FİRMA] ${firma.adi}`);
  await page.goto(CONFIG.firmUrl, { waitUntil: 'networkidle2', timeout: 20000 });
  await page.waitForSelector('a,div', { timeout: 10000 });

  const ok = await page.evaluate(aranan => {
    for (const el of document.querySelectorAll('a,button,div,h4,h3,span')) {
      if ((el.innerText || '').toUpperCase().includes(aranan) && (el.innerText || '').length < 100) {
        (el.closest('a') || el.closest('button') || el).click();
        return true;
      }
    }
    return false;
  }, firma.sektor);

  if (!ok) throw new Error('Firma bulunamadı: ' + firma.adi);
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));
}

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
    const btn = [...document.querySelectorAll('button')].find(b => b.innerText?.includes('Hazırla'));
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
      h.innerText.trim().toLowerCase().replace(/\s+/g, '_')
        .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c')
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o'));
    for (const tr of tbl.querySelectorAll('tbody tr')) {
      const cells = [...tr.querySelectorAll('td')].map(td => td.innerText.trim());
      if (!cells.length || cells.every(c => !c)) continue;
      const o = {};
      hs.forEach((h, i) => { if (h) o[h] = cells[i] || ''; });
      o._cells = cells;
      rows.push(o);
    }
    return rows;
  });
}

async function botLogYaz(tarihISO, firmaId, durum, kayitSayisi, ciroToplam, hataMesaji) {
  try {
    await db.from('bot_logs').insert({
      tarih: tarihISO,
      firma_id: firmaId,
      durum,
      kayit_sayisi: kayitSayisi || 0,
      ciro_toplam: ciroToplam || 0,
      hata_mesaji: hataMesaji || null,
      bot_versiyonu: 'v7-fixed'
    });
  } catch (e) {
    log('  ⚠ Log yazılamadı: ' + e.message);
  }
}

async function kaydet(rows, firma, tarihISO) {
  if (!rows.length) {
    log('  ⚠ Veri yok');
    await botLogYaz(tarihISO, firma.id, 'bos', 0, 0, null);
    return 0;
  }

  log(`  [DB] ${rows.length} satır yazılıyor...`);

  let records = rows.map((r, idx) => ({
    urun: (r.satir_aciklamasi || r.urun || r.aciklama || (r._cells || []).slice(-1)[0] || 'EMPTY').substring(0, 500),
    adet: parseTRNumber(r.adet || r.miktar || '1'),
    ciro: parseTRNumber(r.toplam || r.ciro || r.net || r.tutar || '0'),
    kaynak: 'bizimhesap',
    tarih: tarihISO,
    kaynak_rapor_tarihi: tarihISO,
    kaynak_cekilme_tarihi: new Date().toISOString(),
    belge_no: (r.belge_no || r.fatura_no || r.no || r.evrak_no || '').toString().substring(0, 120) || null,
    satir_hash: hashSatir({ firma_id: firma.id, tarihISO, idx, cells: r._cells || [], row: r }),
    degisim_durumu: 'normal',
    unvan: (r.musteri || r.cari || firma.adi).substring(0, 200),
    kategori: r.kategori || r.sinif1 || null,
    firma_id: firma.id,
    firma_adi: firma.adi,
    yil: parseInt(tarihISO.substring(0, 4)),
    ay: parseInt(tarihISO.substring(5, 7)),
  }));

  if (!DRY_RUN) {
    for (const rec of records) {
      const onceki = rec.belge_no
        ? await db.from(SUPABASE.table).select('id,tarih,ciro,belge_no').eq('firma_id', rec.firma_id).eq('belge_no', rec.belge_no).limit(1)
        : await db.from(SUPABASE.table).select('id,tarih,ciro,belge_no').eq('firma_id', rec.firma_id).eq('tarih', rec.tarih).eq('urun', rec.urun).eq('unvan', rec.unvan).limit(1);
      const old = onceki.data?.[0];
      if (!old) continue;
      const tarihDegisti = old.tarih && old.tarih !== rec.tarih;
      const tutarDegisti = Math.abs(Number(old.ciro || 0) - Number(rec.ciro || 0)) > 0.01;
      if (!tarihDegisti && !tutarDegisti) continue;
      rec.onceki_tarih = old.tarih;
      rec.onceki_ciro = old.ciro;
      rec.degisim_durumu = tarihDegisti ? 'tarih_degisti' : 'tutar_degisti';
      rec.denetim_notu = tarihDegisti
        ? `Belge/satir once ${old.tarih}, simdi ${rec.tarih}`
        : `Tutar once ${old.ciro}, simdi ${rec.ciro}`;
      await db.from('sales_change_log').insert({
        sales_raw_id: old.id,
        firma_id: rec.firma_id,
        belge_no: rec.belge_no,
        eski_tarih: old.tarih,
        yeni_tarih: rec.tarih,
        eski_ciro: old.ciro,
        yeni_ciro: rec.ciro,
        degisim_tipi: rec.degisim_durumu,
        aciklama: rec.denetim_notu,
      });
    }

    const { error: cleanError } = await db.from(SUPABASE.table)
      .delete()
      .eq('firma_id', firma.id)
      .eq('tarih', tarihISO);
    if (cleanError) {
      log('  ✗ Eski satis satirlari temizlenemedi: ' + cleanError.message);
      await botLogYaz(tarihISO, firma.id, 'hata', 0, 0, cleanError.message);
      return 0;
    }
  }

  const { data, error } = await db.from(SUPABASE.table)
    .upsert(records, { onConflict: 'firma_id,kaynak_rapor_tarihi,satir_hash' })
    .select();

  if (error) {
    log('  ✗ DB hatası: ' + error.message);
    await botLogYaz(tarihISO, firma.id, 'hata', 0, 0, error.message);
    return 0;
  }

  const kayitSayisi = data?.length || 0;
  const ciroToplam = records.reduce((t, r) => t + (r.ciro || 0), 0);
  log(`  ✓ ${kayitSayisi} kayıt`);
  await botLogYaz(tarihISO, firma.id, 'basarili', kayitSayisi, ciroToplam, null);
  return kayitSayisi;
}

async function masrafCek(page, tarihTR) {
  log(`  [MASRAF] ${tarihTR}`);
  await page.goto(CONFIG.masrafUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('input', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 800));

  const inputs = await page.$$('input[type="text"]');
  for (let i = 0; i < Math.min(inputs.length, 2); i++) {
    await inputs[i].click({ clickCount: 3 });
    await inputs[i].type(tarihTR, { delay: 30 });
  }

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.innerText?.includes('Hazırla') || b.innerText?.includes('hazırla'));
    if (btn) btn.click();
  });

  try {
    await page.waitForSelector('table tbody tr', { timeout: 30000 });
  } catch {
    log('  ⚠ Masraf tablosu yok');
    return [];
  }

  await new Promise(r => setTimeout(r, 1500));

  return await page.evaluate(() => {
    const rows = [];
    const tbl = document.querySelector('table');
    if (!tbl) return rows;
    const hs = [...tbl.querySelectorAll('thead th')].map(h =>
      h.innerText.trim().toLowerCase().replace(/\s+/g, '_').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o'));
    for (const tr of tbl.querySelectorAll('tbody tr')) {
      const cells = [...tr.querySelectorAll('td')].map(td => td.innerText.trim());
      if (!cells.length || cells.every(c => !c)) continue;
      const o = {};
      hs.forEach((h, i) => { if (h) o[h] = cells[i] || ''; });
      o._cells = cells;
      rows.push(o);
    }
    return rows;
  });
}

async function masrafKaydet(rows, firma, tarihISO) {
  if (!rows.length) {
    log('  ⚠ Masraf verisi yok');
    return 0;
  }

  const records = rows.map(r => ({
    tarih: tarihISO,
    firma_id: firma.id,
    firma_adi: firma.adi,
    aciklama: (r.aciklama || r.masraf || r.gider || (r._cells || []).join(' | ') || '').substring(0, 500),
    kategori: r.kategori || r.sinif1 || null,
    tutar: parseTRNumber(r.toplam || r.tutar || '0'),
    kdv: parseTRNumber(r.kdv || '0'),
    tedarikci: (r.tedarikci || r.cari || firma.adi).substring(0, 200),
    kaynak: 'bizimhesap'
  }));

  if (DRY_RUN) {
    log(`  [DRY] Masraf ${records.length} kayit hazir`);
    return records.length;
  }

  const { data, error } = await db.from(SUPABASE.masrafTbl)
    .upsert(records, { onConflict: 'tarih,aciklama,tedarikci,firma_id', ignoreDuplicates: true })
    .select();

  if (error) {
    if ((error.message || '').includes('ON CONFLICT') || (error.message || '').includes('duplicate key')) {
      log('  ! Masraf unique constraint yok, guvenli insert yoluna geciliyor...');
      return await masrafGuvenliEkle(records);
    }
    log('  ✗ Masraf DB hatası: ' + error.message);
    return 0;
  }

  const kayit = data?.length || 0;
  log(`  ✓ Masraf ${kayit} kayıt`);
  return kayit;
}

async function masrafGuvenliEkle(records) {
  let eklenen = 0;
  for (const rec of records) {
    const { data: varMi, error: kontrolHata } = await db.from(SUPABASE.masrafTbl)
      .select('id')
      .eq('tarih', rec.tarih)
      .eq('aciklama', rec.aciklama)
      .eq('tedarikci', rec.tedarikci)
      .eq('firma_id', rec.firma_id)
      .limit(1);

    if (kontrolHata) {
      log('  Masraf kontrol hatasi: ' + kontrolHata.message);
      continue;
    }
    if (varMi && varMi.length) continue;

    const { error: insertHata } = await db.from(SUPABASE.masrafTbl).insert(rec);
    if (insertHata) {
      log('  Masraf insert hatasi: ' + insertHata.message);
      continue;
    }
    eklenen++;
  }
  log(`  Masraf guvenli ekleme: ${eklenen} yeni kayit`);
  return eklenen;
}

function tarihAraligiOlustur(bas, bit) {
  const liste = [];
  const d = new Date(bas);
  const son = new Date(bit);
  while (d <= son) {
    liste.push({ tr: fmtTR(d), iso: fmtISO(d) });
    d.setDate(d.getDate() + 1);
  }
  return liste;
}

async function main() {
  log('══════════════════════════════════════════════════');
  log('  AperiON Veri Motoru v7-fixed — iSTasyon ErpaltH');
  log(`  MOD: ${GECMIS_MOD ? `GEÇMİŞ VERİ — ${GECMIS_BASLANGIC} → ${GECMIS_BITIS}` : `GÜNLÜK — ${TARIH_TR}`}`);
  log('══════════════════════════════════════════════════');

  const { browser, page } = await startBrowser();
  const tumRows = [];

  try {
    await login(page);

    const tarihListesi = GECMIS_MOD
      ? tarihAraligiOlustur(GECMIS_BASLANGIC, GECMIS_BITIS)
      : [{ tr: TARIH_TR, iso: TARIH_ISO }];

    for (const firma of FIRMALAR.filter(f => f.aktif)) {
      try {
        await firmaSec(page, firma);
        let firmaToplam = 0;

        for (const t of tarihListesi) {
          try {
            const rows = await raporCek(page, t.tr);
            const kayit = await kaydet(rows, firma, t.iso);
            firmaToplam += kayit;
            rows.forEach(r => tumRows.push({ ...r, firma_id: firma.id }));

            try {
              const masrafRows = await masrafCek(page, t.tr);
              await masrafKaydet(masrafRows, firma, t.iso);
            } catch (e) {
              log(`  ⚠ Masraf çekilemedi: ${e.message}`);
            }
          } catch (e) {
            log(`  ✗ ${firma.adi} ${t.iso} hata: ${e.message}`);
            await botLogYaz(t.iso, firma.id, 'hata', 0, 0, e.message);
          }
        }

        log(`  ✅ ${firma.adi}: ${firmaToplam} kayıt`);
      } catch (e) {
        log(`✗ Firma genel hata (${firma.adi}): ${e.message}`);
        const logTarih = GECMIS_MOD ? (GECMIS_BITIS || fmtISO(new Date())) : TARIH_ISO;
        await botLogYaz(logTarih, firma.id, 'hata', 0, 0, e.message);
      }
    }

    await wpSabahOzeti(tumRows);
    log('✅ TAMAMLANDI');
  } catch (e) {
    log('✗ GENEL HATA: ' + e.message);
  } finally {
    await browser.close();
  }
}

main();
