const fs = require('fs');
const path = require('path');
const { fixMojibake } = require('./bank_posting_plan.cjs');

const args = process.argv.slice(2);
const sourcePath = value('--source', 'bank_exports/historical_bank_reconciliation_company_sources_secure_v109.json');
const outputPath = value('--out', 'bank_exports/historical_bank_reconciliation_with_bizimhesap_v110.json');
const historyPaths = values('--history');

function value(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}
function values(name) { return args.reduce((out, arg, index) => arg === name && args[index + 1] ? [...out, args[index + 1]] : out, []); }
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function clean(value) { return fixMojibake(String(value ?? '')).replace(/\s+/g, ' ').trim(); }
function amount(value) {
  const raw = clean(value).replace(/\s|TL/gi, '');
  if (!raw) return 0;
  const comma = raw.lastIndexOf(','); const dot = raw.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) return Number(dot > comma ? raw.replace(/,/g, '') : raw.replace(/\./g, '').replace(',', '.')) || 0;
  return Number(comma >= 0 ? raw.replace(',', '.') : raw) || 0;
}
function normalize(value) {
  return clean(value).toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
}
function historyAccount(selected) {
  const text = normalize(selected);
  if (text.startsWith('IS BANKASI')) return '*IS BANKASI';
  if (text.startsWith('VAKIF SIRKET')) return '*VAKIF SIRKET';
  return clean(selected);
}
function direction(row) {
  const action = normalize(row[1]);
  if (/PARA GIRISI|TAHSILAT|GELIR/.test(action)) return 'in';
  if (/PARA CIKISI|ODEME|GIDER/.test(action)) return 'out';
  return '';
}
function makeHistoryEntries(report) {
  const account = historyAccount(report.selected_account || report.requested_account || '');
  return (report.pages || []).flatMap(page => (page.rows || []).flatMap(row => {
    const date = clean(row[0]);
    const flow = direction(row);
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date) || !flow) return [];
    const [day, month, year] = date.split('.');
    const figure = flow === 'in' ? amount(row[5]) : amount(row[6]);
    if (!figure) return [];
    return [{ account, date: `${year}-${month}-${day}`, flow, amount: Number(figure.toFixed(2)), description: clean(row[4]), operation: clean(row[1]) }];
  }));
}
function sourceFlow(row) { return Number(row.amount_in || 0) > 0 ? 'in' : Number(row.amount_out || 0) > 0 ? 'out' : ''; }
function matchKey(account, date, flow, value) { return `${normalize(account)}|${date}|${flow}|${Number(value).toFixed(2)}`; }

function main() {
  if (!fs.existsSync(sourcePath)) throw new Error(`Kaynak mutabakat raporu yok: ${sourcePath}`);
  if (!historyPaths.length) throw new Error('En az bir --history BizimHesap banka gecmis raporu gerekli.');
  const source = readJson(sourcePath);
  const historyReports = historyPaths.map(readJson);
  const history = historyReports.flatMap(makeHistoryEntries);
  const index = new Map();
  for (const item of history) {
    const key = matchKey(item.account, item.date, item.flow, item.amount);
    const list = index.get(key) || []; list.push(item); index.set(key, list);
  }
  const rows = (source.decisions || []).map(item => {
    const flow = sourceFlow(item);
    const amountValue = flow === 'in' ? Number(item.amount_in || 0) : Number(item.amount_out || 0);
    const key = matchKey(item.account_name || item.source_account || '', item.transaction_date, flow, amountValue);
    const matches = index.get(key) || [];
    if (matches.length === 1) return {
      ...item,
      reconciliation: { status: 'bizimhesap_gecmisinde_var', reason: 'BizimHesap banka gecmisinde tekil tarih/yön/tutar eslesmesi bulundu; tekrar kayit yok.', history_match: matches[0] },
    };
    if (matches.length > 1) return {
      ...item,
      reconciliation: { status: 'inceleme_gerekli', reason: `BizimHesap gecmisinde ayni tarih/yön/tutar ile ${matches.length} hareket var; otomatik eslestirme yapilmaz.`, history_matches: matches },
    };
    return item;
  });
  const summary = rows.reduce((out, row) => { const status = row.reconciliation.status; out[status] = (out[status] || 0) + 1; return out; }, {
    statement_rows: rows.length, bizimhesap_history_rows: history.length, history_sources: historyPaths.length,
  });
  const report = {
    created_at: new Date().toISOString(), mode: 'read_only_reconciliation', company_id: source.company_id || 'alayli',
    source_report: sourcePath, history_reports: historyPaths, summary, decisions: rows,
    limitation: 'Eslesme sadece BizimHesap ekranindan okunabilen gecmis kapsaminda tarih + yon + tutar tekil kanitiyla yapilir. Cakisan veya kapsama disi hareketler otomatik islenmez.',
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`RESULT: READ ONLY - statement=${summary.statement_rows} already_in_bizimhesap=${summary.bizimhesap_gecmisinde_var || 0} candidate=${summary.guvenli_isleme_adayi || 0} review=${summary.inceleme_gerekli || 0}`);
  console.log(`REPORT: ${outputPath}`);
}
main();
