'use strict';

// Reuse an already authenticated Chrome session; never infer that an open
// BizimHesap tab means authenticated access.
const LOCAL_BROKERS = Object.freeze([
  'http://127.0.0.1:9223',
  'http://127.0.0.1:9222',
]);

function brokerCandidateURLs(env = process.env) {
  const preferred = String(env.APERION_BIZIMHESAP_BROWSER_URL || '').trim();
  return [...new Set([preferred, ...LOCAL_BROKERS].filter(Boolean))];
}

function attachOnly(env = process.env) {
  return String(env.APERION_CHROME_ATTACH_MODE || '').trim().toLowerCase() === 'attach-only';
}

module.exports = { brokerCandidateURLs, attachOnly };
