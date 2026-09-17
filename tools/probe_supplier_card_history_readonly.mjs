import { pageValue } from 'file:///C:/Users/HP/Documents/Codex/2026-08-27/referenced-chatgpt-conversation-this-is-an/work/aperion-command-bridge/src/windows-worker.js';

const accountGuid = 'FC5428C692F44E0EBBB9E2EAED9941E7'; // KK İŞ ŞİRKET, verify live before interpreting.
const result = await pageValue(`https://uygulama.bizimhesap.com/web/ngn/acc/ngnaccount?rc=1&guid=${accountGuid}`, `(async () => {
  if (location.origin !== 'https://uygulama.bizimhesap.com' || location.pathname !== '/web/ngn/acc/ngnaccount') return { error:'wrong_account_page' };
  const headings = [...document.querySelectorAll('h1,h2,h3')].map(x => x.innerText.trim()).filter(Boolean).slice(0,8);
  let params = 'draw=1';
  for (let i=0;i<9;i++) params += '&columns['+i+'][data]='+i+'&columns['+i+'][name]=&columns['+i+'][searchable]=true&columns['+i+'][orderable]=true&columns['+i+'][search][value]=&columns['+i+'][search][regex]=false';
  params += '&order[0][column]=0&order[0][dir]=desc&start=0&length=1500&search[value]=&search[regex]=false&guid=${accountGuid}';
  const response = await fetch('/web/services/json.asmx/GetCashTrx',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},body:params});
  const json = await response.json().catch(() => null);
  const rows = json?.d?.data || json?.d || json?.data;
  if (!response.ok || !Array.isArray(rows)) return {error:'account_history_unavailable',httpStatus:response.status};
  const matches = rows.filter(row => /KARADEN[Iİ]Z|KARADENIZ/i.test(row.map(String).join(' ')));
  return {headings, scannedRows:rows.length, totalRows:json?.d?.recordsTotal||json?.recordsTotal||null, filteredRows:json?.d?.recordsFiltered||json?.recordsFiltered||null,
    firstDate:rows[0]?.[0]||null,lastDate:rows.at(-1)?.[0]||null,
    matches:matches.slice(0,20).map(row => row.map(x => String(x||'').replace(/<[^>]*>/g,' ').replace(/\\s+/g,' ').trim().slice(0,130)))};
})()`);
console.log(JSON.stringify(result,null,2));
