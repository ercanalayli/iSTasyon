/**
 * AperiON Remote Command Bot v57
 * Telegram üzerinden PC'deki ErpaltH klasöründe güvenli komut çalıştırır.
 * Serbest PowerShell çalıştırmaz. Sadece izinli AperiON komutları vardır.
 */

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const WORKDIR = "C:\\Users\\HP\\Desktop\\ErpaltH";
let offset = 0;

function loadEnv() {
  const envPath = path.join(WORKDIR, ".env");
  const result = {};

  if (!fs.existsSync(envPath)) {
    return result;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    const key = match[1].trim();
    let value = match[2].trim();

    value = value.replace(/^["']|["']$/g, "");

    result[key] = value;
    if (!process.env[key]) process.env[key] = value;
  }

  return result;
}

function pickEnv(env, names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
    if (env[name]) return env[name];
  }
  return "";
}

const env = loadEnv();

const BOT_TOKEN = pickEnv(env, [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_TOKEN",
  "BOT_TOKEN",
  "APERION_TELEGRAM_BOT_TOKEN",
  "APERION_BOT_TOKEN",
  "TELEGRAM_BANKA_BOT_TOKEN"
]);

const ALLOWED_CHAT_ID = pickEnv(env, [
  "TELEGRAM_CHAT_ID",
  "CHAT_ID",
  "APERION_TELEGRAM_CHAT_ID",
  "APERION_CHAT_ID",
  "TELEGRAM_BANKA_CHAT_ID"
]);

function safeTrim(text, max = 3500) {
  const value = String(text || "");
  return value.length > max ? value.slice(0, max) + "\n...\n[çıktı kısaltıldı]" : value;
}

function run(command) {
  return new Promise((resolve) => {
    exec(command, { cwd: WORKDIR, windowsHide: true, timeout: 180000 }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: stdout || "",
        stderr: stderr || "",
        error: error ? error.message : ""
      });
    });
  });
}

async function sendMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: safeTrim(text),
      parse_mode: "HTML"
    })
  });
}

function isAuthorized(chatId) {
  if (!ALLOWED_CHAT_ID) return false;
  return String(chatId) === String(ALLOWED_CHAT_ID);
}

async function handleCommand(text, chatId) {
  const cmd = String(text || "").trim();

  if (!isAuthorized(chatId)) {
    await sendMessage(chatId, "⛔ Yetkisiz chat. Bu bot sadece kayıtlı TELEGRAM_CHAT_ID / CHAT_ID ile çalışır.");
    return;
  }

  if (cmd === "/help" || cmd === "/start") {
    await sendMessage(chatId, [
      "🤖 <b>AperiON Komut Botu v57</b>",
      "",
      "İzinli komutlar:",
      "/status - git status",
      "/git - branch ve son commitler",
      "/v57test - v57 SQL verify",
      "/v57services - v57 servis verify + dry-run test",
      "/v57full - v57 SQL + servis tüm testler",
      "/log - kısa durum",
      "",
      "Güvenlik:",
      "- Serbest PowerShell komutu çalışmaz.",
      "- git push / pull / reset / clean çalışmaz.",
      "- .env içeriği gösterilmez.",
      "- BizimHesap'a kayıt göndermez."
    ].join("\n"));
    return;
  }

  if (cmd === "/status") {
    const r = await run("git status");
    await sendMessage(chatId, `📌 <b>git status</b>\n\n${r.stdout}${r.stderr}${r.error}`);
    return;
  }

  if (cmd === "/git") {
    const r = await run("git branch --show-current && git log --oneline -6 && git status --short");
    await sendMessage(chatId, `🌿 <b>Git Durumu</b>\n\n${r.stdout}${r.stderr}${r.error}`);
    return;
  }

  if (cmd === "/v57test") {
    const r = await run("npm run verify:cash-command-center-v57");
    await sendMessage(chatId, `🧪 <b>v57 SQL Verify</b>\n\n${r.stdout}${r.stderr}${r.error}`);
    return;
  }

  if (cmd === "/v57services") {
    const r = await run("npm run verify:cash-command-services-v57 && npm run bank-mail:read-v57 && npm run bank-statement:parse-v57 && npm run bank-transaction:match-v57");
    await sendMessage(chatId, `🧪 <b>v57 Servis Testleri</b>\n\n${r.stdout}${r.stderr}${r.error}`);
    return;
  }

  if (cmd === "/v57full") {
    const r = await run("npm run verify:cash-command-center-v57 && npm run verify:cash-command-services-v57 && npm run bank-mail:read-v57 && npm run bank-statement:parse-v57 && npm run bank-transaction:match-v57");
    await sendMessage(chatId, `🧪 <b>v57 Tam Test</b>\n\n${r.stdout}${r.stderr}${r.error}`);
    return;
  }

  if (cmd === "/log") {
    const r = await run("git status --short && git log --oneline -4");
    await sendMessage(chatId, `📋 <b>AperiON kısa durum</b>\n\n${r.stdout}${r.stderr}${r.error}`);
    return;
  }

  await sendMessage(chatId, "Bilinmeyen komut. /help yaz.");
}

async function poll() {
  if (!BOT_TOKEN || !ALLOWED_CHAT_ID) {
    console.error("Telegram ayarı eksik.");
    console.error("Beklenen token isimleri: TELEGRAM_BOT_TOKEN / TELEGRAM_TOKEN / BOT_TOKEN / APERION_TELEGRAM_BOT_TOKEN / TELEGRAM_BANKA_BOT_TOKEN");
    console.error("Beklenen chat id isimleri: TELEGRAM_CHAT_ID / CHAT_ID / APERION_TELEGRAM_CHAT_ID / TELEGRAM_BANKA_CHAT_ID");
    process.exit(1);
  }

  console.log("AperiON Remote Command Bot v57 çalışıyor.");
  console.log("Workdir:", WORKDIR);
  console.log("Güvenlik: sadece izinli komutlar.");
  console.log("Telegram token bulundu:", BOT_TOKEN ? "EVET" : "HAYIR");
  console.log("Telegram chat id bulundu:", ALLOWED_CHAT_ID ? "EVET" : "HAYIR");

  while (true) {
    try {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?timeout=30&offset=${offset}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.ok) {
        console.error("Telegram getUpdates hatası:", JSON.stringify(data));
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }

      if (Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;

          const message = update.message;
          if (!message || !message.text) continue;

          await handleCommand(message.text, message.chat.id);
        }
      }
    } catch (error) {
      console.error("Polling hata:", error.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

poll();