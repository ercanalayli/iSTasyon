// 2026-08-04: Ercan'in istegi - Gmail OAuth "finish" adimini GH Actions'a
// gitmeden, bu bilgisayardan dogrudan tamamla. local-secrets/bizimhesap.local.env
// icindeki GOOGLE_CLIENT_ID/SECRET'i okuyup Google'in verdigi code'u refresh
// token'a cevirir. Hicbir sey GitHub'a yazmaz - token'i ekrana basar, Ercan
// (ya da ben, ayri bir adimda) GOOGLE_REFRESH_TOKEN secret'ina elle koyar.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'local-secrets', 'bizimhesap.local.env') });
const { google } = require('googleapis');

const code = process.argv[2];
if (!code) { console.error('Kullanim: node tools/gmail_oauth_exchange_local.cjs "CODE"'); process.exit(1); }

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
if (!clientId || !clientSecret || clientSecret.includes('BURAYA_') || clientSecret.includes('<')) {
  console.error('HATA: GOOGLE_CLIENT_ID/SECRET local-secrets dosyasinda eksik/placeholder.');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost');

(async () => {
  try {
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) {
      console.error('Refresh token gelmedi. Kod eski/kullanilmis olabilir - yeni bir izin linki gerekiyor.');
      process.exit(1);
    }
    console.log('BASARILI. Refresh token:');
    console.log(tokens.refresh_token);
  } catch (e) {
    console.error('HATA: ' + (e.message || e));
    process.exit(1);
  }
})();
