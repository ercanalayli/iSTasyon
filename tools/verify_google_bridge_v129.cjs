const fs = require('fs');
function ok(label, pass) { if (!pass) throw new Error('FAIL ' + label); console.log('OK  ' + label); }
const api = fs.readFileSync('functions/api/google-bridge.js', 'utf8');
const gas = fs.readFileSync('google-apps-script/Code.gs', 'utf8');
const manifest = JSON.parse(fs.readFileSync('google-apps-script/appsscript.json', 'utf8'));
ok('D1 source health upsert', api.includes('INSERT INTO source_health'));
ok('shared key required', api.includes('APERION_GOOGLE_BRIDGE_KEY') && api.includes('unauthorized'));
ok('Drive check', gas.includes('DriveApp.getFolderById'));
ok('Sheets check', gas.includes('SpreadsheetApp.openById'));
ok('daily trigger', gas.includes("atHour(8)") && gas.includes("nearMinute(30)"));
ok('no Gmail permission', !manifest.oauthScopes.some(x => x.includes('gmail')));
ok('no financial adapter', !gas.includes('BizimHesap'));
console.log('Google bridge verification passed.');
