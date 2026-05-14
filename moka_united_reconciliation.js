/*
AperiON / ErpaltH iSTasyon
Moka United Mutabakat Motoru

Amaç:
- POS tahsilatı Moka United hesabına girer.
- Beklenen banka geçiş tarihi takip edilir.
- Banka hareketinde Moka/United transferi görülürse bekleyen Moka hareketleriyle eşleştirme önerilir.
- Eşleşme kesin kayıt yapmaz; Onay Merkezi'ne öneri üretir.
*/

function mokaNorm(v) {
  return String(v || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/\s+/g, ' ').trim();
}

function mokaNum(v) {
  if (typeof v === 'number') return v;
  const n = Number(String(v || '0').replace(/TL/gi, '').replace(/₺/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function mokaDate(v) {
  if (!v) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const raw = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const da = new Date(`${a}T12:00:00`);
  const db = new Date(`${b}T12:00:00`);
  return Math.abs(Math.round((da - db) / 86400000));
}

function isMokaBankTransfer(bankRow) {
  const text = mokaNorm([bankRow.description, bankRow.sender, bankRow.account_name, bankRow.note].join(' '));
  return text.includes('moka') || text.includes('united') || text.includes('pos aktarim') || text.includes('kart tahsilat');
}

function scoreMokaMatch(mokaMovement, bankRow) {
  const bankAmount = mokaNum(bankRow.amount || bankRow.incoming_amount || bankRow.alacak || bankRow.credit);
  const expected = mokaNum(mokaMovement.gross_amount) - mokaNum(mokaMovement.commission_amount || 0);
  const amountDiff = Math.abs(expected - bankAmount);
  const bankDate = mokaDate(bankRow.date || bankRow.transaction_date);
  const expectedDate = mokaDate(mokaMovement.expected_bank_transfer_date || mokaMovement.pos_collection_date);
  let score = 40;
  const reasons = [];
  if (isMokaBankTransfer(bankRow)) { score += 25; reasons.push('banka açıklamasında Moka/United izi var'); }
  if (amountDiff <= 1) { score += 25; reasons.push('tutar birebir uyumlu'); }
  else if (expected > 0 && amountDiff / expected <= 0.02) { score += 15; reasons.push('tutar %2 içinde uyumlu'); }
  if (bankDate && expectedDate) {
    const gap = daysBetween(bankDate, expectedDate);
    if (gap <= 2) { score += 10; reasons.push('beklenen geçiş tarihine yakın'); }
    else if (gap <= 7) { score += 5; reasons.push('tarih haftalık aralıkta'); }
  }
  return { score: Math.min(score, 100), reasons, amountDiff };
}

function proposeMokaMatches(mokaMovements, bankRows) {
  const proposals = [];
  const candidates = bankRows.filter(isMokaBankTransfer);
  mokaMovements
    .filter(m => mokaNum(m.gross_amount) - mokaNum(m.banked_amount || 0) > 0)
    .forEach(movement => {
      candidates.forEach(bank => {
        const match = scoreMokaMatch(movement, bank);
        if (match.score >= 70) {
          proposals.push({
            company: movement.company,
            moka_movement_id: movement.id || movement.temp_id,
            bank_source_ref: bank.id || bank.source_ref || null,
            customer_name: movement.customer_name,
            proposed_bank_date: mokaDate(bank.date || bank.transaction_date),
            proposed_banked_amount: mokaNum(bank.amount || bank.incoming_amount || bank.alacak || bank.credit),
            confidence_score: match.score,
            match_reason: match.reasons.join(', '),
            approval_status: 'onay_bekliyor'
          });
        }
      });
    });
  return proposals.sort((a, b) => b.confidence_score - a.confidence_score);
}

function buildMokaFinanceRecord(proposal) {
  return {
    company: proposal.company,
    record_type: 'tahsilat',
    cari_name: proposal.customer_name || 'Moka United',
    description: 'Moka United banka geçişi eşleşme önerisi',
    original_due_date: proposal.proposed_bank_date,
    actual_payment_date: proposal.proposed_bank_date,
    expected_amount: proposal.proposed_banked_amount,
    realized_amount: proposal.proposed_banked_amount,
    source: 'moka_united_reconciliation',
    source_ref: proposal.bank_source_ref,
    approval_status: 'onay_bekliyor',
    confidence_score: proposal.confidence_score,
    match_reason: proposal.match_reason,
    notes: `Moka hareketi: ${proposal.moka_movement_id}`
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    isMokaBankTransfer,
    scoreMokaMatch,
    proposeMokaMatches,
    buildMokaFinanceRecord
  };
}
