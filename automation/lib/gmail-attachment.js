export async function readAttachmentBuffer(gmail, messageId, attachmentId){
  const res = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId,
    id: attachmentId
  });
  const data = res.data.data || '';
  return Buffer.from(data, 'base64url');
}

export function isReadableBankAttachment(file){
  const name = String(file?.filename || '').toLowerCase();
  return name.endsWith('.pdf') || name.endsWith('.txt') || name.endsWith('.csv') || name.endsWith('.xls') || name.endsWith('.xlsx');
}
