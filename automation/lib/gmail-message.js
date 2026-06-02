export function headerValue(headers, name){
  const item = (headers || []).find(h => String(h.name).toLowerCase() === String(name).toLowerCase());
  return item ? item.value : '';
}

export function collectAttachments(part, out = []){
  if(!part) return out;
  if(part.filename && part.body && part.body.attachmentId){
    out.push({
      filename: part.filename,
      mimeType: part.mimeType || '',
      attachmentId: part.body.attachmentId,
      size: part.body.size || 0
    });
  }
  for(const child of part.parts || []) collectAttachments(child, out);
  return out;
}

export async function readMessageSummary(gmail, messageId){
  const res = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
  const payload = res.data.payload || {};
  const headers = payload.headers || [];
  return {
    id: messageId,
    from: headerValue(headers, 'from'),
    to: headerValue(headers, 'to'),
    subject: headerValue(headers, 'subject'),
    date: headerValue(headers, 'date'),
    attachments: collectAttachments(payload)
  };
}
