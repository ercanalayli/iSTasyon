import assert from 'node:assert/strict';
import { answerWithAperionAI, modelText, providerOrder, requestedProvider, systemInstruction } from '../functions/shared/aperion-conversation.js';

assert.equal(modelText({ response: ' Merhaba Ercan ' }), 'Merhaba Ercan');
assert.equal(modelText({ output: [{ content: [{ type: 'output_text', text: 'OpenAI cevabı' }] }] }), 'OpenAI cevabı');
assert.equal(modelText({ content: [{ type: 'text', text: 'Claude cevabı' }] }), 'Claude cevabı');
assert.equal(modelText({ candidates: [{ content: { parts: [{ text: 'Gemini cevabı' }] } }] }), 'Gemini cevabı');
assert.match(systemInstruction(null), /doğrudan|Doğal/i);
assert.match(systemInstruction({ summary: 'Hasta bezi operasyonu öncelikli.', next_action: 'Canlı kabul' }), /Hasta bezi operasyonu/);
assert.deepEqual(providerOrder({ APERION_CONVERSATION_PROVIDERS: 'anthropic,openai,unknown,anthropic' }), ['anthropic', 'openai']);
assert.equal(requestedProvider('Claude ile değerlendir'), 'anthropic');
assert.equal(requestedProvider('GPT ile değerlendir'), 'openai');
assert.equal(requestedProvider('Bugün ne yapalım?'), null);
assert.deepEqual(providerOrder({ APERION_CONVERSATION_PROVIDERS: 'openai,anthropic,cloudflare' }, 'Claude ile değerlendir'), ['anthropic', 'openai', 'cloudflare']);
assert.deepEqual(providerOrder({ APERION_CONVERSATION_PROVIDERS: 'anthropic,openai,cloudflare' }, 'GPT ile değerlendir'), ['openai', 'anthropic', 'cloudflare']);

let captured;
const cloudflareEnv = {
  APERION_CONVERSATION_PROVIDERS: 'cloudflare',
  AI: {
    async run(model, payload) {
      captured = { model, payload };
      return { response: 'Elbette. İsteğini doğrudan ele alıyorum.' };
    }
  }
};
const cloudflareResult = await answerWithAperionAI(cloudflareEnv, { chatId: 1, messageId: 2, text: 'Benimle normal konuş.' });
assert.equal(cloudflareResult.ok, true);
assert.equal(cloudflareResult.text, 'Elbette. İsteğini doğrudan ele alıyorum.');
assert.equal(cloudflareResult.provider, 'cloudflare_workers_ai');
assert.match(captured.model, /llama-4-scout/);
assert.equal(captured.payload.messages.at(-1).content, 'Benimle normal konuş.');
assert.equal(captured.payload.messages[0].role, 'system');

const originalFetch = globalThis.fetch;
const calls = [];
globalThis.fetch = async (url, init) => {
  calls.push(String(url));
  if (String(url).includes('api.openai.com') && !String(init?.headers?.authorization || '').includes('success')) return new Response('{"error":"temporary"}', { status: 503 });
  if (String(url).includes('api.openai.com')) {
    const request = JSON.parse(init.body);
    assert.equal(request.model, 'gpt-6-astra');
    assert.deepEqual(request.reasoning, { effort: 'low' });
    assert.equal('temperature' in request, false);
    return Response.json({ output: [{ content: [{ type: 'output_text', text: 'Astra yanıtı.' }] }] });
  }
  if (String(url).includes('api.anthropic.com')) {
    const request = JSON.parse(init.body);
    assert.equal(request.model, 'claude-fable-5-1');
    assert.deepEqual(request.output_config, { effort: 'high' });
    assert.equal('temperature' in request, false);
    return Response.json({ content: [{ type: 'text', text: 'Claude yedek yanıtı.' }] });
  }
  throw new Error('unexpected_provider');
};
try {
  const astra = await answerWithAperionAI({
    APERION_CONVERSATION_PROVIDERS: 'openai,cloudflare',
    OPENAI_API_KEY: 'success'
  }, { chatId: 1, messageId: 3, text: 'Bugün neye odaklanmalıyım?' });
  assert.equal(astra.ok, true);
  assert.equal(astra.provider, 'openai');
  assert.equal(astra.model, 'gpt-6-astra');
  assert.equal(astra.text, 'Astra yanıtı.');

  const exactClaude = await answerWithAperionAI({
    APERION_CONVERSATION_PROVIDERS: 'openai,anthropic',
    OPENAI_API_KEY: 'success',
    ANTHROPIC_API_KEY: 'test-anthropic-key'
  }, { chatId: 1, messageId: 31, text: 'Claude ile değerlendir.' });
  assert.equal(exactClaude.ok, true);
  assert.equal(exactClaude.provider, 'anthropic');

  const fallback = await answerWithAperionAI({
    APERION_CONVERSATION_PROVIDERS: 'openai,anthropic',
    OPENAI_API_KEY: 'test-openai-key',
    ANTHROPIC_API_KEY: 'test-anthropic-key'
  }, { chatId: 1, messageId: 4, text: 'Stratejik bir yanıt ver.' });
  assert.equal(fallback.ok, true);
  assert.equal(fallback.provider, 'anthropic');
  assert.equal(fallback.text, 'Claude yedek yanıtı.');
  assert.equal(calls.length, 4);
} finally {
  globalThis.fetch = originalFetch;
}

const unavailable = await answerWithAperionAI({}, { chatId: 1, messageId: 5, text: 'test' });
assert.deepEqual(unavailable, { ok: false, error: 'no_conversation_provider_configured' });

const missingClaude = await answerWithAperionAI({
  APERION_CONVERSATION_PROVIDERS: 'openai,anthropic', OPENAI_API_KEY: 'success'
}, { chatId: 1, messageId: 6, text: 'Claude ile konuş.' });
assert.deepEqual(missingClaude, { ok: false, error: 'anthropic_not_configured', requestedProvider: 'anthropic' });

console.log('AperiON conversational AI router with failover: OK');
