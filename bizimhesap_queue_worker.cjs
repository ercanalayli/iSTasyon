const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const { launchOptions, loginBizimHesap, selectFirma, savePageDiagnostics } = require('./bizimhesap_common.cjs');
const { classifyQueueRow: classifyQueueBankPlan } = require('./tools/bank_posting_plan.cjs');

const args = process.argv.slice(2);
const LIMIT = Number(valueArg('--limit', process.env.BIZIMHESAP_QUEUE_LIMIT || 10));
const COMPANY = valueArg('--firma', process.env.COMPANY_ID || 'alayli');
const ONE_ID = valueArg('--id', '');
const COMMIT = args.includes('--commit');
const SAVE = args.includes('--save');
const LIVE_UNLOCKED = process.env.BIZIMHESAP_POSTING_LIVE === '1';
const SAVE_UNLOCKED = process.env.BIZIMHESAP_POSTING_SAVE === '1';
const DRY_OUT = valueArg('--dry-out', 'data/bizimhesap_queue_dryrun.json');
const MANUAL_PROOF_FILE = path.join(__dirname, 'data', 'bizimhesap_manual_posting_proofs.json');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_MmvLmFVEDXXmGQS4xMCe0Q_MgDwftIW';

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const FIRMALAR = [
  { id: 'alayli', adi: 'ALAYLI MEDIKAL', sektor: 'ALAYLI', arama: 'ALAYLI' },
  { id: 'elit', adi: 'ELIT ET URUNLERI', sektor: 'ELIT', arama: 'ELIT' },
  { id: 'odyoform', adi: 'ODYOFORM ISITME CIHAZLARI', sektor: 'ODYOFORM', arama: 'ODYOFORM' },
];

const ROUTES = {
  accounts: process.env.BIZIMHESAP_ACCOUNTS_URL || 'https://bizimhesap.com/web/ngn/acc/ngnaccounts',
  expenses: process.env.BIZIMHESAP_EXPENSES_URL || 'https://bizimhesap.com/web/ngn/acc/ngncostss',
  expenseEntry: process.env.BIZIMHESAP_EXPENSE_ENTRY_URL || 'https://bizimhesap.com/web/ngn/acc/ngncostentry',
  customers: process.env.BIZIMHESAP_CUSTOMERS_URL || 'https://bizimhesap.com/web/ngn/pos/ngncustomers',
  collectionCashPath: '/web/ngn/acc/ngncollectioncash',
};

function valueArg(name, fallback = '') {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

function log(msg) {
  const line = `[${new Date().toLocaleString('tr-TR')}] ${msg}`;
  console.log(line);
  fs.appendFileSync('bizimhesap_queue_worker.log', line + '\n');
}

function fixMojibake(value) {
  const text = String(value || '');
  if (!/[ÃÄÅÂ]/.test(text)) return text;
  try {
    const repaired = Buffer.from(text, 'latin1').toString('utf8');
    return repaired && repaired.length >= Math.min(3, text.length / 2) ? repaired : text;
  } catch {
    return text;
  }
}

function normalize(value) {
  return fixMojibake(value)
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o');
}

function money(n) {
  return Math.abs(Number(n || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isoDate(v) {
  return String(v || '').slice(0, 10);
}

function queuePayload(row) {
  if (!row || typeof row.payload !== 'object' || row.payload === null) return {};
  return row.payload;
}

function amountOf(payload) {
  return Number(payload.amount_in || 0) > 0 ? Number(payload.amount_in || 0) : Math.abs(Number(payload.amount_out || 0));
}

function analysisText(payload) {
  return [
    payload.description,
    payload.detected_type,
    payload.suggested_counterparty,
    payload.suggested_bizimhesap_action,
    payload.mail_subject,
    payload.attachment_name,
  ].filter(Boolean).map(fixMojibake).join(' ');
}

function classifyQueueRow(row) {
  return classifyQueueBankPlan(row);
  const p = queuePayload(row);
  const text = normalize(analysisText(p));
  const amountIn = Number(p.amount_in || 0);
  const amountOut = Number(p.amount_out || 0);
  let kind = amountIn > 0 ? 'customer_collection' : 'supplier_or_expense_payment';
  let title = amountIn > 0 ? 'Cari tahsilat' : 'Cari ödeme';
  let target = 'BizimHesap banka/kasa';
  let category = p.suggested_category || (amountIn > 0 ? 'Tahsilat' : 'Ödeme');
  let counterparty = p.target_counterparty || p.suggested_counterparty || '';
  let account = p.target_account || `${p.bank_name || 'Banka'} banka hesabı`;
  let confidence = Number(p.confidence_score || p.confidence || 0) || (amountIn > 0 ? 72 : 70);
  const reasons = [];

  if (p.suggested_bizimhesap_action) {
    kind = p.suggested_bizimhesap_action;
    if (p.suggested_category) category = p.suggested_category;
    reasons.push(`payload:${p.suggested_bizimhesap_action}`);
  }
  if (amountIn > 0) reasons.push('banka alacak/giriş');
  if (amountOut > 0) reasons.push('banka borç/çıkış');

  if (amountIn > 0 && /pos|batch yatan|pesin satis|peşin satis|net satis|kredi kart/.test(text)) {
    kind = 'pos_collection';
    title = 'POS tahsilatı';
    target = 'BizimHesap banka tahsilatı';
    category = 'Satış tahsilatı';
    counterparty = counterparty || 'POS / Kredi kartı tahsilatı';
    confidence = 88;
    reasons.push('POS açıklaması');
  }
  if (/komisyon|bsmv|ucret|ücret|masraf|katki payi/.test(text) || (amountOut > 0 && /pos|kredi kart|uye isyeri|üye işyeri/.test(text))) {
    kind = 'bank_fee_expense';
    title = 'Banka/POS masrafı';
    target = 'BizimHesap gider/masraf kaydı';
    category = 'Banka masrafı';
    counterparty = counterparty || p.bank_name || 'Banka';
    confidence = 90;
    reasons.push('komisyon/masraf');
  }
  if (/virman|hesaplar arasi|hesaplar arası/.test(text)) {
    kind = 'bank_transfer';
    title = 'Banka virmanı';
    target = 'BizimHesap banka virmanı';
    category = 'Bankalar arası transfer';
    counterparty = counterparty || 'Banka içi virman';
    confidence = 84;
    reasons.push('virman');
  }
  if (/kredi kart borc|kredi kart borç|kart borc|kart borç/.test(text)) {
    kind = 'credit_card_payment';
    title = 'Kredi kartı ödemesi';
    target = 'BizimHesap banka/kredi kartı virmanı';
    category = 'Kredi kartı borç ödemesi';
    counterparty = counterparty || 'Kredi kartı';
    confidence = 86;
    reasons.push('kart borcu');
  }
  if (/sgk|vergi|kdv|stopaj/.test(text)) {
    kind = 'tax_or_sgk_payment';
    title = 'Vergi/SGK ödemesi';
    target = 'BizimHesap gider/ödeme kaydı';
    category = 'Vergi/SGK';
    counterparty = counterparty || 'Vergi/SGK';
    confidence = 84;
    reasons.push('vergi/sgk');
  }
  if (/elektrik|uludag|uludağ|dogalgaz|doğalgaz|telekom|turkcell|vodafone|turknet/.test(text)) {
    kind = 'utility_bill_payment';
    title = 'Fatura ödemesi';
    target = 'BizimHesap gider/ödeme kaydı';
    category = 'Sabit gider faturası';
    confidence = Math.max(confidence, 82);
    reasons.push('fatura anahtar kelimesi');
  }

  return {
    queue_id: row.id,
    pending_bank_movement_id: row.pending_bank_movement_id,
    action_type: row.action_type,
    kind,
    title,
    target,
    category,
    counterparty: counterparty || 'Cari eşleştirme onayda',
    account,
    amount: amountOf(p),
    date: isoDate(p.transaction_date),
    time: p.transaction_time || '',
    bank_name: p.bank_name || '',
    description: p.description || '',
    source: p.source || '',
    confidence,
    reasons: [...new Set(reasons)].slice(0, 5),
  };
}

function cleanPlan(plan) {
  return {
    ...plan,
    title: fixMojibake(plan.title),
    target: fixMojibake(plan.target),
    category: fixMojibake(plan.category),
    counterparty: fixMojibake(plan.counterparty),
    account: fixMojibake(plan.account),
    time: fixMojibake(plan.time),
    bank_name: fixMojibake(plan.bank_name),
    description: fixMojibake(plan.description),
    source: fixMojibake(plan.source),
    reasons: (plan.reasons || []).map(fixMojibake),
  };
}

function postingEvidence(row, plan) {
  const manualProof = manualPostingProof(row.id);
  const queueStatus = row.status || 'ready_for_bizimhesap';
  const safeToAutoSave = plan.confidence >= 84 && !plan.requires_user_review && !['supplier_or_expense_payment'].includes(plan.kind);
  const blockers = [];
  if (plan.confidence < 84) blockers.push(`guven ${plan.confidence}%`);
  if (plan.requires_user_review) blockers.push('kullanici/cari incelemesi gerekli');
  if (plan.kind === 'supplier_or_expense_payment') blockers.push('genel odeme tipi otomatik kayda kapali');
  if (!plan.counterparty || /eslestirme|eşleştirme|onayda/i.test(plan.counterparty)) blockers.push('cari net degil');
  return {
    queue_id: row.id,
    pending_bank_movement_id: row.pending_bank_movement_id || '',
    queue_status: queueStatus,
    target: plan.target,
    account: plan.account,
    counterparty: plan.counterparty,
    category: plan.category,
    confidence: plan.confidence,
    safe_to_auto_save: safeToAutoSave,
    blockers,
    duplicate_guard: manualProof ? 'manuel BizimHesap kaniti var, tekrar kayit atlanir' : 'manuel kanit yok',
    next_step: safeToAutoSave
      ? 'BIZIMHESAP_POSTING_LIVE=1 ve kullanici onayi ile form/save calisabilir'
      : 'Onay Merkezi incelemesi ve cari/kategori netlestirme gerekli',
  };
}

function dryRunPlan(row) {
  const plan = cleanPlan(classifyQueueRow(row));
  const safeToAutoSave = plan.confidence >= 84 && !['supplier_or_expense_payment'].includes(plan.kind);
  const stopReason = safeToAutoSave ? '' : 'Canlı kayıtta kullanıcı/cari eşleştirme kontrolü gerekli.';
  const steps = [
    'BizimHesap login',
    `${COMPANY} firma seç`,
    `${plan.target} ekranını aç`,
    `Hesap: ${plan.account}`,
    `Cari/karşı taraf: ${plan.counterparty}`,
    `Kategori: ${plan.category}`,
    `Tarih: ${plan.date || '-'}`,
    `Tutar: ${money(plan.amount)} TL`,
    `Açıklama: APERION QUEUE ${row.id}`,
    SAVE ? 'Kaydet butonuna basılacak' : 'Kaydetme yok: form kontrol/dry-run',
  ];
  return { ...plan, safeToAutoSave, stopReason, evidence: postingEvidence(row, plan), steps };
}

function manualPostingProof(rowId) {
  if (!rowId || !fs.existsSync(MANUAL_PROOF_FILE)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(MANUAL_PROOF_FILE, 'utf8'));
    const rows = Array.isArray(parsed?.proofs) ? parsed.proofs : [];
    return rows.find(x => x.queue_id === rowId && x.bizimhesap_record_seen === true) || null;
  } catch (error) {
    log(`Manual BizimHesap proof okunamadı: ${error.message}`);
    return null;
  }
}

async function fetchQueueRows() {
  let q = db.from('bizimhesap_queue')
    .select('*')
    .eq('company_id', COMPANY)
    .eq('status', 'ready_for_bizimhesap')
    .order('created_at', { ascending: true })
    .limit(LIMIT);
  if (ONE_ID) q = q.eq('id', ONE_ID);
  const { data, error } = await q;
  if (error) throw new Error(`bizimhesap_queue okunamadı: ${error.message}`);
  return data || [];
}

async function markQueue(row, status, message, extra = {}) {
  if (status === 'processed') {
    const { error: rpcError } = await db.rpc('mark_bizimhesap_queue_processed', {
      p_queue_id: row.id,
      p_message: message,
      p_result: extra,
    });
    if (!rpcError) return;
    log(`Queue RPC processed yazılamadı ${row.id}: ${rpcError.message}`);
  }
  const payload = queuePayload(row);
  const nextPayload = {
    ...payload,
    aperion_posting_result: {
      status,
      message,
      at: new Date().toISOString(),
      ...extra,
    },
  };
  const patch = {
    status,
    error_message: status === 'failed' ? String(message || '').slice(0, 1000) : null,
    payload: nextPayload,
  };
  if (status === 'processed') patch.processed_at = new Date().toISOString();
  const { error } = await db.from('bizimhesap_queue').update(patch).eq('id', row.id);
  if (error) log(`Queue durum yazılamadı ${row.id}: ${error.message}`);
  const { data: verifyRows, error: verifyError } = await db
    .from('bizimhesap_queue')
    .select('id,status,processed_at,error_message')
    .eq('id', row.id)
    .limit(1);
  if (verifyError) {
    log(`Queue durum doğrulaması okunamadı ${row.id}: ${verifyError.message}`);
  } else if (verifyRows?.[0]?.status !== status) {
    log(`Queue durum doğrulaması başarısız ${row.id}: beklenen=${status}, görünen=${verifyRows?.[0]?.status || 'yok'}`);
  }
}

async function startBrowser() {
  const browser = await puppeteer.launch(launchOptions({ headless: !COMMIT || process.env.BIZIMHESAP_HEADLESS !== 'false', width: 1440, height: 950 }));
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'tr-TR,tr;q=0.9' });
  return { browser, page };
}

async function openPostingForm(page, plan) {
  if (['bank_fee_expense', 'tax_or_sgk_payment', 'utility_bill_payment', 'supplier_or_expense_payment'].includes(plan.kind)) {
    await page.goto(ROUTES.expenseEntry, { waitUntil: 'networkidle2', timeout: 30000 });
    return;
  }
  if (['customer_collection', 'pos_collection'].includes(plan.kind)) {
    await page.goto(ROUTES.customers, { waitUntil: 'networkidle2', timeout: 30000 });
    await searchAndOpenCounterparty(page, plan.counterparty);
    await clickByText(page, ['tahsilat', 'ödeme al', 'odeme al', 'para girişi', 'para girisi']);
    if (!page.url().includes('/acc/ngncollectioncash') && page.url().includes('/pos/ngncustomer')) {
      const url = new URL(page.url());
      const guid = url.searchParams.get('guid');
      const rc = url.searchParams.get('rc') || '1';
      if (guid) await page.goto(`https://bizimhesap.com${ROUTES.collectionCashPath}?rc=${rc}&identity=${guid}`, { waitUntil: 'networkidle2', timeout: 30000 });
    }
    return;
  }
  await page.goto(ROUTES.accounts, { waitUntil: 'networkidle2', timeout: 30000 });
  await clickByText(page, [plan.account, plan.bank_name, 'banka', 'hesap']);
  await clickByText(page, plan.kind === 'bank_transfer'
    ? ['hesaplar arası transfer', 'hesaplar arasi transfer', 'transfer']
    : ['hesaptan para çıkışı', 'hesaptan para cikisi', 'para çıkışı', 'para cikisi', 'ödeme']);
}

async function clickByText(page, texts) {
  const found = await page.evaluate((wanted) => {
    const norm = s => String(s || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const visible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const wants = wanted.map(norm).filter(Boolean);
    const el = [...document.querySelectorAll('a,button,span,div')]
      .filter(visible)
      .find(x => wants.some(w => norm(x.innerText || x.value || x.title).includes(w)) && String(x.innerText || '').length < 160);
    if (!el) return false;
    (el.closest('a') || el.closest('button') || el).click();
    return true;
  }, texts);
  if (found) {
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 900));
  }
  return found;
}

async function searchAndOpenCounterparty(page, counterparty) {
  await page.waitForSelector('input,a,button,table', { timeout: 15000 });
  await page.evaluate((counterpartyText) => {
    const visible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const search = [...document.querySelectorAll('input[type="search"],input[type="text"],input')]
      .filter(visible)
      .find(x => /ara|search|cari|müşteri|musteri/i.test([x.placeholder, x.name, x.id].join(' '))) ||
      [...document.querySelectorAll('input')].filter(visible)[0];
    if (search && counterpartyText && !/cari eşleştirme/i.test(counterpartyText)) {
      search.focus();
      search.value = counterpartyText;
      search.dispatchEvent(new Event('input', { bubbles: true }));
      search.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter' }));
    }
  }, counterparty);
  await new Promise(r => setTimeout(r, 1400));
  await clickByText(page, [counterparty, 'detay', 'aç', 'ac']);
}

async function fillPostingForm(page, row, plan) {
  await page.waitForSelector('input,textarea,select,button', { timeout: 15000 });
  const fill = await page.evaluate((p, queueId) => {
    const norm = s => String(s || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const directSet = (id, value) => {
      const el = document.getElementById(id);
      if (!el) return false;
      el.focus();
      el.value = value == null ? '' : String(value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.blur();
      return true;
    };
    const directSelect = (id, texts) => {
      const el = document.getElementById(id);
      if (!el) return false;
      const wants = texts.map(norm).filter(Boolean);
      const opt = [...el.options].find(o => wants.some(w => norm(o.text).includes(w)));
      if (!opt) return false;
      el.value = opt.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };
    const trDate = value => {
      const s = String(value || '');
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      return m ? `${m[3]}.${m[2]}.${m[1]}` : s;
    };
    const directDesc = `APERION QUEUE:${queueId} | ${p.title} | ${p.description || ''}`.slice(0, 250);
    const direct = {
      date: directSet('txtDocumentDate', trDate(p.date)),
      amount: directSet('txtAmount', p.amountText),
      description: directSet('txtNote', directDesc),
      counterparty: true,
      account: directSelect('ddlCashierNew', [p.account, p.bank_name, 'akbank sirket', 'akbank şirket']),
      category: directSelect('ddlCostAccounts', [p.category, 'banka masraflari', 'banka masrafları', 'mali giderler banka masraflari', 'mali giderler banka masrafları']),
      paid: directSelect('ddlPaymentOption', ['odendi', 'ödendi']),
    };
    if (direct.date && direct.amount && direct.description && direct.account && direct.category && direct.paid) return direct;
    const visible = el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const fields = () => [...document.querySelectorAll('input,textarea')].filter(visible);
    const fieldText = el => norm([el.name, el.id, el.placeholder, el.getAttribute('aria-label'), el.closest('label')?.innerText].join(' '));
    const setValue = (el, value) => {
      if (!el) return false;
      el.focus();
      el.value = value == null ? '' : String(value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.blur();
      return true;
    };
    const byHint = (hints, value) => {
      const hs = hints.map(norm);
      const el = fields().find(x => hs.some(h => fieldText(x).includes(h)));
      return setValue(el, value);
    };
    const byOrder = (idx, value) => setValue(fields()[idx], value);
    const selectByText = (texts) => {
      const wants = texts.map(norm).filter(Boolean);
      if (!wants.length) return false;
      for (const s of [...document.querySelectorAll('select')].filter(visible)) {
        const opt = [...s.options].find(o => wants.some(w => norm(o.text).includes(w)));
        if (opt) {
          s.value = opt.value;
          s.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    };
    const desc = `APERION QUEUE:${queueId} | ${p.title} | ${p.description || ''}`.slice(0, 250);
    return {
      date: byHint(['tarih', 'date'], p.date) || byOrder(0, p.date),
      amount: byHint(['tutar', 'meblağ', 'meblag', 'amount'], p.amountText) || byOrder(2, p.amountText) || byOrder(3, p.amountText),
      description: byHint(['açıklama', 'aciklama', 'not', 'description'], desc) || byOrder(1, desc),
      counterparty: byHint(['cari', 'müşteri', 'musteri', 'tedarikçi', 'tedarikci', 'unvan'], p.counterparty),
      account: selectByText([p.account, p.bank_name, 'banka']),
      category: selectByText([p.category, 'banka masraf', 'mali gider', 'vergi', 'sgk', 'fatura']),
      paid: selectByText(['ödendi', 'odendi', 'tahsil edildi']),
    };
  }, { ...plan, amountText: money(plan.amount) }, row.id);

  await savePageDiagnostics(page, `bizimhesap_queue_${row.id}_form`).catch(() => {});
  return fill;
}

async function clickSave(page) {
  const clicked = await page.evaluate(() => {
    const norm = s => String(s || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const btn = [...document.querySelectorAll('button,a,input[type="submit"]')]
      .find(x => ['kaydet', 'tamam', 'onayla'].some(w => norm(x.innerText || x.value || x.title).includes(w)));
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!clicked) throw new Error('BizimHesap kaydet butonu bulunamadı');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1800));
}

async function processLiveRow(page, row) {
  const plan = dryRunPlan(row);
  const manualProof = manualPostingProof(row.id);
  if (SAVE && manualProof) {
    return {
      status: 'processed',
      message: `BizimHesap kaydı kullanıcı tarafından görüldü; tekrar kaydetme atlandı (${manualProof.record_date || 'tarih yok'}).`,
      plan,
      fill: {},
      manualProof,
    };
  }
  if (!plan.safeToAutoSave && SAVE) {
    throw new Error(plan.stopReason);
  }
  await openPostingForm(page, plan);
  const fill = await fillPostingForm(page, row, plan);
  const missing = ['date', 'amount', 'description'].filter(k => !fill[k]);
  if (missing.length) throw new Error(`BizimHesap form alanları bulunamadı: ${missing.join(', ')}`);
  if (!SAVE) {
    return { status: 'form_filled', message: 'Form dolduruldu, kaydet tuşuna basılmadı.', plan, fill };
  }
  if (!SAVE_UNLOCKED) throw new Error('Canlı kaydetme kilitli: BIZIMHESAP_POSTING_SAVE=1 gerekli.');
  await clickSave(page);
  await savePageDiagnostics(page, `bizimhesap_queue_${row.id}_after_save`).catch(() => {});
  return { status: 'processed', message: 'BizimHesap kaydet butonuna basıldı; kayıt sonrası ekran kanıtı alındı.', plan, fill };
}

async function writeDryRun(rows) {
  const plans = rows.map(r => dryRunPlan(r));
  const summary = {
    queue_count: rows.length,
    safe_to_auto_save: plans.filter(p => p.evidence.safe_to_auto_save).length,
    needs_review: plans.filter(p => !p.evidence.safe_to_auto_save).length,
    manual_proof_locked: plans.filter(p => String(p.evidence.duplicate_guard || '').includes('manuel BizimHesap')).length,
  };
  fs.mkdirSync(path.dirname(DRY_OUT), { recursive: true });
  fs.writeFileSync(DRY_OUT, JSON.stringify({
    created_at: new Date().toISOString(),
    source: 'bizimhesap_queue',
    company_id: COMPANY,
    live_mode: false,
    queue_count: rows.length,
    summary,
    plans,
  }, null, 2), 'utf8');
  log(`Dry-run raporu yazıldı: ${DRY_OUT}`);
}

async function main() {
  log(`AperiON BizimHesap queue worker - ${COMMIT ? 'FORM' : 'DRY'}${SAVE ? '+SAVE' : ''} - limit ${LIMIT}`);
  if (COMMIT && !LIVE_UNLOCKED) {
    throw new Error('Canlı form modu kilitli: BIZIMHESAP_POSTING_LIVE=1 gerekli.');
  }
  if (SAVE && !COMMIT) throw new Error('--save yalnızca --commit ile kullanılabilir.');
  let rows = await fetchQueueRows();
  log(`${rows.length} hazır BizimHesap kuyruk kaydı bulundu.`);
  if (!rows.length) {
    await writeDryRun([]);
    return;
  }
  if (!COMMIT) {
    await writeDryRun(rows);
    return;
  }

  if (SAVE) {
    const manualRows = rows
      .map(row => ({ row, proof: manualPostingProof(row.id) }))
      .filter(x => x.proof);
    for (const { row, proof } of manualRows) {
      const result = {
        status: 'processed',
        message: `BizimHesap kaydı kullanıcı tarafından görüldü; tekrar kaydetme atlandı (${proof.record_date || 'tarih yok'}).`,
        plan: dryRunPlan(row),
        fill: {},
        manualProof: proof,
      };
      await markQueue(row, 'processed', result.message, result);
      log(`${row.id} ${result.message}`);
    }
    rows = rows.filter(row => !manualPostingProof(row.id));
    if (!rows.length) return;
  }

  const { browser, page } = await startBrowser();
  try {
    await loginBizimHesap(page, log);
    const firma = FIRMALAR.find(f => f.id === COMPANY) || FIRMALAR[0];
    await selectFirma(page, firma, log);
    for (const row of rows) {
      try {
        const result = await processLiveRow(page, row);
        if (result.status === 'processed') {
          await markQueue(row, 'processed', result.message, result);
        } else {
          await markQueue(row, 'ready_for_bizimhesap', result.message, result);
        }
        log(`${row.id} ${result.message}`);
      } catch (e) {
        await markQueue(row, 'failed', e.message, { plan: dryRunPlan(row) });
        await savePageDiagnostics(page, `bizimhesap_queue_${row.id}_failed`).catch(() => {});
        log(`${row.id} HATA: ${e.message}`);
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch(e => {
  log(`GENEL HATA: ${e.message}`);
  process.exitCode = 1;
});
