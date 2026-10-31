'use strict';
const crypto = require('node:crypto');
// This guard only proves uniqueness INSIDE one rendered source window.
// It cannot prove full paging or identity across different virtual windows.
function assertDistinctVisibleSourceRows(rows, identityOf, source = 'unknown_source') {
  if (!Array.isArray(rows) || typeof identityOf !== 'function') throw new TypeError('SOURCE_IDENTITY_INVALID_INPUT');
  const seen = new Map();
  for (let i = 0; i < rows.length; i++) {
    const key = identityOf(rows[i]);
    if (typeof key !== 'string' || !key.length) {
      const err = new Error(`SOURCE_IDENTITY_MISSING source=${source} row=${i}`);
      err.code = 'SOURCE_IDENTITY_MISSING'; throw err;
    }
    if (seen.has(key)) {
      const fp = crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
      const err = new Error(`SOURCE_IDENTITY_COLLISION source=${source} rows=${seen.get(key)},${i} fingerprint=${fp} — import blocked`);
      err.code = 'SOURCE_IDENTITY_COLLISION';
      err.firstIndex = seen.get(key); err.secondIndex = i; throw err;
    }
    seen.set(key, i);
  }
  return { checkedRows: rows.length, distinctKeys: seen.size, safeWithinWindow: true };
}
module.exports = { assertDistinctVisibleSourceRows };
