require('dotenv').config();

function normalizeText(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ğüşöçıİ\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(' ')
    .filter(t => t.length >= 3)
    .filter(t => !['ltd', 'sti', 'şirketi', 'tic', 'san', 'anonim', 'limited', 'medikal'].includes(t));
}

function jaccardScore(a, b) {
  const aa = new Set(tokenize(a));
  const bb = new Set(tokenize(b));
  if (!aa.size || !bb.size) return 0;
  let hit = 0;
  aa.forEach(x => { if (bb.has(x)) hit++; });
  const total = new Set([...aa, ...bb]).size;
  return Math.round((hit / total) * 100);
}

function includesScore(description, name) {
  const d = normalizeText(description);
  const n = normalizeText(name);
  if (!d || !n) return 0;
  if (d.includes(n)) return 100;
  const tokens = tokenize(name);
  if (!tokens.length) return 0;
  const hits = tokens.filter(t => d.includes(t)).length;
  return Math.round((hits / tokens.length) * 90);
}

function detectSpecialAccount(description) {
  const d = normalizeText(description);
  if (d.includes('moka') || d.includes('united payment') || d.includes('pos')) return { type: 'moka', score: 95, reason: 'Moka/POS ifadesi bulundu' };
  if (d.includes('sgk')) return { type: 'sgk', score: 90, reason: 'SGK ifadesi bulundu' };
  if (d.includes('vergi') || d.includes('gib')) return { type: 'tax', score: 90, reason: 'Vergi/GİB ifadesi bulundu' };
  if (d.includes('kredi') || d.includes('taksit')) return { type: 'loan', score: 75, reason: 'Kredi/taksit ifadesi bulundu' };
  return null;
}

function buildCandidate(cari, transaction) {
  const description = transaction.description || transaction.raw_line || '';
  const name = cari.name || cari.title || cari.cari_name || '';
  const aliasList = Array.isArray(cari.aliases) ? cari.aliases : [];

  const nameScore = Math.max(includesScore(description, name), jaccardScore(description, name));
  const aliasScore = aliasList.reduce((best, alias) => Math.max(best, includesScore(description, alias), jaccardScore(description, alias)), 0);
  const ibanScore = cari.iban && description.replace(/\s/g, '').includes(String(cari.iban).replace(/\s/g, '')) ? 100 : 0;
  const taxScore = cari.tax_no && description.includes(String(cari.tax_no)) ? 90 : 0;

  const score = Math.max(nameScore, aliasScore, ibanScore, taxScore);
  const reasons = [];
  if (nameScore >= 40) reasons.push(`isim benzerliği ${nameScore}`);
  if (aliasScore >= 40) reasons.push(`alias benzerliği ${aliasScore}`);
  if (ibanScore) reasons.push('IBAN eşleşmesi');
  if (taxScore) reasons.push('vergi no eşleşmesi');

  return {
    cari_id: cari.id || cari.cari_id || null,
    cari_name: name,
    match_score: score,
    match_reason: reasons.join(', ') || 'zayıf metin benzerliği',
    suggested_type: Number(transaction.amount || 0) >= 0 ? 'collection' : 'payment',
    transaction,
  };
}

function matchTransaction(transaction, cariList = []) {
  const special = detectSpecialAccount(transaction.description || transaction.raw_line || '');
  const candidates = cariList
    .map(cari => buildCandidate(cari, transaction))
    .filter(c => c.match_score >= 35)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 5);

  if (special) {
    candidates.unshift({
      cari_id: special.type,
      cari_name: special.type.toUpperCase(),
      match_score: special.score,
      match_reason: special.reason,
      suggested_type: special.type,
      transaction,
    });
  }

  const best = candidates[0] || null;
  return {
    transaction,
    best_match: best,
    candidates,
    status: best && best.match_score >= 85 ? 'auto_suggested' : best ? 'needs_review' : 'unmatched',
  };
}

function matchTransactions(transactions = [], cariList = []) {
  return transactions.map(t => matchTransaction(t, cariList));
}

function loadJson(filePath) {
  return JSON.parse(require('fs').readFileSync(filePath, 'utf8'));
}

function main() {
  const txFile = process.argv[2];
  const cariFile = process.argv[3];
  if (!txFile || !cariFile) {
    console.error('Usage: node services/cari_transaction_matcher_v59.cjs transactions.json cari-list.json');
    process.exit(1);
  }
  const txPayload = loadJson(txFile);
  const cariPayload = loadJson(cariFile);
  const transactions = Array.isArray(txPayload) ? txPayload : txPayload.transactions || [];
  const cariList = Array.isArray(cariPayload) ? cariPayload : cariPayload.cari || cariPayload.customers || [];
  console.log(JSON.stringify(matchTransactions(transactions, cariList), null, 2));
}

if (require.main === module) main();

module.exports = { matchTransaction, matchTransactions, normalizeText, detectSpecialAccount };
