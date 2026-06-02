import { google } from 'googleapis';

const id = process.env.GOOGLE_CLIENT_ID;
const secret = process.env.GOOGLE_CLIENT_SECRET;
const token = process.env.GOOGLE_REFRESH_TOKEN;
const mailbox = process.env.GMAIL_MAILBOX || 'alaylimedikal@gmail.com';

if (!id || !secret || !token) throw new Error('Google OAuth env eksik');

const auth = new google.auth.OAuth2(id, secret, process.env.GOOGLE_REDIRECT_URI || 'http://localhost');
auth.setCredentials({ refresh_token: token });
const gmail = google.gmail({ version: 'v1', auth });

const query = `to:${mailbox} has:attachment newer_than:7d`;
const res = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 10 });
const messages = res.data.messages || [];

console.log(JSON.stringify({
  run_at: new Date().toISOString(),
  mailbox,
  query,
  found_count: messages.length,
  message_ids: messages.map(x => x.id)
}, null, 2));
