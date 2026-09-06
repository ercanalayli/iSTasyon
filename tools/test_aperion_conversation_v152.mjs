import assert from 'node:assert/strict';
import { answerWithAperionAI, modelText, systemInstruction } from '../functions/shared/aperion-conversation.js';

assert.equal(modelText({ response: ' Merhaba Ercan ' }), 'Merhaba Ercan');
assert.match(systemInstruction(null), /normal|Doğal/i);
assert.match(systemInstruction({ summary: 'Hasta bezi operasyonu öncelikli.', next_action: 'Canlı kabul' }), /Hasta bezi operasyonu/);

let captured;
const env = {
  AI: {
    async run(model, payload) {
      captured = { model, payload };
      return { response: 'Elbette. İsteğini doğrudan ele alıyorum.' };
    }
  }
};
const result = await answerWithAperionAI(env, { chatId: 1, messageId: 2, text: 'Benimle normal konuş.' });
assert.equal(result.ok, true);
assert.equal(result.text, 'Elbette. İsteğini doğrudan ele alıyorum.');
assert.match(captured.model, /llama-4-scout/);
assert.equal(captured.payload.messages.at(-1).content, 'Benimle normal konuş.');
assert.equal(captured.payload.messages[0].role, 'system');

const unavailable = await answerWithAperionAI({}, { chatId: 1, messageId: 3, text: 'test' });
assert.deepEqual(unavailable, { ok: false, error: 'workers_ai_binding_missing' });

console.log('AperiON conversational AI router: OK');
