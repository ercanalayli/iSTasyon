import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enrollmentPayload } from '../functions/telegram/device-bridge.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'functions/telegram/device-bridge.js'), 'utf8');
const webhook = fs.readFileSync(path.join(root, 'functions/telegram/webhook.js'), 'utf8');
const localBridge = fs.readFileSync(path.join(root, 'tools/aperion_device_bridge.cjs'), 'utf8');
const enrollmentPage = fs.readFileSync(path.join(root, 'aperion-device-enroll.html'), 'utf8');
const saveEnrollment = fs.readFileSync(path.join(root, 'tools/save_aperion_device_enrollment.ps1'), 'utf8');

assert.equal(
  enrollmentPayload('windows-test', 123, 'nonce-value'),
  'aperion-device-enroll-v1\nwindows-test\n123\nnonce-value'
);
assert.match(source, /token_sha256/);
assert.match(source, /allowed_chat_id/);
assert.match(source, /desktop_open_url/);
assert.match(source, /enrollment_replay_rejected/);
assert.match(webhook, /queueDeviceCommand/);
assert.match(webhook, /desktop_bridge_configured/);
assert.match(localBridge, /const TARGETS = Object\.freeze/);
assert.match(localBridge, /--prepare-enroll/);
assert.match(localBridge, /--enroll-from-request/);
assert.doesNotMatch(localBridge, /SUPABASE_SERVICE_ROLE_KEY/);
assert.doesNotMatch(localBridge, /writeFileSync\([\s\S]*TELEGRAM_BOT_TOKEN/);
assert.match(enrollmentPage, /\/api\/device\/enroll/);
assert.match(saveEnrollment, /Set-Clipboard -Value ''/);
assert.doesNotMatch(saveEnrollment, /TELEGRAM_BOT_TOKEN/);

console.log('AperiON cihaz köprüsü v141 doğrulaması geçti.');
