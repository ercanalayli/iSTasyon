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
  // 2026-08-06: .xlsx/.xls buraya hic eklenmemisti - lib/pdf-text.js xlsx
  // okuyabilir hale getirilse bile bu kapidan gecemedigi icin ekler hic
  // indirilmiyordu (Vakifbank gunluk ekstresi tam olarak bu formatta).
  return name.endsWith('.pdf') || name.endsWith('.txt') || name.endsWith('.csv') || name.endsWith('.zip') || name.endsWith('.xlsx') || name.endsWith('.xls');
}
