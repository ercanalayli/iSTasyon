const fs = require('fs');
const path = require('path');
const { buildReport, todayInIstanbul } = require('../tools/build_payment_reminder_candidates_v88.cjs');

const ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'data', 'aperion_payment_obligation_registry.json');

function formatMoney(amount, currency) {
  return amount === null ? 'Tutar kaynakta bekliyor' : new Intl.NumberFormat('tr-TR', {
    style: 'currency', currency: currency || 'TRY', maximumFractionDigits: 2
  }).format(amount);
}

function levelLabel(candidate) {
  if (candidate.level === 'overdue') return `GECİKMİŞ (${Math.abs(candidate.days)} gün)`;
  if (candidate.level === 'due_today') return 'BUGÜN VADELİ';
  if (candidate.level.startsWith('due_in_')) return `${candidate.days} GÜN KALDI`;
  return 'BİLGİ EKSİK';
}

function formatDigest(report) {
  const actionable = report.candidates.filter((candidate) => candidate.notify);
  const lines = ['<b>AperiON Ödeme Takibi</b>', `Tarih: <b>${report.as_of}</b>`];
  if (!actionable.length) return `${lines.join('\n')}\n\nBugün için bildirim gerektiren doğrulanmış ödeme yok.`;
  for (const candidate of actionable) {
    lines.push('');
    lines.push(`<b>${levelLabel(candidate)} · ${candidate.scope === 'personal' ? 'Şahsi' : 'Şirket'}</b>`);
    lines.push(candidate.title);
    lines.push(`Vade: ${candidate.due_date || 'hesap ve vade bilgisi bekliyor'} · ${formatMoney(candidate.amount, candidate.currency)}`);
    if (candidate.counterparty) lines.push(`Taraf: ${candidate.counterparty}`);
    lines.push(`İşlem: ${candidate.action}`);
  }
  lines.push('', 'Not: Bu bildirim ödeme emri değildir; kaynak ve dekont doğrulanmadan BizimHesap kaydı oluşturulmaz.');
  return lines.join('\n');
}

async function sendTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN ve TELEGRAM_CHAT_ID gerekli.');
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
  });
  if (!response.ok) throw new Error(`Telegram gönderimi başarısız: ${await response.text()}`);
  return response.json();
}

async function main() {
  const send = process.argv.includes('--send');
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  const report = buildReport(registry, todayInIstanbul());
  const digest = formatDigest(report);
  if (!send) {
    console.log(digest);
    console.log('\nRESULT: DRY-RUN - Telegram mesajı gönderilmedi.');
    return;
  }
  await sendTelegram(digest);
  console.log('RESULT: OK - payment reminder digest sent.');
}

if (require.main === module) main().catch((error) => { console.error(error.message || error); process.exitCode = 1; });

module.exports = { formatDigest, formatMoney, levelLabel };
