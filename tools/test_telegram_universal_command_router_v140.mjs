import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DESKTOP_TARGETS, normalizeCommandText, parseUniversalCommand } from '../functions/telegram/universal-command-router.js';

assert.equal(normalizeCommandText('  BİZİMHESAP AÇ  '), 'bizimhesap ac');
assert.equal(parseUniversalCommand('BizimHesap aç').target, 'bizimhesap');
assert.equal(parseUniversalCommand('/ac gmail').target, 'gmail');
assert.equal(parseUniversalCommand('Telegramı aç').target, 'telegram');
assert.equal(parseUniversalCommand('AperiON paneli aç').target, 'aperion');
assert.equal(parseUniversalCommand('Nakit kasadan Ercan kasaya 3500 TL transfer').risk, 'approval_required');
assert.equal(parseUniversalCommand('Ahmet’e WhatsApp mesajı gönder').category, 'communication');
assert.equal(parseUniversalCommand('Bu kaydı sil').category, 'delete');
assert.equal(parseUniversalCommand('Yarın satış raporunu hazırla').executionMode, 'review_queue');
assert.equal(parseUniversalCommand('sadece bir not'), null);
assert.equal(DESKTOP_TARGETS.bizimhesap.url.startsWith('https://bizimhesap.com/'), true);

const listener = fs.readFileSync(new URL('./aperion_command_listener.cjs', import.meta.url), 'utf8');
const webhook = fs.readFileSync(new URL('../functions/telegram/webhook.js', import.meta.url), 'utf8');
assert.equal(listener.includes("cmd.command === 'desktop_open_url'"), true);
assert.equal(listener.includes("spawn('rundll32.exe'"), true);
assert.equal(listener.includes('DESKTOP_TARGETS[String(targetKey'), true);
assert.equal(webhook.includes("command: 'desktop_open_url'"), true);
assert.equal(webhook.includes('claimUniversalCommand'), true);

console.log('Telegram universal command router tests passed.');
