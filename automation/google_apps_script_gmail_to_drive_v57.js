/**
 * AperiON v57 — Ücretsiz Gmail → Drive Banka Ekstre Aktarım Scripti
 *
 * Kullanılacak Google hesabı:
 * - ercanalayli@gmail.com
 *
 * Amaç:
 * - Gmail'de banka ekstresi / hesap hareketi maillerini bulur.
 * - Ekleri Google Drive'da standart AperiON klasör ağacına kaydeder.
 * - Yıl / ay klasörlerini otomatik oluşturur.
 * - Maili işaretler: APERION-ISLENDI
 * - Hata/sonuç loglarını Apps Script Logger'a yazar.
 *
 * Ücret:
 * - n8n / Make yok.
 * - Google Apps Script + Gmail + mevcut 2 TB Drive kullanılır.
 * - GPT dışında ek otomasyon aboneliği gerektirmez.
 *
 * Güvenlik:
 * - BizimHesap'a kayıt göndermez.
 * - AperiON kesin finans kaydı oluşturmaz.
 * - Sadece ekstre dosyasını Drive'a taşır ve arşivler.
 */

const APERION_CONFIG = {
  ownerEmail: 'ercanalayli@gmail.com',
  rootFolderName: 'AperiON',
  bankFolderName: '01 Banka Ekstreleri',
  processedLabelName: 'APERION-ISLENDI',
  errorLabelName: 'APERION-HATA',
  gmailSearchQuery: 'has:attachment newer_than:30d (subject:ekstre OR subject:"hesap hareket" OR subject:banka OR subject:pos OR subject:moka OR from:banka)',
  allowedExtensions: ['pdf', 'xlsx', 'xls', 'csv', 'txt'],
  maxThreadsPerRun: 20,
  monthNames: [
    '01 Ocak', '02 Şubat', '03 Mart', '04 Nisan', '05 Mayıs', '06 Haziran',
    '07 Temmuz', '08 Ağustos', '09 Eylül', '10 Ekim', '11 Kasım', '12 Aralık'
  ]
};

function aperionGetOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

function aperionGetOrCreateChildFolder_(parent, childName) {
  const folders = parent.getFoldersByName(childName);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(childName);
}

function aperionGetOrCreateRootFolder_() {
  const folders = DriveApp.getFoldersByName(APERION_CONFIG.rootFolderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(APERION_CONFIG.rootFolderName);
}

function aperionGetBankMonthFolder_(dateObj) {
  const cfg = APERION_CONFIG;
  const root = aperionGetOrCreateRootFolder_();
  const bankRoot = aperionGetOrCreateChildFolder_(root, cfg.bankFolderName);
  const yearName = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'yyyy');
  const monthIndex = Number(Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'M')) - 1;
  const monthName = cfg.monthNames[monthIndex] || Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'MM');
  const yearFolder = aperionGetOrCreateChildFolder_(bankRoot, yearName);
  return aperionGetOrCreateChildFolder_(yearFolder, monthName);
}

function aperionEnsureStandardFolders() {
  const root = aperionGetOrCreateRootFolder_();
  [
    '01 Banka Ekstreleri',
    '02 Moka POS',
    '03 Faturalar',
    '04 Gider Belgeleri',
    '05 BizimHesap Export',
    '06 Onay Bekleyen',
    '07 İşlenen Arşiv',
    '99 Hata Kontrol'
  ].forEach(name => aperionGetOrCreateChildFolder_(root, name));

  Logger.log('AperiON standart Drive klasörleri kontrol edildi / oluşturuldu. Hesap: ' + APERION_CONFIG.ownerEmail);
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
  aperionEnsureStandardFolders();

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
        const msgDate = message.getDate();
        const targetFolder = aperionGetBankMonthFolder_(msgDate);
        const dateText = Utilities.formatDate(msgDate, Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm');
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
          const created = targetFolder.createFile(att.copyBlob()).setName(filename);
          savedCount++;
          threadSaved++;
          Logger.log('Kaydedildi: ' + filename + ' | DriveFileId=' + created.getId());
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
