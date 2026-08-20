const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildCaption, sendFinanceResult } = require('./telegram_finance_result.cjs');

async function main() {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'aperion-telegram-result-'));
  const proofPath = path.join(temporaryDirectory, 'proof.png');
  const ledgerPath = path.join(temporaryDirectory, 'ledger.json');
  fs.writeFileSync(proofPath, Buffer.from('fake-png'));

  const payload = {
    verified: true,
    transactionId: 'test:3500',
    status: 'BAŞARILI',
    date: '20.08.2026',
    sourceAccount: 'TL Kasa',
    targetAccount: '**ercan nakit',
    amount: 3500,
    currency: 'TRY',
    newBalance: 990.10,
    proofPath,
  };
  const caption = buildCaption(payload);
  assert.match(caption, /^\[GPT-CODEX KAYDI\]/);
  assert.match(caption, /3\.500,00/);

  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ ok: true, result: { message_id: 321 } }), { status: 200 });
  };
  const options = {
    env: { TELEGRAM_BOT_TOKEN: 'test-token', TELEGRAM_ALLOWED_CHAT_ID: '1497' },
    chatId: '1497',
    ledgerPath,
    fetchImpl,
  };

  const first = await sendFinanceResult(payload, options);
  assert.equal(first.ok, true);
  assert.equal(first.duplicate, false);
  assert.equal(first.messageId, 321);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/sendPhoto$/);
  assert.equal(calls[0].options.body.get('chat_id'), '1497');
  assert.match(calls[0].options.body.get('caption'), /görsel kanıt ektedir/);

  const duplicate = await sendFinanceResult(payload, options);
  assert.equal(duplicate.duplicate, true);
  assert.equal(calls.length, 1);

  await assert.rejects(
    () => sendFinanceResult({ ...payload, transactionId: 'unverified', verified: false }, options),
    /verified=true/
  );
  await assert.rejects(
    () => sendFinanceResult({ ...payload, transactionId: 'wrong-chat' }, { ...options, chatId: '9999' }),
    /izin verilen sohbetle eşleşmiyor/
  );
  console.log('RESULT: OK');
  console.log('Verified-only guard: OK');
  console.log('Telegram sendPhoto payload: OK');
  console.log('Chat allowlist: OK');
  console.log('Duplicate notification guard: OK');
}

main().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});
