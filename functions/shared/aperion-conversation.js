const DEFAULT_CLOUDFLARE_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';
const DEFAULT_PROVIDER_ORDER = ['openai', 'cloudflare', 'anthropic', 'gemini'];
const MAX_HISTORY_TURNS = 10;
const MAX_INPUT_CHARS = 6000;
const MAX_OUTPUT_TOKENS = 1200;
const MAX_TELEGRAM_CHARS = 3900;
let schemaReady = false;

function clean(value, limit = 4000) {
  return String(value || '').trim().replace(/\u0000/g, '').slice(0, limit);
}

function modelText(result) {
  if (typeof result === 'string') return clean(result, 12000);
  if (typeof result?.response === 'string') return clean(result.response, 12000);
  if (typeof result?.result?.response === 'string') return clean(result.result.response, 12000);
  if (typeof result?.output_text === 'string') return clean(result.output_text, 12000);
  const openAiText = result?.output?.flatMap((item) => item?.content || [])
    .filter((item) => item?.type === 'output_text').map((item) => item?.text || '').join('\n');
  if (openAiText) return clean(openAiText, 12000);
  const anthropicText = result?.content?.filter((item) => item?.type === 'text')
    .map((item) => item?.text || '').join('\n');
  if (anthropicText) return clean(anthropicText, 12000);
  const geminiText = result?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || '').join('\n');
  return clean(geminiText, 12000);
}

function telegramText(result) {
  return clean(modelText(result), MAX_TELEGRAM_CHARS);
}

async function ensureConversationSchema(db) {
  if (!db) return false;
  if (schemaReady) return true;
  await db.prepare(`CREATE TABLE IF NOT EXISTS telegram_conversation_turns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user','assistant')),
    content TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE(chat_id,message_id,role)
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_telegram_conversation_chat_created ON telegram_conversation_turns(chat_id,created_at DESC)').run();
  schemaReady = true;
  return true;
}

async function existingAnswer(db, chatId, messageId) {
  if (!db) return null;
  try {
    const row = await db.prepare(`SELECT content,provider,model FROM telegram_conversation_turns
      WHERE chat_id=? AND message_id=? AND role='assistant' LIMIT 1`).bind(String(chatId), String(messageId)).first();
    return row?.content ? { text: row.content, provider: row.provider, model: row.model } : null;
  } catch (_error) { return null; }
}

async function memoryContext(db, chatId) {
  if (!db) return { history: [], checkpoint: null, standingRules: [], accessGrants: [] };
  try {
    await ensureConversationSchema(db);
    const [turns, checkpoint, standingRules, accessGrants] = await db.batch([
      db.prepare(`SELECT role,content FROM telegram_conversation_turns
        WHERE chat_id=? ORDER BY created_at DESC,id DESC LIMIT ?`).bind(String(chatId), MAX_HISTORY_TURNS),
      db.prepare('SELECT summary,next_action,created_at FROM session_checkpoints ORDER BY created_at DESC LIMIT 1'),
      db.prepare(`SELECT statement FROM memory_items
        WHERE status='active' AND memory_type='standing_rule'
        AND (valid_until IS NULL OR valid_until>=date('now'))
        ORDER BY confidence DESC,updated_at DESC LIMIT 20`),
      db.prepare(`SELECT connector_key,scopes_json FROM standing_access_grants
        WHERE principal='ercan' AND status='active' AND revoked_at IS NULL
        ORDER BY connector_key`)
    ]);
    return {
      history: (turns?.results || []).reverse().map((row) => ({ role: row.role, content: clean(row.content, 2500) })),
      checkpoint: checkpoint?.results?.[0] || null,
      standingRules: (standingRules?.results || []).map((row) => clean(row.statement, 1200)).filter(Boolean),
      accessGrants: (accessGrants?.results || []).map((row) => ({
        connector: clean(row.connector_key, 100),
        scopes: (() => { try { return JSON.parse(row.scopes_json || '[]'); } catch (_error) { return []; } })()
      }))
    };
  } catch (_error) {
    return { history: [], checkpoint: null, standingRules: [], accessGrants: [] };
  }
}

function systemInstruction(checkpoint, standingRules = [], accessGrants = []) {
  const durable = checkpoint?.summary
    ? `\nMERKEZI HAFIZA OZETI (${checkpoint.created_at || 'tarih yok'}):\n${clean(checkpoint.summary, 3500)}\nSIRADAKI ADIM: ${clean(checkpoint.next_action, 800) || 'belirtilmedi'}`
    : '\nMERKEZI HAFIZA: Bu konuşmada henüz doğrulanmış kalıcı oturum özeti bulunmuyor.';
  const rules = standingRules.length
    ? `\nKALICI KURALLAR:\n${standingRules.slice(0, 20).map((rule) => `- ${clean(rule, 1200)}`).join('\n')}`
    : '';
  const grants = accessGrants.length
    ? `\nAKTIF KALICI ERISIM IZINLERI:\n${accessGrants.map((grant) => `- ${grant.connector}: ${(grant.scopes || []).join(', ')}`).join('\n')}\nBu kapsamlarda tekrar izin isteme. Kullanici iptal ederse ilgili izni gecersiz say.`
    : '';
  return `Sen tek kimlikli AperiON'sun: Ercan Alaylı'nın Türkçe konuşan ikinci beyni, üst aklı, CEO/CFO karar destek katmanı ve dijital çalışanısın.
Önce sonucu söyle. Doğal, hızlı, doğrudan ve insani cevap ver. Kullanıcıyı komut ezberlemeye zorlama; niyetini gündelik Türkçeden anla.
Kullanıcı seninle güçlü bir yapay zekâ asistanıyla konuşur gibi konuşabilmelidir. Hangi altyapı modeli yanıt üretirse üretsin kimliğin daima AperiON'dur; model veya sağlayıcı adını kullanıcıya söyleme. Komut biçimi, görev kimliği, kuyruk veya teknik süreç öğretme.
Elindeki doğrulanmış bilgileri birleştirerek karar, analiz ve uygulanabilir sonraki adımı ver. Yanıtı normalde 1200 karakteri aşmayacak kadar öz tut.
Gerçek veri verilmemişse rakam, kayıt, başarı veya erişim uydurma. Kaynak eksikse tek cümlede neyin eksik olduğunu söyle ve mevcut bilgiyle yararlı bir sonraki adımı ver.
Bir sistem için aktif kalıcı erişim izni varsa giriş, kasadaki kimlik bilgisini kullanma, oturum yenileme, gezinme, okuma, sağlık kontrolü, bağlantı kurtarma ve taslak hazırlama için tekrar izin isteme. Para transferi/ödeme, faturayı veya muhasebe kaydını kesinleştirme, üçüncü kişiye mesaj gönderme, silme, erişim kapsamını büyütme, yeni API/OAuth anahtarı üretme, parola değiştirme, OTP/MFA ve CAPTCHA adımları bu kapsamın dışındadır.
Bu serbest konuşma katmanı dış işlemi kendi başına tamamlanmış saymaz; güvenli işlem motoruna yönlendirir ve hedef sistemden geri okuma kanıtı olmadan başarı bildirmez.
Parola, anahtar, OTP veya gizli değeri isteme, tekrarlama ya da yanıta koyma.
Yanıtı Telegram için kısa tut; ham JSON, HTML, form dökümü, görev kuyruğu ayrıntısı ve gereksiz bürokratik durum mesajı kullanma.${durable}${rules}${grants}`;
}

async function persistTurn(db, { chatId, messageId, role, content, provider = null, model = null }) {
  if (!db) return false;
  try {
    await ensureConversationSchema(db);
    await db.prepare(`INSERT INTO telegram_conversation_turns(chat_id,message_id,role,content,provider,model)
      VALUES(?,?,?,?,?,?) ON CONFLICT(chat_id,message_id,role) DO UPDATE SET
      content=excluded.content,provider=excluded.provider,model=excluded.model`)
      .bind(String(chatId), String(messageId), role, content, provider, model).run();
    return true;
  } catch (_error) { return false; }
}

function providerOrder(env) {
  const configured = clean(env?.APERION_CONVERSATION_PROVIDERS, 200).toLowerCase()
    .split(',').map((value) => value.trim()).filter(Boolean);
  const allowed = new Set(DEFAULT_PROVIDER_ORDER);
  const result = [...new Set(configured.filter((value) => allowed.has(value)))];
  return result.length ? result : DEFAULT_PROVIDER_ORDER;
}

function timeoutMs(env) {
  const value = Number(env?.APERION_PROVIDER_TIMEOUT_MS || 8000);
  return Math.max(3000, Math.min(20000, Number.isFinite(value) ? value : 8000));
}

async function fetchJson(url, init, timeout) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeout) });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`provider_http_${response.status}`);
  return body;
}

function conversationMessages(history, input) {
  return [...history, { role: 'user', content: input }];
}

async function callOpenAI(env, system, history, input, timeout) {
  if (!env.OPENAI_API_KEY) return null;
  const model = clean(env.OPENAI_MODEL, 120) || 'gpt-6-astra';
  const request = {
    model, instructions: system,
    input: conversationMessages(history, input).map((item) => ({ role: item.role, content: item.content })),
    max_output_tokens: MAX_OUTPUT_TOKENS, store: false
  };
  if (/^gpt-6(?:-|$)/i.test(model)) {
    request.reasoning = { effort: clean(env.OPENAI_REASONING_EFFORT, 20) || 'low' };
  } else {
    request.temperature = 0.2;
  }
  const body = await fetchJson('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(request)
  }, timeout);
  return { text: telegramText(body), provider: 'openai', model };
}

async function callAnthropic(env, system, history, input, timeout) {
  if (!env.ANTHROPIC_API_KEY) return null;
  const model = clean(env.ANTHROPIC_MODEL, 120) || 'claude-fable-5-1';
  const body = await fetchJson('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model, system, messages: conversationMessages(history, input), max_tokens: MAX_OUTPUT_TOKENS,
      output_config: { effort: clean(env.ANTHROPIC_EFFORT, 20) || 'high' }
    })
  }, timeout);
  return { text: telegramText(body), provider: 'anthropic', model };
}

async function callGemini(env, system, history, input, timeout) {
  if (!env.GEMINI_API_KEY) return null;
  const model = clean(env.GEMINI_MODEL, 120) || 'gemini-2.5-flash';
  const contents = conversationMessages(history, input).map((item) => ({
    role: item.role === 'assistant' ? 'model' : 'user', parts: [{ text: item.content }]
  }));
  const body = await fetchJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] }, contents,
      generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.2 }
    })
  }, timeout);
  return { text: telegramText(body), provider: 'gemini', model };
}

async function callCloudflare(env, system, history, input) {
  if (!env?.AI?.run) return null;
  const model = clean(env.APERION_CONVERSATION_MODEL, 200) || DEFAULT_CLOUDFLARE_MODEL;
  const result = await env.AI.run(model, {
    messages: [{ role: 'system', content: system }, ...conversationMessages(history, input)],
    temperature: 0.2, max_tokens: MAX_OUTPUT_TOKENS
  });
  return { text: telegramText(result), provider: 'cloudflare_workers_ai', model };
}

async function callProvider(provider, env, system, history, input, timeout) {
  if (provider === 'openai') return callOpenAI(env, system, history, input, timeout);
  if (provider === 'anthropic') return callAnthropic(env, system, history, input, timeout);
  if (provider === 'gemini') return callGemini(env, system, history, input, timeout);
  if (provider === 'cloudflare') return callCloudflare(env, system, history, input);
  return null;
}

export async function answerWithAperionAI(env, { chatId, messageId, text }) {
  const previous = await existingAnswer(env?.APERION_DB, chatId, messageId);
  if (previous) return { ok: true, ...previous, replayed: true, memoryPersisted: true };

  const input = clean(text, MAX_INPUT_CHARS);
  if (!input) return { ok: false, error: 'empty_input' };
  const memory = await memoryContext(env?.APERION_DB, chatId);
  const system = systemInstruction(memory.checkpoint, memory.standingRules, memory.accessGrants);
  let configuredProviders = 0;

  const order = providerOrder(env);
  for (const provider of order) {
    try {
      const answer = await callProvider(provider, env || {}, system, memory.history, input, timeoutMs(env));
      if (!answer) continue;
      configuredProviders += 1;
      if (!answer.text) continue;
      await persistTurn(env?.APERION_DB, { chatId, messageId, role: 'user', content: input, provider: answer.provider, model: answer.model });
      const memoryPersisted = await persistTurn(env?.APERION_DB, { chatId, messageId, role: 'assistant', content: answer.text, provider: answer.provider, model: answer.model });
      return { ok: true, ...answer, replayed: false, memoryPersisted };
    } catch (_error) {
      configuredProviders += 1;
      // Provider failures are deliberately sanitized. The next provider is tried.
    }
  }

  return { ok: false, error: configuredProviders ? 'all_conversation_providers_failed' : 'no_conversation_provider_configured' };
}

export const APERION_CONVERSATION_MODEL = DEFAULT_CLOUDFLARE_MODEL;
export { ensureConversationSchema, modelText, providerOrder, systemInstruction };
