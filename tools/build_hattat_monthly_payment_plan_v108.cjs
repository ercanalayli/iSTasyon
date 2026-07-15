const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const root = path.resolve(__dirname, '..');
const MONTHS = { ocak: '01', subat: '02', mart: '03', nisan: '04', mayis: '05', haziran: '06', temmuz: '07', agustos: '08', eylul: '09', ekim: '10', kasim: '11', aralik: '12' };
const TAX_CODES = ['KDV1', 'POSET', 'MUHSGK', 'KGECICI', 'KURUMLAR'];

function argValue(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/İ/g, 'I').toLowerCase();
}

function parseMoney(value) {
  const number = Number(String(value || '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function parseDate(value) {
  const match = String(value || '').match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function sourceId(seed) {
  return Number.parseInt(crypto.createHash('sha256').update(seed).digest('hex').slice(0, 12), 16);
}

function paymentListSection(text) {
  // PDF'lerin ek beyannameleri sonradan geliyor. Ödeme listesi, ilk MUHASEBE
  // toplamıyla kapanır; şirket adı bazen SGK listesinin ortasında tekrar geçer.
  const marker = text.search(/\nMUHASEBE\s*\nToplam/i);
  return marker >= 0 ? text.slice(0, marker + 120) : text.slice(0, 8000);
}

function monthInfo(text) {
  const match = text.match(/(\d{4})\/([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+ayı\s+ödeme\s+listesi/i);
  if (!match) return { year: null, month: null, label: null };
  const month = MONTHS[normalize(match[2])];
  return { year: match[1], month: month || null, label: `${match[1]}/${match[2]}` };
}

function codeChunks(text) {
  const positions = TAX_CODES.map((code) => ({ code, at: text.indexOf(`\n${code}\n`) })).filter((item) => item.at >= 0).sort((a, b) => a.at - b.at);
  return positions.map((entry, index) => {
    const next = index + 1 < positions.length ? positions[index + 1].at : text.indexOf('\nSGK', entry.at);
    return { code: entry.code, text: text.slice(entry.at, next >= 0 ? next : text.length) };
  });
}

function buildItem({ code, period, reference, amount, dueDate, meta, fileHash, filename, cariName = 'Vergi dairesi' }) {
  const key = `${fileHash}:${code}:${reference}:${amount}:${dueDate}`;
  return {
    company: 'ALAYLI', item_date: dueDate, original_due_date: dueDate, effective_due_date: dueDate,
    item_type: 'payment', direction: 'out', title: `${code} tahakkuku ${period}`,
    description: `Hattat aylık ödeme listesi: ${meta.label}; referans ${reference}`,
    cari_name: cariName, category: 'Vergi/SGK', expected_amount: amount,
    source_type: 'hattat_pdf', source_table: 'monthly_payment_list', source_id: sourceId(key),
    plan_type: 'accrual', scope: 'business', fixed_or_variable: 'variable', priority: 'high',
    source_reference: reference, declaration_period: period, source_file: filename, source_hash: fileHash,
    confidence: 100, payment_status: 'unknown',
  };
}

function parseTaxItems(text, meta, fileHash, filename) {
  const items = [];
  for (const chunk of codeChunks(text)) {
    const match = chunk.text.match(/([0-9]{10,}[A-Za-z0-9]*)\s*([\d.]+,\d{2})\s*TL\s*(?:\d{1,2}\.\d{1,2}\.\d{4})?\s*(\d{4}\/\d{2})(\d{1,2}\.\d{1,2}\.\d{4})/i);
    if (!match) continue;
    const [, reference, rawAmount, period, rawDueDate] = match;
    const amount = parseMoney(rawAmount);
    const dueDate = parseDate(rawDueDate);
    if (dueDate && amount > 0) items.push(buildItem({ code: chunk.code, period, reference, amount, dueDate, meta, fileHash, filename }));
  }
  return items;
}

function parseSgkItems(text, meta, fileHash, filename) {
  const start = text.indexOf('\nSGK');
  const end = text.indexOf('\nMUHASEBE', start);
  if (start < 0) return [];
  const section = text.slice(start, end >= 0 ? end : text.length);
  const match = section.match(/([\d.]+,\d{2})\s*TL\s*(\d{4}\/\d{2})(\d{1,2}[./]\d{1,2}[./]\d{4})/i);
  if (!match) return [];
  const [, rawAmount, period, rawDueDate] = match;
  const totalMatch = section.match(/Toplam\s*([\d.]+,\d{2})\s*TL/i);
  const amount = parseMoney(totalMatch ? totalMatch[1] : rawAmount);
  const dueDate = parseDate(rawDueDate);
  return dueDate && amount > 0 ? [buildItem({ code: 'SGK', period, reference: `SGK-${period}`, amount, dueDate, meta, fileHash, filename, cariName: 'SGK' })] : [];
}

async function parseFile(file) {
  const buffer = fs.readFileSync(file);
  const extracted = await pdfParse(buffer);
  const page = paymentListSection(extracted.text || '');
  const meta = monthInfo(page);
  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
  const filename = path.basename(file);
  const items = [...parseTaxItems(page, meta, fileHash, filename), ...parseSgkItems(page, meta, fileHash, filename)];
  const generalMatch = page.match(/Genel\s+Toplam\s*([\d.]+,\d{2})\s*TL/i);
  return { source_file: filename, source_hash: fileHash, month: meta, general_total: generalMatch ? parseMoney(generalMatch[1]) : null, item_total: Number(items.reduce((sum, item) => sum + item.expected_amount, 0).toFixed(2)), items, parse_warnings: meta.month ? [] : ['Aylık ödeme listesi dönemi okunamadı.'] };
}

function defaultFiles() {
  const downloads = path.join(process.env.USERPROFILE || '', 'Downloads');
  return fs.existsSync(downloads) ? fs.readdirSync(downloads).filter((name) => /^AylikOdemeListesi(?: \(\d+\))?\.pdf$/i.test(name)).map((name) => path.join(downloads, name)) : [];
}

async function main() {
  const explicit = process.argv.filter((arg) => arg.startsWith('--file=')).map((arg) => arg.slice('--file='.length));
  const files = explicit.length ? explicit : defaultFiles();
  const out = argValue('out', path.join(root, 'finance_imports', 'hattat', 'hattat_monthly_payment_plan.json'));
  if (!files.length) throw new Error('Aylık ödeme listesi PDF bulunamadı. --file=... ile dosya belirtin.');
  const reports = [];
  for (const file of files) {
    if (!fs.existsSync(file)) throw new Error(`PDF bulunamadı: ${file}`);
    reports.push(await parseFile(file));
  }
  reports.sort((a, b) => `${a.month.year || ''}${a.month.month || ''}`.localeCompare(`${b.month.year || ''}${b.month.month || ''}`));
  const items = reports.flatMap((report) => report.items);
  const result = { created_at: new Date().toISOString(), source: 'hattat_musavir_monthly_payment_list', mode: 'dry_run', company: 'ALAYLI', payment_status_note: 'Bu liste tahakkuk/beklenen ödemedir. Banka mutabakatı yapılmadan ödenmiş sayılmaz.', summary: { files: reports.length, payment_candidates: items.length, expected_total: Number(items.reduce((sum, item) => sum + item.expected_amount, 0).toFixed(2)) }, reports, finance_calendar_items: items };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log('Hattat aylık ödeme listesi -> Finans Takvimi dry-run');
  console.log(`PDF: ${reports.length}; ödeme adayı: ${items.length}; toplam: TL ${result.summary.expected_total.toLocaleString('tr-TR')}`);
  console.log(`Çıktı: ${out}`);
  console.log('SONUC: BASARILI');
}

if (require.main === module) main().catch((error) => { console.error('SONUC: BASARISIZ'); console.error(error.message || error); process.exitCode = 1; });
module.exports = { parseFile, parseDate, parseMoney, sourceId };
