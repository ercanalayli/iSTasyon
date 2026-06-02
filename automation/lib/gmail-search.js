export async function searchMessages(gmail, q, maxResults = 10){
  const res = await gmail.users.messages.list({ userId:'me', q, maxResults });
  return res.data.messages || [];
}

export function mailboxQuery(mailbox, extra){
  return `to:${mailbox} ${extra}`;
}
