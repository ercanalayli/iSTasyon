/* AperiON Expense Import Helper v36
   Purpose: normalize bank/card/BizimHesap/Moka/manual expense rows and classify them.
*/

function parseAmount(value){
  if(value === null || value === undefined) return 0;
  return Number(String(value).replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'')) || 0;
}

function cleanText(value){
  return String(value || '').toLowerCase().trim();
}

const expenseRules = [
  ['kira','RENT',95],
  ['maas','PERSONNEL',90],
  ['maaş','PERSONNEL',90],
  ['sgk','SGK',95],
  ['vergi','TAX',90],
  ['kdv','TAX',90],
  ['kredi karti','CREDIT_CARD',90],
  ['kredi kartı','CREDIT_CARD',90],
  ['kredi','LOAN',85],
  ['eft masraf','BANK_FEE',90],
  ['banka masraf','BANK_FEE',90],
  ['moka','POS_MOKA',95],
  ['pos','POS_MOKA',85],
  ['navlun','LOGISTICS',95],
  ['kargo','LOGISTICS',85],
  ['yakit','VEHICLE',80],
  ['yakıt','VEHICLE',80],
  ['kasko','VEHICLE',90],
  ['sigorta','VEHICLE',80],
  ['cloudflare','SOFTWARE',90],
  ['supabase','SOFTWARE',90],
  ['bizimhesap','SOFTWARE',85],
  ['tamir','REPAIR',90],
  ['bakim','REPAIR',85],
  ['bakım','REPAIR',85]
];

function classifyExpense(description){
  const text = cleanText(description);
  let best = { category_code: 'OTHER', confidence_score: 40, classification_status: 'waiting' };
  for(const [keyword, code, score] of expenseRules){
    if(text.includes(keyword) && score > best.confidence_score){
      best = { category_code: code, confidence_score: score, classification_status: score >= 85 ? 'auto_classified' : 'review' };
    }
  }
  return best;
}

function normalizeExpenseRow(row){
  const description = row.description || row.aciklama || row.açıklama || row.detay || row.memo || '';
  const classified = classifyExpense(description);
  return {
    company: row.company || row.firma || 'ALAYLI',
    expense_date: row.expense_date || row.tarih || row.date || null,
    source_type: row.source_type || row.kaynak || 'manual',
    source_name: row.source_name || row.dosya || row.file || null,
    description,
    amount: parseAmount(row.amount || row.tutar || row.borc || row.borç || row.odeme || row.ödeme),
    matched_category_code: classified.category_code,
    confidence_score: classified.confidence_score,
    classification_status: classified.classification_status,
    is_fixed: ['RENT','PERSONNEL','SGK','LOAN','SOFTWARE'].includes(classified.category_code),
    is_variable: !['RENT','PERSONNEL','SGK','LOAN','SOFTWARE'].includes(classified.category_code)
  };
}

function normalizeExpenseRows(rows){
  return (rows || []).map(normalizeExpenseRow);
}

function summarizeExpenses(rows){
  const summary = {};
  for(const r of rows || []){
    const code = r.matched_category_code || 'OTHER';
    if(!summary[code]) summary[code] = { count: 0, amount: 0 };
    summary[code].count += 1;
    summary[code].amount += parseAmount(r.amount);
  }
  return summary;
}

if(typeof module !== 'undefined'){
  module.exports = { parseAmount, classifyExpense, normalizeExpenseRow, normalizeExpenseRows, summarizeExpenses };
}
