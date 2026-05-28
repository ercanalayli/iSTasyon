/**
 * AperiON Bank Statement Parser v57
 * PDF / Excel / CSV banka ekstresi okuma hazırlığı.
 * Kural: Okunamayan veya eksik verili dosyada tahmin yapılmaz; control_waiting üretilir.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function normalizeMoney(value) {
  if (value === null || value === undefined || value === "") return null;

  const raw = String(value)
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function buildTransactionHash(item) {
  const parts = [
    item.company || "alayli",
    item.bank_name || "",
    item.transaction_date || "",
    item.value_date || "",
    item.amount || "",
    item.direction || "",
    item.description || ""
  ];

  return crypto.createHash("sha256").update(parts.join("|")).digest("hex");
}

function normalizeTransaction(raw = {}) {
  const debit = normalizeMoney(raw.debit_amount);
  const credit = normalizeMoney(raw.credit_amount);
  const directAmount = normalizeMoney(raw.amount);
  const amount = directAmount ?? credit ?? debit ?? null;

  let direction = raw.direction || "unknown";

  if (direction === "unknown") {
    if (credit && credit > 0) direction = "in";
    if (debit && debit > 0) direction = "out";
  }

  const tx = {
    company: raw.company || "alayli",
    bank_name: raw.bank_name || null,
    transaction_date: raw.transaction_date || null,
    value_date: raw.value_date || raw.transaction_date || null,
    description: raw.description || raw.raw_text || null,
    debit_amount: debit || 0,
    credit_amount: credit || 0,
    amount: amount || 0,
    currency: raw.currency || "TRY",
    direction,
    raw_text: raw.raw_text || JSON.stringify(raw),
    source_type: raw.source_type || "manual_or_mail_statement",
    source_file_name: raw.source_file_name || null,
    status: "raw_data"
  };

  tx.transaction_hash = buildTransactionHash(tx);

  if (!tx.transaction_date || !tx.amount || tx.direction === "unknown") {
    tx.status = "control_waiting";
    tx.parse_note = "Eksik veri: tarih, tutar veya hareket yönü belirsiz.";
  }

  return tx;
}

async function main() {
  const input = process.argv[2];

  console.log("AperiON Bank Statement Parser v57");
  console.log("--------------------------------");

  if (!input) {
    console.log("RESULT: OK - parser hazır. Dosya verilmediği için dry-run çalıştı.");
    console.log("Kural: PDF/Excel/CSV okunamazsa tahmin yapılmayacak.");
    return;
  }

  const fullPath = path.resolve(input);

  if (!fs.existsSync(fullPath)) {
    console.log("RESULT: CONTROL_WAITING - dosya bulunamadı:", fullPath);
    process.exitCode = 1;
    return;
  }

  const ext = path.extname(fullPath).toLowerCase();

  if (![".csv", ".xlsx", ".xls", ".pdf", ".json"].includes(ext)) {
    console.log("RESULT: CONTROL_WAITING - desteklenmeyen dosya türü:", ext);
    process.exitCode = 1;
    return;
  }

  console.log("Dosya bulundu:", fullPath);
  console.log("Dosya türü:", ext);
  console.log("RESULT: OK - parser hazırlığı tamam. Gerçek satır okuma sonraki adımda bağlanacak.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("RESULT: FAILED");
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  normalizeMoney,
  normalizeTransaction,
  buildTransactionHash
};