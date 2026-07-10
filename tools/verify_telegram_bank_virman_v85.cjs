const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { classifyBankMovement } = require('./bank_posting_plan.cjs');

const root = path.resolve(__dirname, '..');
const sample = classifyBankMovement({
  id: 'is-vakif-virman',
  bank_name: 'IS BANKASI',
  transaction_date: '2026-05-26',
  amount_out: 17300,
  description: 'FAST IsCep | ALAYLI MEDIKAL ORTOPEDI TIC LTD STI TR180001! TEKRARLA VAKIFBANK IS BANKASI 2695814966 FAST VIRMAN',
});

assert.equal(sample.plan.kind, 'bank_transfer');
assert.equal(sample.plan.type, 'Sirket bankalari arasi virman');
assert.match(sample.plan.source_account, /Is Bankasi/i);
assert.match(sample.plan.target_account, /VakifBank/i);
assert.match(sample.plan.confirmation_question, /sirket ici virman/i);
assert.match(sample.plan.confirmation_question, /17\.300/i);

const parser = fs.readFileSync(path.join(root, 'banka_gorsel_parser.js'), 'utf8');
assert(parser.includes("'bankalar_arasi_transfer', 'onay_bekliyor'"), 'visual parser still rejects virman');

const telegram = fs.readFileSync(path.join(root, 'telegram', 'aperion_bank_image_bot.cjs'), 'utf8');
assert(telegram.includes('function waitingRowText'), 'Telegram decision explanation missing');
assert(telegram.includes('Açıklama kanıtı'), 'Telegram source explanation missing');
assert(telegram.includes('Kaynak hesap:'), 'Telegram source account missing');
assert(telegram.includes('Hedef hesap:'), 'Telegram target account missing');
assert(telegram.includes('Sorum:'), 'Telegram confirmation question missing');

console.log('Telegram company virman decision verification passed.');
