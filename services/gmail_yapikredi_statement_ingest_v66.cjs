// AperiON v66 - Gmail Yapı Kredi Statement Ingest Service
// Amaç: Gmail'den gelen Yapı Kredi hesap hareketleri PDF metnini pending havuzuna hazırlamak.
// Bu dosya gerçek Gmail API çağrısı yapmaz; Gmail entegrasyon katmanı PDF text'i bu servise verir.
// Ledger yazmaz. Onaysız kesin kayıt oluşturmaz.

const { parseYapiKrediStatementText } = require('./yapikredi_statement_parser_v66.cjs');
const { buildPendingInsertBatch, insertPendingBatch } = require('./finance_pool_pending_writer_v66.cjs');

function isYapiKrediStatementMail(email = {}) {
  const subject = String(email.subject || '').toLowerCase();
  const attachmentName = String(email.attachment_name || email.filename || '').toLowerCase();
  return (
    subject.includes('hesap_hareketleri') ||
    subject.includes('hesap hareketleri') ||
    attachmentName.includes('hesap_hareketleri') ||
    attachmentName.includes('hesap hareketleri')
  );
}

function buildIngestSourceMeta(email = {}) {
  return {
    source_message_id: email.message_id || null,
    source_subject: email.subject || null,
    source_attachment_name: email.attachment_name || email.filename || null
  };
}

function prepareYapiKrediStatementForPending(email, pdfText, options = {}) {
  if (!isYapiKrediStatementMail(email)) {
    return {
      accepted: false,
      reason: 'not_yapikredi_statement_mail',
      pending_count: 0,
      duplicate_count: 0,
      pending: [],
      duplicates: []
    };
  }

  const parsed = parseYapiKrediStatementText(pdfText, {
    knownCariMap: options.knownCariMap || {}
  });

  const batch = buildPendingInsertBatch(parsed, {
    processedBankRowKeys: options.processedBankRowKeys || [],
    source: buildIngestSourceMeta(email)
  });

  return {
    accepted: true,
    reason: 'yapikredi_statement_parsed',
    email_subject: email.subject || null,
    attachment_name: email.attachment_name || email.filename || null,
    account: batch.account,
    total_rows: batch.total_rows,
    pending_count: batch.pending_count,
    duplicate_count: batch.duplicate_count,
    pending: batch.pending,
    duplicates: batch.duplicates
  };
}

async function ingestYapiKrediStatementToPending(supabaseClient, email, pdfText, options = {}) {
  const prepared = prepareYapiKrediStatementForPending(email, pdfText, options);
  if (!prepared.accepted) return { ...prepared, inserted: 0 };

  const result = await insertPendingBatch(supabaseClient, prepared);
  return {
    ...prepared,
    inserted: result.inserted,
    skipped: result.skipped
  };
}

module.exports = {
  isYapiKrediStatementMail,
  buildIngestSourceMeta,
  prepareYapiKrediStatementForPending,
  ingestYapiKrediStatementToPending
};
