// /durum view only. Healthy customer/product mirrors NEVER prove finance is current.
const REQUIRED = ["bizimhesap_events", "bizimhesap_hesap_hareketleri",
  "sales_raw", "e_invoice_live", "payment_collection_live"];

function timeTR(value) {
  if (!value) return "bilinmiyor";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "bilinmiyor"
    : d.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }) + " (TR)";
}
function liveMirror(x) {
  return Boolean(x && x.source_kind === "API_MIRROR"
    && x.freshness === "FRESH" && x.connection_status === "OK" && x.last_success_at);
}
export function buildMobileStatusReport({ stockRow, eventRow, sources, freshnessOk }) {
  const lines = [
    "AperiON Durum — kaynak denetimi", "",
    "📚 TARİHSEL VERİLER",
    "• Stok geçmişi (stock_raw): " + (stockRow?.tarih || "okunamadı"),
    "• BizimHesap olay geçmişi: " + timeTR(eventRow?.created_at),
    "Bu kayıtlar canlı BizimHesap durumunu kanıtlamaz.",
    "", "📡 CANLI API AYNALARI (KISMİ)"
  ];
  if (!freshnessOk || !Array.isArray(sources)) {
    lines.push("⚠ Kaynak güncelliği doğrulanamadı.");
    lines.push("🔴 Finansal otomatik kapanış YASAK.");
  } else {
    for (const [name, label] of [["customers", "Cari"], ["products", "Ürün"]]) {
      const row = sources.find(x => x?.source === name);
      lines.push("• " + label + ": " + (liveMirror(row)
        ? "GÜNCEL API aktarımı " + timeTR(row.last_success_at)
        : "CANLI DOĞRULANAMADI"));
    }
    const inventories = sources.filter(x => x?.source?.startsWith("inventory:") && liveMirror(x));
    lines.push("• Envanter API: " + (inventories.length
      ? inventories.length + " depo için güncel aktarım (tam stok kapsamı belirsiz)"
      : "CANLI DOĞRULANAMADI"));
    const missing = REQUIRED.filter(name => {
      const row = sources.find(x => x?.source === name);
      return !(row && row.source_kind !== "HISTORICAL_IMPORT"
        && row.freshness === "FRESH" && row.connection_status === "OK" && row.last_success_at);
    });
    lines.push("", "💰 FİNANSAL VERİ GÜNCELLİĞİ");
    if (missing.length) {
      lines.push("🔴 KRİTİK: " + missing.length + "/" + REQUIRED.length
        + " finansal kaynak güncel olarak doğrulanmadı.");
      lines.push("Eksik: " + missing.join(", "));
      lines.push("Finansal otomatik kapanış YASAK.");
    } else {
      lines.push("🟡 Kaynak sağlığı uygun; her gerçek ERP kaydı bağımsız doğrulanmalı.");
    }
  }
  lines.push("", "Not: Bu komut Windows/Chrome motorunu veya BizimHesap'a kayıt yazıldığını doğrulamaz.");
  return lines.join("\n");
}
