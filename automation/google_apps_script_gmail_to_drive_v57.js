/**
 * AperiON v57 — Ücretsiz Gmail → Drive Banka Ekstre Aktarım Scripti
 *
 * Amaç:
 * - Gmail'de banka ekstresi / hesap hareketi maillerini bulur.
 * - Ekleri Google Drive klasörüne kaydeder.
 * - Maili işaretler: APERION-ISLENDI
 * - Hata/sonuç loglarını Apps Script Logger'a yazar.
 *
 * Ücret:
 * - n8n / Make yok.
 * - Google Apps Script + Gmail + Drive kullanır.
 * - GPT dışında ek otomasyon aboneliği gerektirmez.
 *
 * Güvenlik:
 * - BizimHesap'a kayıt göndermez.
 * - AperiON kesin finans kaydı oluşturmaz.
 * - Sadece ekstre dosyasını Drive'a taşır.
 */

const APERION_CONFIG = {
  driveFolderName: 'AperiON Banka Ekstreleri',
  processedLabelName: 'APERION-ISLENDI',
  errorLabelName: 'APERION-HATA',
  gmailSearchQuery: 'has:attachment newer_than:30d (subject:ekstre OR subject:"hesap hareket" OR subject:banka OR subject:pos OR subject:moka OR from:banka)',
  allowedExtensions: ['pdf', 'xlsx', 'xls', 'csv', 'txt'],
  maxThreadsPerRun: 20
};

function aperionGetOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

function aperionGetOrCreateFolder_(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}

function aperionSafeName_(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 160);
}

function aperionFileExtension_(filename) {
  const parts = String(filename || '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function aperionRunBankStatementIntake() {
  const cfg = APERION_CONFIG;
  const folder = aperionGetOrCreateFolder_(cfg.driveFolderName);
  const processedLabel = aperionGetOrCreateLabel_(cfg.processedLabelName);
  const errorLabel = aperionGetOrCreateLabel_(cfg.errorLabelName);

  const query = cfg.gmailSearchQuery + ' -label:' + cfg.processedLabelName;
  const threads = GmailApp.search(query, 0, cfg.maxThreadsPerRun);

  let savedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  Logger.log('AperiON banka ekstre aktarımı başladı. Thread sayısı: ' + threads.length);

  threads.forEach(thread => {
    try {
      const messages = thread.getMessages();
      let threadSaved = 0;

      messages.forEach(message => {
        const dateText = Utilities.formatDate(message.getDate(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm');
        const subject = aperionSafeName_(message.getSubject() || 'konu-yok');
        const from = aperionSafeName_(message.getFrom() || 'gonderen-yok');
        const attachments = message.getAttachments({ includeInlineImages: false, includeAttachments: true });

        attachments.forEach(att => {
          const ext = aperionFileExtension_(att.getName());

          if (cfg.allowedExtensions.indexOf(ext) === -1) {
            skippedCount++;
            Logger.log('Atlandı: desteklenmeyen ek türü: ' + att.getName());
            return;
          }

          const filename = [dateText, from, subject, aperionSafeName_(att.getName())].join(' -- ');
          folder.createFile(att.copyBlob()).setName(filename);
          savedCount++;
          threadSaved++;
          Logger.log('Kaydedildi: ' + filename);
        });
      });

      if (threadSaved > 0) {
        thread.addLabel(processedLabel);
      } else {
        skippedCount++;
      }
    } catch (err) {
      errorCount++;
      thread.addLabel(errorLabel);
      Logger.log('HATA: ' + err.message);
    }
  });

  Logger.log('AperiON banka ekstre aktarımı bitti. Kaydedilen: ' + savedCount + ' | Atlanan: ' + skippedCount + ' | Hata: ' + errorCount);

  return {
    savedCount,
    skippedCount,
    errorCount
  };
}

function aperionInstallHourlyTrigger() {
  ScriptApp.newTrigger('aperionRunBankStatementIntake')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('Saatlik AperiON banka ekstre tetikleyicisi kuruldu.');
}

function aperionRemoveTriggers() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'aperionRunBankStatementIntake') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  Logger.log('AperiON banka ekstre tetikleyicileri kaldırıldı.');
}
