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

function decodeBodyData(data = ''){
  if(!data) return '';
  const normalized = String(data).replace(/-/g, '+').replace(/_/g, '/');
  try{
    return Buffer.from(normalized, 'base64').toString('utf8');
  }catch{
    return '';
  }
}

function decodeHtmlEntities(value = ''){
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function htmlToText(html = ''){
  return decodeHtmlEntities(String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim());
}

export function collectBodyText(part, out = { plain: [], html: [] }){
  if(!part) return out;
  const mime = String(part.mimeType || '').toLowerCase();
  const data = part.body?.data ? decodeBodyData(part.body.data) : '';
  if(data && mime.includes('text/plain')) out.plain.push(data);
  if(data && mime.includes('text/html')) out.html.push(htmlToText(data));
  for(const child of part.parts || []) collectBodyText(child, out);
  return out;
}

export async function readMessageSummary(gmail, messageId){
  const res = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
  const payload = res.data.payload || {};
  const headers = payload.headers || [];
  const body = collectBodyText(payload);
  const bodyText = [
    body.plain.join('\n'),
    body.html.join('\n'),
    res.data.snippet || ''
  ].filter(Boolean).join('\n').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return {
    id: messageId,
    from: headerValue(headers, 'from'),
    to: headerValue(headers, 'to'),
    subject: headerValue(headers, 'subject'),
    date: headerValue(headers, 'date'),
    snippet: res.data.snippet || '',
    body_text: bodyText.slice(0, 80000),
    attachments: collectAttachments(payload)
  };
}
