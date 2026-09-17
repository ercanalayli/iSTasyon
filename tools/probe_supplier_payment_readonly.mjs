// Read-only discovery for the dedicated AperiON BizimHesap browser profile.
// No form submission or financial write is performed here.
import { pageValue } from 'file:///C:/Users/HP/Documents/Codex/2026-08-27/referenced-chatgpt-conversation-this-is-an/work/aperion-command-bridge/src/windows-worker.js';

const term = String(process.argv[2] || 'KARADENIZ').trim();
if (!/^[\p{L} .-]{3,60}$/u.test(term)) throw new Error('invalid_supplier_search');
const result = await pageValue('https://uygulama.bizimhesap.com/web/ngn/org/ngnsuppliers', `(async () => {
  if (location.origin !== 'https://uygulama.bizimhesap.com' || !/ngnsuppliers/.test(location.pathname)) return { error: 'wrong_page' };
  const term = ${JSON.stringify(term)};
  const input = document.querySelector('#searchInput');
  if (!input) return { error: 'supplier_search_missing', title: document.title };
  input.value = term;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Enter', keyCode: 13 }));
  await new Promise(resolve => setTimeout(resolve, 2300));
  const rows = [...document.querySelectorAll('tr')].filter(row => row.innerText.toLocaleUpperCase('tr-TR').includes(term.toLocaleUpperCase('tr-TR'))).slice(0, 12);
  return { page: location.pathname, matches: rows.map(row => ({
    text: row.innerText.replace(/\\s+/g, ' ').slice(0, 220),
    links: [...row.querySelectorAll('a[href]')].map(a => ({ text: a.innerText.slice(0, 50), path: new URL(a.href).pathname + new URL(a.href).search })).slice(0, 3)
  })) };
})()`);
const exact = result.matches?.filter(row => row.text.startsWith('KARADENİZ MEDİKAL SAĞLIK HİZMETLERİ')) || [];
if (exact.length !== 1) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}
const supplierHref = exact[0].links.find(link => /ngnsupplier\?/.test(link.path))?.path;
const supplierGuid = supplierHref?.match(/guid=([0-9a-f]{32})/i)?.[1];
if (!supplierGuid) throw new Error('supplier_guid_missing');
const payment = await pageValue(`https://uygulama.bizimhesap.com/web/ngn/acc/ngnpaymentcash?rc=1&identity=${supplierGuid}`, `(() => {
  if (location.origin !== 'https://uygulama.bizimhesap.com' || !/ngnpaymentcash/.test(location.pathname)) return { error: 'wrong_payment_page' };
  const form = document.querySelector('form');
  return { page: location.pathname, title: document.title,
    labels: [...document.querySelectorAll('label')].map(el => el.textContent.trim()).filter(Boolean).slice(0, 40),
    fields: [...(form?.querySelectorAll('input, select, textarea') || [])].filter(el => el.name && !/viewstate|eventvalidation|password|token/i.test(el.name)).map(el => ({
      name: el.name, id: el.id, type: el.type || el.tagName.toLowerCase(),
      options: el.tagName === 'SELECT' ? [...el.options].map(o => ({ value: o.value, text: o.textContent.trim() })).slice(0, 80) : undefined
    })).slice(0, 70),
    saveButtons: [...document.querySelectorAll('button,input[type=submit]')].map(el => ({ id: el.id, name: el.name, text: (el.innerText || el.value || '').trim() })).filter(x => /kaydet|save/i.test(x.text)).slice(0, 8)
  };
})()`);
const supplierHistory = await pageValue(`https://uygulama.bizimhesap.com${supplierHref}`, `(() => {
  if (location.origin !== 'https://uygulama.bizimhesap.com' || !/ngnsupplier$/.test(location.pathname)) return { error: 'wrong_supplier_page' };
  return { page: location.pathname, heading: [...document.querySelectorAll('h1,h2,h3')].map(x => x.innerText.trim()).filter(Boolean).slice(0, 8),
    tables: [...document.querySelectorAll('table')].map(t => ({ id: t.id, headers: [...t.querySelectorAll('th')].map(x => x.innerText.trim()).slice(0, 15),
      dataTable: (() => { try { const api = window.jQuery?.fn?.dataTable?.isDataTable(t) ? window.jQuery(t).DataTable() : null; return api ? { recordsTotal: api.page.info().recordsTotal, pageLength: api.page.len(), ajaxUrl: api.ajax.url() || null } : null; } catch { return null; } })(),
      rows: [...t.querySelectorAll('tbody tr')].slice(0, 8).map(x => x.innerText.replace(/\\s+/g, ' ').trim().slice(0, 240)) })).slice(0, 8)
  };
})()`);
console.log(JSON.stringify({ supplier: { text: exact[0].text, guid: supplierGuid }, payment, supplierHistory }, null, 2));
