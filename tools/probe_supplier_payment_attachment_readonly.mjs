// Read-only discovery: identify where BizimHesap supports payment evidence attachments.
import { pageValue } from 'file:///C:/Users/HP/Documents/Codex/2026-08-27/referenced-chatgpt-conversation-this-is-an/work/aperion-command-bridge/src/windows-worker.js';

const guid = 'D1C7B701EAED48568753DB14F2F46C67';
const origin = 'https://uygulama.bizimhesap.com';
const pages = [
  `${origin}/web/ngn/acc/ngnpaymentcash?rc=1&identity=${guid}`,
  `${origin}/web/ngn/org/ngnsupplier?rc=1&guid=${guid}`
];
for (const url of pages) {
  const result = await pageValue(url, `(() => {
    if (location.origin !== '${origin}') return { error: 'unexpected_origin' };
    const relevant = el => /belge|dosya|ekle|upload|attachment|file|evrak/i.test([
      el.textContent, el.getAttribute('title'), el.getAttribute('aria-label'),
      el.getAttribute('href'), el.getAttribute('id'), el.getAttribute('name')
    ].filter(Boolean).join(' '));
    const brief = el => ({ tag: el.tagName.toLowerCase(), id: el.id || null, type: el.type || null,
      text: (el.textContent || el.value || '').replace(/\\s+/g, ' ').trim().slice(0, 110),
      href: el.getAttribute('href') || null, name: el.getAttribute('name') || null });
    const payment = document.querySelector('#tblPaymentHistory');
    return { path: location.pathname,
      fileInputs: [...document.querySelectorAll('input[type=file]')].map(brief),
      attachmentControls: [...document.querySelectorAll('a,button,input,label')].filter(relevant).map(brief).slice(0, 35),
      paymentHistoryFirstRow: payment?.querySelector('tbody tr')?.outerHTML.slice(0, 1500) || null,
      uploadArea: document.getElementById('fileUploader')?.parentElement?.parentElement?.outerHTML.slice(0, 3500) || null,
      uploadButton: document.getElementById('btnUploadFile')?.outerHTML || null,
      uploadContainer: document.getElementById('btnUploadFile')?.closest('.panel, .modal, .tab-pane')?.outerHTML.slice(0, 6000) || null
    };
  })()`);
  console.log(JSON.stringify(result));
}

const detail = await pageValue(`${origin}/web/ngn/org/ngnsupplier?rc=1&guid=${guid}`, `(async () => {
  if (location.origin !== '${origin}' || location.pathname !== '/web/ngn/org/ngnsupplier') return { error: 'wrong_supplier_page' };
  const table = document.getElementById('tblPaymentHistory');
  const first = table?.querySelector('tbody tr');
  const expander = first?.querySelector('td img[src*=details_open]');
  if (!expander) return { error: 'payment_expander_missing' };
  expander.click();
  await new Promise(resolve => setTimeout(resolve, 400));
  const next = first.nextElementSibling;
  return { firstRowGuid: first.children[1]?.textContent.trim(), expanded: next?.outerHTML.slice(0, 5000) || null };
})()`);
console.log(JSON.stringify({ paymentDetail: detail }));
