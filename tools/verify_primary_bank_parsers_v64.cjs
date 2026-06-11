const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function fail(message) {
  console.error(`FAIL - ${message}`);
  process.exitCode = 1;
}

(async () => {
  const { parseBankStatement } = await import(pathToFileUrl(path.join(root, 'automation/parsers/index.js')));
  const config = JSON.parse(fs.readFileSync(path.join(root, 'automation/mail-ekstre-config.json'), 'utf8'));
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  const expectedBanks = [
    ['akbank', 'Akbank'],
    ['garanti', 'Garanti BBVA'],
    ['isbank', 'Is Bankasi'],
    ['vakifbank', 'VakifBank'],
    ['yapikredi', 'Yapi Kredi']
  ];

  console.log('AperiON Primary Bank Parser v64 Verify');
  console.log('--------------------------------------');

  const primary = config.primary_banks || [];
  for (const [code, label] of expectedBanks) {
    const cfg = (config.banks || []).find(item => item.bank === code);
    if (!primary.includes(code)) fail(`${code} primary_banks icinde yok`);
    if (!cfg) fail(`${code} config banks icinde yok`);
    if (cfg && cfg.label !== label) fail(`${code} label beklenen degil: ${cfg.label}`);
    if (!html.includes(label)) fail(`${label} ana ekran banka izleme listesinde yok`);
  }

  const samples = {
    akbank: 'AKBANK HESAP HAREKETLERI\n05/06/2026 FAST GELEN ALAYLI MEDIKAL 12.345,67 TL 88.888,00 TL',
    garanti: 'GARANTI BBVA Hesap Hareket Dokumu\n05/06/2026 EFT GIDEN TEDARIKCI ODEMESI -7.500,00 TL 81.388,00 TL',
    isbank: 'TURKIYE IS BANKASI HESAP HAREKETLERI\n05/06/2026 10:15:00 FAST GELEN MUSTERI TAHSILATI 1.250,00 TL 22.000,00 TL',
    vakifbank: 'VAKIFBANK E-Ekstre\n05/06/2026 POS UYE ISYERI TAHSILATI 3.400,00 TL 25.400,00 TL',
    yapikredi: 'YAPI KREDI HESAP HAREKETLERI\n05/06/2026 HAVALE GIDEN KIRA -15.000,00 TL 10.400,00 TL'
  };

  for (const [code, label] of expectedBanks) {
    const rowsA = parseBankStatement(samples[code], {
      company_id: 'alayli',
      mailbox: 'alaylimedikal@gmail.com',
      bank_hint: code,
      mail_subject: `${label} Gunluk Ekstre`,
      attachment_name: `${code}-20260605-a.pdf`
    });
    const rowsB = parseBankStatement(samples[code], {
      company_id: 'alayli',
      mailbox: 'alaylimedikal@gmail.com',
      bank_hint: code,
      mail_subject: `${label} Eski Ekstre Tekrar`,
      attachment_name: `${code}-20260605-b.pdf`
    });
    const row = rowsA[0];
    if (rowsA.length !== 1) fail(`${label} parser hareket cikaramadi`);
    if (row && row.bank_name !== label) fail(`${label} bank_name hatali: ${row.bank_name}`);
    if (row && !row.transaction_date) fail(`${label} tarih yok`);
    if (row && !row.description) fail(`${label} aciklama yok`);
    if (row && !(Number(row.amount_in || 0) + Number(row.amount_out || 0) > 0)) fail(`${label} tutar yok`);
    if (!rowsB[0] || rowsB[0].duplicate_key !== row.duplicate_key) fail(`${label} duplicate_key statement bagimsiz degil`);
    console.log(`OK  - ${label} parser + duplicate guard`);
  }

  if (process.exitCode) {
    console.error('--------------------------------------');
    console.error('RESULT: FAIL - Ana banka parser kapsami eksik.');
    process.exit(process.exitCode);
  }
  console.log('--------------------------------------');
  console.log('RESULT: OK - Akbank, Garanti BBVA, Is Bankasi, VakifBank, Yapi Kredi kapsami kilitli.');
})();

function pathToFileUrl(filePath) {
  return `file:///${filePath.replace(/\\/g, '/')}`;
}
