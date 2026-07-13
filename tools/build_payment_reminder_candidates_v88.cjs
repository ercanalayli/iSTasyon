const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'data', 'aperion_payment_obligation_registry.json');

function parseArgs(argv) {
  const args = { asOf: null, out: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--as-of') args.asOf = argv[index + 1] || null;
    if (argv[index] === '--out') args.out = argv[index + 1] || null;
  }
  return args;
}

function toIsoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`);
  return date.toISOString().slice(0, 10);
}

function todayInIstanbul(asOf) {
  if (asOf) return toIsoDate(`${asOf}T12:00:00.000Z`);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date()).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addDays(iso, days) {
  const date = new Date(`${iso}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

function daysBetween(from, to) {
  return Math.round((new Date(`${to}T12:00:00.000Z`) - new Date(`${from}T12:00:00.000Z`)) / 86400000);
}

function monthlyDueDate(obligation, asOf) {
  const [yearText, monthText] = asOf.split('-');
  let year = Number(yearText);
  let month = Number(monthText);
  const dueDay = Math.max(1, Math.min(Number(obligation.due_day), 31));
  let due = `${year}-${String(month).padStart(2, '0')}-${String(Math.min(dueDay, daysInMonth(year, month))).padStart(2, '0')}`;
  if (due < asOf) {
    month += 1;
    if (month === 13) { month = 1; year += 1; }
    due = `${year}-${String(month).padStart(2, '0')}-${String(Math.min(dueDay, daysInMonth(year, month))).padStart(2, '0')}`;
  }
  return due;
}

function dueDateFor(obligation, asOf) {
  if (obligation.due_date) return obligation.due_date;
  if (obligation.frequency === 'monthly' && obligation.due_day) return monthlyDueDate(obligation, asOf);
  return null;
}

function classify(obligation, asOf, dueDate, policy) {
  if (!dueDate) return { level: 'needs_details', action: 'Kaynak ekstrelerinden hesap ve vade bilgisini öğren.', notify: false, days: null };
  const remaining = daysBetween(asOf, dueDate);
  if (remaining < 0) {
    const overdueDays = Math.abs(remaining);
    const followUp = (policy.overdue_follow_up_days || []).includes(overdueDays);
    return {
      level: 'overdue',
      action: obligation.status === 'payment_confirmation_required'
        ? 'Dekont veya ödeme kanıtını kontrol et; ödenmiş varsayma.'
        : 'Gecikme nedenini ve ödeme durumunu doğrula.',
      notify: followUp || overdueDays === 1,
      days: -overdueDays
    };
  }
  if (remaining === 0) return { level: 'due_today', action: 'Ödeme veya ödeme kanıtı kontrolü gerekli.', notify: true, days: 0 };
  if ((policy.reminder_days_before || []).includes(remaining)) {
    return { level: `due_in_${remaining}`, action: 'Vade yaklaşımı: hesap, tutar ve dekont eşleştirmesini hazırla.', notify: true, days: remaining };
  }
  return { level: 'scheduled', action: 'Takvimde izleniyor.', notify: false, days: remaining };
}

function buildCandidates(registry, asOf) {
  const policy = registry.notification_policy || {};
  return (registry.obligations || [])
    .filter((obligation) => obligation.notification_enabled !== false)
    .map((obligation) => {
      const dueDate = dueDateFor(obligation, asOf);
      const classification = classify(obligation, asOf, dueDate, policy);
      return {
        obligation_id: obligation.id,
        scope: obligation.scope,
        title: obligation.title,
        category: obligation.category || null,
        counterparty: obligation.counterparty || null,
        due_date: dueDate,
        amount: typeof obligation.amount === 'number' ? obligation.amount : null,
        currency: obligation.currency || 'TRY',
        source: obligation.source || null,
        status: obligation.status || 'unknown',
        note: obligation.note || '',
        ...classification
      };
    })
    .sort((left, right) => (left.due_date || '9999-12-31').localeCompare(right.due_date || '9999-12-31'));
}

function buildReport(registry, asOf) {
  const candidates = buildCandidates(registry, asOf);
  return {
    generated_at: new Date().toISOString(),
    timezone: registry.timezone || 'Europe/Istanbul',
    as_of: asOf,
    source: 'aperion_payment_obligation_registry',
    principle: registry.principle,
    summary: {
      total: candidates.length,
      notify_now: candidates.filter((item) => item.notify).length,
      overdue: candidates.filter((item) => item.level === 'overdue').length,
      due_today: candidates.filter((item) => item.level === 'due_today').length,
      needs_details: candidates.filter((item) => item.level === 'needs_details').length
    },
    candidates
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  const report = buildReport(registry, todayInIstanbul(args.asOf));
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (args.out) {
    const output = path.resolve(ROOT, args.out);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, serialized, 'utf8');
    console.log(`RESULT: OK - reminder candidates written to ${path.relative(ROOT, output)}`);
  } else {
    console.log(serialized);
  }
}

if (require.main === module) main();

module.exports = { buildCandidates, buildReport, todayInIstanbul, dueDateFor, classify, addDays };
