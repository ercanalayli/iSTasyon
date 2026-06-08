/* AperiON Product Match Helper v44
   Purpose: match supplier price list items to AperiON product master safely.
   Safe rule: high confidence can be suggested; uncertain rows must go to approval.
*/

function normalizeText(value){
  return String(value || '')
    .toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function tokens(value){
  return normalizeText(value).split(' ').filter(Boolean);
}

function jaccardScore(a, b){
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if(A.size === 0 || B.size === 0) return 0;
  let intersection = 0;
  for(const t of A){ if(B.has(t)) intersection++; }
  const union = new Set([...A, ...B]).size;
  return intersection / union;
}

function containsScore(a, b){
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if(!na || !nb) return 0;
  if(na === nb) return 1;
  if(na.includes(nb) || nb.includes(na)) return 0.88;
  return 0;
}

function sizeSignal(value){
  const t = normalizeText(value);
  const m = t.match(/\b(xs|s|m|l|xl|xxl|small|medium|large)\b/);
  return m ? m[1] : '';
}

function brandSignal(value){
  const t = tokens(value);
  return t[0] || '';
}

function scoreProductMatch(supplierItem, product){
  const supplierName = supplierItem.supplier_product_name || supplierItem.normalized_product_name || '';
  const productName = product.product_name || product.name || product.urun_adi || '';
  const codeA = normalizeText(supplierItem.supplier_product_code || supplierItem.matched_product_code || '');
  const codeB = normalizeText(product.product_code || product.code || product.stok_kodu || '');

  let score = 0;
  let reasons = [];

  if(codeA && codeB && codeA === codeB){
    score += 45;
    reasons.push('product_code_exact');
  } else if(codeA && codeB && (codeA.startsWith(codeB + ' ') || codeA.startsWith(codeB + '-'))) {
    score += 30;
    reasons.push('product_code_prefix');
  }

  const exactContain = containsScore(supplierName, productName);
  if(exactContain >= 1){
    score += 45;
    reasons.push('name_exact');
  } else if(exactContain > 0){
    score += Math.round(exactContain * 35);
    reasons.push('name_contains');
  }

  const jac = jaccardScore(supplierName, productName);
  score += Math.round(jac * 35);
  if(jac >= 0.6) reasons.push('token_similarity_high');
  else if(jac >= 0.35) reasons.push('token_similarity_medium');

  const supplierSize = sizeSignal(supplierName);
  const productSize = sizeSignal(productName);
  if(supplierSize && productSize){
    if(supplierSize === productSize){
      score += 12;
      reasons.push('size_match');
    } else {
      score -= 18;
      reasons.push('size_conflict');
    }
  }

  const supplierBrand = brandSignal(supplierName);
  const productBrand = brandSignal(productName);
  if(supplierBrand && productBrand){
    if(supplierBrand === productBrand){
      score += 8;
      reasons.push('brand_match');
    } else {
      score -= 8;
      reasons.push('brand_diff');
    }
  }

  score = Math.max(0, Math.min(100, score));
  return {
    product_code: product.product_code || product.code || product.stok_kodu || null,
    product_name: productName,
    confidence: score,
    reasons
  };
}

function findBestProductMatch(supplierItem, products){
  const scored = (products || [])
    .map(p => scoreProductMatch(supplierItem, p))
    .sort((a,b) => b.confidence - a.confidence);

  const best = scored[0] || null;
  if(!best){
    return { matched_product_code: null, matched_product_name: null, match_confidence: 0, approval_status: 'waiting', match_reason: 'no_product_master' };
  }

  let approvalStatus = 'waiting';
  if(best.confidence >= 92) approvalStatus = 'matched';
  else if(best.confidence >= 75) approvalStatus = 'review';
  else approvalStatus = 'waiting';

  return {
    matched_product_code: best.product_code,
    matched_product_name: best.product_name,
    match_confidence: best.confidence,
    approval_status: approvalStatus,
    match_reason: best.reasons.join(',')
  };
}

function applyProductMatching(supplierItems, products){
  return (supplierItems || []).map(item => {
    if(item.matched_product_name && item.match_confidence >= 90){
      return item;
    }
    const match = findBestProductMatch(item, products);
    return {
      ...item,
      ...match
    };
  });
}

function summarizeProductMatching(rows){
  return {
    total: (rows || []).length,
    matched: (rows || []).filter(r => r.approval_status === 'matched').length,
    review: (rows || []).filter(r => r.approval_status === 'review').length,
    waiting: (rows || []).filter(r => r.approval_status === 'waiting').length
  };
}

if(typeof module !== 'undefined'){
  module.exports = {
    normalizeText,
    scoreProductMatch,
    findBestProductMatch,
    applyProductMatching,
    summarizeProductMatching
  };
}
