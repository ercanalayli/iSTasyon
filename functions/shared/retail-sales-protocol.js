// AperiON P0 — BizimHesap retail-sale request handoff.
// THIS MODULE CANNOT POST A SALE OR BOOK A CASH RECEIPT.
// A dedicated, separately reviewed native retail/cash write adapter is mandatory.
// Approval records are local intent/evidence, never financial transaction receipts.

export const RETAIL_TEST_V1 = Object.freeze({
  operationKey: "APERION-P0-20261011-RETAIL-6TRY-ERCAN-NAKIT",
  kind: "normal_retail_sale",
  company: "ALAYLI MEDIKAL",
  amountMinor: 600,
  currency: "TRY",
  taxMinor: 100,
  taxableMinor: 500,
  vatPercent: 20,
  item: Object.freeze({
    description: "APERION API TEST 20261010 2152 URUN",
    sourceProductGuid: "D96E3752EEBE4DAB90C64159ED45E24D",
    quantity: 1
  }),
  cash: Object.freeze({
    label: "Ercan Nakit Kasa",
    sourceName: "**ercan nakit",
    code: "NAKIT",
    sourceGuid: "389916FD16984267B4F61251BC182525"
  }),
  eInvoice: false,
  documentNumberRequired: false,
  cashReceiptBooked: false
});

export function retailCommand(text) {
  const t = String(text || "").trim().toLocaleLowerCase("tr-TR");
  if (/^\/(?:satistest|satıştest)(?:@[\w_]+)?(?:\s+6(?:[,.]00)?\s*(?:tl|try)?)?$/.test(t))
    return "stage_test";
  if (/^\/(?:satisdurum|satışdurum)(?:@[\w_]+)?$/.test(t))
    return "status";
  return null;
}

function textStatus(status = "adapter_missing", recordId = null) {
  const state = status === "adapter_missing"
    ? "TEKNİK BEKLİYOR — perakende satış + nakit tahsilat yazma adaptörü doğrulanmadı."
    : "Kayıt aşaması: " + status;
  return [
    "🧪 AperiON · BizimHesap Perakende Satış",
    "Tutar: 6,00 TL (5,00 TL + %20 KDV)",
    "Ürün: " + RETAIL_TEST_V1.item.description,
    "Kasa: Ercan Nakit Kasa (" + RETAIL_TEST_V1.cash.code + ")",
    "e-Fatura: Hayır",
    "Durum: " + state,
    "BizimHesap gerçek satış kaydı: YOK / doğrulanmadı.",
    "Kasa tahsilatı: YOK / doğrulanmadı.",
    recordId ? "Yerel hazırlık ID: " + recordId : "Yerel hazırlık: yapılmadı.",
    "Bu hazırlık finansal işlem değildir; Satışlar/Kasa ekranından geri doğrulama zorunludur."
  ].join("\n");
}

export function validateRetailExecutionEvidence(evidence = {}) {
  // Never call "completed" based only on queued, HTTP 200, or a generated GUID.
  const correctCash = String(evidence.cashGuid || "").toUpperCase() === RETAIL_TEST_V1.cash.sourceGuid;
  const correctSale = Number(evidence.amountMinor) === RETAIL_TEST_V1.amountMinor &&
    evidence.customerType === "retail" && evidence.recordVerified === true &&
    Boolean(String(evidence.saleGuid || "").trim());
  const correctReceipt = evidence.cashReceiptVerified === true && correctCash &&
    Number(evidence.cashReceiptMinor) === RETAIL_TEST_V1.amountMinor &&
    Boolean(String(evidence.cashEntryGuid || "").trim());
  return {
    complete: correctSale && correctReceipt,
    saleVerified: correctSale,
    cashReceiptVerified: correctReceipt,
    error: correctSale && correctReceipt ? null : "sale_and_cash_readback_required"
  };
}

async function stageOnly(env, message) {
  if (!env?.APERION_DB) return { ok: false, reason: "d1_unavailable" };
  const idempotency = "aperion:retail:6try:ercan-nakit:p0:20261011";
  try {
    const existing = await env.APERION_DB.prepare(
      "SELECT id,status FROM approval_queue WHERE idempotency_key=?"
    ).bind(idempotency).first();
    if (existing) return { ok: true, id: existing.id, duplicate: true, status: existing.status };
    const id = crypto.randomUUID();
    const payload = {
      ...RETAIL_TEST_V1,
      origin: "telegram",
      chatId: String(message.chat.id),
      messageId: String(message.message_id),
      state: "blocked_native_retail_cash_adapter",
      ownerApprovedTest: true,
      erpWriteCount: 0,
      evidenceStatus: "UNVERIFIED"
    };
    await env.APERION_DB.prepare(
      "INSERT INTO approval_queue (id,item_type,status,payload_json,evidence_ref,idempotency_key) VALUES (?,'retail_sale_test','blocked_adapter',?,?,?)"
    ).bind(id, JSON.stringify(payload), "telegram:" + message.chat.id + ":" + message.message_id, idempotency).run();
    return { ok: true, id, duplicate: false, status: "blocked_adapter" };
  } catch (error) {
    const existing = await env.APERION_DB.prepare(
      "SELECT id,status FROM approval_queue WHERE idempotency_key=?"
    ).bind(idempotency).first().catch(() => null);
    if (existing) return { ok: true, id: existing.id, duplicate: true, status: existing.status };
    return { ok: false, reason: "proposal_store_failed" };
  }
}

export async function handleRetailTelegramCommand({ env, message, identity, sendMessage }) {
  const action = retailCommand(message?.text);
  if (!action) return { handled: false };
  const chatId = message?.chat?.id;
  if (!chatId || !identity?.hardened) {
    if (chatId) await sendMessage(env, chatId, "🔒 Güvenli Telegram kimlik doğrulaması gerekli. Satış veya kasa kaydı yapılmadı.");
    return { handled: true, status: "identity_blocked", financialWrites: 0 };
  }
  if (action === "status") {
    let saved = null;
    if (env?.APERION_DB) {
      saved = await env.APERION_DB.prepare(
        "SELECT id,status FROM approval_queue WHERE idempotency_key=?"
      ).bind("aperion:retail:6try:ercan-nakit:p0:20261011").first().catch(() => null);
    }
    await sendMessage(env, chatId, textStatus(saved?.status || "adapter_missing", saved?.id));
    return { handled: true, status: saved?.status || "adapter_missing", financialWrites: 0 };
  }
  const r = await stageOnly(env, message);
  const status = r.ok ? r.status : "draft_storage_failed";
  await sendMessage(env, chatId, textStatus(status, r.id || null));
  return { handled: true, status, recordId: r.id || null, duplicate: !!r.duplicate, financialWrites: 0 };
}
