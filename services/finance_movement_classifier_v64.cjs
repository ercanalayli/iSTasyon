// AperiON v64 - Finance Movement Classifier
// Purpose: suggest movement type, cari/counterparty, expense/income center and confidence before approval.
// No ledger write. No live mutation. Suggestion only.

const BANK_ACCOUNT_CODE = 'YAPI_KREDI_SIRKET';
const COMPANY_CODE = 'ALAYLI_MEDIKAL';

function normalizeText(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
    .trim();
}

function directionFromAmount(amount) {
  return Number(amount) >= 0 ? 'giris' : 'cikis';
}

function baseSuggestion(row) {
  return {
    company_code: COMPANY_CODE,
    bank_account_code: BANK_ACCOUNT_CODE,
    movement_direction: directionFromAmount(row.amount),
    movement_type: 'diger',
    counterparty_name: null,
    counterparty_cari_id: null,
    counterparty_cari_status: 'not_matched',
    center_type: 'bekleyen_eslesme',
    center_name: 'Diğer / İnceleme Gerekli',
    gider_yeri_id: null,
    gider_yeri_adi: null,
    gelir_yeri_id: null,
    gelir_yeri_adi: null,
    confidence_score: 50,
    approval_status: 'needs_review',
    suggestion_reason: 'Kural eşleşmesi zayıf. Manuel kontrol gerekli.'
  };
}

function extractCounterparty(text) {
  const raw = String(text || '').trim();
  const parts = raw.split('-').map(x => x.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[1];
  return raw || null;
}

function classifyFinanceMovement(row, knownCariMap = {}) {
  const desc = normalizeText(row.description || row.desc || '');
  const suggestion = baseSuggestion(row);

  function setCari(name) {
    suggestion.counterparty_name = name;
    const key = normalizeText(name);
    if (knownCariMap[key]) {
      suggestion.counterparty_cari_id = knownCariMap[key];
      suggestion.counterparty_cari_status = 'matched';
    } else {
      suggestion.counterparty_cari_status = 'not_matched';
    }
  }

  if (/bsmv|eft ucreti|fast ucreti|uye isyeri ucreti/.test(desc)) {
    suggestion.movement_type = 'banka_masrafi';
    suggestion.center_type = 'gider_merkezi';
    suggestion.center_name = 'Banka Masrafları';
    suggestion.gider_yeri_adi = 'Banka Masrafları';
    setCari('Yapı Kredi Bankası');
    suggestion.confidence_score = 95;
    suggestion.approval_status = 'pending';
    suggestion.suggestion_reason = 'Açıklamada banka masrafı anahtar kelimesi bulundu.';
    return suggestion;
  }

  if (/hgs|ogs|otoyol|kopru/.test(desc)) {
    suggestion.movement_type = 'gider';
    suggestion.center_type = 'gider_merkezi';
    suggestion.center_name = 'Araç / HGS / OGS Giderleri';
    suggestion.gider_yeri_adi = 'Araç / HGS / OGS Giderleri';
    setCari('Yapı Kredi HGS Talimatı');
    suggestion.confidence_score = 90;
    suggestion.approval_status = 'pending';
    suggestion.suggestion_reason = 'Açıklamada HGS/OGS/otoyol ifadesi bulundu.';
    return suggestion;
  }

  if (/sgk|gib|vergi|tahakkuk|muhsgk/.test(desc)) {
    suggestion.movement_type = 'vergi_sgk';
    suggestion.center_type = 'gider_merkezi';
    suggestion.center_name = 'Vergi / SGK Ödemeleri';
    suggestion.gider_yeri_adi = 'Vergi / SGK Ödemeleri';
    setCari(desc.includes('sgk') ? 'SGK' : 'Gelir İdaresi Başkanlığı');
    suggestion.confidence_score = 95;
    suggestion.approval_status = 'pending';
    suggestion.suggestion_reason = 'Açıklamada SGK/vergi anahtar kelimesi bulundu.';
    return suggestion;
  }

  if (/moka|united|pos aktarim/.test(desc)) {
    suggestion.movement_type = 'moka_tahsilat_aktarimi';
    suggestion.center_type = 'virman_hesabi';
    suggestion.center_name = 'Moka United';
    suggestion.gelir_yeri_adi = 'Moka United';
    setCari('Moka United');
    suggestion.confidence_score = 85;
    suggestion.approval_status = 'needs_review';
    suggestion.suggestion_reason = 'Moka/POS aktarımı olabilir. Moka hesabıyla eşleşmeden kesinleşmemeli.';
    return suggestion;
  }

  if (/pos|pesinsatis|uye isyeri/.test(desc)) {
    suggestion.movement_type = Number(row.amount) >= 0 ? 'pos' : 'pos_komisyon_gideri';
    suggestion.center_type = Number(row.amount) >= 0 ? 'gelir_merkezi' : 'gider_merkezi';
    suggestion.center_name = Number(row.amount) >= 0 ? 'POS Tahsilatları' : 'POS Komisyon Giderleri';
    suggestion.gelir_yeri_adi = Number(row.amount) >= 0 ? 'POS Tahsilatları' : null;
    suggestion.gider_yeri_adi = Number(row.amount) < 0 ? 'POS Komisyon Giderleri' : null;
    setCari('Yapı Kredi POS');
    suggestion.confidence_score = 85;
    suggestion.approval_status = 'pending';
    suggestion.suggestion_reason = 'Açıklamada POS/peşin satış/üye işyeri ifadesi bulundu.';
    return suggestion;
  }

  if (/gelen eft|gelen fast/.test(desc)) {
    const cp = extractCounterparty(row.description || row.desc);
    suggestion.movement_type = 'tahsilat';
    suggestion.center_type = 'gelir_merkezi';
    suggestion.center_name = 'Cari Tahsilatları';
    suggestion.gelir_yeri_adi = 'Cari Tahsilatları';
    setCari(cp || 'Bilinmeyen Cari');
    suggestion.confidence_score = suggestion.counterparty_cari_status === 'matched' ? 90 : 65;
    suggestion.approval_status = suggestion.counterparty_cari_status === 'matched' ? 'pending' : 'needs_review';
    suggestion.suggestion_reason = 'Gelen EFT/FAST tahsilat olarak algılandı. Cari eşleşmesi kontrol edildi.';
    return suggestion;
  }

  if (/giden eft|giden fast|virman/.test(desc)) {
    const cp = extractCounterparty(row.description || row.desc);
    const isVirman = /virman|alayli medikal|akbank|vakifbank|is bankasi|yapi kredi/.test(desc);
    suggestion.movement_type = isVirman ? 'virman' : 'odeme';
    suggestion.center_type = isVirman ? 'virman_hesabi' : 'gider_merkezi';
    suggestion.center_name = isVirman ? 'Virman / Bankalar Arası Aktarım' : 'Tedarikçi Ödemeleri';
    suggestion.gider_yeri_adi = isVirman ? 'Virman / Bankalar Arası Aktarım' : 'Tedarikçi Ödemeleri';
    setCari(cp || 'Bilinmeyen Cari');
    suggestion.confidence_score = isVirman ? 75 : (suggestion.counterparty_cari_status === 'matched' ? 90 : 65);
    suggestion.approval_status = isVirman || suggestion.counterparty_cari_status !== 'matched' ? 'needs_review' : 'pending';
    suggestion.suggestion_reason = isVirman ? 'Kendi hesapları arasında virman olabilir.' : 'Giden EFT/FAST ödeme olarak algılandı.';
    return suggestion;
  }

  return suggestion;
}

module.exports = {
  BANK_ACCOUNT_CODE,
  COMPANY_CODE,
  normalizeText,
  classifyFinanceMovement
};
