const fs = require('fs');
const path = require('path');

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { quoted = !quoted; continue; }
    if ((ch === ',' || ch === ';') && !quoted) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function readCsv(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0] || '');
  return lines.slice(1).map(line => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => row[h] = cells[i] || '');
    return row;
  });
}

function norm(v) {
  return String(v || '').toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/\s+/g, ' ').trim();
}

function num(v) {
  if (typeof v === 'number') return v;
  const n = Number(String(v || '0').replace(/TL/gi, '').replace(/₺/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function dateVal(row) {
  return row.Tarih || row.date || row.transaction_date || new Date().toISOString().slice(0, 10);
}

function isMoka(row) {
  const text = norm([row.Açıklama, row.Aciklama, row.description, row.Banka].join(' '));
  return text.includes('moka') || text.includes('united') || text.includes('pos aktarim') || text.includes('kart tahsilat');
}

function toApproval(row, company) {
  const amount = num(row.Tutar || row.amount || row.Alacak || row.credit);
  return {
    company,
    record_type: 'tahsilat',
    status: 'taslak',
    cari_name: 'Moka United',
    description: row.Açıklama || row.Aciklama || row.description || 'Moka banka geçişi',
    original_due_date: dateVal(row),
    actual_payment_date: dateVal(row),
    expected_amount: amount,
    realized_amount: amount,
    source: 'moka_bank_pipeline',
    approval_status: 'onay_bekliyor',
    confidence_score: amount > 0 ? 88 : 55,
    match_reason: amount > 0 ? 'Banka açıklamasında Moka/United izi ve tutar var' : 'Tutar eksik, kontrol gerekli'
  };
}

function main() {
  const input = process.argv[2];
  const company = process.argv[3] || 'alayli';
  if (!input) {
    console.error('Kullanım: node moka_bank_pipeline.cjs <banka.csv> <company>');
    process.exit(1);
  }
  const rows = readCsv(input);
  const queue = rows.filter(isMoka).map(r => toApproval(r, company));
  const summary = queue.reduce((a, r) => {
    a.count += 1;
    a.total += Number(r.expected_amount || 0);
    return a;
  }, { count: 0, total: 0 });
  const outDir = './finance_imports';
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `moka_approval_queue_${company}_demo.json`);
  fs.writeFileSync(out, JSON.stringify({ source_file: input, company, summary, queue }, null, 2), 'utf8');
  console.log('OK', out, JSON.stringify(summary));
}

main();
