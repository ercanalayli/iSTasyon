import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enrollmentPayload, deviceHealth } from '../functions/telegram/device-bridge.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'functions/telegram/device-bridge.js'), 'utf8');
const webhook = fs.readFileSync(path.join(root, 'functions/telegram/webhook.js'), 'utf8');
const localBridge = fs.readFileSync(path.join(root, 'tools/aperion_device_bridge.cjs'), 'utf8');
const enrollmentPage = fs.readFileSync(path.join(root, 'aperion-device-enroll.html'), 'utf8');
const saveEnrollment = fs.readFileSync(path.join(root, 'tools/save_aperion_device_enrollment.ps1'), 'utf8');
const installer = fs.readFileSync(path.join(root, 'tools/install_aperion_device_bridge.ps1'), 'utf8');
const installerLauncher = fs.readFileSync(path.join(root, 'aperion_device_bridge_install.cmd'), 'utf8');

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
assert.match(installer, /HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run/);
assert.match(installer, /AperiON_Device_Bridge/);
assert.match(installerLauncher, /install_aperion_device_bridge\.ps1/);


// Regression: a registered device is not necessarily online. Report recent
// authenticated polling separately, with no Chrome/login inference.
const fakeEnv = (registered, recentlySeen) => ({
  APERION_DB: {
    prepare(sql) {
      return {
        async run() { return { success: true }; },
        async first() {
          if (sql.includes('FROM aperion_device_commands')) return { count: 2 };
          if (sql.includes('FROM aperion_devices') && sql.includes('last_seen_at IS NOT NULL'))
            return { count: recentlySeen };
          if (sql.includes('FROM aperion_devices')) return { count: registered };
          throw new Error('unexpected test SQL');
        }
      };
    }
  }
});
const offline = await deviceHealth(fakeEnv(1, 0));
assert.equal(offline.configured, true);
assert.equal(offline.activeDeviceCount, 1); // backward compatibility only
assert.equal(offline.registeredDeviceCount, 1);
assert.equal(offline.onlineDeviceCount, 0);
assert.equal(offline.devicePresence, 'not_recently_seen');
assert.equal(offline.pendingCommandCount, 2);
const online = await deviceHealth(fakeEnv(1, 1));
assert.equal(online.onlineDeviceCount, 1);
assert.equal(online.devicePresence, 'recent_device_poll');
const absent = await deviceHealth(fakeEnv(0, 0));
assert.equal(absent.devicePresence, 'no_registered_device');
const unavailable = await deviceHealth({});
assert.equal(unavailable.devicePresence, 'unavailable');
assert.match(webhook, /desktop_bridge_online_device_count: desktopBridge\.onlineDeviceCount/);
assert.match(webhook, /desktop_bridge_presence: desktopBridge\.devicePresence/);
// Public health is read-only: no device command, ERP posting or authorization granted.
assert.doesNotMatch(source.slice(source.indexOf('export async function deviceHealth')), /queueDeviceCommand|completeDeviceCommand/);

console.log('AperiON cihaz köprüsü v141: kayıt / çevrimiçi ayrımı doğrulandı.');
