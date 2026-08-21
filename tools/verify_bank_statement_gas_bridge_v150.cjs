const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');
const AdmZip = require('../automation/node_modules/adm-zip');

const gas = fs.readFileSync('google-apps-script/BankAutomation.gs', 'utf8');
const endpoint = fs.readFileSync('functions/api/bank-statement-ingest.js', 'utf8');
const helper = fs.readFileSync('functions/shared/bank-approvals.js', 'utf8');
const webhook = fs.readFileSync('functions/telegram/webhook.js', 'utf8');
const workflow = fs.readFileSync('.github/workflows/mail-ekstre-pipeline.yml', 'utf8');
const sample = 'C:\\Users\\HP\\Downloads\\00158007352192509 (8).xlsx';

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

const context = {
  console,
  Utilities: {
    Charset: { UTF_8: 'utf8' },
    DigestAlgorithm: { SHA_256: 'sha256' },
    unzip(blob) {
      return new AdmZip(blob.path).getEntries().filter((entry) => !entry.isDirectory).map((entry) => ({
        getName: () => entry.entryName,
        getDataAsString: () => entry.getData().toString('utf8'),
      }));
    },
    computeDigest(_algorithm, value) {
      return Array.from(crypto.createHash('sha256').update(value, 'utf8').digest()).map((byte) => byte > 127 ? byte - 256 : byte);
    },
  },
};
vm.createContext(context);
vm.runInContext(gas, context);

const attachment = {
  path: sample,
  getName: () => '00158007352192509.xlsx',
  copyBlob() { return this; },
  setContentType() { return this; },
};
const message = {
  getId: () => 'test-message-id',
  getSubject: () => 'E-Ekstre (ALAYLI MEDÄ°KAL)',
};
const rows = context.parseVakifBankXlsx_(attachment, message);

ok(rows.length === 2, `Beklenen 2 hareket, bulunan ${rows.length}`);
ok(rows[0].amount_in === 50670 && rows[0].amount_out === 0, 'Tahsilat yÃ¶nÃ¼ hatalÄ±');
ok(rows[1].amount_in === 0 && Math.abs(rows[1].amount_out - 1128.81) < 0.001, 'Ã–deme yÃ¶nÃ¼ hatalÄ±');
ok(rows.every((row) => /^2026-08-09$/.test(row.transaction_date)), 'Tarih dÃ¶nÃ¼ÅŸÃ¼mÃ¼ hatalÄ±');
ok(new Set(rows.map((row) => row.duplicate_key)).size === 2, 'MÃ¼kerrer anahtarÄ± benzersiz deÄŸil');
ok(gas.includes('from:ekstre@vakifbank.com.tr') && gas.includes('atHour(9)'), 'Gmail sorgusu veya 09:00 tetikleyici eksik');
ok(endpoint.includes('x-aperion-ingest-secret') && endpoint.includes('ingestBankRows'), 'KorumalÄ± D1 ingest ucu eksik');
ok(helper.includes('bank_statement_movements') && helper.includes('bank_posting_queue'), 'D1 hareket/onay kuyruÄŸu eksik');
ok(helper.includes('BANKA HAREKETÄ° ONAYI') && helper.includes('ONAYLA'), 'Telegram onay kartÄ± eksik');
ok(webhook.includes('decideBankMovement') && webhook.includes('gÃ¼venli iÅŸlem kuyruÄŸuna'), 'Telegram callback D1 baÄŸlantÄ±sÄ± eksik');
ok(workflow.includes('APERION_BANK_INGEST_SECRET') && workflow.includes('AperiON D1 approval queue'), 'GitHub D1 aktarÄ±mÄ± eksik');

console.log('BANK_STATEMENT_GAS_BRIDGE_V150_OK');

