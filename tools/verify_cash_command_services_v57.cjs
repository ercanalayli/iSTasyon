const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = [
  "services/bank_mail_reader_v57.cjs",
  "services/bank_statement_parser_v57.cjs",
  "services/bank_transaction_matcher_v57.cjs"
];

const requiredTokens = {
  "services/bank_mail_reader_v57.cjs": [
    "BANK_MAIL_DRY_RUN",
    "BANK_MAIL_QUERY",
    "Onaysız kesin kayıt",
    "BizimHesap otomatik kayıt",
    "requiresApproval: true"
  ],
  "services/bank_statement_parser_v57.cjs": [
    "normalizeTransaction",
    "buildTransactionHash",
    "control_waiting",
    "Eksik veri"
  ],
  "services/bank_transaction_matcher_v57.cjs": [
    "inferSuggestedType",
    "buildSuggestion",
    "moka_banka_gecisi",
    "createsFinalFinanceRecord: false",
    "sendsToBizimHesap: false"
  ]
};

function fail(message) {
  console.error("❌ " + message);
  process.exitCode = 1;
}

function pass(message) {
  console.log("✅ " + message);
}

for (const file of files) {
  const fullPath = path.join(root, file);

  if (!fs.existsSync(fullPath)) {
    fail("Dosya yok: " + file);
    continue;
  }

  pass("Dosya bulundu: " + file);
  const content = fs.readFileSync(fullPath, "utf8");

  for (const token of requiredTokens[file]) {
    if (!content.includes(token)) {
      fail(file + " içinde eksik token: " + token);
    } else {
      pass(file + " token OK: " + token);
    }
  }
}

if (process.exitCode) {
  console.error("");
  console.error("❌ v57 servis verify başarısız.");
  process.exit(process.exitCode);
}

console.log("");
console.log("✅ v57 servis verify başarılı.");