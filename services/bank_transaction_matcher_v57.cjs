/**
 * AperiON Bank Transaction Matcher v57
 * Ham banka hareketinden işlem tipi / cari / hesap önerisi üretir.
 * Kural: Öneri üretir; kesin kayıt oluşturmaz; BizimHesap'a göndermez.
 */

function inferSuggestedType(description = "", direction = "unknown") {
  const text = String(description || "").toLocaleLowerCase("tr-TR");

  if (text.includes("moka") || text.includes("pos")) {
    return direction === "in" ? "moka_banka_gecisi" : "kontrol_bekliyor";
  }

  if (text.includes("sgk")) return "sgk";
  if (text.includes("vergi") || text.includes("gib")) return "vergi";
  if (text.includes("kredi") && direction === "out") return "kredi_taksidi";
  if (text.includes("kart") && direction === "out") return "kredi_karti_odeme";

  if (direction === "in") return "tahsilat";
  if (direction === "out") return "odeme";

  return "kontrol_bekliyor";
}

function buildSuggestion(raw = {}) {
  const suggestedType = inferSuggestedType(raw.description, raw.direction);

  let confidence = 55;
  let riskNote = "Kontrol önerilir.";

  if (suggestedType === "moka_banka_gecisi") {
    confidence = 75;
    riskNote = "Moka/POS banka geçişi olabilir; taksit planı ile eşleşmeli.";
  }

  if (["sgk", "vergi", "kredi_karti_odeme", "kredi_taksidi"].includes(suggestedType)) {
    confidence = 70;
    riskNote = "Özel işlem; otomatik kesin kayıt yapılmaz.";
  }

  if (suggestedType === "kontrol_bekliyor") {
    confidence = 30;
    riskNote = "İşlem yönü veya açıklama belirsiz.";
  }

  return {
    company: raw.company || "alayli",
    raw_transaction_id: raw.id || null,
    suggested_type: suggestedType,
    suggested_customer_name: raw.customer_name || null,
    suggested_account_id: raw.account_id || null,
    suggested_counter_account: null,
    confidence_score: confidence,
    match_reason: "Açıklama ve hareket yönüne göre ilk öneri.",
    risk_note: riskNote,
    approval_status: confidence >= 70 ? "approval_waiting" : "control_waiting",
    createsFinalFinanceRecord: false,
    sendsToBizimHesap: false
  };
}

async function main() {
  const demo = {
    company: "alayli",
    description: process.argv.slice(2).join(" ") || "Moka POS taksit ödemesi",
    direction: "in",
    amount: 1000
  };

  const suggestion = buildSuggestion(demo);

  console.log("AperiON Bank Transaction Matcher v57");
  console.log("------------------------------------");
  console.log(JSON.stringify(suggestion, null, 2));
  console.log("");
  console.log("RESULT: OK - öneri üretildi. Kesin kayıt oluşturulmadı.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("RESULT: FAILED");
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  inferSuggestedType,
  buildSuggestion
};