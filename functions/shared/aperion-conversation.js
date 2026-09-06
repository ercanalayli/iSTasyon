const DEFAULT_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';
const MAX_HISTORY_TURNS = 10;
const MAX_INPUT_CHARS = 6000;
let schemaReady = false;

function clean(value, limit = 4000) {
  return String(value || '').trim().replace(/\u0000/g, '').slice(0, limit);
}

function modelText(result) {
  if (typeof result === 'string') return clean(result, 12000);
  if (typeof result?.response === 'string') return clean(result.response, 12000);
  if (typeof result?.result?.response === 'string') return clean(result.result.response, 12000);
  if (typeof result?.output_text === 'string') return clean(result.output_text, 12000);
  return '';
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
  if (!db) return { history: [], checkpoint: null };
  try {
    await ensureConversationSchema(db);
    const [turns, checkpoint] = await db.batch([
      db.prepare(`SELECT role,content FROM telegram_conversation_turns
        WHERE chat_id=? ORDER BY created_at DESC,id DESC LIMIT ?`).bind(String(chatId), MAX_HISTORY_TURNS),
      db.prepare('SELECT summary,next_action,created_at FROM session_checkpoints ORDER BY created_at DESC LIMIT 1')
    ]);
    return {
      history: (turns?.results || []).reverse().map((row) => ({ role: row.role, content: clean(row.content, 2500) })),
      checkpoint: checkpoint?.results?.[0] || null
    };
  } catch (_error) {
    return { history: [], checkpoint: null };
  }
}

function systemInstruction(checkpoint) {
  const durable = checkpoint?.summary
    ? `\nMERKEZI HAFIZA OZETI (${checkpoint.created_at || 'tarih yok'}):\n${clean(checkpoint.summary, 3500)}\nSIRADAKI ADIM: ${clean(checkpoint.next_action, 800) || 'belirtilmedi'}`
    : '\nMERKEZI HAFIZA: Bu konuşmada henüz doğrulanmış kalıcı oturum özeti bulunmuyor.';
  return `Sen AperiON'sun: Ercan Alaylı'nın Türkçe konuşan ikinci beyni, yönetici asistanı ve karar destek katmanısın.
Doğal, hızlı, doğrudan ve insani cevap ver. Kullanıcıyı komut ezberlemeye zorlama; niyetini gündelik Türkçeden anla.
Gerçek veri verilmemişse rakam, kayıt, başarı veya erişim uydurma. Kaynak eksikse tek cümlede neyin eksik olduğunu söyle ve mevcut bilgiyle yararlı bir sonraki adımı ver.
Bu serbest konuşma katmanı hiçbir para transferi, fatura, mesaj, silme, yetki veya dış sistem kaydı gerçekleştirmez. Böyle bir işlem istenirse yapıldığını söyleme; güvenli işlem motoruna aktarılması gerektiğini belirt.
Parola, anahtar, OTP veya gizli değeri isteme, tekrarlama ya da yanıta koyma.
Yanıtı Telegram için kısa tut; gereksiz başlık ve bürokratik durum mesajı kullanma.${durable}`;
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

export async function answerWithAperionAI(env, { chatId, messageId, text }) {
  if (!env?.AI?.run) return { ok: false, error: 'workers_ai_binding_missing' };
  const previous = await existingAnswer(env.APERION_DB, chatId, messageId);
  if (previous) return { ok: true, ...previous, replayed: true, memoryPersisted: true };

  const input = clean(text, MAX_INPUT_CHARS);
  if (!input) return { ok: false, error: 'empty_input' };
  const memory = await memoryContext(env.APERION_DB, chatId);
  const model = clean(env.APERION_CONVERSATION_MODEL, 200) || DEFAULT_MODEL;
  const messages = [
    { role: 'system', content: systemInstruction(memory.checkpoint) },
    ...memory.history,
    { role: 'user', content: input }
  ];

  try {
    const result = await env.AI.run(model, {
      messages,
      temperature: 0.2,
      max_tokens: 650
    });
    const answer = modelText(result);
    if (!answer) return { ok: false, error: 'empty_ai_response' };
    await persistTurn(env.APERION_DB, { chatId, messageId, role: 'user', content: input, provider: 'cloudflare_workers_ai', model });
    const memoryPersisted = await persistTurn(env.APERION_DB, { chatId, messageId, role: 'assistant', content: answer, provider: 'cloudflare_workers_ai', model });
    return { ok: true, text: answer, provider: 'cloudflare_workers_ai', model, replayed: false, memoryPersisted };
  } catch (error) {
    return { ok: false, error: clean(error?.message || error, 300) || 'workers_ai_error' };
  }
}

export const APERION_CONVERSATION_MODEL = DEFAULT_MODEL;
export { ensureConversationSchema, modelText, systemInstruction };
