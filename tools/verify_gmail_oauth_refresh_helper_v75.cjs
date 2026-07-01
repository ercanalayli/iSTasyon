const fs = require('fs');

function ok(name, pass) {
  console.log(`${pass ? 'OK ' : 'FAIL'} ${name}`);
  if (!pass) failed += 1;
}

let failed = 0;
const workflow = fs.readFileSync('.github/workflows/gmail-oauth-refresh.yml', 'utf8');
const helper = fs.readFileSync('automation/gmail-oauth-refresh-helper.cjs', 'utf8');

ok('workflow exists', workflow.includes('AperiON Gmail OAuth Refresh Helper'));
ok('manual dispatch', workflow.includes('workflow_dispatch'));
ok('start finish modes', workflow.includes('start') && workflow.includes('finish'));
ok('correct mailbox locked', workflow.includes('GMAIL_MAILBOX: alaylimedikal@gmail.com') && helper.includes("mailbox !== 'alaylimedikal@gmail.com'"));
ok('uses GitHub secrets', workflow.includes('secrets.GOOGLE_CLIENT_ID') && workflow.includes('secrets.GOOGLE_CLIENT_SECRET'));
ok('localhost redirect for web client', workflow.includes('GOOGLE_REDIRECT_URI: http://localhost') && helper.includes("'http://localhost'"));
ok('does not need local env', !workflow.includes('notepad') && !workflow.includes('.env'));
ok('prints auth url markers', helper.includes('GMAIL_OAUTH_URL_BEGIN') && helper.includes('GMAIL_OAUTH_URL_END'));
ok('prints refresh token markers', helper.includes('GOOGLE_REFRESH_TOKEN_BEGIN') && helper.includes('GOOGLE_REFRESH_TOKEN_END'));
ok('writes OAuth artifacts', helper.includes('gmail-oauth-url.txt') && helper.includes('gmail-refresh-token.txt') && workflow.includes('upload-artifact@v4'));
ok('readonly Gmail scope', helper.includes('https://www.googleapis.com/auth/gmail.readonly'));

if (failed) {
  console.error(`Gmail OAuth refresh helper verification failed: ${failed}`);
  process.exit(1);
}

console.log('Gmail OAuth refresh helper verification passed.');
