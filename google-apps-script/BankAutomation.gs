/**
 * AperiON banka ekstresi kÃ¶prÃ¼sÃ¼.
 * Gmail'i salt okunur tarar; mali kayÄ±t oluÅŸturmaz.
 * Hareketleri Cloudflare D1 onay kuyruÄŸuna gÃ¶nderir ve Telegram onayÄ± bekler.
 */
var APERION_BANK_INGEST_ENDPOINT = 'https://aperion-istasyon.pages.dev/api/bank-statement-ingest';

function installAperionBankStatementTrigger() {
  ScriptApp.getProjectTriggers().filter(function (trigger) {
    return trigger.getHandlerFunction() === 'processAperionBankStatements';
  }).forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });

  ScriptApp.newTrigger('processAperionBankStatements')
    .timeBased()
    .atHour(9)
    .nearMinute(0)
    .everyDays(1)
    .inTimezone('Europe/Istanbul')
    .create();

  return { ok: true, handler: 'processAperionBankStatements', timezone: 'Europe/Istanbul', hour: 9 };
}

function processAperionBankStatements() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { ok: false, skipped: true, reason: 'already_running' };
  try {
    var props = PropertiesService.getScriptProperties();
    var secret = props.getProperty('APERION_BANK_INGEST_SECRET');
    if (!secret) throw new Error('APERION_BANK_INGEST_SECRET tanÄ±mlÄ± deÄŸil.');

    var processed = readProcessedBankMessages_(props);
    var query = 'from:ekstre@vakifbank.com.tr subject:"E-Ekstre" newer_than:2d has:attachment';
    var threads = GmailApp.search(query, 0, 25);
    var report = { ok: true, query: query, scanned: 0, parsed: 0, sent: 0, duplicate_messages: 0, errors: [] };

    threads.forEach(function (thread) {
      thread.getMessages().forEach(function (message) {
        report.scanned += 1;
        var messageId = message.getId();
        if (processed[messageId]) {
          report.duplicate_messages += 1;
          return;
        }
        try {
          var rows = [];
          message.getAttachments({ includeInlineImages: false, includeAttachments: true }).forEach(function (attachment) {
            if (/\.xlsx$/i.test(attachment.getName())) {
              rows = rows.concat(parseVakifBankXlsx_(attachment, message));
            }
          });
          report.parsed += rows.length;
          if (!rows.length) throw new Error('Ekstrede okunabilir hareket bulunamadÄ±.');
          var result = postBankRows_(secret, rows);
          if (!result.ok) throw new Error('D1/Telegram aktarÄ±mÄ± baÅŸarÄ±sÄ±z: ' + (result.error || 'bilinmeyen hata'));
          report.sent += Number(result.inserted || 0);
          processed[messageId] = new Date().toISOString();
        } catch (error) {
          report.ok = false;
          report.errors.push({ message_id_suffix: messageId.slice(-6), error: String(error.message || error) });
        }
      });
    });

    writeProcessedBankMessages_(props, processed);
    props.setProperty('APERION_BANK_LAST_RUN_JSON', JSON.stringify({
      at: new Date().toISOString(), ok: report.ok, scanned: report.scanned,
      parsed: report.parsed, sent: report.sent, errors: report.errors.length
    }));
    return report;
  } finally {
    lock.releaseLock();
  }
}

function postBankRows_(secret, rows) {
  var response = UrlFetchApp.fetch(APERION_BANK_INGEST_ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-aperion-key': secret },
    payload: JSON.stringify({ company_id: 'alayli', rows: rows }),
    muteHttpExceptions: true
  });
  var body = JSON.parse(response.getContentText() || '{}');
  if (response.getResponseCode() >= 300) throw new Error('HTTP ' + response.getResponseCode() + ': ' + (body.error || 'yanÄ±t yok'));
  return body;
}

function parseVakifBankXlsx_(attachment, message) {
  var files = Utilities.unzip(attachment.copyBlob().setContentType('application/zip'));
  var byName = {};
  files.forEach(function (file) { byName[file.getName()] = file.getDataAsString('UTF-8'); });
  var sharedXml = findZipPart_(byName, 'xl/sharedStrings.xml');
  var sheetXml = findZipPart_(byName, 'xl/worksheets/sheet1.xml');
  if (!sharedXml || !sheetXml) throw new Error('XLSX Ã§alÄ±ÅŸma sayfasÄ± okunamadÄ±.');

  var shared = [];
  var stringMatches = sharedXml.match(/<si[\s\S]*?<\/si>/g) || [];
  stringMatches.forEach(function (item) {
    var parts = [];
    item.replace(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g, function (_, value) {
      parts.push(xmlDecode_(value));
      return _;
    });
    shared.push(parts.join(''));
  });

  var rows = [];
  var rowMatches = sheetXml.match(/<row\b[\s\S]*?<\/row>/g) || [];
  rowMatches.forEach(function (rowXml) {
    var values = {};
    var cells = rowXml.match(/<c\b[\s\S]*?<\/c>/g) || [];
    cells.forEach(function (cellXml) {
      var ref = attr_(cellXml, 'r');
      var colMatch = ref.match(/^[A-Z]+/);
      if (!colMatch) return;
      var type = attr_(cellXml, 't');
      var valueMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);
      var value = valueMatch ? xmlDecode_(valueMatch[1]) : '';
      if (type === 's') value = shared[Number(value)] || '';
      values[colMatch[0]] = value;
    });
    if (values.A && values.C && values.D && values.G !== '' && /^\d{2}\.\d{2}\.\d{4}/.test(values.D)) {
      var amount = Number(values.G || 0);
      var direction = String(values.P || '').toUpperCase();
      var amountIn = amount > 0 || direction === 'A' ? Math.abs(amount) : 0;
      var amountOut = amount < 0 || direction === 'B' ? Math.abs(amount) : 0;
      var isoDate = trDateToIso_(values.D);
      var description = [values.F, values.Q].filter(Boolean).join(' â€” ').trim();
      var stable = ['VAKIFBANK', isoDate, values.C, values.J, amountIn, amountOut, description].join('|');
      rows.push({
        company_id: 'alayli',
        bank_name: 'VakÄ±fBank',
        transaction_date: isoDate,
        transaction_time: String(values.C).split(' ')[1] || '',
        description: description,
        amount_in: amountIn,
        amount_out: amountOut,
        balance_after: values.H === '' ? null : Number(values.H),
        confidence_score: 70,
        suggested_counterparty: '',
        confirmed_counterparty: '',
        counterparty_confirmed: false,
        source: 'gmail_vakifbank_xlsx',
        source_ref: message.getId() + ':' + attachment.getName() + ':' + (values.J || ''),
        mail_id: message.getId(),
        mail_subject: message.getSubject(),
        attachment_name: attachment.getName(),
        duplicate_key: sha256Hex_(stable)
      });
    }
  });
  return rows;
}

function findZipPart_(parts, suffix) {
  var keys = Object.keys(parts);
  for (var i = 0; i < keys.length; i += 1) {
    if (keys[i] === suffix || keys[i].slice(-suffix.length) === suffix) return parts[keys[i]];
  }
  return '';
}

function attr_(xml, name) {
  var match = xml.match(new RegExp('\\b' + name + '="([^"]*)"'));
  return match ? match[1] : '';
}

function xmlDecode_(value) {
  return String(value || '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function trDateToIso_(value) {
  var match = String(value || '').match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  return match ? match[3] + '-' + match[2] + '-' + match[1] : '';
}

function sha256Hex_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)
    .map(function (byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); })
    .join('');
}

function readProcessedBankMessages_(props) {
  try { return JSON.parse(props.getProperty('APERION_BANK_PROCESSED_MESSAGES_JSON') || '{}'); }
  catch (_) { return {}; }
}

function writeProcessedBankMessages_(props, processed) {
  var keys = Object.keys(processed).sort(function (a, b) { return String(processed[b]).localeCompare(String(processed[a])); }).slice(0, 200);
  var compact = {};
  keys.forEach(function (key) { compact[key] = processed[key]; });
  props.setProperty('APERION_BANK_PROCESSED_MESSAGES_JSON', JSON.stringify(compact));
}

