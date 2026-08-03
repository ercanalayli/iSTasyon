// 2026-08-03: Ercan'in istegi - "AperiON'un BizimHesap'a HER AN erisebilmesi".
// Bu, Ercan'in bilgisayarinda SUREKLI acik kalan bir dinleyici: Claude (bu
// sohbetten, Supabase MCP ile) `bot_commands` tablosuna bir komut satiri
// ekler, bu script 15 saniyede bir kontrol edip GERCEK BizimHesap islemini
// (dogrulama veya kayit) yapar ve sonucu geri yazar. Boylece Claude'un
// kendisi captcha riskiyle her seferinde yeni bir bulut ortami acmasina
// gerek kalmaz - hep AYNI, kalici, guvenilir makineden calisir.
//
// Calistirma: node tools/aperion_command_listener.cjs
// (acik birakilmali - Ctrl+C ile durdurulur, PC yeniden baslarsa tekrar
// calistirilmasi gerekir; kalici hale getirmek istersen soyle, Windows
// Gorev Zamanlayici ile "PC acilinca baslat" kurulur.)
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const ENV_FILE = path.join(__dirname, '..', 'local-secrets', 'bizimhesap.local.env');
if (!fs.existsSync(ENV_FILE)) {
  console.error('HATA: local-secrets/bizimhesap.local.env yok. Once o dosyayi doldur.');
  process.exit(1);
}
require('dotenv').config({ path: ENV_FILE });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY || SERVICE_KEY.includes('BURAYA_')) {
  console.error('HATA: local-secrets/bizimhesap.local.env icinde SUPABASE_SERVICE_ROLE_KEY hala placeholder. Once onu doldur.');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY);

const PROFILE_DIR = path.join(__dirname, '..', 'local-secrets', '.bizimhesap-persistent-profile');
fs.mkdirSync(PROFILE_DIR, { recursive: true });

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

function runScript(script, args) {
  const env = {
    ...process.env,
    BANK_TABLE: 'bank_transactions',
    BIZIMHESAP_PROFILE_DIR: PROFILE_DIR,
    BIZIMHESAP_HEADLESS: process.env.BIZIMHESAP_HEADLESS || 'true',
  };
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: path.join(__dirname, '..'),
    env,
    encoding: 'utf8',
    timeout: 120000,
  });
  return {
    ok: result.status === 0,
    output: (result.stdout || '') + (result.stderr ? '\n---stderr---\n' + result.stderr : ''),
  };
}

async function handleCommand(cmd) {
  log(`Komut alindi: #${cmd.id} tip=${cmd.command_type} payload=${JSON.stringify(cmd.payload)}`);
  await db.from('bot_commands').update({ status: 'processing', started_at: new Date().toISOString() }).eq('id', cmd.id);

  let outcome;
  try {
    if (cmd.command_type === 'bizimhesap_verify') {
      const search = cmd.payload?.search || 'APERION AUTO';
      outcome = runScript('tools/verify_bank_post_v112.cjs', ['--search', search]);
    } else if (cmd.command_type === 'bizimhesap_process') {
      const args = ['--limit', String(cmd.payload?.limit || 1)];
      if (cmd.payload?.id) args.push('--id', String(cmd.payload.id));
      if (cmd.payload?.commit) { args.push('--commit', '--save'); process.env.BIZIMHESAP_POSTING_LIVE = '1'; }
      outcome = runScript('bizimhesap_banka_bot.cjs', args);
    } else {
      outcome = { ok: false, output: `Bilinmeyen komut_tipi: ${cmd.command_type}` };
    }
  } catch (e) {
    outcome = { ok: false, output: String(e.message || e) };
  }

  await db.from('bot_commands').update({
    status: outcome.ok ? 'completed' : 'failed',
    result: outcome.output.slice(0, 8000),
    completed_at: new Date().toISOString(),
  }).eq('id', cmd.id);
  log(`Komut bitti: #${cmd.id} -> ${outcome.ok ? 'completed' : 'failed'}`);
}

async function tick() {
  const { data, error } = await db.from('bot_commands').select('*').eq('status', 'pending').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (error) { log(`HATA (sorgu): ${error.message}`); return; }
  if (data) await handleCommand(data);
}

log('AperiON yerel dinleyici baslatildi. Komut bekleniyor (her 15 saniyede bir kontrol)...');
tick();
setInterval(tick, 15000);
