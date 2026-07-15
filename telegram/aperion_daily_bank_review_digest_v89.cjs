const { createClient } = require('@supabase/supabase-js');
const { buildDailyReview } = require('../tools/build_daily_bank_review_v89.cjs');

const send = process.argv.includes('--send');
const company = process.env.COMPANY_ID || 'alayli';
const url = process.env.SUPABASE_URL || 'https://iilfwosoroflzubkaryj.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const token = process.env.TELEGRAM_BOT_TOKEN || '';
const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_ALLOWED_CHAT_ID || String(process.env.TELEGRAM_CHAT_IDS || '').split(',').map(x => x.trim()).find(Boolean) || '';

function money(value) {
  return Number(value || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

function rowLine(item, index) {
  const direction = Number(item.amount) >= 0 ? 'Giris' : 'Cikis';
  const line = [
    `${index + 1}. <b>${item.proposed_type}</b> | ${money(Math.abs(item.amount))} ${direction}`,
    item.record_summary || `${item.bank} | ${item.proposed_category}`,
  ];
  if (item.transaction_no) line.push(`Islem no: ${item.transaction_no}`);
  if (item.question) line.push(`Soru: ${item.question}`);
  return line.join('\n');
}

function formatDailyBankReview(report) {
  const s = report.summary || {};
  const date = report.review_date ? new Date(`${report.review_date}T12:00:00`).toLocaleDateString('tr-TR') : '-';
  const lines = [
    `<b>AperiON Gunluk Banka Kontrolu</b>`,
    `Islem gunu: <b>${date}</b>`,
    `Yeni/acik hareket: <b>${s.total || 0}</b>`,
    `Kayda hazir: <b>${s.hazir || 0}</b> | Cari sorusu: <b>${s.cari_dogrulama || 0}</b> | Inceleme: <b>${s.inceleme || 0}</b>`,
  ];
  const needsDecision = [...(report.buckets?.cari_dogrulama || []), ...(report.buckets?.inceleme || [])].slice(0, 3);
  const ready = (report.buckets?.hazir || []).slice(0, 5);
  if (ready.length) lines.push(`\n<b>Kayda hazir</b>\n${ready.map(rowLine).join('\n\n')}`);
  if (needsDecision.length) lines.push(`\n<b>Sadece senin kararini bekleyenler</b>\n${needsDecision.map(rowLine).join('\n\n')}`);
  if (!ready.length && !needsDecision.length) lines.push('\nBugun icin yeni banka hareketi yok.');
  lines.push('\nAperiON net hareketleri kayda hazirlar; yalnizca cari veya tur belirsizse soru sorar.');
  return lines.join('\n');
}

async function loadReport() {
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY gerekli.');
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.from('pending_bank_movements')
    .select('*')
    .eq('company_id', company)
    .in('status', ['pending', 'needs_review'])
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  return buildDailyReview(data || []);
}

async function main() {
  const report = await loadReport();
  const text = formatDailyBankReview(report);
  if (!send) {
    console.log(text);
    console.log('RESULT: PREVIEW - Telegram mesaji gonderilmedi.');
    return report;
  }
  if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN ve Telegram chat hedefi gerekli.');
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (!response.ok) throw new Error(`Telegram gonderimi basarisiz: ${await response.text()}`);
  console.log('RESULT: OK - Gunluk banka kontrol ozeti gonderildi.');
  return report;
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}

module.exports = { formatDailyBankReview, loadReport, main };
