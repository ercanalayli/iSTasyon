/*
AperiON / ErpaltH iSTasyon
Türkiye İş Günü Takvimi

Amaç:
- Çek/senet, kredi kartı, vergi/SGK ve ödeme vadelerinde hafta sonu + resmi tatil kontrolü.
- Asıl vade tarihi korunur.
- Fiili ödeme tarihi ilk iş gününe atılır.

Not:
Dini bayramlar her yıl değiştiği için yıl bazlı manuel/merkezi liste tutulur.
Eksik yıl varsa sistem uyarı üretir, tahmin yürütmez.
2027 dini bayram tarihleri takvime işlendi; resmi duyuru farklılaşırsa merkezi liste güncellenecek.
*/

const TURKIYE_HOLIDAYS = {
  2026: [
    ['2026-01-01', 'Yılbaşı'],
    ['2026-03-20', 'Ramazan Bayramı 1. Gün'],
    ['2026-03-21', 'Ramazan Bayramı 2. Gün'],
    ['2026-03-22', 'Ramazan Bayramı 3. Gün'],
    ['2026-04-23', 'Ulusal Egemenlik ve Çocuk Bayramı'],
    ['2026-05-01', 'Emek ve Dayanışma Günü'],
    ['2026-05-19', 'Atatürk’ü Anma Gençlik ve Spor Bayramı'],
    ['2026-05-27', 'Kurban Bayramı 1. Gün'],
    ['2026-05-28', 'Kurban Bayramı 2. Gün'],
    ['2026-05-29', 'Kurban Bayramı 3. Gün'],
    ['2026-05-30', 'Kurban Bayramı 4. Gün'],
    ['2026-07-15', 'Demokrasi ve Milli Birlik Günü'],
    ['2026-08-30', 'Zafer Bayramı'],
    ['2026-10-29', 'Cumhuriyet Bayramı']
  ],
  2027: [
    ['2027-01-01', 'Yılbaşı'],
    ['2027-03-09', 'Ramazan Bayramı 1. Gün'],
    ['2027-03-10', 'Ramazan Bayramı 2. Gün'],
    ['2027-03-11', 'Ramazan Bayramı 3. Gün'],
    ['2027-04-23', 'Ulusal Egemenlik ve Çocuk Bayramı'],
    ['2027-05-01', 'Emek ve Dayanışma Günü'],
    ['2027-05-16', 'Kurban Bayramı 1. Gün'],
    ['2027-05-17', 'Kurban Bayramı 2. Gün'],
    ['2027-05-18', 'Kurban Bayramı 3. Gün'],
    ['2027-05-19', 'Kurban Bayramı 4. Gün / Atatürk’ü Anma Gençlik ve Spor Bayramı'],
    ['2027-07-15', 'Demokrasi ve Milli Birlik Günü'],
    ['2027-08-30', 'Zafer Bayramı'],
    ['2027-10-29', 'Cumhuriyet Bayramı']
  ]
};

function isoDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function holidaySet(year) {
  return new Set((TURKIYE_HOLIDAYS[year] || []).map(item => item[0]));
}

function hasHolidayYear(year) {
  return Array.isArray(TURKIYE_HOLIDAYS[year]) && TURKIYE_HOLIDAYS[year].length > 0;
}

function isWeekendDate(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return d.getDay() === 0 || d.getDay() === 6;
}

function addOneDay(iso) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function isOfficialHoliday(iso) {
  const year = Number(iso.slice(0, 4));
  return holidaySet(year).has(iso);
}

function isBusinessDay(iso) {
  return !isWeekendDate(iso) && !isOfficialHoliday(iso);
}

function actualPaymentDate(originalDueDate) {
  let iso = isoDate(originalDueDate);
  if (!iso) throw new Error('Geçersiz vade tarihi');
  const year = Number(iso.slice(0, 4));
  const warnings = [];
  if (!hasHolidayYear(year)) warnings.push(`${year} resmi tatil listesi tanımlı değil; sadece hafta sonu kontrol edildi.`);
  let shifted = false;
  while (!isBusinessDay(iso)) {
    shifted = true;
    iso = addOneDay(iso);
  }
  return {
    original_due_date: isoDate(originalDueDate),
    actual_payment_date: iso,
    shifted,
    warnings
  };
}

function explainBusinessDate(originalDueDate) {
  const result = actualPaymentDate(originalDueDate);
  if (!result.shifted) return `Asıl vade ${result.original_due_date}; ödeme aynı gün yapılabilir.`;
  return `Asıl vade ${result.original_due_date}; hafta sonu/resmi tatil nedeniyle fiili ödeme ${result.actual_payment_date}.`;
}

if (typeof module !== 'undefined') {
  module.exports = {
    TURKIYE_HOLIDAYS,
    isOfficialHoliday,
    isBusinessDay,
    actualPaymentDate,
    explainBusinessDate
  };
}
