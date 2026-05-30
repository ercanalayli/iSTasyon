/* AperiON v58 - Gmail to Drive Metadata Intake

Required Apps Script Properties:
- APERION_SUPABASE_URL
- APERION_SUPABASE_SERVICE_ROLE_KEY
- APERION_DRIVE_ROOT_FOLDER_ID
- APERION_GMAIL_QUERY

Suggested query:
to:alaylimedikal@gmail.com has:attachment newer_than:30d -label:APERION_PROCESSED
*/

const APERION_PROCESSED_LABEL = 'APERION_PROCESSED';
const APERION_ERROR_LABEL = 'APERION_ERROR';

function aperionProp(key, fallback) {
  return PropertiesService.getScriptProperties().getProperty(key) || fallback || '';
}

function aperionLabel(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

function aperionFolder(parent, name) {
  const existing = parent.getFoldersByName(name);
  if (existing.hasNext()) return existing.next();
  return parent.createFolder(name);
}

function aperionSafeName(name) {
  return String(name || 'attachment')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function aperionDateKey(date) {
  return Utilities.formatDate(date || new Date(), Session.getScriptTimeZone(), 'yyyy-MM');
}

function aperionDayKey(date) {
  return Utilities.formatDate(date || new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function aperionGuessModule(fileName, mimeType, subject) {
  const t = `${fileName || ''} ${mimeType || ''} ${subject || ''}`.toLowerCase();
  if (t.includes('banka') || t.includes('ekstre') || t.includes('hesap') || t.includes('pos') || t.includes('moka') || t.includes('fatura')) return 'finance';
  if (t.includes('sigorta') || t.includes('poliçe') || t.includes('police') || t.includes('mtv') || t.includes('aidat')) return 'life';
  if (t.includes('karar') || t.includes('decision')) return 'decision';
  return 'general';
}

function aperionTargetFolder(root, moduleName, messageDate) {
  const main = aperionFolder(root, 'AperiON Gelen Belgeler');
  const moduleFolder = aperionFolder(main, moduleName || 'general');
  return aperionFolder(moduleFolder, aperionDateKey(messageDate));
}

function aperionCreateMetadata(payload) {
  const supabaseUrl = aperionProp('APERION_SUPABASE_URL');
  const serviceKey = aperionProp('APERION_SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase properties');

  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/create_document_metadata_v58`;
  const response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    payload: JSON.stringify({
      p_company: payload.company || 'alayli',
      p_module: payload.module || 'general',
      p_source: 'gmail',
      p_drive_file_id: payload.drive_file_id || '',
      p_drive_url: payload.drive_url || '',
      p_file_name: payload.file_name || '',
      p_file_type: payload.file_type || '',
      p_file_size_bytes: payload.file_size_bytes || 0,
      p_note: payload.note || '',
    }),
  });

  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(`Supabase metadata error ${code}: ${response.getContentText()}`);
  }
  return response.getContentText();
}

function aperionProcessGmailToDriveV58() {
  const rootFolderId = aperionProp('APERION_DRIVE_ROOT_FOLDER_ID');
  if (!rootFolderId) throw new Error('Missing APERION_DRIVE_ROOT_FOLDER_ID');

  const query = aperionProp('APERION_GMAIL_QUERY', 'to:alaylimedikal@gmail.com has:attachment newer_than:30d -label:APERION_PROCESSED');
  const root = DriveApp.getFolderById(rootFolderId);
  const processedLabel = aperionLabel(APERION_PROCESSED_LABEL);
  const errorLabel = aperionLabel(APERION_ERROR_LABEL);
  const threads = GmailApp.search(query, 0, 25);

  let saved = 0;
  let metadata = 0;
  let errors = 0;

  threads.forEach(thread => {
    try {
      thread.getMessages().forEach(message => {
        const subject = message.getSubject();
        const from = message.getFrom();
        const date = message.getDate();
        const attachments = message.getAttachments({ includeInlineImages: false, includeAttachments: true });

        attachments.forEach(att => {
          const originalName = aperionSafeName(att.getName());
          const moduleName = aperionGuessModule(originalName, att.getContentType(), subject);
          const folder = aperionTargetFolder(root, moduleName, date);
          const fileName = `${aperionDayKey(date)} - ${originalName}`;
          const file = folder.createFile(att.copyBlob()).setName(fileName);
          saved++;

          aperionCreateMetadata({
            company: 'alayli',
            module: moduleName,
            drive_file_id: file.getId(),
            drive_url: file.getUrl(),
            file_name: fileName,
            file_type: att.getContentType(),
            file_size_bytes: att.getBytes().length,
            note: `gmail_subject=${subject}\ngmail_from=${from}\ngmail_thread_id=${thread.getId()}`,
          });
          metadata++;
        });
      });
      thread.addLabel(processedLabel);
      thread.removeLabel(errorLabel);
    } catch (err) {
      errors++;
      thread.addLabel(errorLabel);
      console.error(`AperiON intake error thread=${thread.getId()} ${err.message || err}`);
    }
  });

  const summary = { scanned_threads: threads.length, saved_files: saved, metadata_rows: metadata, errors, finished_at: new Date().toISOString() };
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

function aperionInstallGmailTriggerV58() {
  ScriptApp.newTrigger('aperionProcessGmailToDriveV58').timeBased().everyMinutes(15).create();
}
