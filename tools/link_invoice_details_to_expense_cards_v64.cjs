const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const detailPath = process.argv[2] || path.join(ROOT, 'data', 'bizimhesap_fatura_detaylari_raw.json');
const cardsPath = process.argv[3] || path.join(ROOT, 'data', 'gider_kartlari_alayli_2026.json');
const outPath = process.argv[4] || path.join(ROOT, 'data', 'aperion_gider_kart_fatura_eslesmeleri.json');

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return fallback;
  }
}

function norm(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Ä±/g, 'i').replace(/ÅŸ/g, 's').replace(/Ã§/g, 'c').replace(/ÄŸ/g, 'g').replace(/Ã¼/g, 'u').replace(/Ã¶/g, 'o')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function invoiceText(detail) {
  return norm([
    detail.fatura_tipi,
    detail.fatura_no,
    detail.cari_unvan,
    detail.aciklama,
    detail.raw_text,
    ...(detail.kalemler || []).map(item => item.mal_hizmet),
  ].filter(Boolean).join(' '));
}

function fingerprint(detail) {
  const raw = [
    detail.task_id,
    detail.fatura_no,
    detail.fatura_tarihi,
    Math.round(money(detail.genel_toplam) * 100),
    norm(detail.cari_unvan),
  ].join('|');
  return crypto.createHash('sha1').update(raw).digest('hex');
}

function classify(detail) {
  const text = invoiceText(detail);
  const out = {
    decision: 'needs_review',
    owner_type: 'business',
    main_category: 'Diger / Kontrol',
    sub_category: 'Kontrol Gerekli',
    expense_class: 'variable',
    card_name: 'Diger - Kontrol',
    confidence: 40,
    reason: 'Fatura detayi kesin gider kartina baglanamadi',
  };

  if (/okul|egitim|kolej|universite|hayir|kurban|zekat|bagis/.test(text)) {
    return { ...out, owner_type: 'personal_family', main_category: 'Kisisel / Aile', sub_category: 'Onay', card_name: 'Kisisel / Aile Kontrol', reason: 'Otomatik isletme gideri degil', confidence: 90 };
  }
  if (/iade|refund|satistan iade|satis iadesi/.test(text)) {
    return { ...out, decision: 'return_record', main_category: 'Iade / Ters Kayit', sub_category: 'Satis Iadesi', expense_class: 'return', card_name: 'Satis Iadesi / Ters Kayit', reason: 'Normal gider degil, ters kayit kontrolu gerekir', confidence: 95 };
  }
  if (/urun alis|stok|mal alis|tedarikciden alis|hasta bezi|sonova|phonak|isitme cihazi|barkod|sarf/.test(text)) {
    return { ...out, decision: 'stock_purchase', main_category: 'Urun Alis / Stok', sub_category: 'Tedarikci Faturasi', expense_class: 'stock_purchase', card_name: 'Urun Alis / Stok Kontrol', reason: 'Gider degil, stok/cari kontrolune gitmeli', confidence: 92 };
  }
  if (/elektrik|enerjisa|limak|beda[sş]|ck bogazici|aydem/.test(text)) return mapped('Fatura / Abonelik', 'Elektrik', 'periodic', 'Elektrik - ALAYLI', 96);
  if (/\bsu\b|iski|aski|su faturasi/.test(text)) return mapped('Fatura / Abonelik', 'Su', 'periodic', 'Su - ALAYLI', 94);
  if (/telefon|internet|iletisim|telekom|turkcell|vodafone|ttnet|superonline/.test(text)) return mapped('Fatura / Abonelik', 'Iletisim', 'periodic', 'Iletisim - Sirket Hatlari', 95);
  if (/isinma|dogalgaz|gazdas|igdas|komb/i.test(text)) return mapped('Fatura / Abonelik', 'Isinma', 'periodic', 'Isinma - ALAYLI', 92);
  if (/kargo|nakliye|tasima|aras|yurtici|mng|surat kargo|ptt kargo/.test(text)) return mapped('Kargo / Nakliye', 'Kargo', 'variable', 'Kargo / Nakliye', 94);
  if (/personel yemek|yemek|tost|lokanta|restoran|yemek kart/.test(text)) return mapped('Personel', 'Personel Yemek', 'variable', 'Personel Yemek', 90);
  if (/maas|maa[sş]|prim|yol parasi|yol ucreti|personel/.test(text)) return mapped('Personel', 'Maas / Prim / Yol', 'fixed', 'Personel Giderleri', 91);
  if (/sgk|ssk|vergi|stopaj|kdv|damga vergisi|muhtasar/.test(text)) return mapped('Vergi / SGK', 'Resmi Odeme', 'periodic', 'Vergi / SGK', 96);
  if (/market|mutfak|temizlik|deterjan|sabun|kahve|cay|ikram/.test(text)) {
    return { ...mapped('Market / Mutfak', 'Mutfak / Temizlik', 'variable', 'Market - Mutfak / Temizlik', 80), decision: 'needs_review', reason: 'Market faturasi mutfak/temizlik/kisisel ayrimi icin onay ister' };
  }
  if (/kira|aidat/.test(text)) return mapped('Kira / Sozlesmeli', 'Kira / Aidat', 'contractual', 'Kira / Aidat', 92);
  if (/banka|komisyon|masraf|bsmv|eft|havale|fast ucret/.test(text)) return mapped('Mali Giderler', 'Banka Masrafi', 'variable', 'Banka Masrafi', 93);
  return out;
}

function mapped(main_category, sub_category, expense_class, card_name, confidence) {
  return {
    decision: 'mapped',
    owner_type: 'business',
    main_category,
    sub_category,
    expense_class,
    card_name,
    confidence,
    reason: 'Fatura detayi gider karti kuralina uydu',
  };
}

function loadCards(payload) {
  const cards = Array.isArray(payload) ? payload : payload.cards || [];
  return cards.map(card => ({
    ...card,
    card_name: card.card_name || card.gider_karti || card.name || '',
    main_category: card.main_category || card.ana_kategori || '',
    sub_category: card.sub_category || card.alt_kategori || '',
  })).filter(card => card.card_name);
}

function findCard(cards, decision) {
  const target = norm(decision.card_name);
  return cards.find(card => norm(card.card_name) === target)
    || cards.find(card => norm(card.main_category) === norm(decision.main_category) && norm(card.sub_category) === norm(decision.sub_category))
    || null;
}

const detailsPayload = readJson(detailPath, { details: [] });
const cardsPayload = readJson(cardsPath, { cards: [] });
const details = Array.isArray(detailsPayload) ? detailsPayload : detailsPayload.details || [];
const cards = loadCards(cardsPayload);
const seen = new Set();
const matches = [];
const proposedCards = new Map();
const approvalCenter = [];

for (const detail of details) {
  const id = fingerprint(detail);
  if (seen.has(id)) continue;
  seen.add(id);

  const decision = classify(detail);
  const existing = decision.decision === 'mapped' ? findCard(cards, decision) : null;
  const record = {
    match_id: id,
    task_id: detail.task_id || '',
    fatura_no: detail.fatura_no || '',
    fatura_tarihi: detail.fatura_tarihi || '',
    cari_unvan: detail.cari_unvan || '',
    genel_toplam: money(detail.genel_toplam),
    read_status: detail.read_status || '',
    decision: decision.decision,
    gider_karti: existing?.card_name || decision.card_name,
    existing_card: Boolean(existing),
    confidence: decision.confidence,
    reason: decision.reason,
    source: 'bizimhesap_invoice_detail',
  };

  if (detail.read_status !== 'ok' || decision.decision !== 'mapped' || !existing) {
    approvalCenter.push({
      ...record,
      approval_reason: detail.read_status !== 'ok'
        ? 'Fatura detayi okunamadi veya eksik'
        : (!existing ? 'Gider karti yok, kart onerisi gerekiyor' : decision.reason),
    });
  }

  if (!existing && ['mapped', 'needs_review'].includes(decision.decision)) {
    const key = decision.card_name;
    if (!proposedCards.has(key)) {
      proposedCards.set(key, {
        card_name: decision.card_name,
        owner_type: decision.owner_type,
        main_category: decision.main_category,
        sub_category: decision.sub_category,
        expense_class: decision.expense_class,
        status: decision.decision === 'mapped' ? 'proposed' : 'control_required',
        reason: decision.reason,
      });
    }
  }

  matches.push(record);
}

const output = {
  created_at: new Date().toISOString(),
  source: 'bizimhesap_invoice_detail',
  firma_id: detailsPayload.firma_id || 'alayli',
  inputs: {
    details: detailPath,
    cards: cardsPath,
  },
  summary: {
    invoice_details: details.length,
    unique_invoice_details: matches.length,
    matched_existing_cards: matches.filter(x => x.existing_card && x.decision === 'mapped').length,
    proposed_cards: proposedCards.size,
    approval_required: approvalCenter.length,
    skipped_duplicates: details.length - matches.length,
  },
  matches,
  proposed_cards: [...proposedCards.values()],
  approval_center: approvalCenter,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
console.log(JSON.stringify(output.summary, null, 2));
console.log(outPath);
