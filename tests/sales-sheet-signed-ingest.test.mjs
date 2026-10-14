import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { signedSalesSheetRequest } from '../functions/api/bizimhesap-sales-sync.js';

const secret = 'test-only-signed-sales-secret-0123456789abcdef';
const source = readFileSync(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8');

function gasSandbox() {
  const cells = [];
  const sheet = {
    getLastRow: () => cells.length,
    setFrozenRows: () => {},
    getRange(row, col, nRows = 1, nCols = 1) {
      const range = {
        getValue() { return cells[row - 1]?.[col - 1] || ''; },
        getValues() {
          return Array.from({ length: nRows }, (_, i) =>
            Array.from({ length: nCols }, (_, j) => cells[row + i - 1]?.[col + j - 1] ?? ''));
        },
        setValues(values) {
          values.forEach((v, i) => {
            const index = row + i - 1;
            cells[index] ||= [];
            v.forEach((cell, j) => { cells[index][col + j - 1] = cell; });
          });
          return range;
        },
        setFontWeight() { return range; },
        setNumberFormat() { return range; }
      };
      return range;
    }
  };
  const bytes = buffer => [...buffer].map(b => b > 127 ? b - 256 : b);
  const ctx = {
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput(text) { return { setMimeType() { return this; }, text }; }
    },
    PropertiesService: { getScriptProperties: () => ({
      getProperty(key) { return key === 'APERION_SHEET_INGEST_KEY' ? secret : null; }
    }) },
    SpreadsheetApp: { openById: () => ({
      getSheetByName: () => sheet,
      insertSheet: () => sheet
    }) },
    LockService: { getScriptLock: () => ({
      tryLock() { return true; },
      releaseLock() {}
    }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      computeDigest(_alg, value) { return bytes(createHash('sha256').update(value, 'utf8').digest()); },
      computeHmacSha256Signature(value, key) { return bytes(createHmac('sha256', key).update(value, 'utf8').digest()); },
      base64EncodeWebSafe(v) { return Buffer.from(v.map(b => b & 255)).toString('base64url'); }
    }
  };
  runInNewContext(source, ctx, { filename: 'Code.gs' });
  const ingest = body => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) } }).text);
  return { ingest, rows: cells };
}

test('Cloudflare signed envelope matches HMAC and Google receiver accepts only once', async () => {
  const records = [{
    tarih: '2026-10-14', firma_id: 'alayli', fatura_no: 'TEST-NEVER-POST',
    unvan: 'TEST CUSTOMER', urun_kod: 'MAM.TEST', urun: 'TEST PRODUCT',
    adet: 1, ciro: 123.45, event_key: 'test-only-invoice-row'
  }];
  const env = await signedSalesSheetRequest(secret, records);
  assert.equal(env.digest, createHash('sha256').update(JSON.stringify(records)).digest('hex'));
  const expected = createHmac('sha256', secret).update(env.timestamp + '\n' + env.digest).digest('base64url');
  assert.equal(env.token, expected);
  assert.equal('key' in env, false);

  const runtime = gasSandbox();
  const first = runtime.ingest(env);
  assert.equal(first.ok, true);
  assert.equal(first.appended, 1);
  assert.equal(first.duplicates, 0);
  assert.equal(runtime.rows.length, 2);

  const again = runtime.ingest(env);
  assert.equal(again.ok, true);
  assert.equal(again.appended, 0);
  assert.equal(again.duplicates, 1);
  assert.equal(runtime.rows.length, 2);
});

test('tampered amount, forged signature and expired messages fail closed', async () => {
  const records = [{event_key:'test-only', tarih:'2026-10-14', ciro:5}];
  const payload = await signedSalesSheetRequest(secret, records);
  const ctx = gasSandbox();
  const tampered = structuredClone(payload);
  tampered.records[0].ciro = 50000;
  assert.equal(ctx.ingest(tampered).ok, false);
  assert.equal(ctx.ingest({...payload, token:'x'.repeat(43)}).ok, false);
  const stale = await signedSalesSheetRequest(secret, records, Date.now() - 8 * 60 * 1000);
  assert.equal(ctx.ingest(stale).ok, false);
  assert.equal(ctx.rows.length, 0);
});

test('unverified mirror acknowledgement never defaults to sent=true', () => {
  const src = readFileSync(new URL('../functions/api/bizimhesap-sales-sync.js', import.meta.url), 'utf8');
  assert.match(src, /parsed\?\.ok === true/);
  assert.match(src, /parsed\.appended \+ parsed\.duplicates === payload\.length/);
  assert.doesNotMatch(src, /accepted:\s*finiteNumber\(parsed\?\.appended,\s*payload\.length\)/);
});
