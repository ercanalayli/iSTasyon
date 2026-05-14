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

function toNumber(value) {
  if (typeof value === 'number') return value;
  const n = Number(String(value || '0').replace(/TL/gi, '').replace(/₺/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function normalize(row, company) {
  const incoming = toNumber(row.incoming_amount || row.alacak || row.credit || row.Tahsilat || row.tahsilat);
  const outgoing = toNumber(row.outgoing_amount || row.borc || row.debit || row.Odeme || row.odeme);
  const amount = incoming || outgoing || toNumber(row.amount || row.Tutar || row.tutar);
  const isIncome = incoming > 0 || String(row.type || row.Tip || '').toLowerCase().includes('tahsil');
  return {
    company,
    record_type: isIncome ? 'tahsilat' : 'odeme',
    status: 'taslak',
    cari_name: row.cari_name || row.Cari || row.Musteri || row['Müşteri'] || row.customer || 'Eşleşmeyen Cari',
    description: row.description || row.Aciklama || row['Açıklama'] || '',
    original_due_date: row.date || row.Tarih || row.transaction_date || new Date().toISOString().slice(0, 10),
    actual_payment_date: row.date || row.Tarih || row.transaction_date || new Date().toISOString().slice(0, 10),
    expected_amount: amount,
    realized_amount: 0,
    source: 'bizimhesap_pipeline_demo',
    approval_status: 'onay_bekliyor',
    confidence_score: amount > 0 ? 80 : 50,
    match_reason: amount > 0 ? 'tutar okundu, onay gerekli' : 'tutar eksik, kontrol gerekli'
  };
}

function main() {
  const input = process.argv[2];
  const company = process.argv[3] || 'alayli';
  if (!input) {
    console.error('Kullanım: node bizimhesap_finance_pipeline.cjs <csv> <company>');
    process.exit(1);
  }
  const rows = readCsv(input);
  const queue = rows.map(r => normalize(r, company));
  const summary = queue.reduce((a, r) => {
    a.count += 1;
    a.total += Number(r.expected_amount || 0);
    return a;
  }, { count: 0, total: 0 });
  const outDir = './finance_imports';
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `approval_queue_${company}_demo.json`);
  fs.writeFileSync(out, JSON.stringify({ source_file: input, company, summary, queue }, null, 2), 'utf8');
  console.log('OK', out, JSON.stringify(summary));
}

main();
