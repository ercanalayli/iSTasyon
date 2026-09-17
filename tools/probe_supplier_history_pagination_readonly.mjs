// Read-only DataTables capability probe. No payment form or save action.
import { pageValue } from 'file:///C:/Users/HP/Documents/Codex/2026-08-27/referenced-chatgpt-conversation-this-is-an/work/aperion-command-bridge/src/windows-worker.js';
const guid = 'D1C7B701EAED48568753DB14F2F46C67';
const result = await pageValue(`https://uygulama.bizimhesap.com/web/ngn/org/ngnsupplier?rc=1&guid=${guid}`, `(() => {
  if (location.origin !== 'https://uygulama.bizimhesap.com' || location.pathname !== '/web/ngn/org/ngnsupplier') return {error:'wrong_page'};
  const table = document.getElementById('tblPaymentHistory');
  if (!table || !window.jQuery?.fn?.dataTable?.isDataTable(table)) return {error:'history_table_missing'};
  const api = window.jQuery(table).DataTable();
  const settings = api.settings()[0];
  const rows = api.rows().data().toArray();
  return { serverSide:!!settings.oFeatures?.bServerSide, recordsTotal:api.page.info().recordsTotal,
    visibleDomRows:table.querySelectorAll('tbody tr').length, apiRows:rows.length,
    firstRowType:Array.isArray(rows[0])?'array':typeof rows[0], firstRow:Array.isArray(rows[0])?rows[0].slice(0,5):String(rows[0]||'').slice(0,300) };
})()`);
console.log(JSON.stringify(result));
