import { google } from 'googleapis';

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost';

if (!clientId || !clientSecret) {
  console.error('GOOGLE_CLIENT_ID ve GOOGLE_CLIENT_SECRET gerekli.');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];
const url = oauth2.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: scopes });

console.log('\nAşağıdaki linki aç, alaylimedikal@gmail.com ile izin ver.\n');
console.log(url);
console.log('\nGoogle dönüşte code verecek. Sonra şu komut çalışacak:');
console.log('node gmail-oauth-finish.js "BURAYA_CODE"\n');
