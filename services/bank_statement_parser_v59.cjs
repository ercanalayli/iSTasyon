require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const xlsx = require('xlsx');

function normalizeTR(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function parseTRAmount(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const cleaned = raw
    .replace(/TL|TRY|₺/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function guessBankName(text, fileName) {
  const t = `${fileName || ''} ${text || ''}`.toLowerCase();
  if (t.includes('ziraat')) return 'Ziraat Bankası';
  if (t.includes('vakıf') || t.includes('vakif')) return 'Vakıfbank';
  if (t.includes('yapı kredi') || t.includes('yapi kredi')) return 'Yapı Kredi';
  if (t.includes('akbank')) return 'Akbank';
  if (t.includes('iş bank') || t.includes('is bank')) return 'İş Bankası';
  if (t.includes('garanti')) return 'Garanti BBVA';
  return 'Bilinmeyen Banka';
}

function extractDate(line) {
  const m = line.match(/\b(\d{2}[./-]\d{2}[./-]\d{4})\b/);
  if (!m) return null;
  const [d, mo, y] = m[1].replace(/-/g, '.').replace(/\//g, '.').split('.');
  return `${y}-${mo}-${d}`;
}

function extractAmounts(line) {
  const matches = line.match(/[-+]?\d{1,3}(?:\.\d{3})*,\d{2}|[-+]?\d+,\d{2}/g) || [];
  return matches.map(parseTRAmount).filter(v => v !== null);
}

function parseTextTransactions(text) {
  const lines = normalizeTR(text).split('\n').map(s => s.trim()).filter(Boolean);
  const tx = [];
  for (const line of lines) {
    const date = extractDate(line);
    const amounts = extractAmounts(line);
    if (!date || !amounts.length) continue;

    const amount = amounts[0];
    const balance = amounts.length > 1 ? amounts[amounts.length - 1] : null;
    const description = line
      .replace(/\b\d{2}[./-]\d{2}[./-]\d{4}\b/g, '')
      .replace(/[-+]?\d{1,3}(?:\.\d{3})*,\d{2}|[-+]?\d+,\d{2}/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    tx.push({
      transaction_date: date,
      description,
      amount,
      balance,
      direction: amount < 0 ? 'outflow' : 'inflow',
      confidence: 55,
      raw_line: line,
    });
  }
  return tx;
}

async function parsePdf(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  const text = normalizeTR(data.text || '');
  return { text, transactions: parseTextTransactions(text) };
}

function parseExcel(filePath) {
  const wb = xlsx.readFile(filePath, { cellDates: false });
  const rows = [];
  wb.SheetNames.forEach(sheetName => {
    const sheet = wb.Sheets[sheetName];
    const json = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    json.forEach(row => rows.push(row.join(' ')));
  });
  const text = normalizeTR(rows.join('\n'));
  return { text, transactions: parseTextTransactions(text) };
}

async function parseBankStatement(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  const ext = path.extname(filePath).toLowerCase();
  let result;
  if (ext === '.pdf') result = await parsePdf(filePath);
  else if (['.xlsx', '.xls', '.csv'].includes(ext)) result = parseExcel(filePath);
  else throw new Error(`Unsupported file type: ${ext}`);

  return {
    source_file: path.basename(filePath),
    bank_name: guessBankName(result.text, path.basename(filePath)),
    transaction_count: result.transactions.length,
    transactions: result.transactions,
    text_preview: result.text.slice(0, 1200),
  };
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node services/bank_statement_parser_v59.cjs <file.pdf|xlsx|xls|csv>');
    process.exit(1);
  }
  const parsed = await parseBankStatement(filePath);
  console.log(JSON.stringify(parsed, null, 2));
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { parseBankStatement, parseTextTransactions, parseTRAmount, guessBankName };
