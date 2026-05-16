/* AperiON BizimHesap File Reader v40
   Purpose: read CSV/XLSX exports and send rows to BizimHesap normalizer.
   Safe rule: this file only reads and prepares rows. It does not write to Supabase or BizimHesap.
*/

const fs = require('fs');
const path = require('path');

function parseCsvLine(line, delimiter){
  const out = [];
  let current = '';
  let inQuotes = false;
  for(let i = 0; i < line.length; i++){
    const ch = line[i];
    const next = line[i + 1];
    if(ch === '"' && inQuotes && next === '"'){
      current += '"';
      i++;
    } else if(ch === '"'){
      inQuotes = !inQuotes;
    } else if(ch === delimiter && !inQuotes){
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

function detectDelimiter(text){
  const first = String(text || '').split(/\r?\n/).find(Boolean) || '';
  const semicolon = (first.match(/;/g) || []).length;
  const comma = (first.match(/,/g) || []).length;
  const tab = (first.match(/\t/g) || []).length;
  if(tab >= semicolon && tab >= comma && tab > 0) return '\t';
  if(semicolon >= comma) return ';';
  return ',';
}

function readCsvFile(filePath){
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(text);
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if(lines.length === 0) return [];
  const headers = parseCsvLine(lines[0], delimiter).map(h => String(h || '').trim());
  return lines.slice(1).map(line => {
    const cells = parseCsvLine(line, delimiter);
    const row = {};
    headers.forEach((h, i) => row[h] = cells[i] === undefined ? '' : cells[i]);
    return row;
  });
}

function readXlsxFile(filePath, sheetName){
  let XLSX;
  try {
    XLSX = require('xlsx');
  } catch (err) {
    throw new Error('xlsx package is required for Excel files. Run npm install xlsx or use CSV export.');
  }
  const workbook = XLSX.readFile(filePath);
  const target = sheetName || workbook.SheetNames[0];
  if(!target || !workbook.Sheets[target]) throw new Error('Sheet not found: ' + target);
  return XLSX.utils.sheet_to_json(workbook.Sheets[target], { defval: '' });
}

function readExportFile(filePath, options = {}){
  const ext = path.extname(filePath).toLowerCase();
  if(ext === '.csv' || ext === '.txt' || ext === '.tsv') return readCsvFile(filePath);
  if(ext === '.xlsx' || ext === '.xls') return readXlsxFile(filePath, options.sheetName);
  throw new Error('Unsupported file extension: ' + ext);
}

function summarizeRawRows(rows){
  const list = rows || [];
  const keys = new Set();
  list.forEach(row => Object.keys(row || {}).forEach(k => keys.add(k)));
  return {
    row_count: list.length,
    column_count: keys.size,
    columns: Array.from(keys)
  };
}

if(typeof module !== 'undefined'){
  module.exports = { readCsvFile, readXlsxFile, readExportFile, summarizeRawRows, detectDelimiter };
}
