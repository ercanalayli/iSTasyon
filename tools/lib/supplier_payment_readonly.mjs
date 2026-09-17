// Live, read-only preparation for a BizimHesap supplier payment.
// This module deliberately has no submit/save capability.
const ORIGIN = 'https://uygulama.bizimhesap.com';
const clean = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/İ/g, 'I').toLocaleUpperCase('en-US').replace(/[^A-Z0-9]+/g, ' ').trim();

export function validateSupplierPayment(input) {
  const supplier = String(input.supplier || '').trim();
  const account = String(input.account || '').trim();
  const amount = Number(input.amount);
  const date = String(input.date || '').trim();
  if (supplier.length < 5 || !/^[\p{L}0-9 .,&'-]{5,120}$/u.test(supplier)) throw new Error('supplier_name_invalid');
  if (account.length < 4 || !/^[\p{L}0-9 *.,&'-]{4,100}$/u.test(account)) throw new Error('payment_account_invalid');
  if (!Number.isSafeInteger(Math.round(amount * 100)) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.001) throw new Error('payment_amount_invalid');
  const m = date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 31 || Number(m[2]) < 1 || Number(m[2]) > 12 || Number(m[3]) < 2020) throw new Error('payment_date_invalid');
  const day = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  if (day.getUTCDate() !== +m[1] || day.getUTCMonth() !== +m[2] - 1) throw new Error('payment_date_invalid');
  return { supplier, account, amount, date, amountText: amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) };
}

export async function supplierPaymentReadOnlyDraft(input, pageValue, accountLookup, accountEvidence) {
  const planned = validateSupplierPayment(input);
  // The account list is independent of supplier discovery. Start both reads
  // together; each is still validated against the live payment form below.
  const accountPromise = accountLookup ? accountLookup(planned.account).catch(error => ({ error:String(error?.message || error) })) : Promise.resolve(null);
  const term = planned.supplier.slice(0, 6);
  const found = await pageValue(`${ORIGIN}/web/ngn/org/ngnsuppliers`, `(async () => {
    if (location.origin !== ${JSON.stringify(ORIGIN)} || location.pathname !== '/web/ngn/org/ngnsuppliers') return {error:'wrong_supplier_page'};
    const firmResponse = await fetch('/api/AngularControllers/firms/getcurrentfirm', {credentials:'include'});
    const firmJson = await firmResponse.json().catch(() => null);
    const firm = firmJson?.Data || firmJson?.data || firmJson;
    const firmName = String(firm?.Name || firm?.name || firm?.dsFirm || '');
    if (!firmResponse.ok || !/ALAYLI/i.test(firmName)) return {error:'wrong_company_or_session'};
    const search = document.querySelector('#searchInput');
    if (!search) return {error:'supplier_search_missing'};
    search.value = ${JSON.stringify(term)};
    search.dispatchEvent(new Event('input',{bubbles:true}));
    search.dispatchEvent(new KeyboardEvent('keyup',{bubbles:true,key:'Enter',keyCode:13}));
    await new Promise(resolve => setTimeout(resolve,1800));
    return {firmName, candidates:[...document.querySelectorAll('tr a[href*="ngnsupplier?"]')].map(a => ({name:a.innerText.trim(),href:a.getAttribute('href')})).slice(0,40)};
  })()`);
  if (found.error) throw new Error(found.error);
  const tokens = clean(planned.supplier).split(' ').filter(Boolean);
  const candidates = found.candidates.filter(row => tokens.every(token => clean(row.name).split(' ').includes(token)));
  if (candidates.length !== 1) return { status:'needs_supplier_mapping', supplier:planned.supplier, candidates:candidates.map(x => x.name), writePerformed:false };
  const row = candidates[0];
  const guid = new URL(row.href, ORIGIN).searchParams.get('guid');
  if (!/^[0-9a-f]{32}$/i.test(guid || '')) throw new Error('supplier_identity_invalid');
  const paymentPromise = pageValue(`${ORIGIN}/web/ngn/acc/ngnpaymentcash?rc=1&identity=${guid}`, `(() => {
    if (location.origin !== ${JSON.stringify(ORIGIN)} || location.pathname !== '/web/ngn/acc/ngnpaymentcash') return {error:'wrong_payment_module'};
    const type = document.querySelector('#ddlTransactionType');
    const accounts = document.querySelector('#ddlCashierAccounts');
    if (!type || !accounts || ![...type.options].some(x => x.value === '2' && /Tedarikçiye Ödeme/i.test(x.textContent))) return {error:'supplier_payment_form_changed'};
    if (!document.querySelector('#txtDocumentDate') || !document.querySelector('#txtAmount') || !document.querySelector('#txtNote') || !document.querySelector('#btnSave')) return {error:'supplier_payment_form_incomplete'};
    return {module:location.pathname, accounts:[...accounts.options].filter(o => o.value).map(o => ({id:o.value,label:o.textContent.trim()}))};
  })()`);
  const historyPromise = pageValue(`${ORIGIN}/web/ngn/org/ngnsupplier?rc=1&guid=${guid}`, `(() => {
    if (location.origin !== ${JSON.stringify(ORIGIN)} || location.pathname !== '/web/ngn/org/ngnsupplier') return {error:'wrong_supplier_detail'};
    const name = [...document.querySelectorAll('h1,h2,h3')].map(x => x.innerText.trim()).find(x => x.includes(${JSON.stringify(row.name.slice(0,20))}));
    if (!name) return {error:'supplier_identity_unverified'};
    const table = document.querySelector('#tblPaymentHistory');
    if (!table || !window.jQuery?.fn?.dataTable?.isDataTable(table)) return {error:'supplier_history_unavailable'};
    const api = window.jQuery(table).DataTable();
    const info = api.page.info();
    const serverSide = !!api.settings()[0]?.oFeatures?.bServerSide;
    if (serverSide) return {error:'supplier_history_server_pagination_requires_scan'};
    // Client-side DataTables retains all rows in memory, including rows not
    // currently rendered on screen. Read that complete set without paging UI.
    const data = api.rows().data().toArray();
    if (data.some(cells => !Array.isArray(cells) || cells.length < 5)) return {error:'supplier_history_shape_changed'};
    const rows = data.map(cells => cells.slice(2).map(cell => String(cell || '').replace(/<[^>]*>/g,' ')).join(' ').replace(/\\s+/g,' ').trim());
    return {name,recordsTotal:info.recordsTotal,rows};
  })()`);
  const evidencePromise = accountEvidence && accountLookup ? accountPromise.then(account => {
    if (account?.error || !account?.href || account?.currency !== 'TL') return { error:'payment_account_identity_unverified' };
    return accountEvidence(account.href,{approvalTaskId:'READONLY-NO-TASK',amount:planned.amount,date:planned.date},'Ödeme',row.name);
  }) : Promise.resolve(null);
  const [payment, history, account, evidence] = await Promise.all([paymentPromise, historyPromise, accountPromise, evidencePromise]);
  if (payment.error) throw new Error(payment.error);
  const accounts = payment.accounts.filter(x => clean(x.label.replace(/\s*\([^)]*\)\s*$/, '')) === clean(planned.account));
  const base = { supplier:row.name.replace(/\s+/g,' ').trim(), supplierGuid:guid, amount:planned.amount, date:planned.date, requestedAccount:planned.account,
    firm:found.firmName, module:payment.module, writePerformed:false };
  if (accounts.length !== 1) return { ...base, status:'needs_account_mapping', matchingAccounts:accounts.map(x => ({id:x.id,name:x.label})), writePerformed:false };
  if (history.error) throw new Error(history.error);
  const amountNeedle = `${planned.amountText} TL`;
  const duplicateCandidates = history.rows.filter(x => x.includes(planned.date) && x.includes(amountNeedle));
  const complete = history.recordsTotal === history.rows.length;
  if (!complete || duplicateCandidates.length) return { ...base, account:{id:accounts[0].id,name:accounts[0].label.replace(/\s*\([^)]*\)\s*$/, '')},
    status:!complete ? 'duplicate_scan_incomplete' : 'possible_duplicate', duplicateCandidates,
    supplierHistoryCount:history.recordsTotal, supplierHistoryScanComplete:complete, approvalReady:false, writePerformed:false };
  if (!accountLookup || !accountEvidence) return { ...base, account:{id:accounts[0].id,name:accounts[0].label.replace(/\s*\([^)]*\)\s*$/, '')},
    status:'supplier_history_clear_account_readback_pending', duplicateCandidates, supplierHistoryCount:history.recordsTotal,
    supplierHistoryScanComplete:complete, approvalReady:false, writePerformed:false };
  if (clean(account?.name) !== clean(accounts[0].label.replace(/\s*\([^)]*\)\s*$/, ''))) throw new Error('payment_account_form_list_mismatch');
  if (account.error || !account.href || account.currency !== 'TL') throw new Error('payment_account_identity_unverified');
  if (evidence.error || !evidence.scanCompleteThroughDate) throw new Error('payment_account_duplicate_scan_incomplete');
  return { ...base, account:{id:accounts[0].id,name:accounts[0].label.replace(/\s*\([^)]*\)\s*$/, '')},
    status: evidence.sameDateAmountCount ? 'possible_duplicate' : 'primary_system_duplicate_check_clear',
    duplicateCandidates, supplierHistoryCount:history.recordsTotal, supplierHistoryScanComplete:complete,
    accountHistoryRowsScanned:evidence.scannedRows, accountSameDateAmountCount:evidence.sameDateAmountCount,
    approvalReady:false, writePerformed:false };
}
