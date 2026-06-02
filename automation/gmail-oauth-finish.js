import { google } from 'googleapis';

const code = process.argv[2];
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost';

if (!code) {
  console.error('Kullanım: node gmail-oauth-finish.js "GOOGLE_CODE"');
  process.exit(1);
}
if (!clientId || !clientSecret) {
  console.error('GOOGLE_CLIENT_ID ve GOOGLE_CLIENT_SECRET gerekli.');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const { tokens } = await oauth2.getToken(code);

console.log('\nRefresh token aşağıda. Bunu .env içine GOOGLE_REFRESH_TOKEN olarak koy. GitHub\'a koyma.\n');
console.log(tokens.refresh_token || '(refresh_token gelmedi; tekrar prompt=consent ile izin ver)');
console.log('\nAccess token kısa ömürlüdür, saklama gerekmiyor.\n');
