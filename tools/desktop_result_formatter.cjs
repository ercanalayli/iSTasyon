'use strict';

function userSafeDesktopResult(command, outcome, params = {}) {
  const raw = String(outcome?.output || '').trim();
  if (outcome?.ok) return `✅ ${raw || 'İşlem tamamlandı.'}`;

  if (command === 'bizimhesap_diaper_proforma') {
    const ref = String(params.order_reference || '').trim();
    const prefix = ref ? `${ref}: ` : '';
    if (/GİRİŞ_GEREKLİ|oturumu kapalı/i.test(raw)) {
      return `⚠️ ${prefix}BizimHesap oturumu doğrulama bekliyor. Sipariş güvende; taslak henüz kaydedilmedi.`;
    }
    if (/Müşteri kesin eşleşmedi/i.test(raw)) {
      return `⚠️ ${prefix}müşteri seçimi tamamlanamadı. Sipariş güvende; taslak henüz kaydedilmedi.`;
    }
    if (/Fiyat listesi kesin eşleşmedi/i.test(raw)) {
      return `⚠️ ${prefix}fiyat doğrulaması tamamlanamadı. Sipariş güvende; taslak henüz kaydedilmedi.`;
    }
    return `⚠️ ${prefix}proforma taslağı hazırlanamadı. Sipariş güvende; teknik ayrıntı denetim kaydına alındı.`;
  }

  const withoutDiagnostics = raw
    .replace(/\s+(?:FORM|DIAGNOSTICS?):[\s\S]*$/i, '')
    .replace(/\s*\{[\s\S]*$/i, '')
    .trim();
  return `⚠️ ${withoutDiagnostics || 'İşlem tamamlanamadı; teknik ayrıntı denetim kaydına alındı.'}`;
}

module.exports = { userSafeDesktopResult };
