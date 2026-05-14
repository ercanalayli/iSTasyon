/*
AperiON / ErpaltH iSTasyon
BizimHesap Finans Pipeline

Amaç:
- BizimHesap botunun indirdiği CSV/JSON çıktıları okumak.
- Ham hareketleri finance_import_bridge üzerinden standart finans kaydına çevirmek.
- Çıktıyı Onay Merkezi için JSON dosyası olarak üretmek.

Kullanım:
node bizimhesap_finance_pipeline.js ./bizimhesap_exports/alaysatis.json alayli
node bizimhesap_finance_pipeline.js ./bizimhesap_exports/banka.csv alayli
*/

const fs = require('fs');
const path = require('path');
const { buildApprovalQueue, summarizeQueue } = require('./finance_import_bridge');

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === ',' && !quoted) { out.push(cur.trim()); cur = ''; continue; }
    if (ch === ';' && !quoted) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function readCsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => row[h] = cells[i] || '');
    return row;
  });
}

function readInput(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.rows)) return data.rows;
    if (Array.isArray(data.data)) return data.data;
    return [data];
  }
  if (ext === '.csv' || ext === '.txt') return readCsv(filePath);
  throw new Error('Desteklenmeyen dosya türü: ' + ext);
}

function main() {
  const inputPath = process.argv[2];
  const company = process.argv[3] || 'alayli';
  if (!inputPath) {
    console.error('Kullanım: node bizimhesap_finance_pipeline.js <dosya.csv|json> <company>');
    process.exit(1);
  }
  const rawRows = readInput(inputPath);
  const queue = buildApprovalQueue(rawRows, company);
  const summary = summarizeQueue(queue);
  const outDir = process.env.APERION_FINANCE_IMPORT_DIR || './finance_imports';
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(outDir, `approval_queue_${company}_${stamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ source_file: inputPath, company, summary, queue }, null, 2), 'utf8');
  console.log('Onay kuyruğu üretildi:', outPath);
  console.log(JSON.stringify(summary, null, 2));
}

main();
