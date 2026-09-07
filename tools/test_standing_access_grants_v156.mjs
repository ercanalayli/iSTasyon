import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(new URL('../migrations/0020_persistent_access_grants.sql', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../functions/api/session-bootstrap.js', import.meta.url), 'utf8');
const conversation = fs.readFileSync(new URL('../functions/shared/aperion-conversation.js', import.meta.url), 'utf8');

assert.match(migration, /CREATE TABLE IF NOT EXISTS standing_access_grants/);
assert.match(migration, /user-confirmed:2026-09-07/);
assert.match(migration, /"authenticate"/);
assert.match(migration, /"recover_connection"/);
assert.match(migration, /financial_commit/);
assert.match(migration, /yeni API\/OAuth/i);
assert.match(bootstrap, /standing_access_grants/);
assert.match(conversation, /AKTIF KALICI ERISIM IZINLERI/);
assert.match(conversation, /tekrar izin isteme/);
assert.match(conversation, /OTP\/MFA/);

console.log('Kalıcı erişim izni şeması, merkezi hafıza aktarımı ve Telegram kuralı doğrulandı.');
