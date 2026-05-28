/**
 * AperiON Bank Mail Reader v57
 * Mailden gelen banka ekstreleri için güvenli hazırlık servisi.
 * Bu sürüm gerçek Gmail bağlantısını zorunlu tutmaz; dry-run / mimari hazırlık yapar.
 * Kural: Onaysız hiçbir hareket kesin finans kaydına veya BizimHesap kaydına dönüşmez.
 */

const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1];
    const value = match[2].replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function buildReaderConfig() {
  loadEnv();

  const company = process.env.COMPANY || process.env.APERION_COMPANY || "alayli";
  const query = process.env.BANK_MAIL_QUERY || "subject:(ekstre OR hesap hareketleri OR banka OR pos OR moka)";
  const dryRun = process.env.BANK_MAIL_DRY_RUN !== "false";

  return {
    company,
    provider: "gmail",
    query,
    dryRun,
    mode: dryRun ? "dry-run" : "live-ready",
    safety: {
      createsFinalFinanceRecord: false,
      sendsToBizimHesap: false,
      requiresApproval: true
    }
  };
}

async function main() {
  const config = buildReaderConfig();

  console.log("AperiON Bank Mail Reader v57");
  console.log("--------------------------------");
  console.log("Company:", config.company);
  console.log("Provider:", config.provider);
  console.log("Query:", config.query);
  console.log("Mode:", config.mode);
  console.log("Onaysız kesin kayıt: YOK");
  console.log("BizimHesap otomatik kayıt: YOK");

  if (config.dryRun) {
    console.log("");
    console.log("RESULT: OK - dry-run. Gerçek Gmail bağlantısı bu aşamada çalıştırılmadı.");
    return;
  }

  console.log("");
  console.log("RESULT: CONTROL_WAITING - Gmail canlı bağlantısı için OAuth / izin akışı ayrıca kurulacak.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("RESULT: FAILED");
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  loadEnv,
  buildReaderConfig
};