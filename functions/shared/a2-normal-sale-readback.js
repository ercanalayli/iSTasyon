/**
 * AperiON A2 - offline, READ ONLY comparison of independently collected ERP
 * document details with a user-approved normal-sale proposal.
 *
 * WARNING: This function NEVER attests an ERP read. A browser screenshot,
 * caller-supplied JSON, GUID or a customer statement can be forged/mistaken.
 * Even matchesExpected=true is NOT verified=true: only an independently
 * authenticated provider reader may attach provenance and elevate status.
 *
 * No HTTP, credentials, SQL, queue calls, browser control or ERP writes.
 */
const GUID = /^[0-9a-f]{32}$/i;
const ID = /^[A-Za-z0-9._:-]{1,120}$/;
const integer = value => Number.isSafeInteger(value) && value >= 0;
const moneyKeys = ['gross', 'discount', 'net', 'tax', 'total'];
const fail = (errors, code) => { if (!errors.includes(code)) errors.push(code); };

/** Compares expected proposal to an untrusted *candidate* ERP document. */
export function compareNormalSaleReadback(expected = {}, observation = {}) {
  const errors = [];
  const blocked = reason => ({
    matchesExpected: false,
    verified: false,
    status: 'READBACK_INCOMPLETE_OR_MISMATCH',
    blockers: reason,
    requiresIndependentProviderAttestation: true,
    financialWrites: 0,
  });
  // Legacy boolean-only "ERP verified" payloads are not evidence.
  if (observation.erpRecordReadBack === true && !observation.document) {
    fail(errors, 'legacy_boolean_is_not_proof');
  }
  const doc = observation.document;
  if (!doc || typeof doc !== 'object') {
    fail(errors, 'provider_document_details_required');
    return blocked(errors);
  }
  if (!GUID.test(String(doc.erpGuid || ''))) fail(errors, 'erp_guid_missing');
  if (!ID.test(String(expected.sourceId || ''))) fail(errors, 'source_id_invalid');
  if (doc.customerGuid !== expected.customerGuid) fail(errors, 'customer_guid_mismatch');
  if (doc.invoiceType !== 3) fail(errors, 'normal_sale_type_required');
  if (!String(doc.note || '').includes(String(expected.sourceId || ''))) {
    fail(errors, 'order_reference_not_on_document');
  }
  const date = String(doc.invoiceDate || '').slice(0, 10);
  const expectedDate = String(expected.invoiceDate || '').slice(0, 10);
  if (!expectedDate || date !== expectedDate) fail(errors, 'invoice_date_mismatch');

  const values = doc.amountsKurus || {};
  for (const k of moneyKeys) {
    if (!integer(values[k]) || values[k] !== expected.amountsKurus?.[k]) {
      fail(errors, 'header_' + k + '_mismatch');
    }
  }

  const lines = doc.lines, sourceLines = expected.lines;
  if (!Array.isArray(lines) || !Array.isArray(sourceLines) || lines.length !== sourceLines.length) {
    fail(errors, 'product_line_count_mismatch');
  } else {
    const wanted = new Map(sourceLines.map(x => [x.productId, x]));
    const seen = new Set();
    for (const line of lines) {
      if (!line || !GUID.test(String(line.productId || ''))) {
        fail(errors, 'unrecognized_product'); continue;
      }
      if (seen.has(line.productId)) fail(errors, 'duplicate_product_line');
      seen.add(line.productId);
      const original = wanted.get(line.productId);
      if (!original) { fail(errors, 'unapproved_product'); continue; }
      if (!Number.isSafeInteger(line.quantity) || line.quantity !== original.quantity) {
        fail(errors, 'quantity_mismatch');
      }
      if (Number(line.taxRate) !== Number(original.taxRate)) fail(errors, 'vat_rate_mismatch');
      for (const field of moneyKeys) {
        const key = field + 'Kurus';
        if (!integer(line[key]) || line[key] !== original[field]) {
          fail(errors, 'line_' + field + '_mismatch');
        }
      }
    }
    if (seen.size !== wanted.size) fail(errors, 'approved_products_missing');
  }

  if (observation.eInvoiceState !== 'NOT_ISSUED') fail(errors, 'e_invoice_state_not_proven');
  if (observation.paymentState !== 'NOT_BOOKED') fail(errors, 'payment_state_not_proven');
  if (!observation.capturedAt || Number.isNaN(Date.parse(String(observation.capturedAt)))) {
    fail(errors, 'captured_at_missing');
  }
  if (observation.source !== 'BIZIMHESAP_DOCUMENT_DETAIL') {
    fail(errors, 'source_detail_not_confirmed');
  }
  if (errors.length) return blocked(errors);
  return {
    matchesExpected: true,
    verified: false,
    status: 'CONTENT_MATCH_PROVIDER_ATTESTATION_PENDING',
    blockers: ['independent_authenticated_source_attestation_required'],
    requiresIndependentProviderAttestation: true,
    financialWrites: 0,
  };
}
